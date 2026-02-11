// src/app/consent/page.tsx
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileSignature, Download, Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


const consentSchema = z.object({
  studentAgreement: z.boolean().refine((v) => v === true, {
    message: "You must agree to the undertaking.",
  }),
  parentAgreement: z.boolean().refine((v) => v === true, {
    message: "You must confirm your parent/guardian has also read this.",
  }),
  signature: z.string().min(1, "Signature is required."), // This will be the typed name
});

type ConsentFormValues = z.infer<typeof consentSchema>;

// Dummy data for the logged-in student
const dummyStudent = {
  name: "Alex Student",
  studentId: "S1234567",
  course: "B.Tech Computer Science",
  year: "2nd Year",
};

export default function ConsentPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  const form = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      studentAgreement: false,
      parentAgreement: false,
      signature: "",
    },
  });

  const onSubmit = (data: ConsentFormValues) => {
    setIsSubmitting(true);
    console.log("Consent Submitted:", data);

    // Simulate API call and PDF generation
    setTimeout(() => {
      toast({
        title: "Consent Submitted Successfully!",
        description: "Your anti-ragging declaration has been recorded. A PDF copy is now available.",
      });
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 2000);
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSignatureName(e.target.value);
      form.setValue("signature", e.target.value, { shouldValidate: true });
  }

  if (isSubmitted) {
    return (
        <Card className="max-w-3xl mx-auto shadow-xl">
            <CardHeader className="text-center">
                <FileSignature className="mx-auto h-12 w-12 text-green-500" />
                <CardTitle className="text-2xl font-bold text-primary">Submission Complete</CardTitle>
                <CardDescription>Thank you, {dummyStudent.name}. Your undertaking has been digitally signed and recorded.</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
                <p>A PDF copy of your signed declaration has been generated. You can download it for your records. A copy has also been sent to the college administration.</p>
                <Button onClick={() => alert("Simulating PDF download...")}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Your PDF
                </Button>
            </CardContent>
            <CardFooter>
                 <Link href="/dashboard" className="mx-auto">
                    <Button variant="outline">Back to Dashboard</Button>
                 </Link>
            </CardFooter>
        </Card>
    )
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary flex items-center">
          <FileSignature className="mr-3 h-7 w-7" />
          UGC Anti-Ragging Undertaking
        </CardTitle>
        <CardDescription>
          As per UGC regulations, all students and their parents must submit this undertaking at the beginning of each academic year.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Student Details Section */}
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-lg">Student Information</h3>
                <p className="text-sm"><strong>Name:</strong> {dummyStudent.name}</p>
                <p className="text-sm"><strong>Student ID:</strong> {dummyStudent.studentId}</p>
                <p className="text-sm"><strong>Course:</strong> {dummyStudent.course}</p>
            </div>

            {/* Declaration Text */}
            <div>
              <Label className="text-base font-semibold">Declaration Text</Label>
              <ScrollArea className="h-48 w-full rounded-md border p-4 mt-2 bg-stone-50 dark:bg-stone-900">
                <h4 className="font-bold">UNDERTAKING FROM THE STUDENT</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
{`1) I, ${dummyStudent.name} with Student ID ${dummyStudent.studentId}, have received and carefully read the UGC Regulations on Curbing the Menace of Ragging in Higher Educational Institutions, 2009, (hereinafter called the “Regulations”).

2) I have, in particular, perused clause 3 of the Regulations and am aware as to what constitutes ragging.

3) I have also, in particular, perused clause 7 and clause 9.1 of the Regulations and am fully aware of the penal and administrative action that is liable to be taken against me in case I am found guilty of or abetting ragging, actively or passively, or being part of a conspiracy to promote ragging.

4) I hereby solemnly aver and undertake that:
    a) I will not indulge in any behavior or act that may be constituted as ragging under clause 3 of the Regulations.
    b) I will not participate in or abet or propagate through any act of commission or omission that may be constituted as ragging under clause 3 of the Regulations.

5) I hereby affirm that, if found guilty of ragging, I am liable for punishment according to clause 9.1 of the Regulations, without prejudice to any other criminal action that may be taken against me under any penal law or any law for the time being in force.

6) I hereby declare that I have not been expelled or debarred from admission in any institution in the country on account of being found guilty of, abetting or being part of a conspiracy to promote, ragging; and further affirm that, in case the declaration is found to be untrue, I am aware that my admission is liable to be cancelled.`}
                </p>
              </ScrollArea>
            </div>

            {/* Agreement Checkboxes */}
            <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentAgreement"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I, the student, have read and understood the declaration.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parentAgreement"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I confirm that my parent/guardian has also read and understood this undertaking.
                        </FormLabel>
                         <FormDescription>
                          A separate undertaking from your parent/guardian may be required by the institution.
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
            </div>

            {/* Signature Pad */}
             <div>
                <Label htmlFor="signature-pad" className="text-base font-semibold">Digital Signature</Label>
                <div className="mt-2 p-4 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground mb-4">Please type your full name in the box below to digitally sign this undertaking. Your typed name will be considered your legal signature for this document.</p>
                     <input
                        id="signature-pad"
                        type="text"
                        placeholder="Type your full name here"
                        className="w-full text-center text-2xl font-serif tracking-wider bg-transparent border-b-2 border-primary focus:outline-none focus:ring-0 p-2"
                        value={signatureName}
                        onChange={handleSignatureChange}
                    />
                    <FormMessage>{form.formState.errors.signature?.message}</FormMessage>
                </div>
             </div>
              <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <Info className="h-4 w-4 !text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Declaration</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                    By clicking "Digitally Sign and Submit", I declare that the information provided is true and correct. I understand this is a legally binding document.
                </AlertDescription>
            </Alert>


            <CardFooter className="px-0">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Submitting..." : "Digitally Sign and Submit"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
