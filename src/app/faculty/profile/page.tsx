// src/app/faculty/profile/page.tsx
'use client';

import type { Report } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import { format, parseISO, subDays, subHours } from 'date-fns';
import {
  UserCircle,
  BookOpen,
  Building,
  CheckSquare,
  GanttChartSquare,
  Loader2,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Dummy faculty data - in a real app, this would come from auth/DB
const dummyFacultyMember = {
  name: 'Dr. Faculty A', // Matches one of the assignable faculty for consistency
  id: 'faculty01',
  department: 'Computer Science',
  email: 'faculty.a@example.com',
  avatarUrl: 'https://placehold.co/100x100/d1d5db/111827.png',
  office: 'Science Building, Room 402',
};

// Extended dummy report generation to ensure some reports are assigned to our dummyFacultyMember
const incidentTypes = [
  'Theft',
  'Harassment',
  'Vandalism',
  'Assault',
  'Academic Misconduct',
  'Safety Concern',
  'Cyberbullying',
  'Noise Complaint',
  'Maintenance Issue',
  'Medical Emergency',
] as const;
const statuses: Report['status'][] = ['Submitted', 'In Review', 'Resolved', 'Closed'];
const locations = [
  'Main Library',
  'Science Building - Lab 301',
  'Student Dorm - West Wing',
  'Cafeteria',
  'Sports Complex',
  'Online - University Portal',
  'Parking Lot B',
  'Lecture Hall A101',
  'Admin Building - G02',
  'Arts Quad',
];

const generateDummyAssignedReports = (count: number, assignedToFaculty: string): Report[] => {
  const reports: Report[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const dateReported = subDays(subHours(now, Math.random() * 72), Math.random() * 30);
    const lastUpdated = subHours(dateReported, Math.random() * -48);
    const incidentDateTime = subHours(dateReported, Math.random() * 24 + 1);

    const randomIncidentType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];

    // Ensure some reports are assigned to the target faculty
    const isAssignedToThisFaculty = i % 3 === 0; // Assign roughly 1/3 of these reports

    reports.push({
      id: `RPT-FAC-${String(2000 + i).padStart(4, '0')}`,
      incidentType: randomIncidentType,
      dateTime: incidentDateTime.toISOString(),
      location: randomLocation,
      description: `Faculty-assigned incident #${i} regarding ${randomIncidentType.toLowerCase()}.`,
      status: isAssignedToThisFaculty && randomStatus === 'Submitted' ? 'In Review' : randomStatus,
      dateReported: dateReported.toISOString(),
      lastUpdated: lastUpdated.toISOString(),
      aiClassification: {
        category: randomIncidentType,
        confidence: Math.random() * (0.99 - 0.7) + 0.7,
        keywords: ['faculty', randomIncidentType.toLowerCase().split(' ')[0]],
      },
      assignedTo: isAssignedToThisFaculty
        ? assignedToFaculty
        : `Dr. Faculty ${String.fromCharCode(66 + (i % 5))}`, // Assign to current or others
      facultyNotes:
        isAssignedToThisFaculty && i % 2 === 0
          ? `Initial review notes by ${assignedToFaculty}: Further investigation needed for item X.`
          : undefined,
    });
  }
  return reports.filter((report) => report.assignedTo === assignedToFaculty); // Only return reports for this faculty
};

const getStatusVariant = (
  status: Report['status']
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'Submitted':
      return 'default';
    case 'In Review':
      return 'secondary';
    case 'Resolved':
      return 'outline';
    case 'Closed':
      return 'destructive';
    default:
      return 'default';
  }
};

export default function FacultyProfilePage() {
  const [assignedReports, setAssignedReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate fetching assigned reports for the logged-in faculty member
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const reports = generateDummyAssignedReports(15, dummyFacultyMember.name); // Generate 15 potential, then filter
      setAssignedReports(reports);
      setIsLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 border-2 border-primary" data-ai-hint="profile person">
              <AvatarImage src={dummyFacultyMember.avatarUrl} alt={dummyFacultyMember.name} />
              <AvatarFallback>{dummyFacultyMember.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-bold text-primary">
                {dummyFacultyMember.name}
              </CardTitle>
              <CardDescription className="text-md">{dummyFacultyMember.id}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <UserCircle className="mr-2 h-5 w-5 text-primary" /> Personal Information
            </h3>
            <p className="text-sm">
              <strong className="text-muted-foreground">Email:</strong> {dummyFacultyMember.email}
            </p>
            <p className="text-sm">
              <strong className="text-muted-foreground">Office:</strong> {dummyFacultyMember.office}
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <Building className="mr-2 h-5 w-5 text-primary" /> Department
            </h3>
            <p className="text-sm">
              <strong className="text-muted-foreground">Name:</strong>{' '}
              {dummyFacultyMember.department}
            </p>
            {/* Add more department details if needed */}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <GanttChartSquare className="mr-3 h-7 w-7" /> Assigned Incident Reports
          </CardTitle>
          <CardDescription>
            Overview of incidents currently assigned to you for review and action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableCaption>
                {isLoading
                  ? 'Loading assigned reports...'
                  : `A list of ${assignedReports.length} reports assigned to you.`}
              </TableCaption>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">Report ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date Reported</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                        <span className="text-muted-foreground">Loading reports...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : assignedReports.length > 0 ? (
                  assignedReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{report.id}</TableCell>
                      <TableCell>{report.incidentType}</TableCell>
                      <TableCell>{report.location}</TableCell>
                      <TableCell>{format(parseISO(report.dateReported), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/faculty/report/${report.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      You have no incidents currently assigned to you.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
