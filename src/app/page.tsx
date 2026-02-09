// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page will redirect users to the login page.
// In a real application, you would check for an existing authentication session.
// If authenticated, redirect to '/dashboard'; otherwise, redirect to '/login'.

export default function RootPage() {
  const router = useRouter();
  
  // For now, we'll always assume the user is not authenticated on the root page
  // and needs to be redirected to login.
  const isAuthenticated = false; // Placeholder

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login'); // Redirect to user login page
    } else {
      // This branch is for future use if auth state is available here
      router.replace('/dashboard'); // Redirect to the main dashboard
    }
  }, [isAuthenticated, router]); // Added isAuthenticated to dependency array

  return (
    // This content is shown briefly while redirection occurs.
    // It will use the main app layout (src/app/layout.tsx).
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.16))]"> {/* Adjust height considering header if any */}
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Redirecting to login...</p>
    </div>
  );
}
