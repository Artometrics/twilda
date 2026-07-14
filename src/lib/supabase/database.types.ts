export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          pen_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          pen_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          pen_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: "free" | "pro" | "studio";
          status: "active" | "trialing" | "canceled" | "past_due";
          ai_credits_remaining: number;
          ai_credits_monthly: number;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "free" | "pro" | "studio";
          status?: "active" | "trialing" | "canceled" | "past_due";
          ai_credits_remaining?: number;
          ai_credits_monthly?: number;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "free" | "pro" | "studio";
          status?: "active" | "trialing" | "canceled" | "past_due";
          ai_credits_remaining?: number;
          ai_credits_monthly?: number;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      novels: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string;
          synopsis: string;
          cover_kind: "gatsby" | "cardinal" | "trinity";
          series_name: string | null;
          is_template: boolean;
          active_draft_id: string | null;
          last_opened_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          author?: string;
          synopsis?: string;
          cover_kind?: "gatsby" | "cardinal" | "trinity";
          series_name?: string | null;
          is_template?: boolean;
          active_draft_id?: string | null;
          last_opened_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          author?: string;
          synopsis?: string;
          cover_kind?: "gatsby" | "cardinal" | "trinity";
          series_name?: string | null;
          is_template?: boolean;
          active_draft_id?: string | null;
          last_opened_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      novel_drafts: {
        Row: {
          id: string;
          novel_id: string;
          name: string;
          slug: string;
          summary: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          novel_id: string;
          name?: string;
          slug?: string;
          summary?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          novel_id?: string;
          name?: string;
          slug?: string;
          summary?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      draft_references: {
        Row: {
          id: string;
          novel_id: string;
          draft_id: string;
          source_draft_id: string;
          source_type: "codex" | "snippet" | "draft";
          source_id: string | null;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          novel_id: string;
          draft_id: string;
          source_draft_id: string;
          source_type: "codex" | "snippet" | "draft";
          source_id?: string | null;
          note?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          novel_id?: string;
          draft_id?: string;
          source_draft_id?: string;
          source_type?: "codex" | "snippet" | "draft";
          source_id?: string | null;
          note?: string;
          created_at?: string;
        };
      };
      chapters: {
        Row: {
          id: string;
          novel_id: string;
          draft_id: string | null;
          sort_order: number;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          novel_id: string;
          draft_id?: string | null;
          sort_order?: number;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          novel_id?: string;
          draft_id?: string | null;
          sort_order?: number;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      scenes: {
        Row: {
          id: string;
          chapter_id: string;
          sort_order: number;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          sort_order?: number;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chapter_id?: string;
          sort_order?: number;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      codex_entries: {
        Row: {
          id: string;
          novel_id: string;
          draft_id: string | null;
          type: "character" | "location" | "lore" | "other";
          name: string;
          initials: string;
          tags: Json;
          aliases: Json;
          summary: string;
          description: string;
          mentions: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          novel_id: string;
          draft_id?: string | null;
          type?: "character" | "location" | "lore" | "other";
          name: string;
          initials?: string;
          tags?: Json;
          aliases?: Json;
          summary?: string;
          description?: string;
          mentions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          novel_id?: string;
          draft_id?: string | null;
          type?: "character" | "location" | "lore" | "other";
          name?: string;
          initials?: string;
          tags?: Json;
          aliases?: Json;
          summary?: string;
          description?: string;
          mentions?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      snippets: {
        Row: {
          id: string;
          novel_id: string;
          draft_id: string | null;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          novel_id: string;
          draft_id?: string | null;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          novel_id?: string;
          draft_id?: string | null;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_threads: {
        Row: {
          id: string;
          novel_id: string;
          draft_id: string | null;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          novel_id: string;
          draft_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          novel_id?: string;
          draft_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          role: "user" | "assistant" | "system";
          content?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
