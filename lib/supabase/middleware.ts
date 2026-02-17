import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
    ADMIN_ONLY_ROUTES,
    FACULTY_ROUTES,
    ALL_PROTECTED_ROUTES,
    getDashboardPath,
    canAccessFacultyRoutes,
    isAdmin,
} from "@/lib/roles";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Do NOT add any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // 1. Redirect unauthenticated users away from ALL protected routes
    if (
        !user &&
        ALL_PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    if (user) {
        // 2. Block non-admins from admin-only routes
        if (
            !isAdmin(user) &&
            ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))
        ) {
            const url = request.nextUrl.clone();
            // Redirect faculty to their dashboard, students to theirs
            url.pathname = getDashboardPath(user);
            return NextResponse.redirect(url);
        }

        // 3. Block students from faculty routes
        //    (admins pass through since canAccessFacultyRoutes includes them)
        if (
            !canAccessFacultyRoutes(user) &&
            FACULTY_ROUTES.some((route) => pathname.startsWith(route))
        ) {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
        }

        // 4. Redirect authenticated users away from auth pages (Home/Login & Signup)
        if (pathname === "/" || pathname === "/signup") {
            const url = request.nextUrl.clone();
            url.pathname = getDashboardPath(user);
            return NextResponse.redirect(url);
        }
    }

    // IMPORTANT: You *must* return the supabaseResponse object as is.
    return supabaseResponse;
}
