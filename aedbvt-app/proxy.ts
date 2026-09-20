import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const p = request.nextUrl.pathname;
  const protectedPath = ["/dashboard", "/news", "/agenda", "/announcements", "/members", "/organization", "/finance", "/documents", "/governance", "/admin"].some((x) => p.startsWith(x));

  if (protectedPath && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    return NextResponse.redirect(login);
  }
  if (p === "/login" && user) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = "/dashboard";
    return NextResponse.redirect(dashboard);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
