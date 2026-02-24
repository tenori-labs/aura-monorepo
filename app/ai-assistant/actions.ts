'use server';

import prisma from '@/lib/db';
import { generateNeutralReport } from '@/lib/ai/flows/generate-report-flow';
import { clarifyDistress } from '@/lib/ai/flows/clarify-distress-flow';

/**
 * Uses AI to clarify whether a flagged message represents a genuine mental health distress.
 * Called from the client after student provides additional context.
 *
 * @param input - Object containing `originalMessage` leading to flag, and the `studentClarification` response
 * @returns Clarification result object outlining distress validity and summary, via Genkit flow
 */
export async function handleClarification(input: {
  originalMessage: string;
  studentClarification: string;
}) {
  try {
    return await clarifyDistress(input);
  } catch (error) {
    console.error('[Clarify Distress] Failed:', error);
    throw new Error('Failed to process clarification. Please try again.');
  }
}

/**
 * Generates a neutral AI report and stores it in the database.
 * Triggers database creation, guaranteeing no PII in the generated report text.
 * Requires clarification sequence to have confirmed genuine distress beforehand.
 *
 * @param input - Contains extracted `themes`, `clarificationSummary`, user `uid`, and `studentName` (separated for safety)
 * @returns The newly created database record for the wellbeing report
 */
export async function generateAndStoreReport(input: {
  themes: string[];
  clarificationSummary: string;
  studentName: string;
  uid: string;
}) {
  try {
    const { themes, clarificationSummary, studentName, uid } = input;

    // Generate structured report (themes-only, no names, no quotes)
    const structured = await generateNeutralReport(themes, clarificationSummary);

    // Store in MongoDB with all structured fields
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

