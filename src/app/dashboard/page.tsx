
"use client";

import ReportCard from "@/components/report/ReportCard";
import type { Report, TimelineEvent, BookedAppointment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Edit3, Loader2, CalendarCheck, XCircle, Video, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { parseISO, addMinutes, format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Placeholder data - in a real app, this would come from a database or auth
const dummyStudent = {
  name: "Alex Student",
  studentId: "S1234567",
  email: "alex.student@example.com",
  major: "Computer Science",
  avatarUrl: "https://placehold.co/100x100/c7d2fe/312e81.png",
};

const getPlaceholderReports = (): Report[] => {
  const reportsBase = [
    {
      id: "1",
      incidentType: "Theft",
      dateTime: "2024-07-28T10:00:00Z",
      location: "Library Room 201",
      description: "My laptop was stolen from my bag when I stepped away for a moment. It's a silver MacBook Pro with a dent on the corner.",
      status: "Submitted" as Report['status'],
      dateReported: "2024-07-28T10:05:00Z",
      lastUpdated: "2024-07-28T10:05:00Z",
      aiClassification: {
        category: "Theft",
        confidence: 0.95,
        keywords: ["laptop", "stolen", "library"]
      }
    },
    {
      id: "2",
      incidentType: "Harassment",
      dateTime: "2024-07-27T15:30:00Z",
      location: "Student Union Cafeteria",
      description: "A group of students made inappropriate comments and gestures towards me. This has happened multiple times.",
      status: "In Review" as Report['status'],
      dateReported: "2024-07-27T16:00:00Z",
      lastUpdated: "2024-07-29T09:15:00Z",
       aiClassification: {
        category: "Harassment",
        confidence: 0.88,
        keywords: ["inappropriate comments", "gestures", "cafeteria"]
      }
    },
    {
      id: "3",
      incidentType: "Vandalism",
      dateTime: "2024-07-29T08:00:00Z",
      location: "North Quad Wall",
      description: "Graffiti was sprayed on the wall near the main entrance of the North Quad dorms. It appears to be gang-related.",
      status: "Resolved" as Report['status'],
      dateReported: "2024-07-29T08:30:00Z",
      lastUpdated: "2024-07-30T14:00:00Z",
      aiClassification: {
        category: "Vandalism",
        confidence: 0.92,
        keywords: ["graffiti", "sprayed", "wall", "dorm"]
      }
    },
     {
      id: "4",
      incidentType: "Safety Concern",
      dateTime: "2024-08-01T18:00:00Z",
      location: "Chemistry Lab B",
      description: "Broken fume hood, potentially leaking hazardous chemicals. Reported to lab technician but issue persists.",
      status: "Closed" as Report['status'], 
      dateReported: "2024-08-01T18:05:00Z",
      lastUpdated: "2024-08-05T11:00:00Z",
      aiClassification: {
        category: "Safety Concern",
        confidence: 0.98,
        keywords: ["fume hood", "broken", "chemicals", "lab"]
      },
      contactInfo: "alex.student@example.com" 
    },
  ];

  return reportsBase.map(report => {
    const timelineEvents: TimelineEvent[] = [{
        id: `evt-initial-${report.id}`,
        date: report.dateReported,
        actor: 'Student',
        action: 'Report Submitted',
        details: `Initial report submitted by student.`,
    }];

    if (report.status === "In Review") {
        timelineEvents.push({
            id: `evt-review-${report.id}`,
            date: addMinutes(parseISO(report.dateReported), 30).toISOString(),
            actor: 'System',
            action: 'Status: In Review',
            details: 'Report assigned for review.',
            statusChange: { from: 'Submitted', to: 'In Review' }
        });
    }
    if (report.status === "Resolved") {
         timelineEvents.push({
            id: `evt-review-${report.id}`,
            date: addMinutes(parseISO(report.dateReported), 30).toISOString(),
            actor: 'System',
            action: 'Status: In Review',
            details: 'Report assigned for review.',
            statusChange: { from: 'Submitted', to: 'In Review' }
        });
        timelineEvents.push({
            id: `evt-resolved-${report.id}`,
            date: report.lastUpdated,
            actor: 'Faculty', 
            action: 'Status: Resolved',
            details: 'Incident has been resolved.',
            statusChange: { from: 'In Review', to: 'Resolved' }
        });
    }
     if (report.status === "Closed") {
         timelineEvents.push({
            id: `evt-review-${report.id}`,
            date: addMinutes(parseISO(report.dateReported), 30).toISOString(),
            actor: 'System',
            action: 'Status: In Review',
            details: 'Report assigned for review.',
            statusChange: { from: 'Submitted', to: 'In Review' }
        });
         timelineEvents.push({
            id: `evt-closed-${report.id}`,
            date: report.lastUpdated,
            actor: 'Student', 
            action: 'Report Closed by Student',
            details: 'Student closed the report.',
            statusChange: { from: 'In Review', to: 'Closed' } 
        });
    }
    return { ...report, timelineEvents };
  });
};

export const getStudentReportById = (id: string): Report | undefined => {
  const allReports = getPlaceholderReports();
  return allReports.find(report => report.id === id);
};


export default function StudentDashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [bookedAppointment, setBookedAppointment] = useState<BookedAppointment | null>(null);
  const [isLoadingAppointment, setIsLoadingAppointment] = useState(true);

  useEffect(() => {
    setReports(getPlaceholderReports());
    setIsLoadingReports(false);

    setTimeout(() => {
      const hasAppointment = Math.random() > 0.3; 
      if (hasAppointment) {
        const isConfirmed = Math.random() > 0.5;
        setBookedAppointment({
          id: "appt-123",
          studentId: dummyStudent.studentId,
          studentName: dummyStudent.name,
          counselorId: "c1",
          counselorName: "Dr. Emily Carter",
          counselorSpecialty: "Stress & Anxiety Management",
          counselorAvatarUrl: "https://placehold.co/80x80/a5b4fc/1e293b.png",
          appointmentDate: addDays(new Date(), Math.floor(Math.random() * 5) + 2).toISOString(), 
          appointmentTime: "10:00 AM",
          status: isConfirmed ? "ConfirmedByCounselor" : "PendingConfirmation", // Set initial status
          bookingDate: new Date().toISOString(),
          studentNotes: "Looking forward to our session."
        });
      }
      setIsLoadingAppointment(false);
    }, 700); 

  }, []);

  const getAppointmentStatusPill = (status: BookedAppointment['status']) => {
    switch (status) {
      case "PendingConfirmation":
        return (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700">
            <AlertTriangle className="h-10 w-10 text-yellow-500 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-700 dark:text-yellow-300">Awaiting Confirmation</p>
              <p className="text-sm text-muted-foreground">
                Your appointment with <span className="font-medium">{bookedAppointment?.counselorName}</span> on <span className="font-medium">{bookedAppointment && format(parseISO(bookedAppointment.appointmentDate), "MMMM d, yyyy")}</span> at <span className="font-medium">{bookedAppointment?.appointmentTime}</span> is pending counselor approval.
              </p>
            </div>
          </div>
        );
      case "ConfirmedByCounselor":
      case "Upcoming":
        return (
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
             <Avatar className="h-16 w-16 border-2 border-green-500" data-ai-hint="counselor avatar">
              {bookedAppointment?.counselorAvatarUrl && <AvatarImage src={bookedAppointment.counselorAvatarUrl} alt={bookedAppointment.counselorName} />}
              <AvatarFallback>{bookedAppointment?.counselorName.substring(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-green-700 dark:text-green-300">Appointment Confirmed!</p>
              <p className="text-lg font-bold">With {bookedAppointment?.counselorName}</p>
              <p className="text-sm text-muted-foreground">{bookedAppointment?.counselorSpecialty}</p>
              <p className="text-sm text-muted-foreground">
                On <span className="font-medium">{bookedAppointment && format(parseISO(bookedAppointment.appointmentDate), "EEEE, MMMM d, yyyy")}</span> at <span className="font-medium">{bookedAppointment?.appointmentTime}</span>
              </p>
            </div>
          </div>
        );
      // Add cases for CancelledByCounselor, RescheduleProposedByCounselor etc.
      default:
        return (
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700">
                <Info className="h-10 w-10 text-blue-500 shrink-0" />
                <div>
                    <p className="font-semibold text-blue-700 dark:text-blue-300">Appointment Status: {status.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-sm text-muted-foreground">
                        Your appointment with <span className="font-medium">{bookedAppointment?.counselorName}</span> on <span className="font-medium">{bookedAppointment && format(parseISO(bookedAppointment.appointmentDate), "MMMM d, yyyy")}</span> at <span className="font-medium">{bookedAppointment?.appointmentTime}</span>.
                    </p>
                </div>
            </div>
        );
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Student Dashboard
          </h2>
          <p className="text-muted-foreground">
            Welcome, {dummyStudent.name}! Manage your profile and reported incidents.
          </p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 border-2 border-primary" data-ai-hint="profile person">
              <AvatarImage src={dummyStudent.avatarUrl} alt={dummyStudent.name} />
              <AvatarFallback>{dummyStudent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">{dummyStudent.name}</CardTitle>
              <CardDescription className="text-md">{dummyStudent.studentId}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p><strong className="text-muted-foreground">Email:</strong> {dummyStudent.email}</p>
            <p><strong className="text-muted-foreground">Major:</strong> {dummyStudent.major}</p>
          </div>
          <div className="flex md:justify-end items-start">
            <Button variant="outline">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <CalendarCheck className="mr-3 h-7 w-7" /> My Counseling Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingAppointment ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading appointment status...</span>
            </div>
          ) : bookedAppointment ? (
            <div className="space-y-4">
              {getAppointmentStatusPill(bookedAppointment.status)}
              {(bookedAppointment.status === "ConfirmedByCounselor" || bookedAppointment.status === "Upcoming") && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Video className="mr-2 h-4 w-4" /> Join Virtual Session (Link available soon)
                  </Button>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <XCircle className="mr-2 h-4 w-4" /> Cancel Appointment
                  </Button>
                </div>
              )}
               {bookedAppointment.status === "PendingConfirmation" && (
                 <p className="text-xs text-muted-foreground text-center">You will be notified once your counselor confirms the appointment. You can also check back here for updates.</p>
               )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg mb-3">You have no upcoming appointments.</p>
              <Button asChild>
                <Link href="/mental-health/schedule">
                  <PlusCircle className="mr-2 h-4 w-4" /> Schedule an Appointment
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <CardTitle className="text-2xl font-bold text-primary">
                        My Reported Incidents
                    </CardTitle>
                    <CardDescription>
                        Track the status of your submitted reports. Click a report to view details.
                    </CardDescription>
                </div>
                <Button asChild variant="default">
                    <Link href="/report/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Report New Incident
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            {isLoadingReports ? (
               <div className="flex justify-center items-center py-10">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading reports...</span>
              </div>
            ) : reports.length === 0 ? (
            <div className="text-center py-10">
                <p className="text-muted-foreground text-lg">You haven't submitted any reports yet.</p>
                <Button asChild variant="link" className="mt-2">
                <Link href="/report/new">Report an incident now</Link>
                </Button>
            </div>
            ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) => (
                 <Link key={report.id} href={`/report/${report.id}`} className="block hover:no-underline">
                    <ReportCard report={report} />
                  </Link>
                ))}
            </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
