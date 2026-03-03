'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/roles';

/**
 * Authenticate an existing user and redirect them to their respective dashboard based on their role.
 *
 * @param formData - The login form data containing `email` and `password`.
 */
export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error, data: authData } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect(`/?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');

  // Redirect based on role
  const role = authData.user?.app_metadata?.role || 'student';
  if (role === 'faculty') {
    redirect('/faculty-dashboard');
  } else if (role === 'admin') {
    redirect('/admin-dashboard');
  } else {
    redirect('/dashboard');
  }
}

/**
 * Register a new user account via Supabase Authentication.
 *
 * @param formData - The registration form data containing `email`, `password`, `fullName`, and `role`.
 */
export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const role = (formData.get('role') as UserRole) || 'student';

  if (!email || !password || !fullName) {
    redirect('/signup?error=' + encodeURIComponent('Email, password, and full name are required.'));
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/signup?message=Check your email to confirm your account');
}

/**
 * Clear the current user's session and redirect them to the home page.
 */
export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
