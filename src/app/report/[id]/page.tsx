'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Report, TimelineEvent } from '@/lib/types';
import { getStudentReportById } from '@/app/dashboard/page'; // Function to get report
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ReportTimeline from '@/components/report/ReportTimeline';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  UserCircle,
  Edit,
  Save,
  XCircle,
  Info,
  History,
  ListChecks,
  Loader2,
} from 'lucide-react';
import { format, parseISO, addMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import AiClassifierResult from '@/components/report/AiClassifierResult';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

export default function StudentReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const reportId = typeof params.id === 'string' ? params.id : undefined;

  useEffect(() => {
    if (reportId) {
      setIsLoading(true);
      // Simulate API call / data fetching
      setTimeout(() => {
        const fetchedReport = getStudentReportById(reportId);
        if (fetchedReport) {
          setReport(fetchedReport);
          setEditedDescription(fetchedReport.description);
        } else {
          toast({
            title: 'Report Not Found',
            description: `Report with ID ${reportId} could not be found.`,
            variant: 'destructive',
          });
          router.push('/dashboard');
        }
        setIsLoading(false);
      }, 300);
    } else {
      router.push('/dashboard'); // Should not happen if routing is correct
    }
  }, [reportId, router, toast]);

  const handleSaveChanges = () => {
    if (!report || report.status === 'Closed') return;
    setIsSaving(true);

    // Simulate API call
    setTimeout(() => {
      const newTimelineEvent: TimelineEvent = {
        id: `evt-student-edit-${Date.now()}`,
        date: new Date().toISOString(),
        actor: 'Student',
        action: 'Report Details Updated by Student',
        details: 'The incident description was modified.',
      };

      setReport((prevReport) => {
        if (!prevReport) return null;
        return {
          ...prevReport,
          description: editedDescription,
          lastUpdated: new Date().toISOString(),
          timelineEvents: [...(prevReport.timelineEvents || []), newTimelineEvent].sort(
            (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
          ),
        };
      });
      setIsEditingDescription(false);
      setIsSaving(false);
      toast({ title: 'Changes Saved', description: 'Your report description has been updated.' });
    }, 1000);
  };

  const handleCloseReport = () => {
    if (!report || report.status === 'Closed') return;
    setIsClosing(true);

    // Simulate API call
    setTimeout(() => {
      const newTimelineEvent: TimelineEvent = {
        id: `evt-student-close-${Date.now()}`,
        date: new Date().toISOString(),
        actor: 'Student',
        action: 'Report Closed by Student',
        details: `Student marked the report as closed.`,
        statusChange: { from: report.status, to: 'Closed' },
      };

      setReport((prevReport) => {
        if (!prevReport) return null;
        return {
          ...prevReport,
          status: 'Closed',
          lastUpdated: new Date().toISOString(),
          timelineEvents: [...(prevReport.timelineEvents || []), newTimelineEvent].sort(
            (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
          ),
        };
      });
      setIsClosing(false);
      toast({ title: 'Report Closed', description: 'You have successfully closed this report.' });
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p>Loading report details...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Report not found.</p>
      </div>
    );
  }

  const canEditOrClose = report.status !== 'Closed';

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Button variant="outline" onClick={() => router.push('/dashboard')} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="text-2xl font-bold text-primary flex items-center">
                <Info className="mr-2 h-6 w-6" />
                Incident Report: {report.id}
              </CardTitle>
              <CardDescription className="mt-1">Details of your reported incident.</CardDescription>
            </div>
            <Badge
              variant={getStatusVariant(report.status)}
              className="text-sm px-3 py-1 self-start sm:self-center"
            >
              {report.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Basic Incident Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">
                Incident Details
              </h3>
              <InfoItem icon={Info} label="Type of Incident" value={report.incidentType} />
              <InfoItem
                icon={CalendarDays}
                label="Date & Time of Incident"
                value={format(parseISO(report.dateTime), 'PPPp')}
              />
              <InfoItem icon={MapPin} label="Location" value={report.location} />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-2 border-b pb-2">
                Reporting Information
              </h3>
              <InfoItem
                icon={CalendarDays}
                label="Date Reported"
                value={format(parseISO(report.dateReported), 'PPPp')}
              />
              <InfoItem
                icon={ListChecks}
                label="Last Updated"
                value={format(parseISO(report.lastUpdated), 'PPPp')}
              />
              <InfoItem
                icon={UserCircle}
                label="Your Contact (Optional)"
                value={report.contactInfo || 'Anonymous'}
              />
            </div>
          </div>

          {/* Description - Editable or Read-only */}
          <div>
            <div className="flex justify-between items-center mb-2 border-b pb-2">
              <h3 className="text-lg font-semibold text-foreground">Description</h3>
              {canEditOrClose && !isEditingDescription && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingDescription(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Description
                </Button>
              )}
            </div>
            {isEditingDescription && canEditOrClose ? (
              <div className="space-y-3">
                <Label htmlFor="edit-description">Modify your report description:</Label>
                <Textarea
                  id="edit-description"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="min-h-[150px]"
                  disabled={isSaving}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isSaving || editedDescription === report.description}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsEditingDescription(false);
                      setEditedDescription(report.description);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-stone-50 p-4 rounded-md border">
                {report.description}
              </p>
            )}
          </div>

          {/* AI Classification (if available) */}
          {report.aiClassification && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2 flex items-center">
                AI Classification
              </h3>
              <AiClassifierResult result={report.aiClassification} />
            </div>
          )}
        </CardContent>
        {canEditOrClose && (
          <CardFooter className="p-6 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isClosing}>
                  {isClosing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Close This Report
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to close this report?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Once closed, you will not be able to make further edits or reopen the report. It
                    will remain in the system for record-keeping.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCloseReport}
                    className={buttonVariants({ variant: 'destructive' })}
                  >
                    Yes, Close Report
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        )}
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
    </div>
  );
}

// Helper component for info items (copied from faculty report detail page for simplicity)
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
      <p className={cn('font-medium', className)}>{value || 'N/A'}</p>
    </div>
  </div>
);

// Helper for buttonVariants if needed directly (though AlertDialogAction already uses it)
const buttonVariants = ({
  variant,
}: {
  variant:
    | 'destructive'
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | null
    | undefined;
}) => {
  if (variant === 'destructive')
    return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
  // Add other variants if needed, or rely on ShadCN's default if variant is not destructive
  return '';
};
