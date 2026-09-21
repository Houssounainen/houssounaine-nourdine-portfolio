import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath } from "@/lib/access";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const protectedPath = ["/dashboard", "/me", "/news", "/agenda", "/announcements", "/members", "/applications", "/organization", "/finance", "/documents", "/governance", "/operations", "/administration", "/notifications", "/requests", "/cases", "/analytics", "/communication", "/content", "/exports", "/admin"].some((x) => pathname===x || pathname.startsWith(x+"/"));

  if (protectedPath && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next",pathname);
    return NextResponse.redirect(login);
  }

  if (protectedPath && user) {
    const { data: profile } = await supabase.from("profiles").select("role,active").eq("id",user.id).maybeSingle();
    const adminEmail=process.env.AEDBVT_ADMIN_EMAIL?.trim().toLowerCase();
    const isBootstrapAdmin=Boolean(adminEmail&&user.email?.toLowerCase()===adminEmail);

    if (!profile && !isBootstrapAdmin) {
      const denied=request.nextUrl.clone();
      denied.pathname="/access-denied";
      denied.searchParams.set("reason","profile");
      return NextResponse.redirect(denied);
    }

    if (profile?.active===false) {
      const denied=request.nextUrl.clone();
      denied.pathname="/access-denied";
      denied.searchParams.set("reason","suspended");
      return NextResponse.redirect(denied);
    }

    if (profile && !canAccessPath(profile.role,pathname)) {
      const denied=request.nextUrl.clone();
      denied.pathname="/access-denied";
      denied.searchParams.set("reason","role");
      return NextResponse.redirect(denied);
    }
  }

  if (pathname === "/login" && user) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = "/dashboard";
    return NextResponse.redirect(dashboard);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
