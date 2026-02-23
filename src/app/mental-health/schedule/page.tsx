'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Counselor, TimeSlot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format, parse, addDays, parseISO, isValid } from 'date-fns';
import {
  ChevronLeft,
  Clock,
  UserCheck,
  CalendarDays,
  Sparkles,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const dummyCounselors: Counselor[] = [
  {
    id: 'c1',
    name: 'Dr. Emily Carter',
    specialty: 'Stress & Anxiety Management',
    avatarUrl: 'https://placehold.co/80x80/a5b4fc/1e293b.png', // Purple-ish
    availability: {
      [format(addDays(new Date(), 1), 'yyyy-MM-dd')]: [
        { id: 't1', time: '09:00 AM', isBooked: false },
        { id: 't2', time: '10:00 AM', isBooked: true },
        { id: 't3', time: '11:00 AM', isBooked: false },
      ],
      [format(addDays(new Date(), 2), 'yyyy-MM-dd')]: [
        { id: 't4', time: '02:00 PM', isBooked: false },
        { id: 't5', time: '03:00 PM', isBooked: false },
      ],
      [format(addDays(new Date(), 3), 'yyyy-MM-dd')]: [
        { id: 't6', time: '09:30 AM', isBooked: false },
        { id: 't7', time: '10:30 AM', isBooked: true },
      ],
    },
  },
  {
    id: 'c2',
    name: 'Mr. David Lee',
    specialty: 'Academic & Career Counseling',
    avatarUrl: 'https://placehold.co/80x80/93c5fd/1e3a8a.png', // Blue
    availability: {
      [format(addDays(new Date(), 1), 'yyyy-MM-dd')]: [
        { id: 't8', time: '01:00 PM', isBooked: false },
        { id: 't9', time: '02:00 PM', isBooked: false },
      ],
      [format(addDays(new Date(), 3), 'yyyy-MM-dd')]: [
        { id: 't10', time: '10:00 AM', isBooked: true },
        { id: 't11', time: '11:00 AM', isBooked: false },
        { id: 't12', time: '01:00 PM', isBooked: false },
      ],
      [format(addDays(new Date(), 4), 'yyyy-MM-dd')]: [
        { id: 't13', time: '03:00 PM', isBooked: false },
      ],
    },
  },
  {
    id: 'c3',
    name: 'Ms. Sarah Chen',
    specialty: 'Relationship & Social Support',
    avatarUrl: 'https://placehold.co/80x80/a7f3d0/047857.png', // Green
    availability: {
      [format(addDays(new Date(), 2), 'yyyy-MM-dd')]: [
        { id: 't14', time: '10:00 AM', isBooked: false },
        { id: 't15', time: '11:00 AM', isBooked: false },
      ],
      [format(addDays(new Date(), 5), 'yyyy-MM-dd')]: [
        { id: 't16', time: '09:00 AM', isBooked: true },
        { id: 't17', time: '10:00 AM', isBooked: false },
      ],
    },
  },
];

export default function ScheduleCounselorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (selectedCounselor && selectedDate) {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const slotsForDate = selectedCounselor.availability?.[dateString] || [];
      setAvailableSlots(slotsForDate.filter((slot) => !slot.isBooked));
      setSelectedSlot(null); // Reset selected slot when date changes
    } else {
      setAvailableSlots([]);
    }
  }, [selectedCounselor, selectedDate]);

  const handleCounselorSelect = (counselorId: string) => {
    const counselor = dummyCounselors.find((c) => c.id === counselorId);
    setSelectedCounselor(counselor || null);
    setSelectedDate(undefined); // Reset date when counselor changes
    setSelectedSlot(null);
  };

  const handleScheduleAppointment = () => {
    if (!selectedCounselor || !selectedDate || !selectedSlot) {
      toast({
        title: 'Incomplete Selection',
        description: 'Please select a counselor, date, and time slot.',
        variant: 'destructive',
      });
      return;
    }
    setIsScheduling(true);
    // Simulate API call
    setTimeout(() => {
      toast({
        title: 'Appointment Scheduled! (Simulated)',
        description: `Your appointment with ${selectedCounselor.name} on ${format(selectedDate, 'PPP')} at ${selectedSlot.time} has been booked.`,
        duration: 5000,
      });
      // Mark slot as booked (locally, for this session)
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      if (selectedCounselor.availability?.[dateString]) {
        const slotIndex = selectedCounselor.availability[dateString].findIndex(
          (s) => s.id === selectedSlot.id
        );
        if (slotIndex > -1) {
          // This is a dummy update for demo purposes
          // In a real app, this would be managed by backend state
          console.log(
            `Marking slot ${selectedSlot.id} as booked for ${selectedCounselor.name} on ${dateString}`
          );
        }
      }
      setSelectedSlot(null);
      // Optionally, reset other selections or navigate away
      // setSelectedCounselor(null);
      // setSelectedDate(undefined);
      setIsScheduling(false);
    }, 1500);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Ensure comparison is only for date part

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-2">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Mental Health Chat
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center">
            <CalendarDays className="mr-3 h-8 w-8" /> Schedule an Appointment
          </CardTitle>
          <CardDescription className="text-md">
            Book a session with one of our available counselors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Step 1: Select Counselor */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center">
              <UserCheck className="mr-2 h-6 w-6 text-primary" /> Select a Counselor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dummyCounselors.map((counselor) => (
                <Card
                  key={counselor.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${selectedCounselor?.id === counselor.id ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}`}
                  onClick={() => handleCounselorSelect(counselor.id)}
                >
                  <CardHeader className="flex flex-row items-center gap-4 p-4">
                    <Avatar
                      className="h-16 w-16 border-2 border-primary"
                      data-ai-hint="counselor avatar"
                    >
                      <AvatarImage src={counselor.avatarUrl} alt={counselor.name} />
                      <AvatarFallback>{counselor.name.substring(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{counselor.name}</CardTitle>
                      <CardDescription className="text-xs">{counselor.specialty}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          {/* Step 2: Select Date (shown if counselor is selected) */}
          {selectedCounselor && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                <CalendarDays className="mr-2 h-6 w-6 text-primary" /> Select a Date for{' '}
                {selectedCounselor.name}
              </h2>
              <div className="flex justify-center p-2 bg-muted/30 rounded-md border">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date: Date) => {
                    const dateString = format(date, 'yyyy-MM-dd');
                    const slots = selectedCounselor.availability?.[dateString] || [];
                    const availableFutureSlots = slots.filter((s) => !s.isBooked).length > 0;
                    return date < today || !availableFutureSlots;
                  }}
                  initialFocus
                />
              </div>
            </section>
          )}

          {/* Step 3: Select Time Slot (shown if date and counselor are selected) */}
          {selectedCounselor && selectedDate && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                <Clock className="mr-2 h-6 w-6 text-primary" /> Select an Available Time on{' '}
                {format(selectedDate, 'PPP')}
              </h2>
              {availableSlots.length > 0 ? (
                <RadioGroup
                  value={selectedSlot?.id}
                  onValueChange={(slotId: string) => {
                    const slot = availableSlots.find((s) => s.id === slotId);
                    setSelectedSlot(slot || null);
                  }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                >
                  {availableSlots.map((slot) => (
                    <Label
                      key={slot.id}
                      htmlFor={slot.id}
                      className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground transition-colors
                        ${selectedSlot?.id === slot.id ? 'border-primary bg-primary/10 text-primary' : 'border-muted'}
                        ${slot.isBooked ? 'cursor-not-allowed opacity-50 bg-muted/50' : 'cursor-pointer'}`}
                    >
                      <RadioGroupItem
                        value={slot.id}
                        id={slot.id}
                        className="sr-only"
                        disabled={slot.isBooked}
                      />
                      <span className="text-lg font-medium">{slot.time}</span>
                      {slot.isBooked && <span className="text-xs mt-1">(Booked)</span>}
                    </Label>
                  ))}
                </RadioGroup>
              ) : (
                <Card className="bg-amber-50 border-amber-200 p-4 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                  <p className="text-amber-700 font-medium">
                    No available slots for {selectedCounselor.name} on {format(selectedDate, 'PPP')}
                    .
                  </p>
                  <p className="text-xs text-amber-600">
                    Please try selecting a different date or counselor.
                  </p>
                </Card>
              )}
            </section>
          )}
        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button
            size="lg"
            className="w-full sm:w-auto mx-auto"
            onClick={handleScheduleAppointment}
            disabled={!selectedCounselor || !selectedDate || !selectedSlot || isScheduling}
          >
            {isScheduling ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5" />
            )}
            {isScheduling ? 'Scheduling...' : 'Confirm Appointment'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
