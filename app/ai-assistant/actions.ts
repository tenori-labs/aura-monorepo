'use server';

import prisma from '@/lib/db';
import { generateNeutralReport } from '@/lib/ai/flows/generate-report-flow';
import { clarifyDistress } from '@/lib/ai/flows/clarify-distress-flow';
import { auth } from '@clerk/nextjs/server';

/**
 * Light auth check — only verifies the user is signed in. Avoids
 * `currentUser()` (which makes a Clerk Backend API call and can fail
 * with a `ClerkAPIResponseError` on network hiccups). Returns userId
 * or throws.
 */
async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

/**
 * Uses AI to clarify whether a flagged message represents a genuine mental
 * health distress.
 */
export async function handleClarification(input: {
  originalMessage: string;
  studentClarification: string;
}) {
  await requireUserId();

  try {
    return await clarifyDistress(input);
  } catch (error) {
    console.error('[Clarify Distress] Failed:', error);
    throw new Error('Failed to process clarification. Please try again.');
  }
}

/**
 * Generates a neutral AI report and stores it in the database.
 */
export async function generateAndStoreReport(input: {
  themes: string[];
  clarificationSummary: string;
  studentName: string;
  uid: string;
}) {
  try {
    await requireUserId();

    const { themes, clarificationSummary, studentName, uid } = input;

    const structured = await generateNeutralReport(themes, clarificationSummary);

    const report = await prisma.wellbeingReport.create({
      data: {
        uid,
        studentName,
        reportText: structured.reportText,
        themes,
        status: 'pending',
        riskLevel: structured.riskLevel,
        summary: structured.summary,
        observedBehaviors: structured.observedBehaviors,
        recommendedActions: structured.recommendedActions,
        contextNotes: structured.contextNotes,
      },
    });

    console.log(
      `[Wellbeing] Report created: caseId=${report.caseId}, uid=${uid}, risk=${structured.riskLevel}`
    );

    return {
      caseId: report.caseId,
      reportId: report.id,
    };
  } catch (error) {
    console.error('[Wellbeing Report] Failed:', error);
    throw new Error('Failed to generate report. Please try again.');
  }
}
