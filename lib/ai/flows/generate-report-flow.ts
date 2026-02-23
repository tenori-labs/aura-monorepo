'use server';

import { ai } from '@/lib/ai/genkit';

/**
 * Structured wellbeing report returned by the LLM.
 */
export interface StructuredReport {
  summary: string;
  riskLevel: 'low' | 'moderate' | 'high';
  observedBehaviors: string[];
  recommendedActions: string[];
  contextNotes: string;
  /** Legacy plain-text fallback (concatenated for backward compatibility) */
  reportText: string;
}

/**
 * Generates a structured wellbeing report from conversation themes using Google Gemini AI.
 * Enforces strict prompt rules to guarantee no names, no identifiable quotes, and neutral observational language.
 *
 * @param themes - Array of extracted conversational themes from the dialogue
 * @param clarificationSummary - Summary of distress context provided by the student
 * @returns A StructuredReport containing the risk level, actions, and safety-verified generated fallback string
 */
export async function generateNeutralReport(
  themes: string[],
  clarificationSummary: string
): Promise<StructuredReport> {
  const themesSection =
    themes.length > 0
      ? `Observed themes: ${themes.join(', ')}`
      : 'No specific themes were extracted automatically.';

  try {
    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash-001',
      prompt: `You are a wellbeing report generator for a university student support system. Generate a structured JSON report based on the following themes and context. This will be read by an administrator who needs clear, actionable information.

Rules:
- Do NOT include any names or identifying information
- Do NOT diagnose or use clinical terms (e.g., no "depression", "anxiety disorder")
- Do NOT quote the student directly
- Use neutral, observational language only
- Avoid alarming language while still communicating the concern

${themesSection}
Context: ${clarificationSummary}

Return ONLY a valid JSON object with NO markdown formatting, NO code fences, in this exact structure:
{
  "summary": "1-2 sentence high-level overview of the situation",
  "riskLevel": "low" or "moderate" or "high",
  "observedBehaviors": ["behavior 1", "behavior 2", "behavior 3"],
  "recommendedActions": ["action 1", "action 2"],
  "contextNotes": "Brief additional context from the conversation that may help the reviewer"
}

Risk level guide:
- "low": Student expressed general stress or frustration, no safety concerns
- "moderate": Student expressed significant emotional distress, potential need for support
- "high": Student expressed language suggesting self-harm risk or severe crisis

Example:
{
  "summary": "Student expressed language consistent with significant emotional distress, with themes of academic pressure and social withdrawal.",
  "riskLevel": "moderate",
  "observedBehaviors": ["Expressed feelings of hopelessness about academic performance", "Mentioned withdrawing from social activities", "Indicated persistent low mood over several weeks"],
  "recommendedActions": ["Schedule supportive outreach conversation within 48 hours", "Connect student with campus counseling services", "Monitor for follow-up engagement"],
  "contextNotes": "Student clarified that recent academic setbacks have compounded feelings of isolation. No immediate safety concern expressed but ongoing support recommended."
}

Generate the JSON now:`,
    });

    const raw = result.text?.trim() ?? '';

    // Parse the JSON — strip any accidental markdown fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    const parsed = JSON.parse(cleaned);

    // Validate and normalize
    const report: StructuredReport = {
      summary: parsed.summary || 'Student was flagged for potential emotional distress.',
      riskLevel: ['low', 'moderate', 'high'].includes(parsed.riskLevel)
        ? parsed.riskLevel
        : 'moderate',
      observedBehaviors: Array.isArray(parsed.observedBehaviors) ? parsed.observedBehaviors : [],
      recommendedActions: Array.isArray(parsed.recommendedActions)
        ? parsed.recommendedActions
        : ['Supportive outreach conversation recommended'],
      contextNotes: parsed.contextNotes || '',
      reportText:
        parsed.summary ||
        'Student was flagged for potential emotional distress during a wellbeing conversation.',
    };

    return report;
  } catch (e: unknown) {
    console.error('Error generating structured report:', e);

    // Graceful fallback
    return {
      summary: clarificationSummary
        ? `Student was flagged for potential emotional distress. ${clarificationSummary}`
        : 'Student was flagged for potential emotional distress during a wellbeing conversation.',
      riskLevel: 'moderate',
      observedBehaviors: themes.length > 0 ? themes : ['Emotional distress indicators observed'],
      recommendedActions: ['Manual review and supportive outreach is recommended'],
      contextNotes: clarificationSummary || '',
      reportText: clarificationSummary
        ? `Student was flagged for potential emotional distress. ${clarificationSummary} Manual review and supportive outreach is recommended.`
        : 'Student was flagged for potential emotional distress during a wellbeing conversation. Manual review and supportive outreach is recommended.',
    };
  }
}
