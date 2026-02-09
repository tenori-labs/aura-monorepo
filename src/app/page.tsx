// src/app/page.tsx
import { redirect } from 'next/navigation';

// This page will redirect users to the login page.
// In a real application, you would check for an existing authentication session.
// If authenticated, redirect to '/dashboard'; otherwise, redirect to '/login'.

export default function RootPage() {
  // For now, we'll always assume the user is not authenticated on the root page
  // and needs to be redirected to login.
  const isAuthenticated = false; // Placeholder

  if (!isAuthenticated) {
    redirect('/login'); // Redirect to user login page
  } else {
    // This branch is for future use if auth state is available here
    redirect('/dashboard'); // Redirect to the main dashboard
  }
}
