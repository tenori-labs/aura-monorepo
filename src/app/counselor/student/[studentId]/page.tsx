// src/app/counselor/student/[studentId]/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { BookedAppointment, StudentProfile } from '@/lib/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Brain,
  MessageSquare,
  History,
  UserCircle,
  CalendarDays,
  Edit,
  Save,
  Loader2,
} from 'lucide-react';
import { format, parseISO, isPast, addDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { globalDummyAppointments } from '@/app/counselor/dashboard/page'; // Import the shared dummy data

// Dummy data source - in a real app, this would be fetched from a backend
const dummyStudentProfiles: StudentProfile[] = [
  {
    id: 's123',
    name: 'Alex Student',
    email: 'alex.student@example.com',
    avatarUrl: 'https://placehold.co/100x100/c7d2fe/312e81.png',
  },
  {
    id: 's456',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    avatarUrl: 'https://placehold.co/100x100/fecdd3/881337.png',
  },
  {
    id: 's789',
    name: 'Mike Ross',
    email: 'mike.ross@example.com',
    avatarUrl: 'https://placehold.co/100x100/fed7aa/7c2d12.png',
  },
  {
    id: 's007',
    name: 'Chris P. Bacon',
    email: 'chris.bacon@example.com',
    avatarUrl: 'https://placehold.co/100x100/bbf7d0/14532d.png',
  },
  {
    id: 's008',
    name: "Patty O'Furniture",
    email: 'patty.ofurniture@example.com',
    avatarUrl: 'https://placehold.co/100x100/e9d5ff/581c87.png',
  },
  {
    id: 's009',
    name: 'Sam Pending',
    email: 'sam.pending@example.com',
    avatarUrl: 'https://placehold.co/100x100/fecaca/991b1b.png',
  },
];

// Re-using globalDummyAppointments for consistency, but ensuring it's available.
// The data structure is defined in dashboard page and imported here.
// This means changes to auraInstructions in globalDummyAppointments on one page
// will be reflected on the other, simulating a shared backend for this prototype.

const getStatusBadgeVariant = (
  status: BookedAppointment['status']
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'PendingConfirmation':
      return 'secondary';
    case 'ConfirmedByCounselor':
    case 'Upcoming':
      return 'default';
    case 'Completed':
      return 'outline';
    case 'CancelledByStudent':
    case 'CancelledByCounselor':
      return 'destructive';
    default:
      return 'default';
  }
};

const getRiskAssessmentBadgeVariant = (
  risk?: BookedAppointment['auraRiskAssessment']
): 'default' | 'secondary' | 'destructive' => {
  if (risk === 'High Risk') return 'destructive';
  if (risk === 'At Risk') return 'secondary';
  return 'default';
};

export default function CounselorStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const studentId = typeof params.studentId === 'string' ? params.studentId : undefined;

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [appointments, setAppointments] = useState<BookedAppointment[]>([]); // All appts for this student with this counselor
  const [currentAuraInstructions, setCurrentAuraInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);

  // In a real app, 'loggedInCounselorId' would come from auth context
  const loggedInCounselorId = 'c1';

  useEffect(() => {
    setIsLoading(true);
    if (studentId) {
      // Simulate fetching data
      setTimeout(() => {
        const profile = dummyStudentProfiles.find((p) => p.id === studentId);
        setStudentProfile(profile || null);

        const studentAppointments = globalDummyAppointments
          .filter(
            // Use imported global data
            (app) => app.studentId === studentId && app.counselorId === loggedInCounselorId
          )
          .sort(
            (a, b) =>
              parseISO(b.appointmentDate).getTime() - parseISO(a.appointmentDate).getTime() ||
              b.appointmentTime.localeCompare(a.appointmentTime)
          ); // most recent first

        setAppointments(studentAppointments);

        // Find the next upcoming or pending appointment to load existing Aura instructions
        const nextRelevantAppointment = studentAppointments.find(
          (app) =>
            !isPast(parseISO(app.appointmentDate)) &&
            (app.status === 'PendingConfirmation' ||
              app.status === 'ConfirmedByCounselor' ||
              app.status === 'Upcoming')
        );
        setCurrentAuraInstructions(nextRelevantAppointment?.counselorInstructionsForAura || '');

        if (!profile) {
          toast({ title: 'Student Not Found', variant: 'destructive' });
          // router.push("/counselor/dashboard"); // Optionally redirect
        }
        setIsLoading(false);
      }, 500);
    } else {
      setIsLoading(false);
    }
  }, [studentId, router, toast, loggedInCounselorId]);

  const handleSaveAuraInstructions = () => {
    if (!studentId) return;
    setIsSavingInstructions(true);

    console.log(`Saving Aura instructions for student ${studentId}:`, currentAuraInstructions);

    // Update the local dummy data for the student's appointments.
    // This updates the shared globalDummyAppointments array.
    const updatedAppointments = appointments.map((app) => {
      if (
        !isPast(parseISO(app.appointmentDate)) &&
        (app.status === 'PendingConfirmation' ||
          app.status === 'ConfirmedByCounselor' ||
          app.status === 'Upcoming')
      ) {
        return { ...app, counselorInstructionsForAura: currentAuraInstructions };
      }
      return app;
    });
    setAppointments(updatedAppointments);

    // Also update the global-like dummy data for other parts of the app to see
    globalDummyAppointments.forEach((app, index) => {
      if (
        app.studentId === studentId &&
        app.counselorId === loggedInCounselorId &&
        !isPast(parseISO(app.appointmentDate)) &&
        (app.status === 'PendingConfirmation' ||
          app.status === 'ConfirmedByCounselor' ||
          app.status === 'Upcoming')
      ) {
        globalDummyAppointments[index] = {
          ...app,
          counselorInstructionsForAura: currentAuraInstructions,
        };
      }
    });

    setTimeout(() => {
      toast({
        title: 'Aura Instructions Updated',
        description: 'Aura will use these instructions for future interactions with the student.',
      });
      setIsSavingInstructions(false);
    }, 1000);
  };

  const upcomingOrCurrentAppointment = useMemo(() => {
    return appointments.find(
      (app) =>
        !isPast(parseISO(app.appointmentDate)) &&
        (app.status === 'PendingConfirmation' ||
          app.status === 'ConfirmedByCounselor' ||
          app.status === 'Upcoming')
    );
  }, [appointments]);

  const pastAppointments = useMemo(() => {
    return appointments.filter(
      (app) =>
        isPast(parseISO(app.appointmentDate)) ||
        app.status === 'Completed' ||
        app.status === 'CancelledByStudent' ||
        app.status === 'CancelledByCounselor'
    );
  }, [appointments]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading student details...
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Student profile not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 border-2 border-primary" data-ai-hint="student avatar">
              <AvatarImage src={studentProfile.avatarUrl} alt={studentProfile.name} />
              <AvatarFallback>{studentProfile.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-bold text-primary">
                {studentProfile.name}
              </CardTitle>
              <CardDescription className="text-md">
                {studentProfile.id} - {studentProfile.email}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Aura Insights & Instructions */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary flex items-center">
              <Brain className="mr-2 h-5 w-5" /> Aura Engagement & Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingOrCurrentAppointment ? (
              <>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                    Aura's Predicted Mental Health Status:
                  </h4>
                  <Badge
                    variant={getRiskAssessmentBadgeVariant(
                      upcomingOrCurrentAppointment.auraRiskAssessment
                    )}
                  >
                    {upcomingOrCurrentAppointment.auraRiskAssessment || 'Not Assessed'}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                    Latest Conversation Summary with Aura:
                  </h4>
                  {upcomingOrCurrentAppointment.auraChatSummary ? (
                    <ScrollArea className="h-24 bg-stone-50 dark:bg-stone-900/30 p-2 border rounded-md text-xs">
                      <p className="whitespace-pre-wrap">
                        {upcomingOrCurrentAppointment.auraChatSummary}
                      </p>
                    </ScrollArea>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No recent chat summary with Aura.
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                    Aura's Observations (based on your instructions):
                  </h4>
                  {upcomingOrCurrentAppointment.auraObservationsForCounselor ? (
                    <ScrollArea className="h-20 bg-blue-50 dark:bg-blue-900/30 p-2 border border-blue-200 dark:border-blue-700 rounded-md text-xs">
                      <p className="whitespace-pre-wrap">
                        {upcomingOrCurrentAppointment.auraObservationsForCounselor}
                      </p>
                    </ScrollArea>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No specific observations from Aura yet.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No upcoming appointment data to show Aura insights.
              </p>
            )}

            <div className="pt-4 border-t">
              <Label
                htmlFor="aura-instructions"
                className="text-sm font-semibold text-muted-foreground block mb-1"
              >
                Instruct Aura for {studentProfile.name}:
              </Label>
              <Textarea
                id="aura-instructions"
                value={currentAuraInstructions}
                onChange={(e) => setCurrentAuraInstructions(e.target.value)}
                placeholder="e.g., Remind to take medication daily at 2 PM. Ask about sleep patterns. Encourage participation in study group."
                className="min-h-[100px]"
                disabled={isSavingInstructions}
              />
              <Button
                onClick={handleSaveAuraInstructions}
                className="mt-2"
                disabled={isSavingInstructions}
              >
                {isSavingInstructions ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSavingInstructions ? 'Saving...' : 'Save Instructions for Aura'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Aura will attempt to follow these instructions in its interactions with the student.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Appointment History */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary flex items-center">
              <History className="mr-2 h-5 w-5" /> Session History with You
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pastAppointments.length > 0 ? (
              <ScrollArea className="h-[360px] pr-3">
                {' '}
                {/* Adjusted height */}
                <div className="space-y-3">
                  {pastAppointments.map((app) => (
                    <Card key={app.id} className="p-3 bg-muted/30 border">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-semibold">
                          {format(parseISO(app.appointmentDate), 'PPP')} - {app.appointmentTime}
                        </p>
                        <Badge variant={getStatusBadgeVariant(app.status)} className="text-xs">
                          {app.status.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                      </div>
                      {app.counselorNotes && app.status === 'Completed' && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground">Your Notes:</p>
                          <p className="text-xs italic whitespace-pre-wrap bg-stone-50 dark:bg-stone-800 p-1.5 rounded border text-stone-700 dark:text-stone-300">
                            "{app.counselorNotes}"
                          </p>
                        </div>
                      )}
                      {app.auraRiskAssessment && (
                        <div className="text-xs mt-1">
                          <span>Aura Assessment: </span>
                          <Badge
                            variant={getRiskAssessmentBadgeVariant(app.auraRiskAssessment)}
                            className="text-[10px]"
                          >
                            {app.auraRiskAssessment}
                          </Badge>
                        </div>
                      )}
                      {app.auraChatSummary && (
                        <details className="mt-1 text-xs">
                          <summary className="cursor-pointer text-primary hover:underline">
                            Aura Chat Summary
                          </summary>
                          <p className="italic bg-stone-50 dark:bg-stone-800 p-1.5 rounded border text-stone-700 dark:text-stone-300 mt-0.5">
                            {app.auraChatSummary}
                          </p>
                        </details>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-8">
                No past appointment history with this student.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-xl mt-6">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary flex items-center">
            <CalendarDays className="mr-2 h-5 w-5" /> Student's Upcoming/Pending Appointments
          </CardTitle>
          <CardDescription>
            Overview of {studentProfile.name}'s non-past appointments with you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.filter(
            (app) =>
              !isPast(parseISO(app.appointmentDate)) &&
              app.status !== 'Completed' &&
              app.status !== 'CancelledByStudent' &&
              app.status !== 'CancelledByCounselor'
          ).length > 0 ? (
            <div className="space-y-3">
              {appointments
                .filter(
                  (app) =>
                    !isPast(parseISO(app.appointmentDate)) &&
                    app.status !== 'Completed' &&
                    app.status !== 'CancelledByStudent' &&
                    app.status !== 'CancelledByCounselor'
                )
                .map((app) => (
                  <Card key={app.id} className="p-4 border shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold">
                          {format(parseISO(app.appointmentDate), 'PPP')} at {app.appointmentTime}
                        </p>
                        <Badge variant={getStatusBadgeVariant(app.status)}>
                          {app.status.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                      </div>
                      {/* Add relevant action buttons here if needed, e.g., Reschedule, Cancel for upcoming */}
                    </div>
                    {app.studentNotes && (
                      <p className="text-xs mt-2 italic">Student notes: "{app.studentNotes}"</p>
                    )}
                  </Card>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No upcoming or pending appointments with this student.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
