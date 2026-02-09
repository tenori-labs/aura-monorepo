import ReportForm from "@/components/report/ReportForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function NewReportPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Report an Incident</CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Your report is important. Please provide accurate and detailed information.
            You can choose to remain anonymous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportForm />
        </CardContent>
      </Card>
    </div>
  );
}
