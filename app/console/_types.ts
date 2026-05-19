/**
 * Flat shape of a tenant as exposed to the console UI. Mirrors the Prisma
 * `Tenant` model but with serializable types (Dates → ISO strings) so it
 * can pass through server-component → client-component props cleanly.
 */
export interface ConsoleTenant {
  id: string;
  subdomain: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  status: 'active' | 'suspended' | 'deleted';
  planType: 'free' | 'pro' | 'enterprise';

  maxStudents: number;
  maxFaculty: number;
  creditsRemaining: number;

  aiAssistantEnabled: boolean;
  shadowCasesEnabled: boolean;
  bulletinEnabled: boolean;

  allowedEmailDomains: string[];

  clerkOrgId: string | null;

  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy: string | null;
}

/** What a tenant looks like in the list (sidebar / table). Subset of the full row. */
export interface ConsoleTenantListItem {
  id: string;
  subdomain: string;
  name: string;
  status: ConsoleTenant['status'];
  planType: ConsoleTenant['planType'];
  creditsRemaining: number;
  createdAt: string;
}

/** Patch payload sent to `updateTenant`. All fields optional. */
export type ConsoleTenantPatch = Partial<
  Omit<ConsoleTenant, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'clerkOrgId'>
>;
