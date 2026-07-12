import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/ssr";

const PROTECTED_PREFIXES = ["/novels", "/account"];

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  context.locals.supabase = null;

  if (!isSupabaseConfigured()) {
    return next();
  }

  const supabase = createSupabaseServerClient(context.cookies, context.request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  context.locals.supabase = supabase;
  context.locals.user = user ?? null;

  const path = context.url.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const redirect = encodeURIComponent(path + context.url.search);
    return context.redirect(`/forms/login/?redirect=${redirect}`);
  }

  return next();
});
