import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { getAuthCallbackUrl, getSafeRedirect } from "@/lib/auth";
import { createSSRClient } from "@/lib/supabase/ssr";

export const server = {
  signUp: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email("Enter a valid email address."),
      password: z.string().min(6, "Password must be at least 6 characters."),
      display_name: z
        .string()
        .trim()
        .min(1, "Display name is required.")
        .max(80, "Display name is too long."),
    }),
    handler: async (input, context) => {
      const supabase = createSSRClient({
        request: context.request,
        cookies: context.cookies,
      });

      const { error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { display_name: input.display_name },
          emailRedirectTo: getAuthCallbackUrl(),
        },
      });

      if (error) {
        return { success: false as const, message: error.message };
      }

      return {
        success: true as const,
        message: "Check your email to confirm your account, then sign in.",
      };
    },
  }),

  signIn: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email("Enter a valid email address."),
      password: z.string().min(1, "Password is required."),
      next: z.string().optional(),
    }),
    handler: async (input, context) => {
      const supabase = createSSRClient({
        request: context.request,
        cookies: context.cookies,
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (error) {
        return { success: false as const, message: error.message };
      }

      return {
        success: true as const,
        redirectTo: getSafeRedirect(input.next),
      };
    },
  }),

  signOut: defineAction({
    handler: async (_input, context) => {
      const supabase = createSSRClient({
        request: context.request,
        cookies: context.cookies,
      });

      const { error } = await supabase.auth.signOut();

      if (error) {
        return { success: false as const, message: error.message };
      }

      return { success: true as const, redirectTo: "/forms/login" };
    },
  }),

  resetPassword: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email("Enter a valid email address."),
    }),
    handler: async (input, context) => {
      const supabase = createSSRClient({
        request: context.request,
        cookies: context.cookies,
      });

      const { error } = await supabase.auth.resetPasswordForEmail(
        input.email,
        { redirectTo: getAuthCallbackUrl() },
      );

      if (error) {
        return { success: false as const, message: error.message };
      }

      return {
        success: true as const,
        message: "If that email is registered, you will receive a reset link shortly.",
      };
    },
  }),
};
