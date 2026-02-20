'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation'; // Added useSearchParams
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  ShieldAlert,
  LayoutDashboard,
  FilePlus2,
  HelpCircle,
  ShieldCheck,
  Briefcase,
  Smile,
  UserCircle,
  HeartHandshake,
  BookHeart,
  FileSignature,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Student Dashboard', icon: LayoutDashboard, role: 'user' },
  {
    href: '/login?redirect=/mental-health',
    label: 'Mental Health',
    icon: Smile,
    role: 'user',
    originalPath: '/mental-health',
  },
  { href: '/self-help', label: 'Self-Help', icon: BookHeart, role: 'user' },
  {
    href: '/login?redirect=/report/new',
    label: 'Report Incident',
    icon: FilePlus2,
    role: 'user',
    originalPath: '/report/new',
  },
  { href: '/consent', label: 'Give Consent', icon: FileSignature, role: 'user' },
  { href: '/faq', label: 'FAQ & Resources', icon: HelpCircle, role: 'user' },
  {
    href: '/login/admin',
    label: 'Admin Portal',
    icon: ShieldCheck,
    role: 'admin',
    originalPath: '/admin',
  },
  {
    href: '/login/faculty',
    label: 'Faculty Portal',
    icon: Briefcase,
    role: 'faculty',
    originalPath: '/faculty/profile',
  },
  {
    href: '/login/counselor',
    label: 'Counselor Portal',
    icon: HeartHandshake,
    role: 'counselor',
    originalPath: '/counselor/dashboard',
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // For now, show all items. In a real app, filter based on user role.
  const visibleNavItems = navItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link
          href="/login"
          className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors"
        >
          <ShieldAlert className="h-8 w-8" />
          <span className="text-2xl font-semibold group-data-[collapsible=icon]:hidden">
            Campusence
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1">
        <SidebarMenu>
          {visibleNavItems.map((item) => {
            let calculatedIsActive = false;
            const itemPathBase = item.originalPath || item.href.split('?')[0];
            const loginPathForCurrentItem = item.href.startsWith('/login?')
              ? item.href.split('?')[0]
              : null;
            const redirectParamForCurrentItem = item.href.includes('redirect=')
              ? item.href.split('redirect=')[1]
              : null;

            // Check if current path is the item's base path or starts with it (for nested routes)
            if (
              pathname === itemPathBase ||
              (itemPathBase !== '/' &&
                pathname.startsWith(itemPathBase + (itemPathBase.endsWith('/') ? '' : '/')))
            ) {
              calculatedIsActive = true;
            }

            // Specific logic for items that go through login
            if (loginPathForCurrentItem && redirectParamForCurrentItem) {
              if (
                pathname === loginPathForCurrentItem &&
                searchParams.get('redirect') === redirectParamForCurrentItem
              ) {
                calculatedIsActive = true;
              }
            } else if (itemPathBase === '/login/admin' && pathname.startsWith('/admin')) {
              // Handles /admin and /admin/report/*
              calculatedIsActive = true;
            } else if (itemPathBase === '/login/faculty' && pathname.startsWith('/faculty')) {
              // Handles /faculty and /faculty/report/*
              calculatedIsActive = true;
            } else if (itemPathBase === '/login/counselor' && pathname.startsWith('/counselor')) {
              calculatedIsActive = true;
            }

            // Special handling for Student Dashboard to not stay active if other main sections are active
            if (item.href === '/dashboard') {
              const otherMainUserSections = [
                '/report',
                '/mental-health',
                '/faq',
                '/self-help',
                '/consent',
              ];
              const isOtherMainSectionActive = otherMainUserSections.some((section) =>
                pathname.startsWith(section)
              );

              if (isOtherMainSectionActive) {
                calculatedIsActive = false;
              } else if (pathname === '/login' && searchParams.get('redirect') === '/dashboard') {
                calculatedIsActive = true;
              } else if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
                calculatedIsActive = true;
              } else {
                calculatedIsActive = false;
              }
            }

            // Ensure login path itself for a portal doesn't activate the dashboard link, but its own portal link
            if (pathname === '/login/admin' && item.originalPath !== '/admin')
              calculatedIsActive = false;
            if (pathname === '/login/faculty' && item.originalPath !== '/faculty/profile')
              calculatedIsActive = false;
            if (pathname === '/login/counselor' && item.originalPath !== '/counselor/dashboard')
              calculatedIsActive = false;

            if (pathname === '/login/admin' && item.originalPath === '/admin')
              calculatedIsActive = true;
            if (pathname === '/login/faculty' && item.originalPath === '/faculty/profile')
              calculatedIsActive = true;
            if (pathname === '/login/counselor' && item.originalPath === '/counselor/dashboard')
              calculatedIsActive = true;

            return (
              <SidebarMenuItem key={item.href + item.label}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    className="justify-start"
                    isActive={calculatedIsActive}
                    tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2"></SidebarFooter>
    </Sidebar>
  );
}
