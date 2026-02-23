'use server';

import { createClient } from '@/lib/supabase/server';
import { classifyIncidentReport } from '@/lib/ai/flows/classify-incident-report';
import prisma from '@/lib/db';
import { validateRequiredFields, validateFileSize, validateDate } from './report-validation';

/**
 * Submit a new incident report from the student portal.
 * Handles form validation, file uploads, AI classification, and database storage.
 *
 * @param prevState - The previous state of the form action.
 * @param formData - The submitted form payload containing incident details and media.
 * @returns An object containing either the `success` status and `aiAnalysis` result, or an `error` message.
 */
export async function submitIncident(prevState: unknown, formData: FormData) {
  console.log('Submit incident action called');
  const supabase = await createClient();

  // 1. Get current user (Supabase Auth only)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Extract form data
  const type = formData.get('type') as string;
  const date = formData.get('date') as string;
  const location = formData.get('location') as string;
  const description = formData.get('description') as string;
  const email = formData.get('email') as string;
  const file = formData.get('media') as File;

  // 3. Validation
  if (!validateRequiredFields({ type, date, location, description })) {
    return { error: 'Please fill in all required fields.' };
  }

  if (!validateDate(date)) {
    return { error: 'Please enter a valid date. Future dates are not allowed.' };
  }

  if (file && !validateFileSize(file.size)) {
    return { error: 'File size must be under 5MB.' };
  }

  // 4. Convert file to base64 for AI + MongoDB storage
  let mediaBase64: string | undefined = undefined;
  let mediaType: string | undefined = undefined;
  let mediaFileName: string | undefined = undefined;

  if (file && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    mediaBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;
    mediaType = file.type;
    mediaFileName = file.name;
  }

  // 5. Call Genkit AI Flow
  let aiResult = null;
  try {
    console.log('Calling AI Classification with:', {
      descriptionLength: description?.length,
      hasMedia: !!mediaBase64,
    });

    aiResult = await classifyIncidentReport({
      reportText: description,
      media: mediaBase64,
    });

    console.log('AI Result received:', JSON.stringify(aiResult, null, 2));
  } catch (error) {
    console.error('AI Classification Failed:', error);
  }

  // 6. Lookup category assignment for auto-assign
  let assignedTo: string | null = null;
  let assignedToEmail: string | null = null;
  try {
    const assignment = await prisma.categoryAssignment.findUnique({
      where: { category: type },
    });
    if (assignment) {
      assignedTo = assignment.facultyId;
      assignedToEmail = assignment.facultyEmail;
    }
  } catch (lookupError) {
    console.error('Category assignment lookup failed:', lookupError);
  }

  // 7. Save to MongoDB via Prisma
  try {
    // Debug: Check the DATABASE_URL has a db name
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    const masked = dbUrl.replace(/\/\/.*@/, '//***:***@');
    console.log('DATABASE_URL (masked):', masked);
    const savedReport = await prisma.incidentReport.create({
      data: {
        userId: user?.id || null,
        userEmail: user?.email || null,
        incidentType: type,
        dateTime: new Date(date),
        location,
        description,
        email: email || null,
        mediaBase64,
        mediaType,
        mediaFileName,
        aiAnalysis: aiResult
          ? {
            category: aiResult.category,
            confidence: aiResult.confidence,
            keywords: aiResult.keywords,
            validity: aiResult.validity,
            validityReason: aiResult.validityReason,
          }
          : undefined,
        status: 'pending',
        assignedTo,
        assignedToEmail,
      },
    });

    console.log('Report saved to MongoDB:', savedReport.id);

    return {
      success: true,
      message: 'Report submitted successfully.',
      aiAnalysis: aiResult,
      reportId: savedReport.id,
      error: undefined,
    };
  } catch (dbError) {
    console.error('MongoDB Save Failed:', dbError);
    return {
      success: false,
      message: 'Report analyzed but failed to save. Please try again.',
      aiAnalysis: aiResult,
      error: 'Failed to save report to database.',
    };
  }
}
