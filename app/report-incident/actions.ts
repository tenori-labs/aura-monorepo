'use server';

import { getCurrentUser } from '@/lib/auth/server';
import { classifyIncidentReport } from '@/lib/ai/flows/classify-incident-report';
import prisma from '@/lib/db';
import { validateRequiredFields, validateFileSize, validateDate } from './report-validation';

/**
 * Submit a new incident report from the student portal.
 * Handles form validation, file uploads, AI classification, and database storage.
 */
export async function submitIncident(prevState: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'You must be logged in to submit a report.' };
  }

  const type = formData.get('type') as string;
  const date = formData.get('date') as string;
  const location = formData.get('location') as string;
  const description = formData.get('description') as string;
  const email = formData.get('email') as string;
  const file = formData.get('media') as File;

  if (!validateRequiredFields({ type, date, location, description })) {
    return { error: 'Please fill in all required fields.' };
  }

  if (!validateDate(date)) {
    return { error: 'Please enter a valid date. Future dates are not allowed.' };
  }

  if (file && !validateFileSize(file.size)) {
    return { error: 'File size must be under 5MB.' };
  }

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

  let aiResult = null;
  try {
    aiResult = await classifyIncidentReport({
      reportText: description,
      media: mediaBase64,
    });
  } catch (error) {
    console.error('AI Classification Failed:', error);
  }

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

  try {
    const savedReport = await prisma.incidentReport.create({
      data: {
        userId: user.id,
        userEmail: user.email,
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
        status: 'submitted',
        assignedTo,
        assignedToEmail,
      },
    });

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
