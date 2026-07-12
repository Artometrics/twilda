import { defineMiddleware } from "astro:middleware";
import { createSSRClient } from "@/lib/supabase/ssr";

/** Routes that need cookie session refresh (SSR). Skips static prerender pages. */
function needsSessionRefresh(pathname: string): boolean {
  return (
    pathname.startsWith("/forms/login") ||
    pathname.startsWith("/forms/signup") ||
    pathname.startsWith("/forms/forgot") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/api/")
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = new URL(context.request.url).pathname;

  if (!needsSessionRefresh(pathname)) {
    return next();
  }

  const supabase = createSSRClient({
    request: context.request,
    cookies: context.cookies,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  context.locals.supabase = supabase;
  context.locals.user = user;

  return next();
});
