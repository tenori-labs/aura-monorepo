
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Report, TimelineEvent } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, MapPin, UserCircle, ListChecks, Brain, FileText, Edit3, FileUp, Save, CheckSquare, Loader2, History } from 'lucide-react';
import { format, parseISO, subDays, subHours, addMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import AiClassifierResult from '@/components/report/AiClassifierResult';
import ReportTimeline from '@/components/report/ReportTimeline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Helper to get status badge variant
const getStatusVariant = (status: Report['status']): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Submitted': return 'default';
    case 'In Review': return 'secondary';
    case 'Resolved': return 'outline';
    case 'Closed': return 'destructive';
    default: return 'default';
  }
};

const statuses: Report['status'][] = ["Submitted", "In Review", "Resolved", "Closed"];

// Simplified dummy function for faculty report view
const getDummyReportByIdForFaculty = (id: string): Report | undefined => {
    if (!id) return undefined;
    const now = new Date();
    const numericIdPart = parseInt(id.replace('RPT-FAC-', '').replace('RPT-',''), 10) || 1001;
    const incidentTypes = ["Theft", "Harassment", "Vandalism", "Assault", "Academic Misconduct", "Safety Concern", "Cyberbullying", "Noise Complaint", "Maintenance Issue", "Medical Emergency"] as const;
    const reportStatuses: Report['status'][] = ["In Review", "Resolved", "Closed"];
    const locations = ["Main Library", "Science Building - Lab 301", "Student Dorm - West Wing", "Cafeteria", "Sports Complex", "Online - University Portal", "Parking Lot B", "Lecture Hall A101", "Admin Building - G02", "Arts Quad"];
    const facultyMembers = Array.from({ length: 10 }, (_, i) => `Dr. Faculty ${String.fromCharCode(65 + i)}`);

    const randomIncidentType = incidentTypes[numericIdPart % incidentTypes.length];
    let randomStatus = reportStatuses[numericIdPart % reportStatuses.length];
    const randomLocation = locations[numericIdPart % locations.length];
    const assignedTo = facultyMembers[numericIdPart % facultyMembers.length]; 

    const dateReported = subDays(subHours(now, (numericIdPart % 24) * 3), (numericIdPart % 30));
    const incidentDateTime = subHours(dateReported, (numericIdPart % 24) + 1);
    
    let initialFacultyNotes = numericIdPart % 4 === 0 ? `Initial assessment by ${assignedTo}: Incident appears to be ${randomIncidentType.toLowerCase()}. Following up with involved parties.` : undefined;
    let lastUpdated = initialFacultyNotes ? addMinutes(dateReported, 30).toISOString() : dateReported.toISOString(); 
    if (randomStatus !== "In Review" && initialFacultyNotes) { 
        lastUpdated = addMinutes(parseISO(lastUpdated), 60).toISOString();
    } else if (randomStatus !== "In Review") {
        lastUpdated = addMinutes(dateReported, 60).toISOString();
    }

    const timelineEvents: TimelineEvent[] = [
      {
        id: `evt-1-${id}`,
        date: dateReported.toISOString(),
        actor: 'System',
        action: 'Report Submitted by Reporter',
        details: `Incident reported. Initial status: Submitted.`,
      }
    ];

    timelineEvents.push({
      id: `evt-assign-${id}`,
      date: addMinutes(dateReported, 2).toISOString(),
      actor: 'System',
      action: `Assigned to ${assignedTo}`,
      details: `Report automatically assigned to ${assignedTo} for review.`
    });
    
    const inReviewDate = addMinutes(parseISO(timelineEvents[timelineEvents.length-1].date), 5).toISOString();
    timelineEvents.push({
        id: `evt-inreview-${id}`,
        date: inReviewDate,
        actor: 'Faculty', 
        action: `Status: In Review by ${assignedTo}`,
        details: `Report status updated to 'In Review' by ${assignedTo}.`,
        statusChange: { from: 'Submitted', to: 'In Review' }
    });
    

    if (initialFacultyNotes) {
      timelineEvents.push({
        id: `evt-note-${id}`,
        date: addMinutes(parseISO(inReviewDate), 25).toISOString(), // After 'In Review'
        actor: 'Faculty',
        action: `Note added by ${assignedTo}`,
        details: `Faculty member ${assignedTo} added a note.`,
        noteContent: initialFacultyNotes,
      });
    }
    
    if (randomStatus === 'Resolved' || randomStatus === 'Closed') {
      const previousStatusForFinal = 'In Review';
      const actorForFinalStatus = randomStatus === 'Closed' && (numericIdPart % 5 === 0) ? 'Admin' : 'Faculty'; 
      const finalActionBy = actorForFinalStatus === 'Admin' ? `Admin User` : assignedTo;
      const finalEventDate = initialFacultyNotes ? addMinutes(parseISO(timelineEvents[timelineEvents.length-1].date), 30).toISOString() : addMinutes(parseISO(inReviewDate), 30).toISOString();


      timelineEvents.push({
        id: `evt-finalstatus-${id}`,
        date: finalEventDate, 
        actor: actorForFinalStatus,
        action: `Status: ${randomStatus} by ${finalActionBy}`,
        details: `Report status updated to '${randomStatus}' by ${finalActionBy}.`,
        statusChange: { from: previousStatusForFinal, to: randomStatus }
      });
      lastUpdated = finalEventDate;

      if (randomStatus === 'Closed' && actorForFinalStatus === 'Admin') {
         timelineEvents.push({
            id: `evt-admincloseconfirm-${id}`,
            date: addMinutes(parseISO(finalEventDate), 5).toISOString(),
            actor: 'Admin',
            action: `Case Closed by Admin`,
            details: `Administrator confirmed closure of the case.`,
         });
         lastUpdated = addMinutes(parseISO(finalEventDate), 5).toISOString();
      }
    }
    
    timelineEvents.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());


    return {
      id: id,
      incidentType: randomIncidentType,
      dateTime: incidentDateTime.toISOString(),
      location: randomLocation,
      description: `This is a detailed description for incident report ${id} concerning ${randomIncidentType.toLowerCase()} at ${randomLocation}. The incident occurred on ${format(incidentDateTime, "PPPp")}. Report includes multiple witness statements and supporting details provided by the original reporter.`,
      status: randomStatus,
      dateReported: dateReported.toISOString(),
      lastUpdated: lastUpdated,
      aiClassification: {
        category: randomIncidentType,
        confidence: (numericIdPart % 30 + 70) / 100,
        keywords: ["faculty-view", id.toLowerCase(), randomIncidentType.toLowerCase().split(" ")[0]],
      },
      contactInfo: (numericIdPart % 2 === 0) ? `user.${numericIdPart}@example.com` : undefined,
      assignedTo: assignedTo,
      facultyNotes: initialFacultyNotes,
      timelineEvents: timelineEvents,
    };
};


export default function FacultyReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [selectedStatus, setSelectedStatus] = useState<Report['status'] | undefined>(undefined);
  const [currentFacultyNotes, setCurrentFacultyNotes] = useState<string>("");

  const reportId = typeof params.id === 'string' ? params.id : undefined;

  useEffect(() => {
    if (reportId) {
      setIsLoading(true);
      setTimeout(() => {
        const fetchedReport = getDummyReportByIdForFaculty(reportId);
        if (fetchedReport) {
          setReport(fetchedReport);
          setSelectedStatus(fetchedReport.status);
          setCurrentFacultyNotes(fetchedReport.facultyNotes || "");
        } else {
          toast({
            title: "Report Not Found",
            description: `Report with ID ${reportId} could not be found or is not assigned to you.`,
            variant: "destructive",
          });
          router.push('/faculty/profile');
        }
        setIsLoading(false);
      }, 500);
    } else {
      toast({ title: "Error", description: "Report ID is missing.", variant: "destructive" });
      router.push('/faculty/profile');
      setIsLoading(false);
    }
  }, [reportId, router, toast]);

  const handleStatusUpdate = async () => {
    if (!report || !selectedStatus) {
      toast({ title: "Update Failed", description: "No report loaded or status selected.", variant: "destructive" });
      return;
    }

    const facultyName = report.assignedTo;
    if (!facultyName) {
      toast({ title: "Update Failed", description: "Report is not assigned to a faculty member. Cannot update.", variant: "destructive" });
      setIsUpdating(false); // Ensure isUpdating is reset if we return early
      return;
    }

    setIsUpdating(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    const newTimelineEvents = [...(report.timelineEvents || [])];
    const now = new Date(); // Use a single Date object for consistency in this update cycle
    let somethingChanged = false;
    let noteEventAddedThisUpdate = false;

    // Check if notes changed
    const notesHaveChanged = currentFacultyNotes !== (report.facultyNotes || "");
    if (notesHaveChanged) {
        newTimelineEvents.push({
            id: `evt-${now.getTime()}-notes-${newTimelineEvents.length}`,
            date: now.toISOString(),
            actor: 'Faculty',
            action: `Note Updated by ${facultyName}`,
            details: `Faculty member ${facultyName} updated notes.`,
            noteContent: currentFacultyNotes,
        });
        somethingChanged = true;
        noteEventAddedThisUpdate = true;
    }

    // Check if status changed
    const statusHasChanged = selectedStatus !== report.status;
    if (statusHasChanged) {
        newTimelineEvents.push({
            id: `evt-${now.getTime()}-status-${newTimelineEvents.length}`,
            // If a note was also added in this same update, slightly offset the status update time
            date: noteEventAddedThisUpdate ? addMinutes(now, 1).toISOString() : now.toISOString(),
            actor: 'Faculty',
            action: `Status: ${selectedStatus} by ${facultyName}`,
            details: `Report status updated from '${report.status}' to '${selectedStatus}' by ${facultyName}.`,
            statusChange: { from: report.status, to: selectedStatus },
        });
        somethingChanged = true;
    }
    
    if (!somethingChanged) {
        toast({
            title: "No Changes Detected",
            description: "The status and notes are the same as before.",
            variant: "default",
        });
        setIsUpdating(false);
        return;
    }

    newTimelineEvents.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    setReport(prev => prev ? ({
      ...prev,
      status: selectedStatus,
      facultyNotes: currentFacultyNotes,
      lastUpdated: new Date().toISOString(), // Reflects the actual save time
      timelineEvents: newTimelineEvents,
    }) : null);

    toast({
      title: "Report Updated",
      description: `Report ${report.id} has been updated. Timeline reflects changes.`,
    });
    setIsUpdating(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading report details...</p></div>;
  }

  if (!report) {
    return <div className="flex justify-center items-center h-screen"><p>Report not found or access denied.</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Faculty Portal
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="text-2xl font-bold text-primary flex items-center">
                <FileText className="mr-2 h-6 w-6" />
                Incident Report: {report.id}
              </CardTitle>
              <CardDescription className="mt-1">
                Review and update the details of this assigned incident.
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(report.status)} className="text-sm px-3 py-1 self-start sm:self-center">{report.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Basic Incident Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">Incident Details</h3>
              <InfoItem icon={FileText} label="Type of Incident" value={report.incidentType} />
              <InfoItem icon={CalendarDays} label="Date & Time of Incident" value={format(parseISO(report.dateTime), "PPPp")} />
              <InfoItem icon={MapPin} label="Location" value={report.location} />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">Reporting Information</h3>
              <InfoItem icon={CalendarDays} label="Date Reported" value={format(parseISO(report.dateReported), "PPPp")} />
              <InfoItem icon={ListChecks} label="Last Updated" value={format(parseISO(report.lastUpdated), "PPPp")} />
              <InfoItem icon={UserCircle} label="Reporter Contact" value={report.contactInfo || "Anonymous"} />
              {report.assignedTo && <InfoItem icon={UserCircle} label="Assigned To" value={report.assignedTo} className="text-primary font-semibold" />}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">Full Description</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-stone-50 p-4 rounded-md border">
              {report.description}
            </p>
          </div>

          {report.aiClassification && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2 flex items-center">
                <Brain className="mr-2 h-5 w-5 text-primary" /> AI Classification Details
              </h3>
              <AiClassifierResult result={report.aiClassification} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Card */}
      {report.timelineEvents && report.timelineEvents.length > 0 && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary flex items-center">
              <History className="mr-2 h-5 w-5" /> Report Timeline
            </CardTitle>
            <CardDescription>Chronological overview of updates to this report.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportTimeline events={report.timelineEvents} />
          </CardContent>
        </Card>
      )}


      {/* Faculty Actions Card */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary flex items-center">
            <Edit3 className="mr-2 h-5 w-5" /> Faculty Actions & Updates
          </CardTitle>
          <CardDescription>Update the incident status and add your notes here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="status-update" className="text-sm font-medium">Update Incident Status</Label>
            <Select value={selectedStatus} onValueChange={(value: string) => setSelectedStatus(value as Report['status'])}>
              <SelectTrigger id="status-update" className="mt-1">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s} disabled={s === "Submitted"}>
                    {s} {s === "Submitted" ? "(Admin only)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="faculty-notes" className="text-sm font-medium">Faculty Notes / Observations</Label>
            <Textarea
              id="faculty-notes"
              value={currentFacultyNotes}
              onChange={(e) => setCurrentFacultyNotes(e.target.value)}
              placeholder="Add your notes, findings, or actions taken..."
              className="min-h-[120px] mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium">Attach Files (Evidence/Documents)</Label>
            <div className="mt-1 flex items-center justify-center w-full px-6 py-8 border-2 border-dashed rounded-md border-muted-foreground/50">
                <div className="text-center">
                    <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        Multimedia attachments (feature coming soon).
                    </p>
                    <p className="text-xs text-muted-foreground">Describe any files in your notes for now.</p>
                </div>
            </div>
          </div>

        </CardContent>
        <CardFooter>
          <Button onClick={handleStatusUpdate} disabled={isUpdating || !selectedStatus} className="w-full sm:w-auto">
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isUpdating ? "Saving Update..." : "Save Update"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Helper component for info items
interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string | undefined | null;
  className?: string;
}
const InfoItem: React.FC<InfoItemProps> = ({ icon: Icon, label, value, className }) => (
  <div className="flex items-start">
    <Icon className="h-5 w-5 text-muted-foreground mr-3 mt-1 shrink-0" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("font-medium", className)}>{value || "N/A"}</p>
    </div>
  </div>
);
