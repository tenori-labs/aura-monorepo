'use server';

import prisma from '@/lib/db';
import { generateNeutralReport } from '@/lib/ai/flows/generate-report-flow';
import { clarifyDistress } from '@/lib/ai/flows/clarify-distress-flow';

/**
 * Clarify whether a flagged message represents genuine distress.
 * Called from the chat UI when the student responds to a check-in question.
 */
export async function handleClarification(input: {
    originalMessage: string;
    studentClarification: string;
}) {
    return clarifyDistress(input);
}

/**
 * Generate a neutral wellbeing report and store it in the database.
 *
 * Called only when `isGenuineDistress` is confirmed by the clarification flow.
 * The `reportText` will NEVER contain the student's name.
 * `studentName` is stored separately for internal staff identification only.
 */
export async function generateAndStoreReport(input: {
    themes: string[];
    clarificationSummary: string;
    studentName: string;
    uid: string;
}) {
    const { themes, clarificationSummary, studentName, uid } = input;

    // Generate the neutral report (themes-only, no names, no quotes)
    const reportText = await generateNeutralReport(themes, clarificationSummary);

    // Store in MongoDB
    const report = await prisma.wellbeingReport.create({
        data: {
            uid,
            studentName,
            reportText,
            themes,
            status: 'pending',
        },
    });

    console.log(`[Wellbeing] Report created: caseId=${report.caseId}, uid=${uid}`);

    return {
        caseId: report.caseId,
        reportId: report.id,
    };
}
