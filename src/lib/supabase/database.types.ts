export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          pen_name: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          pen_name?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          pen_name?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      storyboard_panels: {
        Row: {
          id: string;
          novel_id: string;
          draft_id: string | null;
          user_id: string;
          sort_order: number;
          caption: string;
          prompt: string;
          image_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          novel_id: string;
          draft_id?: string | null;
          user_id: string;
          sort_order?: number;
          caption?: string;
          prompt?: string;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          novel_id?: string;
          draft_id?: string | null;
          user_id?: string;
          sort_order?: number;
          caption?: string;
          prompt?: string;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };
      novels: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string;
          synopsis: string;
          cover_kind: "gatsby" | "cardinal" | "trinity" | "plain";
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
          cover_kind?: "gatsby" | "cardinal" | "trinity" | "plain";
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
          cover_kind?: "gatsby" | "cardinal" | "trinity" | "plain";
          series_name?: string | null;
          is_template?: boolean;
          active_draft_id?: string | null;
          last_opened_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      atlas_collections: {
        Row: {
          id: string;
          user_id: string;
          seed_entity_id: string;
          title: string | null;
          kind: string | null;
          summary: string | null;
          portrait_url: string | null;
          source_url: string | null;
          license: string | null;
          attribution: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          seed_entity_id: string;
          title?: string | null;
          kind?: string | null;
          summary?: string | null;
          portrait_url?: string | null;
          source_url?: string | null;
          license?: string | null;
          attribution?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          seed_entity_id?: string;
          title?: string | null;
          kind?: string | null;
          summary?: string | null;
          portrait_url?: string | null;
          source_url?: string | null;
          license?: string | null;
          attribution?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      atlas_enrich_cache: {
        Row: {
          cache_key: string;
          payload: Json;
          fetched_at: string | null;
        };
        Insert: {
          cache_key: string;
          payload: Json;
          fetched_at?: string | null;
        };
        Update: {
          cache_key?: string;
          payload?: Json;
          fetched_at?: string | null;
        };
        Relationships: [];
      };
      gotha_persons: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          birth_year: number | null;
          birth_month: number | null;
          birth_day: number | null;
          birth_place: string | null;
          birth_lat: number | null;
          birth_lng: number | null;
          death_year: number | null;
          family_name: string | null;
          notes: string | null;
          portrait_url: string | null;
          is_self: boolean;
          atlas_entity_id: string | null;
          atlas_seed_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          birth_year?: number | null;
          birth_month?: number | null;
          birth_day?: number | null;
          birth_place?: string | null;
          birth_lat?: number | null;
          birth_lng?: number | null;
          death_year?: number | null;
          family_name?: string | null;
          notes?: string | null;
          portrait_url?: string | null;
          is_self?: boolean;
          atlas_entity_id?: string | null;
          atlas_seed_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          birth_year?: number | null;
          birth_month?: number | null;
          birth_day?: number | null;
          birth_place?: string | null;
          birth_lat?: number | null;
          birth_lng?: number | null;
          death_year?: number | null;
          family_name?: string | null;
          notes?: string | null;
          portrait_url?: string | null;
          is_self?: boolean;
          atlas_entity_id?: string | null;
          atlas_seed_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
