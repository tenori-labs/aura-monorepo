
import type { ClassifyIncidentReportOutput } from "@/ai/flows/classify-incident-report";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, Tags, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiClassifierResultProps {
  result: ClassifyIncidentReportOutput;
}

export default function AiClassifierResult({ result }: AiClassifierResultProps) {
  const confidencePercent = Math.round(result.confidence * 100);

  // Determine color based on confidence
  let progressColor = "bg-primary";
  if (confidencePercent > 80) progressColor = "bg-green-500";
  else if (confidencePercent > 50) progressColor = "bg-yellow-500";
  else progressColor = "bg-red-500";

  return (
    <Card className="bg-secondary/30 border-primary/20 shadow-lg overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="flex items-center text-lg text-primary">
          <Lightbulb className="mr-2 h-5 w-5 fill-current" />
          AI Analysis Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">

        {/* Category Section */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center text-sm text-muted-foreground mb-1">
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              Detected Category
            </div>
            <div className="text-2xl font-bold capitalize tracking-tight text-foreground">
              {result.category}
            </div>
          </div>
          <Badge variant="outline" className="text-sm py-1 px-3 border-primary/30 bg-primary/10 text-primary uppercase tracking-wider font-semibold">
            {confidencePercent}% Confidence
          </Badge>
        </div>

        {/* Confidence Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Confidence Score</span>
            <span>{confidencePercent}/100</span>
          </div>
          <Progress value={confidencePercent} className={cn("h-2", progressColor)} />
        </div>

        {/* Validity Section */}
        {result.validity && (
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={cn("h-4 w-4",
                result.validity === 'Likely Valid' ? "text-green-500" :
                  result.validity === 'Invalid' ? "text-red-500" : "text-yellow-500"
              )} />
              <span className="font-semibold text-sm">Validity Assessment:</span>
              <span className={cn("text-sm font-bold",
                result.validity === 'Likely Valid' ? "text-green-600 dark:text-green-400" :
                  result.validity === 'Invalid' ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
              )}>{result.validity}</span>
            </div>
            {result.validityReason && (
              <p className="text-xs text-muted-foreground italic pl-6 border-l-2 border-muted ml-2">
                "{result.validityReason}"
              </p>
            )}
          </div>
        )}

        {/* Keywords Section */}
        {result.keywords.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center mb-3 text-sm text-muted-foreground">
              <Tags className="mr-1.5 h-4 w-4" />
              <span>Key Terms Identified</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.keywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="secondary"
                  className="px-2.5 py-0.5 text-xs font-medium bg-background border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  #{keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
