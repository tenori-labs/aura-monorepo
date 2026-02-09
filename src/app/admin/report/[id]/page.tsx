
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Report } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, ShieldAlert, AlertTriangle, HandCoins, Brush, CircleHelp, CalendarDays, MapPin, UserCircle, ListChecks, Brain, FileText, Users, UserCheck2, MessageSquare } from 'lucide-react';
import { format, parseISO, subDays, subHours } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import AiClassifierResult from '@/components/report/AiClassifierResult';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
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

// Helper to get category icon
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'harassment': return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case 'theft': return <HandCoins className="h-5 w-5 text-yellow-500" />;
    case 'vandalism': return <Brush className="h-5 w-5 text-orange-500" />;
    case 'assault': return <AlertTriangle className="h-5 w-5 text-red-600" />;
    default: return <CircleHelp className="h-5 w-5 text-muted-foreground" />;
  }
};

const facultyMembers = Array.from({ length: 10 }, (_, i) => `Dr. Faculty ${String.fromCharCode(65 + i)}`); 

// Dummy function to generate a single report detail for Admin
const getDummyReportById = (id: string): Report | undefined => {
  if (!id) return undefined;
  const now = new Date();
  const numericIdPart = parseInt(id.replace('RPT-', '').replace('RPT-FAC-',''), 10) || 1001;
  const incidentTypes = ["Theft", "Harassment", "Vandalism", "Assault", "Academic Misconduct", "Safety Concern", "Cyberbullying", "Noise Complaint", "Maintenance Issue", "Medical Emergency"] as const;
  const statuses: Report['status'][] = ["Submitted", "In Review", "Resolved", "Closed"];
  const locations = ["Main Library", "Science Building - Lab 301", "Student Dorm - West Wing", "Cafeteria", "Sports Complex", "Online - University Portal", "Parking Lot B", "Lecture Hall A101", "Admin Building - G02", "Arts Quad"];

  const randomIncidentType = incidentTypes[numericIdPart % incidentTypes.length];
  let randomStatus = statuses[numericIdPart % statuses.length];
  const randomLocation = locations[numericIdPart % locations.length];

  const dateReported = subDays(subHours(now, (numericIdPart % 24) * 3), (numericIdPart % 30));
  const lastUpdated = subHours(dateReported, (numericIdPart % 48) * -1);
  const incidentDateTime = subHours(dateReported, (numericIdPart % 24) + 1);

  let assignedTo: string | undefined = undefined;
  let facultyNotes: string | undefined = undefined;

  if (numericIdPart % 4 === 0) { 
    assignedTo = facultyMembers[numericIdPart % facultyMembers.length];
    if (randomStatus === 'Submitted') randomStatus = 'In Review'; 
    if (numericIdPart % 2 === 0) { // Add faculty notes for some assigned reports
        facultyNotes = `Faculty member ${assignedTo} reviewed on ${format(subHours(lastUpdated, 2), "PPP")}. Recommendation: Follow up with student services.`;
        if (randomStatus === 'In Review') randomStatus = 'Resolved'; // If notes exist, maybe it's resolved
    }
  }


  return {
    id: id,
    incidentType: randomIncidentType,
    dateTime: incidentDateTime.toISOString(),
    location: randomLocation,
    description: `This is a very detailed description for incident report ${id} concerning ${randomIncidentType.toLowerCase()} at ${randomLocation}. The incident occurred on ${format(incidentDateTime, "PPPp")}. 
    
    The report states: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    
    Additional notes: Specific actions X, Y, and Z were observed. Witness A (if contact provided) reported similar occurrences. The area was secured at [Time] by [Campus Security Officer Name/ID]. Evidence (e.g., photos, videos - if applicable) has been cataloged under reference [EvidenceRef]. Follow-up requested with [Department/Individual].`,
    status: randomStatus,
    dateReported: dateReported.toISOString(),
    lastUpdated: lastUpdated.toISOString(),
    aiClassification: {
      category: randomIncidentType,
      confidence: (numericIdPart % 30 + 70) / 100, // confidence between 0.7 and 0.99
      keywords: ["detailed", id.toLowerCase(), randomIncidentType.toLowerCase().split(" ")[0], randomLocation.toLowerCase().split(" ")[0].replace("-","")],
    },
    contactInfo: (numericIdPart % 2 === 0) ? `user.${numericIdPart}@example.com` : undefined,
    assignedTo: assignedTo,
    facultyNotes: facultyNotes,
  };
};


export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");

  const reportId = typeof params.id === 'string' ? params.id : undefined;

  useEffect(() => {
    if (reportId) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const fetchedReport = getDummyReportById(reportId);
        if (fetchedReport) {
          setReport(fetchedReport);
        } else {
          toast({
            title: "Report Not Found",
            description: `Report with ID ${reportId} could not be found.`,
            variant: "destructive",
          });
          router.push('/admin'); // Redirect if not found
        }
        setIsLoading(false);
      }, 500);
    } else {
      toast({
        title: "Error",
        description: "Report ID is missing.",
        variant: "destructive",
      });
      router.push('/admin');
      setIsLoading(false);
    }
  }, [reportId, router, toast]);

  const handleDownloadReport = () => {
    console.log("Download Report button clicked for report:", report?.id);
    toast({
      title: "Download Initiated (Simulated)",
      description: `Preparing PDF download for report ${report?.id}.`,
    });
  };

  const handleReportToPolice = () => {
    console.log("Report to Police button clicked for report:", report?.id);
    toast({
      title: "Report to Police (Simulated)",
      description: `Sending report ${report?.id} to the nearest police station.`,
      variant: "default",
    });
  };

  const handleAssignTicket = () => {
    if (!selectedFaculty) {
      toast({
        title: "Assignment Failed",
        description: "Please select a faculty member.",
        variant: "destructive",
      });
      return;
    }
    console.log(`Assigning report ${report?.id} to ${selectedFaculty}`);
    
    setReport(prevReport => {
      if (!prevReport) return null;
      return {
        ...prevReport,
        assignedTo: selectedFaculty,
        status: prevReport.status === 'Submitted' ? 'In Review' : prevReport.status, 
        lastUpdated: new Date().toISOString(),
      };
    });

    toast({
      title: "Report Assigned (Simulated)",
      description: `Report ${report?.id} has been assigned to ${selectedFaculty}. Status updated.`,
    });
    setSelectedFaculty(""); 
    setIsAssignDialogOpen(false); 
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading report details...</p></div>;
  }

  if (!report) {
    return <div className="flex justify-center items-center h-screen"><p>Report not found.</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Portal
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="text-2xl font-bold text-primary flex items-center">
                {getCategoryIcon(report.incidentType)}
                <span className="ml-2">Incident Report: {report.id}</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Detailed view of the reported incident.
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(report.status)} className="text-sm px-3 py-1 self-start sm:self-center">{report.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
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
              <InfoItem icon={UserCircle} label="Reporter Contact (Optional)" value={report.contactInfo || "Anonymous"} />
               {report.assignedTo && (
                <InfoItem icon={UserCheck2} label="Assigned To" value={report.assignedTo} className="text-primary font-semibold" />
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">Full Description</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-stone-50 p-4 rounded-md border">
              {report.description}
            </p>
          </div>

          {report.facultyNotes && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2 flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-primary" /> Faculty Notes
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md border border-blue-200 dark:border-blue-700">
                {report.facultyNotes}
              </p>
            </div>
          )}

          {report.aiClassification && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2 flex items-center">
                <Brain className="mr-2 h-5 w-5 text-primary" /> AI Classification Details
              </h3>
              <AiClassifierResult result={report.aiClassification} />
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/30 p-6 flex flex-col sm:flex-row sm:justify-around sm:items-center gap-4">
            <div className="flex flex-col items-center text-center w-full sm:w-auto">
                <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                    <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <Users className="mr-2 h-4 w-4" />
                        {report.assignedTo ? "Reassign" : "Assign to Faculty"}
                    </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Assign Report: {report.id}</DialogTitle>
                        <DialogDescription>
                        Select a faculty member to assign this incident report to.
                        Current: {report.assignedTo || "Unassigned"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="faculty" className="text-right">
                            Faculty
                        </Label>
                        <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                            <SelectTrigger className="col-span-3" id="faculty">
                            <SelectValue placeholder="Select faculty member" />
                            </SelectTrigger>
                            <SelectContent>
                            {facultyMembers.map((faculty) => (
                                <SelectItem key={faculty} value={faculty}>
                                {faculty}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleAssignTicket}>Confirm Assignment</Button>
                    </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <div className="flex flex-col items-center text-center w-full sm:w-auto">
                <Button onClick={handleDownloadReport} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download Report
                </Button>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                This will download a PDF of the case report with timeline that can be submitted to legal and police team.
                </p>
            </div>

            <div className="flex flex-col items-center text-center w-full sm:w-auto">
                <Button onClick={handleReportToPolice} variant="destructive" className="w-full">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Report to Police
                </Button>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                This button will send the report to the nearest police station.
                </p>
            </div>
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
