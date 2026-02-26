'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import {
    interrogationChat,
    type ChatMessage,
} from '@/lib/ai/flows/interrogation-chat';

// ─── Get Active Session ──────────────────────────────────────────────

/**
 * Retrieves the current user's pending or in-progress interrogation session.
 * Returns null if the user has no active session.
 *
 * @returns The active session with chat history, or null
 */
export async function getActiveSession() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated.' };
    }

    const session = await prisma.interrogationSession.findFirst({
        where: {
            userId: user.id,
            status: { in: ['pending', 'in_progress'] },
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!session) {
        return { session: null };
    }

    return {
        session: {
            id: session.id,
            status: session.status,
            chatHistory: session.chatHistory as ChatMessage[],
        },
    };
}

// ─── Send Interrogation Message ──────────────────────────────────────

/**
 * Sends a message in an active interrogation session and gets the AI's response.
 * Automatically updates the session status and extracts anchor points.
 * When the AI determines enough anchors are gathered, marks the session complete.
 *
 * @param sessionId - The InterrogationSession ID
 * @param messageText - The reporter's message text
 * @returns AI response and updated session state
 */
export async function sendInterrogationMessage(sessionId: string, messageText: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated.' };
    }

    if (!messageText || messageText.trim().length < 2) {
        return { error: 'Message too short.' };
    }

    // Verify the session belongs to this user and is active
    const session = await prisma.interrogationSession.findFirst({
        where: {
            id: sessionId,
            userId: user.id,
            status: { in: ['pending', 'in_progress'] },
        },
    });

    if (!session) {
        return { error: 'No active session found.' };
    }

    const history = (session.chatHistory as ChatMessage[]) || [];
    const isGreeting = history.length === 0;

    // Call the AI interrogation flow
    const newMessage: ChatMessage = { role: 'user', content: messageText.trim() };
    const result = await interrogationChat({
        newMessage,
        history,
        isGreeting,
    });

    // Build updated chat history
    const updatedHistory: ChatMessage[] = [
        ...history,
        newMessage,
        { role: 'model', content: result.responseText },
    ];

    // Determine new session status
    const newStatus = result.isComplete ? 'completed' : 'in_progress';

    // Update session in DB
    await prisma.interrogationSession.update({
        where: { id: sessionId },
        data: {
            chatHistory: updatedHistory as unknown as Parameters<typeof prisma.interrogationSession.update>[0]['data']['chatHistory'],
            status: newStatus,
            extractedAnchors: result.extractedAnchors
                ? (result.extractedAnchors as unknown as Parameters<typeof prisma.interrogationSession.update>[0]['data']['extractedAnchors'])
                : undefined,
            ...(result.isComplete ? { completedAt: new Date() } : {}),
        },
    });

    // If session completed, check if ALL sessions for this case are done
    if (result.isComplete) {
        await checkAllSessionsComplete(session.shadowCaseId);
    }

    return {
        response: result.responseText,
        isComplete: result.isComplete ?? false,
        anchors: result.extractedAnchors ?? null,
    };
}

// ─── Check All Sessions Complete ─────────────────────────────────────

/**
 * Checks if all interrogation sessions for a shadow case are complete.
 * If so, triggers the consistency engine to calculate the Vc score.
 *
 * @param shadowCaseId - The ShadowCase ID to check
 */
async function checkAllSessionsComplete(shadowCaseId: string) {
    const sessions = await prisma.interrogationSession.findMany({
        where: { shadowCaseId },
    });

    const allComplete = sessions.every((s) => s.status === 'completed');
    if (!allComplete) return;

    // All sessions done → run consistency engine
    const { runConsistencyCheck } = await import('@/lib/ai/flows/consistency-engine');
    await runConsistencyCheck(shadowCaseId);
}

// ─── Get Pending Interview Count ─────────────────────────────────────

/**
 * Returns the count of pending interrogation sessions for the current user.
 * Used for the notification badge in the hamburger menu.
 *
 * @returns Count of pending/in-progress sessions
 */
export async function getPendingInterviewCount() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { count: 0 };
    }

    const count = await prisma.interrogationSession.count({
        where: {
            userId: user.id,
            status: { in: ['pending', 'in_progress'] },
        },
    });

    return { count };
}
