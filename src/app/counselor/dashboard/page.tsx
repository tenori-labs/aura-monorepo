
// src/app/counselor/dashboard/page.tsx
"use client";

import type { Counselor, BookedAppointment, CounselorTimeSlot } from "@/lib/types";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link"; // Import Link
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays, startOfDay, subDays, setHours, setMinutes, isBefore, eachDayOfInterval, endOfWeek, startOfWeek, isSameDay, isPast, parse } from "date-fns";
import { UserCircle, CalendarClock, ListChecks, Check, X, Edit, Loader2, Settings2, Clock4, Users2, CheckCircle, XCircle, CalendarDays, AlertTriangle, ChevronLeft, ChevronRight, Trash2, Brain, MessageSquare, Video, History, CheckSquare, Edit2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Dummy counselor data - assume counselor "c1" (Dr. Emily Carter) is logged in
const loggedInCounselorId = "c1";

const dummyCounselorsData: Counselor[] = [
  {
    id: "c1",
    name: "Dr. Emily Carter",
    specialty: "Stress & Anxiety Management",
    email: "emily.carter@example.com",
    office: "Wellbeing Center, Room 101",
    avatarUrl: "https://placehold.co/80x80/a5b4fc/1e293b.png",
    unavailableSlots: { // Slots Dr. Carter has blocked for herself
      [format(addDays(new Date(), 1), "yyyy-MM-dd")]: [
        { id: `c1-unavailable-${format(addDays(new Date(), 1), "yyyyMMdd")}-1300`, time: "01:00 PM" },
        { id: `c1-unavailable-${format(addDays(new Date(), 1), "yyyyMMdd")}-1330`, time: "01:30 PM" },
      ],
      [format(addDays(new Date(), 2), "yyyy-MM-dd")]: [
        { id: `c1-unavailable-${format(addDays(new Date(), 2), "yyyyMMdd")}-1000`, time: "10:00 AM" },
      ],
    },
  },
];

// MUTABLE DUMMY DATA for simulating updates across components (Mental Health Chat <-> Counselor)
// In a real app, this would be a proper state management solution or backend.
export let globalDummyAppointments: BookedAppointment[] = [
    // Alex Student - Current appointment - Pending
    {
        id: "appt-1-alex-pending", studentId: "s123", studentName: "Alex Student",
        counselorId: "c1", counselorName: "Dr. Emily Carter", counselorSpecialty: "Stress & Anxiety Management",
        appointmentDate: format(addDays(new Date(), 1), "yyyy-MM-dd"), appointmentTime: "09:00 AM",
        status: "PendingConfirmation", bookingDate: new Date().toISOString(),
        studentNotes: "Feeling overwhelmed with upcoming exams.",
        auraRiskAssessment: "At Risk",
        auraChatSummary: "Alex engaged with Aura discussing exam stress and feelings of inadequacy. Aura noted increased anxiety markers and provided initial coping strategies. Student mentioned difficulty sleeping. No direct safety concerns expressed, but monitoring recommended.",
        counselorInstructionsForAura: "Check in with Alex about exam stress before our session. Remind about mindfulness exercises.",
        auraObservationsForCounselor: "Aura: Alex seems receptive to discussing stress.",
        meetingLink: `https://meet.example.com/session/appt-1-alex-pending-${Date.now().toString().slice(-5)}`
    },
    // Alex Student - Past completed appointment
    {
        id: "appt-alex-past-1-completed", studentId: "s123", studentName: "Alex Student",
        counselorId: "c1", counselorName: "Dr. Emily Carter", counselorSpecialty: "Stress & Anxiety Management",
        appointmentDate: format(subDays(new Date(), 7), "yyyy-MM-dd"), appointmentTime: "10:00 AM",
        status: "Completed", bookingDate: subDays(new Date(), 8).toISOString(),
        counselorNotes: "Productive session. Alex is working on coping mechanisms for exam anxiety. Follow-up suggested in 2 weeks to check on progress with study habits.",
        auraObservationsForCounselor: "Session completed. Student reported feeling more prepared. Seems to be using mindfulness techniques discussed.",
        auraChatSummary: "Post-session: Aura had a brief check-in. Alex reported applying one technique and found it helpful.",
        auraRiskAssessment: "No Risk",
    },
    // Alex Student - Past cancelled appointment
    {
        id: "appt-alex-past-2-cancelled", studentId: "s123", studentName: "Alex Student",
        counselorId: "c1", counselorName: "Dr. Emily Carter", counselorSpecialty: "Stress & Anxiety Management",
        appointmentDate: format(subDays(new Date(), 14), "yyyy-MM-dd"), appointmentTime: "11:00 AM",
        status: "CancelledByStudent", bookingDate: subDays(new Date(), 15).toISOString(),
        counselorNotes: "Student cancelled due to unforeseen circumstances. Suggested rebooking when available.",
        auraRiskAssessment: "No Risk",
    },
    {
        id: "appt-2-jane-confirmed", studentId: "s456", studentName: "Jane Doe",
        counselorId: "c1", counselorName: "Dr. Emily Carter", counselorSpecialty: "Stress & Anxiety Management",
        appointmentDate: format(addDays(new Date(), 1), "yyyy-MM-dd"), appointmentTime: "10:30 AM",
        status: "ConfirmedByCounselor", bookingDate: subDays(new Date(),1).toISOString(),
        counselorNotes: "Discuss coping strategies for anxiety.",
        auraRiskAssessment: "No Risk",
        auraChatSummary: "Jane used Aura for a brief check-in. Reported feeling generally well but sought tips for maintaining a positive outlook during a busy semester. Aura provided positive affirmations and resource links.",
        counselorInstructionsForAura: "Ask Jane if she found the positive affirmation exercises helpful.",
        meetingLink: `https://meet.example.com/session/appt-2-jane-confirmed-${Date.now().toString().slice(-5)}`
    },
     {
        id: "appt-sam-pending", studentId: "s009", studentName: "Sam Pending",
        counselorId: "c1", counselorName: "Dr. Emily Carter", counselorSpecialty: "Stress & Anxiety Management",
        appointmentDate: format(addDays(new Date(), 2), "yyyy-MM-dd"), appointmentTime: "11:30 AM",
        status: "PendingConfirmation", bookingDate: subDays(new Date(),1).toISOString(),
        studentNotes: "Need guidance on study habits and focus techniques.",
        auraRiskAssessment: "No Risk",
    },
    {
        id: "appt-mike-past-completed", studentId: "s789", studentName: "Mike Ross",
        counselorId: "c1", counselorName: "Dr. Emily Carter", counselorSpecialty: "Stress & Anxiety Management",
        appointmentDate: format(subDays(new Date(), 2), "yyyy-MM-dd"), appointmentTime: "02:00 PM",
        status: "Completed", bookingDate: subDays(new Date(),3).toISOString(),
        counselorNotes: "Good progress. Mike seems to be managing stress better by implementing a structured daily routine. Discussed time management strategies for upcoming project deadlines. He seemed receptive.",
        auraObservationsForCounselor: "Session completed. Student reported improvement in stress levels.",
    },
    {
        id: "appt-chris-pending-high-risk", studentId: "s007", studentName: "Chris P. Bacon",
        counselorId: "c1", counselorName: "Dr. Emily Carter", counselorSpecialty: "Stress & Anxiety Management",
        appointmentDate: format(addDays(new Date(), 2), "yyyy-MM-dd"), appointmentTime: "02:00 PM",
        status: "PendingConfirmation", bookingDate: subDays(new Date(),2).toISOString(),
        studentNotes: "Need to discuss some personal issues urgently.",
        auraRiskAssessment: "High Risk",
        auraChatSummary: "Chris's interaction with Aura was concerning. Student expressed feelings of hopelessness and isolation, and alluded to 'not wanting to be here anymore.' Aura immediately provided crisis hotline information (988) and strongly urged seeking professional help. This case requires urgent attention.",
        counselorInstructionsForAura: "URGENT: Monitor Chris for any further expressions of hopelessness. Ensure he is aware of crisis resources. Prioritize this appointment. If Aura senses escalation, alert campus security via established protocol.",
    },
     {
        id: "appt-patty-confirmed", studentId: "s008", studentName: "Patty O'Furniture",
        counselorId: "c1", counselorName: "Dr. Emily Carter", counselorSpecialty: "Stress & Anxiety Management",
        appointmentDate: format(addDays(new Date(), 3), "yyyy-MM-dd"), appointmentTime: "11:00 AM",
        status: "ConfirmedByCounselor", bookingDate: subDays(new Date(),1).toISOString(),
        auraRiskAssessment: "At Risk",
        auraChatSummary: "Patty discussed relationship difficulties with Aura. Expressed sadness and frustration. Aura listened empathetically and suggested resources for conflict resolution and emotional support.",
        meetingLink: `https://meet.example.com/session/appt-patty-confirmed-${Date.now().toString().slice(-5)}`
    }
].sort((a,b) => parseISO(a.appointmentDate).getTime() - parseISO(b.appointmentDate).getTime() || a.appointmentTime.localeCompare(b.appointmentTime));


// Generates all 30-minute slots for a given day (from 9 AM to 9 PM)
const generateWorkingTimeSlotsForDay = (date: Date): CounselorTimeSlot[] => {
    const slots: CounselorTimeSlot[] = [];
    const startHour = 9; // 9 AM
    const endHour = 21; // 9 PM (last slot starts 8:30 PM)

    for (let hour = startHour; hour < endHour; hour++) {
        slots.push({
            time: format(setMinutes(setHours(date, hour), 0), "hh:mm a"), // e.g., 09:00 AM
            id: `${format(date, "yyyy-MM-dd")}-${format(setMinutes(setHours(date, hour), 0), "HHmm")}`
        });
        slots.push({
            time: format(setMinutes(setHours(date, hour), 30), "hh:mm a"), // e.g., 09:30 AM
            id: `${format(date, "yyyy-MM-dd")}-${format(setMinutes(setHours(date, hour), 30), "HHmm")}`
        });
    }
    return slots;
};


export default function CounselorDashboardPage() {
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>(globalDummyAppointments.filter(app => app.counselorId === loggedInCounselorId));
  const [manuallyBlockedSlotsByDate, setManuallyBlockedSlotsByDate] = useState<Record<string, CounselorTimeSlot[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [selectedAppointmentForModal, setSelectedAppointmentForModal] = useState<BookedAppointment | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");

  const [selectedAppointmentForInsights, setSelectedAppointmentForInsights] = useState<BookedAppointment | null>(null);
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
  const [auraInstructionsInput, setAuraInstructionsInput] = useState("");


  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const foundCounselor = dummyCounselorsData.find(c => c.id === loggedInCounselorId);
      if (foundCounselor) {
        setCounselor(foundCounselor);
        setManuallyBlockedSlotsByDate(JSON.parse(JSON.stringify(foundCounselor.unavailableSlots || {})));
        // Filter globalDummyAppointments for the logged-in counselor
        setBookedAppointments(globalDummyAppointments.filter(app => app.counselorId === loggedInCounselorId)
          .sort((a,b) => parseISO(a.appointmentDate).getTime() - parseISO(b.appointmentDate).getTime() || a.appointmentTime.localeCompare(b.appointmentTime)));
      }
      setIsLoading(false);
    }, 1000);
  }, []);


  const handleToggleManualBlock = useCallback((date: Date, slotToToggle: CounselorTimeSlot, block: boolean) => {
    const dateString = format(date, "yyyy-MM-dd");
    setManuallyBlockedSlotsByDate(prevBlocked => {
      const newBlocked = { ...prevBlocked };
      const slotsForDay = newBlocked[dateString] ? [...newBlocked[dateString]] : [];
      const existingSlotIndex = slotsForDay.findIndex(s => s.time === slotToToggle.time);

      if (block) {
        if (existingSlotIndex === -1) {
          slotsForDay.push({ time: slotToToggle.time, id: slotToToggle.id });
          toast({ title: "Slot Blocked", description: `Slot ${slotToToggle.time} on ${format(date, "PPP")} is now manually blocked (Out of Office).` });
        }
      } else {
        if (existingSlotIndex !== -1) {
          slotsForDay.splice(existingSlotIndex, 1);
          toast({ title: "Slot Unblocked", description: `Slot ${slotToToggle.time} on ${format(date, "PPP")} is now available (unless booked).` });
        }
      }
      if (slotsForDay.length > 0) {
        newBlocked[dateString] = slotsForDay.sort((a,b) => a.time.localeCompare(b.time));
      } else {
        delete newBlocked[dateString];
      }
      return newBlocked;
    });
  }, [toast]);

  const handleAppointmentAction = (appointmentId: string, newStatus: BookedAppointment['status'], notes?: string) => {
    const updatedAppointments = bookedAppointments.map(app => {
      if (app.id === appointmentId) {
        const updatedApp = { ...app, status: newStatus, counselorNotes: notes || app.counselorNotes, bookingDate: new Date().toISOString() };
        if (newStatus === "ConfirmedByCounselor" && !updatedApp.meetingLink) {
          updatedApp.meetingLink = `https://meet.example.com/session/${appointmentId}-${Date.now().toString().slice(-5)}`;
        }
        const globalIndex = globalDummyAppointments.findIndex(gApp => gApp.id === appointmentId);
        if (globalIndex > -1) globalDummyAppointments[globalIndex] = updatedApp;
        return updatedApp;
      }
      return app;
    });
    setBookedAppointments(updatedAppointments);
    
    toast({ title: "Appointment Updated", description: `Appointment ${appointmentId} status changed to ${newStatus.replace(/([A-Z])/g, ' $1').trim()}.` });
    if (isRescheduleModalOpen) setIsRescheduleModalOpen(false);
    setSelectedAppointmentForModal(null); 
  };

  const openRescheduleDialog = (appointment: BookedAppointment) => {
    setSelectedAppointmentForModal(appointment);
    setRescheduleReason(appointment.counselorNotes || "");
    setIsRescheduleModalOpen(true);
  };

  const openInsightsModal = (appointment: BookedAppointment) => {
    setSelectedAppointmentForInsights(appointment);
    setAuraInstructionsInput(appointment.counselorInstructionsForAura || "");
    setIsInsightsModalOpen(true);
  };

  const handleUpdateAuraInstructions = () => {
    if (!selectedAppointmentForInsights) return;
    const appointmentId = selectedAppointmentForInsights.id;
    const updatedAppointments = bookedAppointments.map(app =>
      app.id === appointmentId ? { ...app, counselorInstructionsForAura: auraInstructionsInput } : app
    );
    setBookedAppointments(updatedAppointments);
    const globalIndex = globalDummyAppointments.findIndex(gApp => gApp.id === appointmentId);
    if (globalIndex > -1) globalDummyAppointments[globalIndex].counselorInstructionsForAura = auraInstructionsInput;

    toast({ title: "Aura Instructions Updated", description: `Instructions for Aura regarding ${selectedAppointmentForInsights.studentName} have been saved.` });
  };


  const getStatusBadgeVariant = (status: BookedAppointment['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "PendingConfirmation": return "secondary"; 
      case "ConfirmedByCounselor": case "Upcoming": return "default"; 
      case "RescheduleProposedByCounselor": case "RescheduleProposedByStudent": return "outline"; 
      case "CancelledByCounselor": case "CancelledByStudent": return "destructive"; 
      case "Completed": return "outline"; 
      default: return "default";
    }
  };

  const getRiskAssessmentBadgeVariant = (risk?: BookedAppointment['auraRiskAssessment']): "default" | "secondary" | "destructive" => {
    if (risk === "High Risk") return "destructive";
    if (risk === "At Risk") return "secondary"; 
    return "default"; 
  };

  const studentHistoryForModal = useMemo(() => {
    if (!selectedAppointmentForInsights) return [];
    return bookedAppointments.filter(app => 
        app.studentId === selectedAppointmentForInsights.studentId &&
        app.id !== selectedAppointmentForInsights.id && 
        (isPast(parseISO(app.appointmentDate)) || ["Completed", "CancelledByStudent", "CancelledByCounselor"].includes(app.status))
    ).sort((a,b) => parseISO(b.appointmentDate).getTime() - parseISO(a.appointmentDate).getTime());
  }, [bookedAppointments, selectedAppointmentForInsights]);

  const pendingAppointments = useMemo(() => {
    return bookedAppointments.filter(app => app.status === "PendingConfirmation" && !isPast(parseISO(app.appointmentDate)));
  }, [bookedAppointments]);


  if (isLoading || !counselor) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading Counselor Dashboard...</span>
      </div>
    );
  }

  const potentialSlotsForSelectedDay = generateWorkingTimeSlotsForDay(selectedDate);
  const selectedDateString = format(selectedDate, "yyyy-MM-dd");
  const manuallyBlockedForSelectedDay = manuallyBlockedSlotsByDate[selectedDateString] || [];

  const handleDayNavigation = (days: number) => {
    setSelectedDate(prev => startOfDay(addDays(prev, days)));
  };


  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8">
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 border-2 border-primary" data-ai-hint="counselor avatar">
              <AvatarImage src={counselor.avatarUrl} alt={counselor.name} />
              <AvatarFallback>{counselor.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-bold text-primary">{counselor.name}</CardTitle>
              <CardDescription className="text-md">{counselor.specialty}</CardDescription>
              <p className="text-xs text-muted-foreground">{counselor.email} | {counselor.office}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <CalendarClock className="mr-3 h-7 w-7" /> Manage Availability &amp; Daily Schedule
          </CardTitle>
          <CardDescription>
            Select a date to view your schedule (9 AM - 9 PM). Click available slots to mark them as Out of Office (manually blocked).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="p-2 border rounded-md bg-background w-full md:w-auto">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(startOfDay(date))}
                initialFocus
                className="shadow-sm"
                 disabled={(date) => isBefore(date, startOfDay(new Date())) && !isSameDay(date, startOfDay(new Date()))} 
              />
                <Button variant="outline" className="w-full mt-4" onClick={() => toast({title: "Feature Coming Soon", description: "Full working hours configuration will be available in a future update."})}>
                  <Settings2 className="mr-2 h-4 w-4" /> Edit Full Working Hours (Soon)
                </Button>
            </div>

            <div className="flex-1 space-y-3 min-w-0 border rounded-lg p-4 bg-muted/10">
              <div className="flex justify-between items-center mb-3">
                <Button variant="outline" size="icon" onClick={() => handleDayNavigation(-1)} disabled={isBefore(addDays(selectedDate, -1), startOfDay(new Date())) && !isSameDay(addDays(selectedDate, -1), startOfDay(new Date()))}><ChevronLeft className="h-4 w-4"/></Button>
                <h3 className="text-xl font-semibold text-center">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </h3>
                <Button variant="outline" size="icon" onClick={() => handleDayNavigation(1)}><ChevronRight className="h-4 w-4"/></Button>
              </div>
              
              <ScrollArea className="h-[500px] border rounded-md p-1 bg-background">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-0.5">
                  {potentialSlotsForSelectedDay.map(slot => {
                    const currentDateTimeForSlot = parseISO(`${selectedDateString}T${format(parse(slot.time, "hh:mm a", new Date()), "HH:mm")}`);
                    const isPastSlot = isBefore(currentDateTimeForSlot, new Date()) && !isSameDay(selectedDate, new Date());
                    
                    const appointmentInSlot = bookedAppointments.find(app =>
                        app.counselorId === counselor.id &&
                        app.appointmentDate === selectedDateString &&
                        app.appointmentTime === slot.time &&
                        app.status !== "CancelledByStudent" && 
                        app.status !== "CancelledByCounselor" &&
                        app.status !== "Completed" 
                    );
                    const isManuallyBlocked = manuallyBlockedForSelectedDay.some(bs => bs.time === slot.time);
                    
                    let slotContent;
                    let slotClasses = "p-2 text-xs text-left w-full h-[60px] flex flex-col items-start justify-center rounded-md"; 
                    let onClickAction = () => {};
                    let disabledInteraction = isPastSlot;

                    if (appointmentInSlot) {
                      slotClasses += " bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700";
                      disabledInteraction = true; 
                      slotContent = (
                        <>
                          <span className="font-semibold text-sm">{slot.time}</span>
                          <span className="text-xs truncate max-w-[90%] font-medium">{appointmentInSlot.studentName}</span>
                          <Badge variant={getStatusBadgeVariant(appointmentInSlot.status)} className="mt-0.5 text-[9px] px-1 py-0 leading-tight self-start">
                            {appointmentInSlot.status.replace(/([A-Z])/g, ' $1').trim()}
                          </Badge>
                          {appointmentInSlot.meetingLink && (appointmentInSlot.status === "ConfirmedByCounselor" || appointmentInSlot.status === "Upcoming") && !isPastSlot && (
                             <a href={appointmentInSlot.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-0.5 flex items-center" onClick={(e) => e.stopPropagation()}>
                                <Video className="h-3 w-3 mr-1"/> Join
                             </a>
                          )}
                           {appointmentInSlot.status === "PendingConfirmation" && !isPastSlot && (
                            <div className="flex gap-1 mt-1 self-start items-center">
                                <Button variant="ghost" size="sm" className="h-5 px-1 py-0 text-green-600 hover:bg-green-100" onClick={(e) => {e.stopPropagation(); handleAppointmentAction(appointmentInSlot.id, "ConfirmedByCounselor");}}> <CheckSquare className="h-3 w-3 mr-1"/> Accept </Button>
                                <Button variant="ghost" size="sm" className="h-5 px-1 py-0 text-red-600 hover:bg-red-100" onClick={(e) => {e.stopPropagation(); handleAppointmentAction(appointmentInSlot.id, "CancelledByCounselor", "Declined by counselor.");}}> <XCircle className="h-3 w-3 mr-1"/> Decline </Button>
                            </div>
                          )}
                        </>
                      );
                    } else if (isManuallyBlocked) {
                      slotClasses += " bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700";
                      onClickAction = disabledInteraction ? () => {} : () => handleToggleManualBlock(selectedDate, slot, false);
                      slotContent = (
                        <>
                          <span className="font-semibold text-sm">{slot.time}</span>
                          <div className="flex items-center text-xs">
                            <XCircle className="h-3 w-3 mr-1 opacity-70"/> Out of Office
                          </div>
                        </>
                      );
                    } else { 
                      slotClasses += " bg-green-50 dark:bg-green-800/20 hover:bg-green-100 dark:hover:bg-green-800/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-600";
                      onClickAction = disabledInteraction ? () => {} : () => handleToggleManualBlock(selectedDate, slot, true);
                      slotContent = (
                        <>
                         <span className="font-semibold text-sm">{slot.time}</span>
                         {!disabledInteraction && <CheckCircle className="h-3 w-3 mt-0.5 opacity-70 text-green-600"/>}
                        </>
                      );
                    }

                    return (
                      <div key={slot.id} className="py-0.5 px-0.5">
                        <Button
                          variant="outline"
                          className={slotClasses}
                          onClick={onClickAction}
                          disabled={disabledInteraction}
                          aria-label={`Slot ${slot.time}`}
                        >
                          {slotContent}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <ListChecks className="mr-3 h-7 w-7" /> Active Appointment Requests
          </CardTitle>
          <CardDescription>
            Review and act on student appointment requests. Click student name for full insights and history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingAppointments.length > 0 ? (
            <div className="space-y-4">
              {pendingAppointments.map((app) => (
                <Card key={app.id} className="p-4 border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-grow">
                       <Link href={`/counselor/student/${app.studentId}?appointmentId=${app.id}`} passHref>
                        <Button variant="link" className="p-0 h-auto text-lg font-semibold hover:underline text-primary">
                            {app.studentName}
                        </Button>
                       </Link>
                      <p className="text-sm text-muted-foreground">
                        Proposed: {format(parseISO(app.appointmentDate), "PPP")} at {app.appointmentTime}
                      </p>
                       <p className="text-xs text-muted-foreground mt-1">Booked on: {format(parseISO(app.bookingDate), "PPP p")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center shrink-0 sm:ml-auto">
                         <Button variant="default" size="sm" onClick={() => handleAppointmentAction(app.id, "ConfirmedByCounselor")} className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 py-1">
                            <CheckSquare className="mr-1 h-3 w-3" /> Accept
                        </Button>
                         <Button variant="destructive" size="sm" onClick={() => handleAppointmentAction(app.id, "CancelledByCounselor", "Declined by counselor.")} className="h-7 px-2 py-1">
                            <XCircle className="mr-1 h-3 w-3" /> Decline
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openRescheduleDialog(app)} className="h-7 px-2 py-1">
                            <Edit2 className="mr-1 h-3 w-3" /> Reschedule
                        </Button>
                    </div>
                  </div>
                   {app.studentNotes && (
                    <div className="mt-3 pt-2 border-t border-muted/30">
                        <p className="text-xs font-medium text-muted-foreground">Student Notes:</p>
                        <p className="text-sm italic whitespace-pre-wrap">"{app.studentNotes}"</p>
                    </div>
                    )}
                     {app.auraRiskAssessment && (
                        <div className="mt-2 flex items-center">
                            <Brain className="h-4 w-4 mr-1 text-primary" />
                            <div className="text-xs">
                                <span className="mr-1">Aura Assessment:</span>
                                <Badge variant={getRiskAssessmentBadgeVariant(app.auraRiskAssessment)} className="text-[10px] align-middle">{app.auraRiskAssessment}</Badge>
                            </div>
                        </div>
                    )}
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No active appointment requests at this time.</p>
          )}
        </CardContent>
      </Card>

      {selectedAppointmentForModal && (
        <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Propose Reschedule for {selectedAppointmentForModal.studentName}</DialogTitle>
              <DialogDescription>
                Current: {format(parseISO(selectedAppointmentForModal.appointmentDate), "PPP")} at {selectedAppointmentForModal.appointmentTime}.
                Provide a reason for rescheduling. The student will be notified. (Full rescheduling to a new slot is a future feature).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="rescheduleReason">Reason / Message to Student</Label>
              <Textarea
                id="rescheduleReason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g., Unexpected conflict. Please re-book or I will suggest alternatives."
              />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={() => {
                  if (selectedAppointmentForModal) {
                      handleAppointmentAction(selectedAppointmentForModal.id, "RescheduleProposedByCounselor", rescheduleReason);
                  }
              }}>
                Propose Reschedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedAppointmentForInsights && (
        <Dialog open={isInsightsModalOpen} onOpenChange={(isOpen) => {
            setIsInsightsModalOpen(isOpen);
            if (!isOpen) setSelectedAppointmentForInsights(null); 
        }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Brain className="mr-2 h-5 w-5 text-primary" />
                        Student Insights: {selectedAppointmentForInsights.studentName}
                    </DialogTitle>
                    <DialogDescription>
                        Review AI-assisted insights, Aura engagement, and appointment history.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
                    <div className="py-4 space-y-6 pr-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-md font-semibold text-primary flex items-center"><MessageSquare className="mr-2 h-4 w-4"/>Aura Engagement</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Aura's Predicted Mental Health Status:</h4>
                                    <Badge variant={getRiskAssessmentBadgeVariant(selectedAppointmentForInsights.auraRiskAssessment)}>
                                        {selectedAppointmentForInsights.auraRiskAssessment || "Not Assessed"}
                                    </Badge>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Conversation Summary with Aura:</h4>
                                    {selectedAppointmentForInsights.auraChatSummary ? (
                                        <Card className="bg-muted/30 p-2 border text-[11px]">
                                            <ScrollArea className="h-full max-h-24">
                                                <p className="whitespace-pre-wrap">{selectedAppointmentForInsights.auraChatSummary}</p>
                                            </ScrollArea>
                                        </Card>
                                    ) : (
                                        <p className="text-muted-foreground">No chat summary available.</p>
                                    )}
                                </div>
                                <div className="border-t pt-3 mt-3 space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Aura Post-Session Engagement Instructions:</h4>
                                    <Textarea
                                        id="auraInstructions"
                                        value={auraInstructionsInput}
                                        onChange={(e) => setAuraInstructionsInput(e.target.value)}
                                        placeholder="e.g., Remind about medication at 2 PM daily."
                                        className="min-h-[60px] text-xs"
                                    />
                                    <Button onClick={handleUpdateAuraInstructions} size="sm" variant="outline" className="text-xs">
                                        Update Aura Instructions
                                    </Button>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Aura's Observations (based on your instructions):</h4>
                                    {selectedAppointmentForInsights.auraObservationsForCounselor ? (
                                        <Card className="bg-blue-50 dark:bg-blue-900/20 p-2 border border-blue-200 dark:border-blue-700 text-[11px]">
                                            <p className="whitespace-pre-wrap">{selectedAppointmentForInsights.auraObservationsForCounselor}</p>
                                        </Card>
                                    ) : (
                                        <p className="text-muted-foreground">No specific observations from Aura yet.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-md font-semibold text-primary flex items-center"><History className="mr-2 h-4 w-4"/>Appointment History</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs">
                                {studentHistoryForModal.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {studentHistoryForModal.map(histApp => (
                                            <div key={histApp.id} className="p-2 border rounded-md bg-muted/40">
                                                <p><strong>Date:</strong> {format(parseISO(histApp.appointmentDate), "PPP")} at {histApp.appointmentTime}</p>
                                                <p><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(histApp.status)} className="text-[10px]">{histApp.status.replace(/([A-Z])/g, ' $1').trim()}</Badge></p>
                                                {histApp.counselorNotes && histApp.status === "Completed" && (
                                                    <p className="text-muted-foreground mt-1 text-[11px] italic">Notes: {histApp.counselorNotes.substring(0,100)}{histApp.counselorNotes.length > 100 ? "..." : ""}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">No prior appointment history found for this student.</p>
                                )}
                            </CardContent>
                        </Card>

                        <div className="text-xs text-muted-foreground italic pt-4 border-t mt-4">
                            <p><strong>Reminder:</strong> This information is a supplementary tool. Summaries and history aim to provide context while respecting student privacy.</p>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="mt-2">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
