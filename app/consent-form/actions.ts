'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/server';
import prisma from '@/lib/db';
import { headers } from 'next/headers';
import { isSignatureValid } from './consent-validation';

/**
 * Process the submission of the UGC anti-ragging consent form.
 * Validates the student signature, captures request metadata (IP, User Agent), and records it in MongoDB.
 *
 * @param formData - The form data containing student details such as `signature`, `fullName`, `studentId`, and `course`.
 */
export async function submitConsent(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const signature = formData.get('signature') as string;
  const fullName = formData.get('fullName') as string;
  const studentId = formData.get('studentId') as string;
  const course = formData.get('course') as string;

  // Server-side validation
  if (!isSignatureValid(signature, fullName)) {
    // In a real app we might return form errors, but for simplicity we'll just throw/redirect
    throw new Error('Signature mismatch');
  }

  // Capture metadata
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Save to MongoDB
  await prisma.consentRecord.create({
    data: {
      userId: user.id,
      userEmail: user.email ?? '',
      fullName: fullName,
      studentId: studentId || null,
      course: course || null,
      section: null, // Can be added later
      ipAddress: ip,
      userAgent: userAgent,
      signedAt: new Date(),
      consentVersion: 'UGC-2009-v1',
    },
  });

  revalidatePath('/consent-form');
}
