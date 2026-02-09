"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { classifyIncidentReport, type ClassifyIncidentReportOutput } from "@/ai/flows/classify-incident-report";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Upload, File, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import AiClassifierResult from "./AiClassifierResult";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const incidentTypes = ["Harassment", "Theft", "Vandalism", "Assault", "Academic Misconduct", "Safety Concern", "Discrimination", "Other"] as const;

const reportFormSchema = z.object({
  incidentType: z.enum(incidentTypes, {
    required_error: "Please select an incident type.",
  }),
  dateTime: z.date({
    required_error: "Date and time of incident is required.",
  }),
  location: z.string().min(3, { message: "Location must be at least 3 characters." }).max(100),
  description: z.string().min(20, { message: "Description must be at least 20 characters." }).max(2000),
  contactInfo: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  multimediaFile: z
    .any()
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => !file || [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].includes(file.type),
      ".jpg, .jpeg, .png, .webp, .mp4 and .webm files are accepted."
    )
    .optional(),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

export default function ReportForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassifyIncidentReportOutput | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      location: "",
      description: "",
      contactInfo: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("multimediaFile", file);
      setFileType(file.type);
      setFilePreview(URL.createObjectURL(file));
    }
  };
  
  const resetFile = () => {
      form.setValue("multimediaFile", undefined);
      setFilePreview(null);
      setFileType(null);
  }

  // Helper function to read file as data URI
  const readFileAsDataURI = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  async function onSubmit(data: ReportFormValues) {
    setIsLoading(true);
    setClassificationResult(null);
    try {
      let mediaDataUri: string | undefined = undefined;
      if (data.multimediaFile && ACCEPTED_IMAGE_TYPES.includes(data.multimediaFile.type)) {
         mediaDataUri = await readFileAsDataURI(data.multimediaFile);
      }
      
      // Call AI classifier
      const aiResult = await classifyIncidentReport({ 
        reportText: data.description,
        media: mediaDataUri,
      });
      setClassificationResult(aiResult);

      // Simulate API call for form submission
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      
      console.log("Form submitted:", { ...data, aiClassification: aiResult });
      toast({
        title: "Report Submitted Successfully!",
        description: (
          <div>
            <p>Your report regarding "{data.incidentType}" has been received.</p>
            {aiResult && <p className="mt-1 text-xs">AI classified as: {aiResult.category}</p>}
          </div>
        ),
        variant: "default",
      });
      form.reset();
      resetFile();

    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Error Submitting Report",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="incidentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type of Incident</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an incident type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {incidentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Choose the category that best describes the incident.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateTime"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date and Time of Incident</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP HH:mm") : <span>Pick a date and time</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                   <div className="p-3 border-t border-border">
                    <Input
                      type="time"
                      value={field.value ? format(field.value, 'HH:mm') : ''}
                      onChange={(e) => {
                        const time = e.target.value;
                        const [hours, minutes] = time.split(':').map(Number);
                        if (field.value) {
                          const newDate = new Date(field.value);
                          newDate.setHours(hours);
                          newDate.setMinutes(minutes);
                          field.onChange(newDate);
                        } else {
                           const newDate = new Date();
                           newDate.setHours(hours);
                           newDate.setMinutes(minutes);
                           field.onChange(newDate);
                        }
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <FormDescription>When did the incident occur?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location of Incident</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Library, North Quad, Online Platform" {...field} />
              </FormControl>
              <FormDescription>Be as specific as possible.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description of Incident</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a detailed account of what happened. Include who was involved, what was said or done, and any other relevant details."
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Please be factual and objective. This information will be used to classify your report.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="multimediaFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attach Image or Video (Optional)</FormLabel>
              <FormControl>
                <div className="flex flex-col items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 border-muted-foreground/30">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-muted-foreground">Image or Video (MAX. 5MB)</p>
                        </div>
                        <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
                    </label> 
                </div>
              </FormControl>
               {filePreview && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">File Preview:</h4>
                  <div className="relative w-full max-w-sm p-2 border rounded-lg bg-muted/20">
                     {fileType?.startsWith("image/") ? (
                        <ImageIcon className="h-16 w-16 text-muted-foreground" />
                      ) : fileType?.startsWith("video/") ? (
                        <VideoIcon className="h-16 w-16 text-muted-foreground" />
                      ) : (
                        <File className="h-16 w-16 text-muted-foreground" />
                      )}
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium truncate">{form.getValues("multimediaFile")?.name}</p>
                        <p className="text-xs text-muted-foreground">{(form.getValues("multimediaFile")?.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1" onClick={resetFile}>X</Button>
                  </div>
                </div>
              )}
              {fileType?.startsWith("video/") && (
                <FormDescription className="text-amber-600 dark:text-amber-500">Note: AI classification currently only supports image analysis, not video content.</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="contactInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your.email@example.com" {...field} />
              </FormControl>
              <FormDescription>
                Providing an email is optional. If you wish to remain anonymous, leave this blank. 
                If provided, it will only be used for follow-up if necessary.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting & Classifying...
            </>
          ) : (
            "Submit Report"
          )}
        </Button>
      </form>

      {classificationResult && (
        <div className="mt-8">
          <AiClassifierResult result={classificationResult} />
        </div>
      )}
    </Form>
  );
}
