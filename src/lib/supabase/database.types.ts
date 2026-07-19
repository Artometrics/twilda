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
      };
      manga_pages: {
        Row: {
          id: string;
          novel_id: string;
          draft_id: string | null;
          user_id: string;
          scene_key: string;
          sequence: number;
          page_number: number;
          title: string;
          summary: string;
          script_notes: string;
          layout: string;
          page_image_path: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          novel_id: string;
          draft_id?: string | null;
          user_id: string;
          scene_key?: string;
          sequence?: number;
          page_number?: number;
          title?: string;
          summary?: string;
          script_notes?: string;
          layout?: string;
          page_image_path?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          novel_id?: string;
          draft_id?: string | null;
          user_id?: string;
          scene_key?: string;
          sequence?: number;
          page_number?: number;
          title?: string;
          summary?: string;
          script_notes?: string;
          layout?: string;
          page_image_path?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      manga_panels: {
        Row: {
          id: string;
          page_id: string;
          novel_id: string;
          user_id: string;
          slot: number;
          sort_order: number;
          caption: string;
          dialogue: string;
          sfx: string;
          notes: string;
          prompt: string;
          negative_notes: string;
          image_path: string | null;
          source_url: string | null;
          higgsfield_job_id: string | null;
          research_links: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          novel_id: string;
          user_id: string;
          slot?: number;
          sort_order?: number;
          caption?: string;
          dialogue?: string;
          sfx?: string;
          notes?: string;
          prompt?: string;
          negative_notes?: string;
          image_path?: string | null;
          source_url?: string | null;
          higgsfield_job_id?: string | null;
          research_links?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_id?: string;
          novel_id?: string;
          user_id?: string;
          slot?: number;
          sort_order?: number;
          caption?: string;
          dialogue?: string;
          sfx?: string;
          notes?: string;
          prompt?: string;
          negative_notes?: string;
          image_path?: string | null;
          source_url?: string | null;
          higgsfield_job_id?: string | null;
          research_links?: Json;
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
          appearance_lock: string;
          element_id: string;
          ref_image_path: string | null;
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
          appearance_lock?: string;
          element_id?: string;
          ref_image_path?: string | null;
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
          appearance_lock?: string;
          element_id?: string;
          ref_image_path?: string | null;
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
