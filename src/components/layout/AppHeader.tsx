
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { usePathname } from 'next/navigation';
import Image from 'next/image'; // Import next/image
import { Home, FilePlus2, HelpCircle, ShieldCheck, Menu, LayoutDashboard, Briefcase, Smile, HeartHandshake, User, BookHeart, FileSignature } from 'lucide-react';

const getPageTitle = (pathname: string): string => {
  if (pathname === '/dashboard') return 'Student Dashboard';
  if (pathname === '/') return 'Campusence';
  if (pathname === '/login') return 'User Login';
  if (pathname === '/login/admin') return 'Admin Login';
  if (pathname === '/login/faculty') return 'Faculty Login';
  if (pathname === '/login/counselor') return 'Counselor Login';
  if (pathname === '/report/new') return 'Report New Incident';
  if (pathname.startsWith('/report/')) return 'My Incident Report Details';
  if (pathname === '/faq') return 'FAQ & Resources';
  if (pathname === '/self-help') return 'Self-Help Resources';
  if (pathname.startsWith('/self-help/')) return 'Self-Help Resource';
  if (pathname === '/mental-health') return 'Mental Health Support';
  if (pathname === '/mental-health/schedule') return 'Schedule Counselor Appointment';
  if (pathname === '/admin') return 'Admin Portal';
  if (pathname.startsWith('/admin/report/')) return 'Incident Report Details';
  if (pathname === '/faculty/profile') return 'Faculty Profile';
  if (pathname.startsWith('/faculty/report/')) return 'Faculty - Incident Details';
  if (pathname === '/counselor/dashboard') return 'Counselor Dashboard';
  if (pathname.startsWith('/counselor/student/')) return 'Detailed Student View';
  if (pathname === '/consent') return 'Anti-Ragging Consent Form';
  return 'Campusence';
};

export default function AppHeader() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  // Hide header on all /login routes and the root path (which redirects to login)
  if (pathname.startsWith('/login') || pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 lg:px-8 shadow-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden">
           <Menu className="h-6 w-6" />
        </SidebarTrigger>
        <Image
            src="https://placehold.co/40x40/c7d2fe/312e81.png"
            alt="Friendly Mascot"
            width={32}
            height={32}
            className="rounded-full"
            data-ai-hint="cute mascot"
        />
        <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
      </div>
    </header>
  );
}
