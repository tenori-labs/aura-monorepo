# Campusence

A comprehensive incident reporting and mental health support platform for college campuses. Campusence provides secure, role-based access for students, faculty, counselors, and administrators to report incidents, schedule counseling sessions, and manage campus safety.

## 🎯 Features

### Core Functionality
- **Incident Reporting**: Secure and anonymous form for reporting campus incidents
- **Report Tracking**: Dashboard to track submitted reports and their status
- **AI Report Classifier**: AI-powered categorization of reports based on keywords and patterns
- **Mental Health Support**: Schedule counseling appointments and access mental health resources
- **Self-Help Resources**: Curated library of self-help content and resources
- **Multi-Role Dashboard**: Separate interfaces for Students, Faculty, Counselors, and Admins

### User Roles
- **Students**: Report incidents, track reports, schedule counseling, access self-help resources
- **Faculty**: View assigned reports, manage student cases, access faculty portal
- **Counselors**: Manage appointments, view student profiles, track mental health sessions
- **Administrators**: Full access to all reports, assignment management, system administration

## 🛠️ Tech Stack

- **Framework**: Next.js 15.2.8 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **State Management**: TanStack Query (React Query)
- **Backend**: Firebase (Firestore, Authentication)
- **AI/ML**: Google Genkit AI for report classification and mental health chat
- **Icons**: Lucide React
- **Charts**: Recharts

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.x or higher
- **pnpm**: Version 8.x or higher (this project uses pnpm as the package manager)
- **Git**: For version control

### Installing pnpm

If you don't have pnpm installed, you can install it globally using npm:

```bash
npm install -g pnpm
```

Or using Homebrew (macOS):

```bash
brew install pnpm
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd aura-monorepo
```

### 2. Install Dependencies

```bash
pnpm install
```

```
test -d node_modules && echo "Dependencies installed" || echo "Dependencies not installed"
```


### 3. Environment Variables

Create a `.env.local` file in the root directory with the following variables (if needed):

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Genkit AI (if using AI features)
GOOGLE_GENAI_API_KEY=your_genai_api_key
```

### 4. Start the Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

The root page (`/`) will automatically redirect to the login page (`/login`).

## 📜 Available Scripts

### Development

```bash
# Start development server with Turbopack
pnpm dev

# Start Genkit AI development server
pnpm genkit:dev

# Start Genkit AI with watch mode
pnpm genkit:watch
```

### Production

```bash
# Build the application for production
pnpm build

# Start the production server
pnpm start
```

### Code Quality

```bash
# Run ESLint
pnpm lint

# Run TypeScript type checking
pnpm typecheck
```

## 📁 Project Structure

```
aura-monorepo/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin portal pages
│   │   ├── consent/           # Consent form page
│   │   ├── counselor/         # Counselor dashboard pages
│   │   ├── dashboard/         # Student dashboard
│   │   ├── faculty/            # Faculty portal pages
│   │   ├── login/             # Login pages (student, admin, faculty, counselor)
│   │   ├── mental-health/     # Mental health chat and scheduling
│   │   ├── report/            # Incident reporting pages
│   │   ├── self-help/         # Self-help resources
│   │   ├── faq/               # FAQ page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Root page (redirects to login)
│   ├── ai/                    # AI/Genkit flows
│   │   ├── flows/             # AI flow definitions
│   │   └── genkit.ts          # Genkit configuration
│   ├── components/            # React components
│   │   ├── layout/           # Layout components (Header, Sidebar)
│   │   ├── report/           # Report-related components
│   │   └── ui/               # Reusable UI components (shadcn/ui)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions and types
│   └── ...
├── docs/                     # Documentation
├── public/                   # Static assets
├── next.config.ts            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
```

## 🔐 Authentication

The application supports multiple login methods:

- **College ID/Password**: Traditional username and password authentication
- **Mobile Number**: Login using mobile number
- **Google Sign-In**: OAuth authentication (simulated in development)

Each user role has a dedicated login portal:
- Students: `/login`
- Faculty: `/login/faculty`
- Administrators: `/login/admin`
- Counselors: `/login/counselor`

## 🎨 Design System

The application follows a clean, professional design system:

- **Primary Color**: Deep Blue (#3F51B5) - Trust and authority
- **Background**: Light Gray (#F0F2F5) - Clean and neutral
- **Accent Color**: Teal (#009688) - Calm and security
- **Typography**: Geist Sans and Geist Mono fonts
- **Components**: Built with Radix UI primitives and styled with Tailwind CSS

## 🤖 AI Features

The application includes AI-powered features using Google Genkit:

- **Report Classification**: Automatically categorizes incident reports
- **Mental Health Chat**: AI-powered mental health support chat
- **Keyword Extraction**: Extracts relevant keywords from reports

To use AI features, ensure you have the Genkit development server running:

```bash
pnpm genkit:dev
```

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is already in use, Next.js will automatically try the next available port (3001, 3002, etc.).

### Font Loading Issues

If you encounter font loading errors, the application will fall back to system fonts. This is handled automatically.

### EMFILE: Too Many Open Files

If you see "EMFILE: too many open files" warnings, this is a file watcher limitation on macOS. It doesn't affect functionality, but you can increase the limit:

```bash
ulimit -n 4096
```

## 📝 Development Notes

- The project uses **pnpm** as the package manager. Do not use `npm` or `yarn`.
- TypeScript errors are ignored during build (`ignoreBuildErrors: true`), but you can check types using `pnpm typecheck`.
- The application uses Next.js Turbopack for faster development builds.
- Client components are marked with `"use client"` directive.
- Server components are used by default in the App Router.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

[Add your license information here]

## 🙏 Acknowledgments

Built with Next.js, Firebase, and Google Genkit AI.
