import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
                    cookiesToSet.forEach(({ name, value, options }) =>
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

    // Define protected and auth-only routes
    const protectedRoutes = [
        "/dashboard",
        "/admin-dashboard",
        "/faculty-dashboard",
        "/report-incident",
        "/well-being",
        "/consent-form",
        "/charts",
    ];
    const authRoutes = ["/login", "/signup"];

    const pathname = request.nextUrl.pathname;

    // Redirect unauthenticated users away from protected routes
    if (
        !user &&
        protectedRoutes.some((route) => pathname.startsWith(route))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth pages
    if (
        user &&
        authRoutes.some((route) => pathname.startsWith(route))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    // IMPORTANT: You *must* return the supabaseResponse object as is.
    // If you need to modify the NextResponse, do so on supabaseResponse directly.
    return supabaseResponse;
}
