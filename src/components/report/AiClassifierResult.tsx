import type { ClassifyIncidentReportOutput } from '@/ai/flows/classify-incident-report';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Tags, CheckCircle } from 'lucide-react';

interface AiClassifierResultProps {
  result: ClassifyIncidentReportOutput;
}

export default function AiClassifierResult({ result }: AiClassifierResultProps) {
  return (
    <Card className="bg-secondary/50 border-accent shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-md text-foreground">
          {' '}
          {/* Changed text-accent-foreground to text-foreground */}
          <Lightbulb className="mr-2 h-5 w-5 text-accent" />
          AI Report Classification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center">
          <CheckCircle className="mr-2 h-4 w-4 text-accent" />
          <span className="font-medium">Category:</span>
          <Badge variant="default" className="ml-2 bg-accent text-accent-foreground">
            {result.category}
          </Badge>
        </div>
        <div className="flex items-center">
          <CheckCircle className="mr-2 h-4 w-4 text-accent" />
          <span className="font-medium">Confidence:</span>
          <span className="ml-2 font-semibold text-accent">
            {(result.confidence * 100).toFixed(0)}%
          </span>
        </div>
        {result.keywords.length > 0 && (
          <div>
            <div className="flex items-center mb-1">
              <Tags className="mr-2 h-4 w-4 text-accent" />
              <span className="font-medium">Keywords:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
