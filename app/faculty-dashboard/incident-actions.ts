"use server";

import prisma from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { canAccessFacultyRoutes } from "@/lib/roles";

const VALID_STATUSES = ["pending", "reviewing", "closed"];

/**
 * Update the status of an incident report.
 * Only faculty/admin can perform this action.
 */
export async function updateIncidentStatus(incidentId: string, newStatus: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !canAccessFacultyRoutes(user)) {
        return { error: "Unauthorized" };
    }

    if (!VALID_STATUSES.includes(newStatus)) {
        return { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` };
    }

    try {
        await prisma.incidentReport.update({
            where: { id: incidentId },
            data: { status: newStatus },
        });
        return { success: true };
    } catch (err) {
        console.error("Failed to update incident status:", err);
        return { error: "Failed to update status." };
    }
}

/**
 * Update faculty notes on an incident report.
 * Only faculty/admin can perform this action.
 */
export async function updateIncidentNotes(incidentId: string, notes: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !canAccessFacultyRoutes(user)) {
        return { error: "Unauthorized" };
    }

    try {
        await prisma.incidentReport.update({
            where: { id: incidentId },
            data: { facultyNotes: notes },
        });
        return { success: true };
    } catch (err) {
        console.error("Failed to update incident notes:", err);
        return { error: "Failed to save notes." };
    }
}
