import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { clerkClient, type WebhookEvent } from '@clerk/nextjs/server';

/**
 * Clerk user.created webhook.
 *
 * Promotes the role the user requested at sign-up time
 * (stored in `unsafeMetadata.requestedRole`) into `publicMetadata.role`,
 * which is server-trusted and read by the rest of the app.
 *
 * Allowlist: only `student`, `faculty`, `admin`. Everything else falls back
 * to `student`. This is the security boundary — never trust the client value.
 */
const ALLOWED_ROLES = ['student', 'faculty', 'admin'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function coerceRole(value: unknown): AllowedRole {
  if (typeof value !== 'string') return 'student';
  return (ALLOWED_ROLES as readonly string[]).includes(value)
    ? (value as AllowedRole)
    : 'student';
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error('[Clerk webhook] CLERK_WEBHOOK_SIGNING_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();

  let evt: WebhookEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('[Clerk webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (evt.type === 'user.created') {
    const { id, unsafe_metadata, public_metadata } = evt.data;

    // Diagnostic: dump what we got so we can see if Clerk is dropping fields.
    console.log('[Clerk webhook] user.created received:', {
      id,
      unsafe_metadata: unsafe_metadata ?? null,
      public_metadata: public_metadata ?? null,
    });

    // Don't touch users that already have a role.
    if (typeof public_metadata?.role === 'string') {
      console.log('[Clerk webhook] Skipped — role already set:', public_metadata.role);
      return NextResponse.json({ ok: true, skipped: 'role already set' });
    }

    // If the signup didn't pass a role, leave it alone — the inline server
    // action `setMyRoleAfterSignup` will handle it.
    const requestedRoleRaw = (unsafe_metadata as Record<string, unknown> | undefined)?.requestedRole;
    if (typeof requestedRoleRaw !== 'string') {
      console.log('[Clerk webhook] Skipped — no requestedRole in unsafeMetadata. Inline action should set it.');
      return NextResponse.json({
        ok: true,
        skipped: 'no requestedRole in unsafeMetadata',
      });
    }

    const role = coerceRole(requestedRoleRaw);

    try {
      const client = await clerkClient();
      await client.users.updateUser(id, {
        publicMetadata: { ...public_metadata, role },
      });
      console.log(`[Clerk webhook] Set publicMetadata.role=${role} for user ${id}`);
    } catch (err) {
      console.error('[Clerk webhook] Failed to set publicMetadata:', err);
      return NextResponse.json({ error: 'Failed to update user metadata' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
