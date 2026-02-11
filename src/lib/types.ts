
import type { ClassifyIncidentReportOutput } from "@/ai/flows/classify-incident-report";

export interface TimelineEvent {
  id: string;
  date: string; // ISO string
  actor: 'Student' | 'System' | 'Faculty' | 'Admin';
  action: string; // e.g., "Report Submitted", "Status changed to In Review", "Note Added"
  details?: string; // Optional detailed description or content of the popover
  statusChange?: { from: Report['status'] | null; to: Report['status'] };
  noteContent?: string;
}

export interface Report {
  id: string;
  incidentType: string;
  dateTime: string; // ISO string
  location: string;
  description:string;
  contactInfo?: string; // Optional
  status: 'Submitted' | 'In Review' | 'Resolved' | 'Closed';
  dateReported: string; // ISO string
  lastUpdated: string; // ISO string
  aiClassification?: ClassifyIncidentReportOutput;
  assignedTo?: string; // Optional: Name of the faculty member assigned
  facultyNotes?: string; // Optional: Notes added by faculty
  timelineEvents?: TimelineEvent[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

// Represents a specific 30-minute slot that a counselor can mark as unavailable
export interface CounselorTimeSlot {
  id: string; // Typically date-time based for uniqueness
  time: string; // e.g., "09:00 AM"
}

export interface Counselor {
  id: string;
  name: string;
  specialty: string;
  avatarUrl?: string;
  // This structure is for the student-facing scheduling page
  availability?: Record<string, { id: string; time: string; isBooked: boolean }[]>;
  // This structure is for the counselor's own dashboard to manage their blocks
  unavailableSlots?: Record<string, CounselorTimeSlot[]>; 
  email?: string;
  office?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  // other student details
}


export interface BookedAppointment {
  id: string;
  studentId: string; 
  studentName: string; // Added for easier access
  counselorId: string;
  counselorName: string;
  counselorSpecialty: string;
  counselorAvatarUrl?: string;
  appointmentDate: string; // "YYYY-MM-DD"
  appointmentTime: string; // e.g., "09:00 AM"
  status:
    | "Upcoming" 
    | "PendingConfirmation" 
    | "ConfirmedByCounselor" 
    | "Completed"
    | "CancelledByStudent"
    | "CancelledByCounselor"
    | "RescheduleProposedByCounselor"
    | "RescheduleProposedByStudent";
  bookingDate: string; // ISO string when appointment was booked
  studentNotes?: string;
  counselorNotes?: string; // Notes made by the counselor after a session
  auraRiskAssessment?: "No Risk" | "At Risk" | "High Risk";
  auraChatSummary?: string;
  counselorInstructionsForAura?: string; // Instructions from counselor to Aura for this student
  auraObservationsForCounselor?: string; // Aura's notes/observations for the counselor
  meetingLink?: string; // Optional link for the virtual meeting
}

// This is for the counselor's availability calendar view, distinct from their "unavailable" personal blocks
export interface TimeSlot { // Used for generic time slot display in scheduling, not for counselor's core availability record
  id: string;
  time: string;
  isBooked?: boolean; // Present when from Counselor.availability
}

export interface SelfHelpContent {
  id: string;
  title: string;
  description: string;
  category: "Mindfulness" | "Stress Management" | "Academic Success" | "Healthy Habits" | "Personal Safety & Awareness";
  type: "Video" | "Audio" | "Article" | "Image" | "Interactive Guide";
  imageUrl: string;
  source?: string; // General purpose link, optional now
  duration?: string; // e.g. "5 min", "20 min read"
  detailedText: string;
  videoUrl?: string;
}
