import type { Report } from '@/lib/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import {
  Clock,
  Tag,
  ListChecks,
  MessageSquare,
  AlertTriangle,
  HandCoins,
  Brush,
  CircleHelp,
} from 'lucide-react';
import Link from 'next/link'; // Import Link

interface ReportCardProps {
  report: Report;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'harassment':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'theft':
      return <HandCoins className="h-4 w-4 text-yellow-500" />;
    case 'vandalism':
      return <Brush className="h-4 w-4 text-orange-500" />;
    case 'assault':
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    default:
      return <CircleHelp className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function ReportCard({ report }: ReportCardProps) {
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

  const categoryIcon = report.aiClassification?.category
    ? getCategoryIcon(report.aiClassification.category)
    : getCategoryIcon(report.incidentType);
  const displayCategory = report.aiClassification?.category || report.incidentType;

  return (
    // Card itself is not a Link, the parent component in dashboard wraps it in a Link
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold capitalize">
            {displayCategory}: {report.location}
          </CardTitle>
          <Badge variant={getStatusVariant(report.status)} className="ml-2 whitespace-nowrap">
            {report.status}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Reported: {format(parseISO(report.dateReported), 'MMM d, yyyy HH:mm')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-foreground line-clamp-3">{report.description}</p>
        {report.aiClassification && (
          <div className="mt-3 pt-3 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground mb-1">AI Classification:</h4>
            <div className="flex items-center gap-2 text-sm">
              {categoryIcon}
              <span>
                {report.aiClassification.category} (Confidence:{' '}
                {(report.aiClassification.confidence * 100).toFixed(0)}%)
              </span>
            </div>
            {report.aiClassification.keywords.length > 0 && (
              <div className="mt-1">
                <span className="text-xs text-muted-foreground">Keywords: </span>
                {report.aiClassification.keywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="mr-1 text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <div className="flex items-center">
          <ListChecks className="h-3 w-3 mr-1" />
          Last updated: {format(parseISO(report.lastUpdated), 'MMM d, yyyy HH:mm')}
        </div>
      </CardFooter>
    </Card>
  );
}
