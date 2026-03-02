// src/app/login/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, Loader2 } from 'lucide-react';

const loginFormSchema = z.object({
  collegeId: z.string().min(1, 'College ID is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

// Dummy prefilled values
const PREFILLED_COLLEGE_ID = 'student';
const PREFILLED_PASSWORD = 'password';
const PREFILLED_MOBILE = '1234567890';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [mobileNumber, setMobileNumber] = useState(PREFILLED_MOBILE);
  const [redirectUrl, setRedirectUrl] = useState('/dashboard');

  useEffect(() => {
    const redirectQuery = searchParams.get('redirect');
    if (redirectQuery) {
      if (redirectQuery.startsWith('/')) {
        setRedirectUrl(redirectQuery);
      }
    }
  }, [searchParams]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      collegeId: PREFILLED_COLLEGE_ID,
      password: PREFILLED_PASSWORD,
    },
  });

  async function handleLogin(data?: LoginFormValues) {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let loginSuccess = false;

    if (activeTab === 'email') {
      const emailFormData = data || form.getValues();
      console.log('User login attempt (Email/ID):', emailFormData);
      if (
        emailFormData.collegeId.toLowerCase() === PREFILLED_COLLEGE_ID.toLowerCase() &&
        emailFormData.password === PREFILLED_PASSWORD
      ) {
        loginSuccess = true;
      }
    } else if (activeTab === 'mobile') {
      console.log('User login attempt (Mobile):', mobileNumber);
      if (mobileNumber === PREFILLED_MOBILE) {
        loginSuccess = true;
      }
    }

    if (loginSuccess) {
      toast({
        title: 'Login Successful',
        description: `Welcome back! Redirecting to ${redirectUrl === '/dashboard' ? 'your dashboard' : 'the requested page'}...`,
      });
      router.push(redirectUrl);
    } else {
      toast({
        title: 'Login Failed',
        description: 'Invalid credentials. Please check your input.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setIsLoading(true);
    console.log('User login attempt (Google)');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
      title: 'Login Successful (Simulated)',
      description: `Redirecting to ${redirectUrl === '/dashboard' ? 'your dashboard' : 'the requested page'} via Google Sign-In...`,
    });
    router.push(redirectUrl);
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <LogIn className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Campus User Login</CardTitle>
            <CardDescription>Access your incident reporting dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email / College ID</TabsTrigger>
                <TabsTrigger value="mobile">Mobile Number</TabsTrigger>
              </TabsList>
              <TabsContent value="email">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6 pt-4">
                    <FormField
                      control={form.control}
                      name="collegeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your College ID" {...field} />
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
                      {isLoading ? 'Logging in...' : 'Login with Email/ID'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              <TabsContent value="mobile">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}
                  className="space-y-6 pt-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumberInput">Mobile Number</Label>
                    <Input
                      id="mobileNumberInput"
                      type="tel"
                      placeholder="Enter your mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? 'Logging in...' : 'Login with Mobile'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                  <path
                    fill="currentColor"
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 1.98-4.78 1.98-3.66 0-6.71-3.04-6.71-6.71s3.05-6.71 6.71-6.71c1.94 0 3.42.76 4.56 1.85l2.62-2.55C19.21 3.43 17.17 2.4 14.96 2.4c-4.97 0-9.01 4.04-9.01 9.01s4.04 9.01 9.01 9.01c3.04 0 5.36-1.02 7.18-2.82 1.9-1.86 2.73-4.49 2.73-7.39 0-.75-.08-1.25-.16-1.74H12.48z"
                  ></path>
                </svg>
              )}
              Sign in with Google
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-3 pt-6 text-sm">
            <p>Staff or Portal Access?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-center">
              <Link href="/login/faculty" className="font-medium text-primary hover:underline">
                Faculty Login
              </Link>
              <Link href="/login/admin" className="font-medium text-primary hover:underline">
                Admin Login
              </Link>
              <Link href="/login/counselor" className="font-medium text-primary hover:underline">
                Counselor Login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="https://placehold.co/1080x1920.png"
          alt="Login background image"
          width={1080}
          height={1920}
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          data-ai-hint="university campus students"
        />
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex w-full min-h-screen items-center justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
