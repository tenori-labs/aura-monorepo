import type { Metadata } from 'next';

// RootLayout (src/app/layout.tsx) already handles global styles, fonts, and Toaster.
// This layout (src/app/login/layout.tsx) is nested within RootLayout.
// Therefore, it should not redeclare <html>, <body>, or re-import global resources.

export const metadata: Metadata = {
  title: 'Login - Campusence',
  description: 'Login to Campusence incident reporting system.',
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The content of login pages (children) will be rendered inside the <main> tag of RootLayout.
  // AppHeader is designed to hide itself on /login routes.
  // AppSidebar (from RootLayout) will still be visible on /login pages with this structure.
  // If a completely separate layout (e.g., no sidebar) is desired for login pages,
  // Next.js Route Groups would be the standard solution.
  // This change fixes the immediate hydration error.
  return <>{children}</>;
}
