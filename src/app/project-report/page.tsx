// src/app/project-report/page.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  LogIn,
  LayoutDashboard,
  FilePlus2,
  Smile,
  BookHeart,
  FileSignature,
  ShieldCheck,
  Briefcase,
  HeartHandshake,
  HelpCircle,
} from 'lucide-react';

// Helper component for consistent section styling
const ReportSection = ({
  icon,
  title,
  description,
  features,
  roles,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  roles: string[];
}) => (
  <Card className="mb-8 shadow-md">
    <CardHeader>
      <CardTitle className="text-2xl font-bold text-primary flex items-center">
        {icon}
        <span className="ml-3">{title}</span>
      </CardTitle>
      <CardDescription className="mt-1 text-md">{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">Key Features:</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">User Roles:</h3>
          <div className="flex flex-wrap gap-2">
            {roles.map((role, index) => (
              <Badge key={index} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ProjectReportPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-background text-foreground font-sans">
      <header className="text-center mb-10 border-b pb-6">
        <div className="flex justify-center items-center gap-3 mb-2">
          <FileText className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-extrabold tracking-tight">Campusence Project Report</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          A comprehensive overview of the application's screens and functionalities.
        </p>
        <p className="text-sm mt-2 text-muted-foreground">
          (This page can be printed or saved as a PDF using your browser's print function)
        </p>
      </header>

      <main className="space-y-12">
        <ReportSection
          icon={<LogIn className="h-8 w-8" />}
          title="1. Login & Authentication"
          description="The gateway to the application, providing secure, role-based access for all user types."
          features={[
            'Separate login portals for Students, Faculty, Admins, and Counselors.',
            'Supports multiple login methods: College ID/Password, Mobile Number, and Google Sign-In (simulated).',
            'Clean, split-screen UI with thematic imagery for a professional user experience.',
            'Automatically redirects users to their respective dashboards upon successful authentication.',
          ]}
          roles={['Student', 'Admin', 'Faculty', 'Counselor']}
        />

        <ReportSection
          icon={<LayoutDashboard className="h-8 w-8" />}
          title="2. Student Dashboard"
          description="The central hub for students to manage their activities, view appointments, and track reported incidents."
          features={[
            'Displays student profile information (name, ID, major).',
            'Shows the status of upcoming or pending counseling appointments.',
            'Provides quick access to schedule a new counseling session if none are booked.',
            'Presents a grid of cards summarizing previously reported incidents, with status badges.',
            'Includes a prominent button to report a new incident.',
          ]}
          roles={['Student']}
        />

        <ReportSection
          icon={<FilePlus2 className="h-8 w-8" />}
          title="3. Incident Reporting (New & Detail View)"
          description="A secure and detailed system for students to report incidents and track their resolution."
          features={[
            'New Report Form: A guided form to capture incident type, date/time, location, and a detailed description.',
            'Optional Anonymity: Students can choose to submit their email for follow-up or remain anonymous.',
            'AI Classification: On submission, the report text is analyzed by a Genkit AI flow to predict the category, assess confidence, and extract keywords.',
            'Detail View: Students can view their submitted reports, see the current status, and read a chronological timeline of events.',
            'Students can edit the description of an open report or choose to close it.',
          ]}
          roles={['Student']}
        />

        <ReportSection
          icon={<Smile className="h-8 w-8" />}
          title="4. Mental Health Chat (Aura)"
          description="An AI-powered conversational agent designed to provide a safe and supportive space for students."
          features={[
            "Empathetic AI Persona: 'Aura' is designed with a calm, supportive, and reflective tone.",
            'Dynamic Conversation: The AI can handle greetings, listen to student concerns, and provide supportive conversation based on psychotherapeutic principles.',
            'Counselor-In-the-Loop: The AI can incorporate specific instructions from a human counselor for a particular student, personalizing the interaction.',
            'Internal Analysis: In the background, the AI performs a risk assessment and analyzes psychological dimensions to provide insights for counselors (not shown to students).',
            "Prominent 'Talk to an Expert' button for easy access to scheduling professional help.",
          ]}
          roles={['Student']}
        />

        <ReportSection
          icon={<HeartHandshake className="h-8 w-8" />}
          title="5. Counselor Scheduling & Dashboard"
          description="A comprehensive suite of tools for counselors to manage their availability, appointments, and student interactions."
          features={[
            'Scheduling Page: Students can view available counselors, see their specialties, and book appointments based on real-time availability.',
            'Counselor Dashboard: Counselors can view their daily schedule, manually block off time slots, and see pending appointment requests.',
            'Appointment Management: Counselors can accept, decline, or propose to reschedule incoming appointment requests.',
            'Student Detail View: A dedicated page for each student, showing their history, Aura chat summaries, and predicted risk levels.',
            'Instruct Aura: Counselors can write and save instructions for the Aura chatbot to follow during its conversations with a specific student.',
          ]}
          roles={['Student', 'Counselor']}
        />

        <ReportSection
          icon={<BookHeart className="h-8 w-8" />}
          title="6. Self-Help Resources"
          description="A curated library of multimedia content to support student well-being and personal growth."
          features={[
            "Categorized Content: Resources are organized into tabs like 'Mindfulness', 'Stress Management', 'Academic Success', and 'Personal Safety & Awareness'.",
            'Multimedia Formats: Includes videos, articles, and interactive guides, each with a distinct card style.',
            'Detailed View: Clicking a resource opens a dedicated page with an embedded video player and a detailed, beautifully formatted written guide.',
            'Rich Topics: Covers a range of topics from meditation and time management to substance awareness and setting personal boundaries.',
          ]}
          roles={['Student', 'Counselor']}
        />

        <ReportSection
          icon={<FileSignature className="h-8 w-8" />}
          title="7. Anti-Ragging Consent Form"
          description="A digital form for students to provide their legally required anti-ragging undertaking."
          features={[
            'Displays the official UGC declaration text in a scrollable area.',
            'Captures student and parent/guardian agreement via checkboxes.',
            "Includes a 'digital signature' field where students type their name.",
            'Simulates a successful submission, providing the user with a confirmation and a simulated PDF download.',
          ]}
          roles={['Student']}
        />

        <ReportSection
          icon={<ShieldCheck className="h-8 w-8" />}
          title="8. Admin Portal"
          description="The central command center for administrators to manage and oversee all reported incidents."
          features={[
            'Interactive Infographics: Features a bar chart (incidents by type) and a pie chart (incidents by status) that act as interactive data slicers.',
            'Dynamic Filtering: Clicking on chart elements instantly filters the main report table below.',
            'Advanced Search & Filter Controls: Includes a search bar and dropdowns to further refine the list of incidents.',
            'Comprehensive Report Table: Displays all incidents with key details like ID, type, location, date, status, and assigned faculty.',
            'Direct link to view full details of any report.',
          ]}
          roles={['Admin']}
        />

        <ReportSection
          icon={<Briefcase className="h-8 w-8" />}
          title="9. Faculty Portal"
          description="A dedicated space for faculty members to manage incidents assigned to them."
          features={[
            "Faculty Profile: Displays the faculty member's personal and departmental information.",
            'Assigned Reports List: A clean table view of all incidents currently assigned to the faculty member.',
            'Detailed Report View: Faculty can open a report to see the full description, AI classification, and a complete chronological timeline of events.',
            "Update & Action: Faculty can update the report's status (e.g., to 'Resolved') and add their own private notes and observations.",
            "All actions taken by the faculty are automatically logged in the report's timeline.",
          ]}
          roles={['Faculty']}
        />

        <ReportSection
          icon={<HelpCircle className="h-8 w-8" />}
          title="10. FAQ Page"
          description="A helpful resource for users to find answers to common questions about the incident reporting process."
          features={[
            'Uses an accordion-style layout for a clean and user-friendly experience.',
            'Covers key questions about anonymity, the reporting process, and data privacy.',
            'Provides clear, concise answers to help build user trust and confidence in the system.',
          ]}
          roles={['Student', 'Admin', 'Faculty', 'Counselor']}
        />
      </main>

      <footer className="text-center mt-12 pt-6 border-t">
        <p className="text-sm text-muted-foreground">End of Report. Generated by Campusence AI.</p>
      </footer>
    </div>
  );
}
