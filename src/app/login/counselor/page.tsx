
// src/app/login/counselor/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { HeartHandshake, Loader2 } from "lucide-react"; // Using HeartHandshake for counselor

const counselorLoginFormSchema = z.object({
  counselorId: z.string().min(1, "Counselor ID is required."),
  password: z.string().min(1, "Password is required."),
});

type CounselorLoginFormValues = z.infer<typeof counselorLoginFormSchema>;

// Dummy prefilled values for prototype
const PREFILLED_COUNSELOR_ID = "counselor01";
const PREFILLED_PASSWORD = "cpass123";

export default function CounselorLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CounselorLoginFormValues>({
    resolver: zodResolver(counselorLoginFormSchema),
    defaultValues: {
      counselorId: PREFILLED_COUNSELOR_ID,
      password: PREFILLED_PASSWORD,
    },
  });

  async function onSubmit(data: CounselorLoginFormValues) {
    setIsLoading(true);
    console.log("Counselor login attempt:", data);
    // Simulate API call for login
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate successful counselor login
    if (data.counselorId.toLowerCase() === PREFILLED_COUNSELOR_ID && data.password === PREFILLED_PASSWORD) {
      toast({
        title: "Counselor Login Successful",
        description: "Redirecting to your Dashboard...",
      });
      router.push("/counselor/dashboard"); // Redirect to counselor dashboard
    } else {
      toast({
        title: "Counselor Login Failed",
        description: "Invalid Counselor ID or Password.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
    // No setIsLoading(false) here if successful, as redirect will occur
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <HeartHandshake className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Counselor Portal Login</CardTitle>
            <CardDescription>Manage your appointments and availability.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="counselorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Counselor ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your Counselor ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isLoading ? "Logging in..." : "Login as Counselor"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2 pt-6 text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Not a counselor? Go to User Login
            </Link>
          </CardFooter>
        </Card>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="https://placehold.co/1080x1920.png"
          alt="Counselor login background image"
          width={1080}
          height={1920}
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          data-ai-hint="calm office plant"
        />
      </div>
    </div>
  );
}
