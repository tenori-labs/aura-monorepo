"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/roles";

export async function login(formData: FormData) {
    const supabase = await createClient();

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const { error, data: authData } = await supabase.auth.signInWithPassword(data);

    if (error) {
        redirect(`/?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");

    // Redirect based on role
    // Redirect based on role
    const role = authData.user?.app_metadata?.role || "student";
    if (role === "faculty") {
        redirect("/faculty-dashboard");
    } else if (role === "admin") {
        redirect("/admin-dashboard");
    } else {
        redirect("/dashboard");
    }
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const role = (formData.get("role") as UserRole) || "student";

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role,
                full_name: fullName,
            },
        },
    });

    if (error) {
        redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");
    redirect("/signup?message=Check your email to confirm your account");
}

export async function signout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/");
}
