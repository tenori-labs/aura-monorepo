import type { ConsoleTenant, ConsoleTenantPatch } from '@/app/console/_types';

/**
 * Whitelist of fields the console is allowed to PATCH on a tenant. Anything
 * outside this list in an incoming payload is silently dropped — protects
 * against accidental mass-assignment.
 */
export const CONSOLE_TENANT_FIELDS = [
  'subdomain',
  'name',
  'logoUrl',
  'primaryColor',
  'status',
  'planType',
  'maxStudents',
  'maxFaculty',
  'creditsRemaining',
  'aiAssistantEnabled',
  'shadowCasesEnabled',
  'bulletinEnabled',
  'allowedEmailDomains',
] as const satisfies readonly (keyof ConsoleTenantPatch)[];

const FIELD_SET = new Set<string>(CONSOLE_TENANT_FIELDS);

/**
 * Strips an incoming PATCH body to only fields in the whitelist.
 * Returns a clean object plus a list of rejected keys for logging.
 */
export function whitelistTenantPatch(input: unknown): {
  patch: Partial<Record<(typeof CONSOLE_TENANT_FIELDS)[number], unknown>>;
  rejected: string[];
} {
  if (!input || typeof input !== 'object') return { patch: {}, rejected: [] };

  const patch: Record<string, unknown> = {};
  const rejected: string[] = [];
  for (const [k, v] of Object.entries(input)) {
    if (FIELD_SET.has(k)) {
      patch[k] = v;
    } else {
      rejected.push(k);
    }
  }
  return { patch: patch as ReturnType<typeof whitelistTenantPatch>['patch'], rejected };
}

/**
 * Serializes a Prisma `Tenant` row into the wire-friendly `ConsoleTenant`
 * shape (Dates → ISO strings, undefined → null).
 */
export function serializeTenant(row: {
  id: string;
  subdomain: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  status: string;
  planType: string;
  maxStudents: number;
  maxFaculty: number;
  creditsRemaining: number;
  aiAssistantEnabled: boolean;
  shadowCasesEnabled: boolean;
  bulletinEnabled: boolean;
  allowedEmailDomains: string[];
  clerkOrgId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}): ConsoleTenant {
  return {
    id: row.id,
    subdomain: row.subdomain,
    name: row.name,
    logoUrl: row.logoUrl,
    primaryColor: row.primaryColor,
    status: row.status as ConsoleTenant['status'],
    planType: row.planType as ConsoleTenant['planType'],
    maxStudents: row.maxStudents,
    maxFaculty: row.maxFaculty,
    creditsRemaining: row.creditsRemaining,
    aiAssistantEnabled: row.aiAssistantEnabled,
    shadowCasesEnabled: row.shadowCasesEnabled,
    bulletinEnabled: row.bulletinEnabled,
    allowedEmailDomains: row.allowedEmailDomains,
    clerkOrgId: row.clerkOrgId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
  };
}
