// src/app/login/admin/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2 } from 'lucide-react';

const adminLoginFormSchema = z.object({
  adminId: z.string().min(1, 'Admin ID is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type AdminLoginFormValues = z.infer<typeof adminLoginFormSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginFormSchema),
    defaultValues: {
      adminId: 'admin',
      password: 'password',
    },
  });

  async function onSubmit(data: AdminLoginFormValues) {
    setIsLoading(true);
    console.log('Admin login attempt:', data);
    // Simulate API call for login
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate successful admin login
    if (data.adminId.toLowerCase() === 'admin' && data.password === 'password') {
      toast({
        title: 'Admin Login Successful',
        description: 'Redirecting to Admin Portal...',
      });
      router.push('/admin'); // Redirect to admin dashboard
    } else {
      toast({
        title: 'Admin Login Failed',
        description: 'Invalid Admin ID or Password.',
        variant: 'destructive',
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
              <ShieldCheck className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Administrator Login</CardTitle>
            <CardDescription>Access the Campusence Admin Portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="adminId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your Admin ID" {...field} />
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
                  {isLoading ? 'Logging in...' : 'Login as Admin'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center pt-6 text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Not an admin? Go to User Login
            </Link>
          </CardFooter>
        </Card>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="https://placehold.co/1080x1920.png"
          alt="Admin login background image"
          width={1080}
          height={1920}
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          data-ai-hint="modern office building"
        />
      </div>
    </div>
  );
}
