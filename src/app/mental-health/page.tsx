
"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { mentalHealthChat, type MentalHealthChatInput, type MentalHealthChatOutput, type ChatMessage } from "@/ai/flows/mental-health-chat-flow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, User, Sparkles, Phone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { BookedAppointment } from "@/lib/types";

const STUDENT_NAME = "Alex";
const STUDENT_ID = "s123";

// Simulating shared data - In a real app, this would come from a backend or global state.
// For the prototype, we assume `globalDummyAppointments` from counselor dashboard is accessible or similar data exists.
// This is a simplified representation.
let studentAlexAppointments: BookedAppointment[] = [];
if (typeof window !== "undefined") { // Ensure this runs client-side only if accessing global var directly
  // @ts-ignore - a bit of a hack for prototype to access globaly mutated data
  if (window.globalDummyAppointments) {
    // @ts-ignore
    studentAlexAppointments = window.globalDummyAppointments.filter((app: BookedAppointment) => app.studentId === STUDENT_ID);
  } else { // Fallback if global isn't set up this way (e.g. direct navigation)
    studentAlexAppointments = [
      {
        id: "appt-1-alex-pending", studentId: "s123", studentName: "Alex Student",
        counselorId: "c1", counselorName: "Dr. Emily Carter", counselorSpecialty: "Stress & Anxiety Management",
        appointmentDate: "2024-08-10",
        appointmentTime: "09:00 AM",
        status: "PendingConfirmation", bookingDate: new Date().toISOString(),
        studentNotes: "Feeling overwhelmed with upcoming exams.",
        auraRiskAssessment: "At Risk",
        auraChatSummary: "Alex engaged with Aura discussing exam stress...",
        counselorInstructionsForAura: "Check in with Alex about exam stress. Remind about mindfulness exercises.",
        auraObservationsForCounselor: "Aura: Alex seems receptive to discussing stress.",
      }
    ];
  }
}


export default function MentalHealthChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [currentCounselorInstructions, setCurrentCounselorInstructions] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Attempt to load counselor instructions specific to Alex (s123)
    // For the prototype, directly use the studentAlexAppointments defined above
    const alexRelevantAppointment = studentAlexAppointments.find(
      app => app.studentId === STUDENT_ID && (app.status === "PendingConfirmation" || app.status === "ConfirmedByCounselor" || app.status === "Upcoming")
    );
    if (alexRelevantAppointment && alexRelevantAppointment.counselorInstructionsForAura) {
      setCurrentCounselorInstructions(alexRelevantAppointment.counselorInstructionsForAura);
      console.log("(Chat Page) Fetched counselor instructions for Alex:", alexRelevantAppointment.counselorInstructionsForAura);
    } else {
      console.log("(Chat Page) No specific counselor instructions found for Alex for upcoming appointments.");
    }
  }, []);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const getInitialGreeting = async () => {
      setIsLoading(true);
      try {
        const initialChatInput: MentalHealthChatInput = {
          studentId: STUDENT_ID,
          newMessage: { role: "user", content: "Hello Aura, this is my first time here." }, // Generic user greeting
          history: [],
          isGreeting: true,
          activeCounselorInstructions: currentCounselorInstructions,
        };
        const response = await mentalHealthChat(initialChatInput);
        if (response.botResponse) {
          setMessages([{ role: "model", content: response.botResponse.content }]);
        } else {
          setMessages([{ role: "model", content: "Hello! I'm Aura, your AI companion for mental well-being. How are you feeling today?" }]);
        }

        if (response.auraObservationsForCounselor) {
          const alexAppointmentIndex = studentAlexAppointments.findIndex(app => app.studentId === STUDENT_ID && (app.status === "PendingConfirmation" || app.status === "ConfirmedByCounselor" || app.status === "Upcoming"));
          if (alexAppointmentIndex > -1) {
            studentAlexAppointments[alexAppointmentIndex].auraObservationsForCounselor = response.auraObservationsForCounselor;
            // @ts-ignore (prototype hack)
            if (window.globalDummyAppointments) {
              // @ts-ignore
              const globalIndex = window.globalDummyAppointments.findIndex((ga: BookedAppointment) => ga.id === studentAlexAppointments[alexAppointmentIndex].id);
              // @ts-ignore
              if (globalIndex > -1) window.globalDummyAppointments[globalIndex].auraObservationsForCounselor = response.auraObservationsForCounselor;
            }
            console.log("(Chat Page) Aura observations from greeting saved for Alex (simulated):", response.auraObservationsForCounselor);
          }
        }
      } catch (error) {
        console.error("Error fetching initial greeting:", error);
        toast({
          title: "Error",
          description: "Could not connect to Aura. Please try refreshing.",
          variant: "destructive",
        });
        setMessages([{ role: "model", content: "I'm having a little trouble connecting right now. Please try refreshing the page." }]);
      } finally {
        setIsLoading(false);
      }
    };
    if (STUDENT_ID) {
      getInitialGreeting();
    }
  }, [toast, currentCounselorInstructions]);


  useEffect(() => {
    scrollToBottom();
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newUserMessage: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const alexRelevantAppointment = studentAlexAppointments.find(
        app => app.studentId === STUDENT_ID && (app.status === "PendingConfirmation" || app.status === "ConfirmedByCounselor" || app.status === "Upcoming")
      );
      const latestInstructions = alexRelevantAppointment?.counselorInstructionsForAura || currentCounselorInstructions;


      const chatInput: MentalHealthChatInput = {
        studentId: STUDENT_ID,
        newMessage: newUserMessage,
        history: messages,
        isGreeting: false,
        activeCounselorInstructions: latestInstructions,
      };
      const response = await mentalHealthChat(chatInput);

      if (response.botResponse) {
        setMessages((prevMessages) => [...prevMessages, response.botResponse!]);
      } else if (response.error) {
        setMessages((prevMessages) => [...prevMessages, { role: "model", content: response.error || "An error occurred." }]);
        toast({ title: "Aura's Response", description: response.error || "An error occurred.", variant: "default" });
      }
      else {
        setMessages((prevMessages) => [...prevMessages, { role: "model", content: "I'm not sure how to respond to that. Could you try rephrasing?" }]);
      }

      if (response.auraObservationsForCounselor) {
        const alexAppointmentIndex = studentAlexAppointments.findIndex(app => app.studentId === STUDENT_ID && (app.status === "PendingConfirmation" || app.status === "ConfirmedByCounselor" || app.status === "Upcoming"));
        if (alexAppointmentIndex > -1) {
          studentAlexAppointments[alexAppointmentIndex].auraObservationsForCounselor = response.auraObservationsForCounselor;
          // @ts-ignore (prototype hack)
          if (window.globalDummyAppointments) {
            // @ts-ignore
            const globalIndex = window.globalDummyAppointments.findIndex((ga: BookedAppointment) => ga.id === studentAlexAppointments[alexAppointmentIndex].id);
            // @ts-ignore
            if (globalIndex > -1) window.globalDummyAppointments[globalIndex].auraObservationsForCounselor = response.auraObservationsForCounselor;
          }
          console.log("(Chat Page) Aura observations saved for Alex (simulated):", response.auraObservationsForCounselor);
        }
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
      setMessages((prevMessages) => [...prevMessages, { role: "model", content: "Sorry, I encountered an error. Please try sending your message again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTalkToExpert = () => {
    router.push('/mental-health/schedule');
  };

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full h-[calc(100vh-10rem)]">
      <Card className="flex flex-col flex-1 shadow-xl rounded-lg overflow-hidden border-0">
        <CardHeader className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-center p-4">
          <div className="flex justify-between items-center w-full">
            <div className="text-left">
              <CardTitle className="text-xl font-bold text-primary flex items-center">
                <Sparkles className="mr-2 h-6 w-6" /> Aura
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Your safe space to talk, {STUDENT_NAME}.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleTalkToExpert}>
              <Phone className="mr-2 h-4 w-4" /> Talk to an Expert
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-end gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  {msg.role === "model" && (
                    <Avatar className="h-9 w-9 shrink-0" data-ai-hint="bot avatar">
                      <AvatarImage src="https://placehold.co/40x40/93c5fd/1e3a8a.png" alt="Aura Avatar" />
                      <AvatarFallback>AU</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                      }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <Avatar className="h-9 w-9 shrink-0" data-ai-hint="user avatar">
                      <AvatarImage src="https://placehold.co/40x40/c7d2fe/312e81.png" alt="User Avatar" />
                      <AvatarFallback>{STUDENT_NAME.substring(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-end gap-3 justify-start">
                  <Avatar className="h-9 w-9 shrink-0" data-ai-hint="bot avatar">
                    <AvatarImage src="https://placehold.co/40x40/93c5fd/1e3a8a.png" alt="Aura Avatar" />
                    <AvatarFallback>AU</AvatarFallback>
                  </Avatar>
                  <div className="max-w-[75%] rounded-2xl px-4 py-3 shadow-md bg-muted text-foreground rounded-bl-none">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                </div>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 border-t bg-muted/50">
          <form onSubmit={handleSubmit} className="flex w-full items-center space-x-3">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type your message to Aura..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-background h-11"
              disabled={isLoading}
              autoComplete="off"
            />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
