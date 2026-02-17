"use server";

import prisma from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/roles";

// The 6 incident categories from the report form
const INCIDENT_CATEGORIES = [
    "Academic Integrity",
    "Harassment/Bullying",
    "Safety/Security",
    "Medical Emergency",
    "Facilities Issue",
    "Other",
];

/**
 * Get all category assignments with their assigned faculty.
 * Returns all 6 categories, with assignment info if it exists.
 */
export async function getCategoryAssignments() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || getUserRole(user) !== "admin") {
        return { error: "Unauthorized" };
    }

    const assignments = await prisma.categoryAssignment.findMany();

    // Build a map of category -> assignment
    const assignmentMap = new Map(
        assignments.map((a: { category: string; facultyId: string; facultyEmail: string; assignedBy: string | null }) => [a.category, a])
    );

    // Return all categories with their assignment status
    const categories = INCIDENT_CATEGORIES.map((category) => {
        const assignment = assignmentMap.get(category);
        return {
            category,
            facultyId: assignment?.facultyId ?? null,
            facultyEmail: assignment?.facultyEmail ?? null,
            assignedBy: assignment?.assignedBy ?? null,
        };
    });

    return { categories };
}

/**
 * Assign a faculty member to a category.
 */
export async function assignCategory(
    category: string,
    facultyId: string,
    facultyName: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || getUserRole(user) !== "admin") {
        return { error: "Unauthorized" };
    }

    if (!INCIDENT_CATEGORIES.includes(category)) {
        return { error: "Invalid category" };
    }

    await prisma.categoryAssignment.upsert({
        where: { category },
        update: {
            facultyId,
            facultyEmail: facultyName,
            assignedBy: user.email ?? user.id,
        },
        create: {
            category,
            facultyId,
            facultyEmail: facultyName,
            assignedBy: user.email ?? user.id,
        },
    });

    return { success: true };
}

/**
 * Remove a faculty assignment from a category.
 */
export async function removeAssignment(category: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || getUserRole(user) !== "admin") {
        return { error: "Unauthorized" };
    }

    try {
        await prisma.categoryAssignment.delete({
            where: { category },
        });
    } catch {
        // Assignment didn't exist, that's fine
    }

    return { success: true };
}

/**
 * Get list of faculty users from the profiles table.
 * Admin RLS policy allows admins to read all profiles.
 */
export async function getFacultyUsers() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || getUserRole(user) !== "admin") {
        return { error: "Unauthorized", users: [] };
    }

    // Query profiles table — admin RLS allows reading all profiles
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, role, full_name")
        .in("role", ["faculty", "admin"]);

    if (error) {
        console.error("Failed to fetch faculty profiles:", error);
        return { error: "Failed to fetch faculty users", users: [] };
    }

    // We need emails — get them from Supabase auth via the current session
    // Since profiles don't store email, we'll use the user ID to look them up
    // For now, show full_name and store the ID. Email can be resolved from the profile.
    const users = (profiles ?? []).map((p: any) => ({
        id: p.id as string,
        name: p.full_name || "Unknown",
        role: p.role as string,
    }));

    return { users };
}
