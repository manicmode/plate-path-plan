export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      _backup_challenge_members_20250816: {
        Row: {
          challenge_id: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["member_role"] | null
          status: Database["public"]["Enums"]["member_status"] | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["member_role"] | null
          status?: Database["public"]["Enums"]["member_status"] | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["member_role"] | null
          status?: Database["public"]["Enums"]["member_status"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      _backup_challenge_messages_orphans: {
        Row: {
          challenge_id: string
          created_at: string
          emoji: string | null
          id: string
          tagged_users: string[] | null
          text: string | null
          timestamp: string
          user_id: string
          username: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          emoji?: string | null
          id?: string
          tagged_users?: string[] | null
          text?: string | null
          timestamp?: string
          user_id: string
          username: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          emoji?: string | null
          id?: string
          tagged_users?: string[] | null
          text?: string | null
          timestamp?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      _backup_private_challenge_messages_20250816: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          private_challenge_id: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          private_challenge_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          private_challenge_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      _backup_private_challenge_participations_20250816: {
        Row: {
          completed_at: string | null
          completed_days: number | null
          completion_percentage: number | null
          daily_completions: Json | null
          id: string | null
          is_creator: boolean | null
          joined_at: string | null
          last_progress_update: string | null
          private_challenge_id: string | null
          progress_value: number | null
          streak_count: number | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_days?: number | null
          completion_percentage?: number | null
          daily_completions?: Json | null
          id?: string | null
          is_creator?: boolean | null
          joined_at?: string | null
          last_progress_update?: string | null
          private_challenge_id?: string | null
          progress_value?: number | null
          streak_count?: number | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_days?: number | null
          completion_percentage?: number | null
          daily_completions?: Json | null
          id?: string | null
          is_creator?: boolean | null
          joined_at?: string | null
          last_progress_update?: string | null
          private_challenge_id?: string | null
          progress_value?: number | null
          streak_count?: number | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      _backup_private_challenges_20250816: {
        Row: {
          auto_team_enabled: boolean | null
          badge_icon: string | null
          banner_image_url: string | null
          brand_name: string | null
          category: string | null
          challenge_type: string | null
          clicks: number | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          duration_days: number | null
          follower_only: boolean | null
          id: string | null
          invited_user_ids: string[] | null
          is_sponsored: boolean | null
          is_team_challenge: boolean | null
          max_participants: number | null
          product_url: string | null
          promo_code: string | null
          reward_description: string | null
          reward_image_url: string | null
          start_date: string | null
          status: string | null
          target_metric: string | null
          target_unit: string | null
          target_value: number | null
          team_ranking_basis: string | null
          team_size: number | null
          title: string | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          auto_team_enabled?: boolean | null
          badge_icon?: string | null
          banner_image_url?: string | null
          brand_name?: string | null
          category?: string | null
          challenge_type?: string | null
          clicks?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          duration_days?: number | null
          follower_only?: boolean | null
          id?: string | null
          invited_user_ids?: string[] | null
          is_sponsored?: boolean | null
          is_team_challenge?: boolean | null
          max_participants?: number | null
          product_url?: string | null
          promo_code?: string | null
          reward_description?: string | null
          reward_image_url?: string | null
          start_date?: string | null
          status?: string | null
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          team_ranking_basis?: string | null
          team_size?: number | null
          title?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          auto_team_enabled?: boolean | null
          badge_icon?: string | null
          banner_image_url?: string | null
          brand_name?: string | null
          category?: string | null
          challenge_type?: string | null
          clicks?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          duration_days?: number | null
          follower_only?: boolean | null
          id?: string | null
          invited_user_ids?: string[] | null
          is_sponsored?: boolean | null
          is_team_challenge?: boolean | null
          max_participants?: number | null
          product_url?: string | null
          promo_code?: string | null
          reward_description?: string | null
          reward_image_url?: string | null
          start_date?: string | null
          status?: string | null
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          team_ranking_basis?: string | null
          team_size?: number | null
          title?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      _backup_public_challenge_messages_20250816: {
        Row: {
          challenge_id: string | null
          created_at: string | null
          emoji: string | null
          id: string | null
          tagged_users: string[] | null
          text: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string | null
          tagged_users?: string[] | null
          text?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          challenge_id?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string | null
          tagged_users?: string[] | null
          text?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      _backup_public_challenge_participations_20250816: {
        Row: {
          challenge_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string | null
          is_creator: boolean | null
          joined_at: string | null
          progress_value: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string | null
          is_creator?: boolean | null
          joined_at?: string | null
          progress_value?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string | null
          is_creator?: boolean | null
          joined_at?: string | null
          progress_value?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      _backup_public_challenges_20250816: {
        Row: {
          badge_icon: string | null
          category: string | null
          challenge_type: string | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          duration_days: number | null
          goal_description: string | null
          id: string | null
          is_active: boolean | null
          is_limited_time: boolean | null
          is_new: boolean | null
          is_trending: boolean | null
          limited_time_end: string | null
          participant_count: number | null
          target_metric: string | null
          target_unit: string | null
          target_value: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          badge_icon?: string | null
          category?: string | null
          challenge_type?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_days?: number | null
          goal_description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_limited_time?: boolean | null
          is_new?: boolean | null
          is_trending?: boolean | null
          limited_time_end?: string | null
          participant_count?: number | null
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          badge_icon?: string | null
          category?: string | null
          challenge_type?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_days?: number | null
          goal_description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_limited_time?: boolean | null
          is_new?: boolean | null
          is_trending?: boolean | null
          limited_time_end?: string | null
          participant_count?: number | null
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      _backup_user_challenge_participations_20250816: {
        Row: {
          best_streak: number | null
          challenge_id: string | null
          completed_at: string | null
          completion_percentage: number | null
          current_progress: number | null
          daily_completions: Json | null
          end_date: string | null
          id: string | null
          is_completed: boolean | null
          joined_at: string | null
          last_progress_update: string | null
          start_date: string | null
          streak_count: number | null
          total_target: number | null
          user_id: string | null
        }
        Insert: {
          best_streak?: number | null
          challenge_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          current_progress?: number | null
          daily_completions?: Json | null
          end_date?: string | null
          id?: string | null
          is_completed?: boolean | null
          joined_at?: string | null
          last_progress_update?: string | null
          start_date?: string | null
          streak_count?: number | null
          total_target?: number | null
          user_id?: string | null
        }
        Update: {
          best_streak?: number | null
          challenge_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          current_progress?: number | null
          daily_completions?: Json | null
          end_date?: string | null
          id?: string | null
          is_completed?: boolean | null
          joined_at?: string | null
          last_progress_update?: string | null
          start_date?: string | null
          streak_count?: number | null
          total_target?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      _nutrition_logs_quarantine: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number | null
          carbs: number | null
          confidence: number | null
          created_at: string
          deleted_at: string | null
          fat: number | null
          fiber: number | null
          food_name: string
          id: string
          image_url: string | null
          ingredient_analysis: Json | null
          is_mock: boolean
          processing_level: string | null
          protein: number | null
          quality_reasons: string[] | null
          quality_score: number | null
          quality_verdict: string | null
          quarantined_at: string
          saturated_fat: number | null
          serving_size: string | null
          sodium: number | null
          source: string | null
          sugar: number | null
          trigger_tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          confidence?: number | null
          created_at?: string
          deleted_at?: string | null
          fat?: number | null
          fiber?: number | null
          food_name: string
          id?: string
          image_url?: string | null
          ingredient_analysis?: Json | null
          is_mock?: boolean
          processing_level?: string | null
          protein?: number | null
          quality_reasons?: string[] | null
          quality_score?: number | null
          quality_verdict?: string | null
          quarantined_at?: string
          saturated_fat?: number | null
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
          sugar?: number | null
          trigger_tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          confidence?: number | null
          created_at?: string
          deleted_at?: string | null
          fat?: number | null
          fiber?: number | null
          food_name?: string
          id?: string
          image_url?: string | null
          ingredient_analysis?: Json | null
          is_mock?: boolean
          processing_level?: string | null
          protein?: number | null
          quality_reasons?: string[] | null
          quality_score?: number | null
          quality_verdict?: string | null
          quarantined_at?: string
          saturated_fat?: number | null
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
          sugar?: number | null
          trigger_tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_steps: {
        Row: {
          created_at: string
          date: string
          id: string
          local_tz: string | null
          raw: Json | null
          source: string
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          local_tz?: string | null
          raw?: Json | null
          source: string
          steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          local_tz?: string | null
          raw?: Json | null
          source?: string
          steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string | null
          id: string
          meta: Json | null
          target_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string | null
          id?: string
          meta?: Json | null
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string | null
          id?: string
          meta?: Json | null
          target_id?: string | null
        }
        Relationships: []
      }
      affiliate_click: {
        Row: {
          affiliate_partner_id: string
          clicked_at: string | null
          id: string
          ip_address: unknown | null
          referrer_url: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_partner_id: string
          clicked_at?: string | null
          id?: string
          ip_address?: unknown | null
          referrer_url?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_partner_id?: string
          clicked_at?: string | null
          id?: string
          ip_address?: unknown | null
          referrer_url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_click_affiliate_partner_id_fkey"
            columns: ["affiliate_partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partner"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversion: {
        Row: {
          affiliate_partner_id: string
          challenge_order_id: string
          commission_amount_cents: number
          converted_at: string | null
          id: string
        }
        Insert: {
          affiliate_partner_id: string
          challenge_order_id: string
          commission_amount_cents: number
          converted_at?: string | null
          id?: string
        }
        Update: {
          affiliate_partner_id?: string
          challenge_order_id?: string
          commission_amount_cents?: number
          converted_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversion_affiliate_partner_id_fkey"
            columns: ["affiliate_partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversion_challenge_order_id_fkey"
            columns: ["challenge_order_id"]
            isOneToOne: true
            referencedRelation: "challenge_order"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_partner: {
        Row: {
          affiliate_program_id: string
          created_at: string | null
          id: string
          partner_user_id: string
          referral_code: string
          status: string
          updated_at: string | null
        }
        Insert: {
          affiliate_program_id: string
          created_at?: string | null
          id?: string
          partner_user_id: string
          referral_code: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          affiliate_program_id?: string
          created_at?: string | null
          id?: string
          partner_user_id?: string
          referral_code?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_partner_affiliate_program_id_fkey"
            columns: ["affiliate_program_id"]
            isOneToOne: false
            referencedRelation: "affiliate_program"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_partner_affiliate_program_id_fkey"
            columns: ["affiliate_program_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_summary"
            referencedColumns: ["program_id"]
          },
        ]
      }
      affiliate_program: {
        Row: {
          commission_rate: number
          cookie_duration_days: number
          created_at: string | null
          id: string
          influencer_id: string
          is_active: boolean
          updated_at: string | null
        }
        Insert: {
          commission_rate?: number
          cookie_duration_days?: number
          created_at?: string | null
          id?: string
          influencer_id: string
          is_active?: boolean
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number
          cookie_duration_days?: number
          created_at?: string | null
          id?: string
          influencer_id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_program_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: true
            referencedRelation: "influencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_program_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: true
            referencedRelation: "v_influencer_earnings"
            referencedColumns: ["influencer_id"]
          },
          {
            foreignKeyName: "affiliate_program_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: true
            referencedRelation: "v_influencer_public_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generated_routines: {
        Row: {
          created_at: string
          days_per_week: number
          equipment_available: string[]
          fitness_level: string
          generation_metadata: Json
          id: string
          is_active: boolean
          locked_days: number[]
          muscle_group_schedule: Json
          parent_routine_id: string | null
          primary_goals: string[]
          routine_name: string
          routine_type: string
          session_duration_minutes: number
          split_type: string
          updated_at: string
          user_id: string
          version_number: number
          weekly_routine_data: Json
        }
        Insert: {
          created_at?: string
          days_per_week: number
          equipment_available?: string[]
          fitness_level: string
          generation_metadata?: Json
          id?: string
          is_active?: boolean
          locked_days?: number[]
          muscle_group_schedule?: Json
          parent_routine_id?: string | null
          primary_goals?: string[]
          routine_name: string
          routine_type?: string
          session_duration_minutes: number
          split_type: string
          updated_at?: string
          user_id: string
          version_number?: number
          weekly_routine_data?: Json
        }
        Update: {
          created_at?: string
          days_per_week?: number
          equipment_available?: string[]
          fitness_level?: string
          generation_metadata?: Json
          id?: string
          is_active?: boolean
          locked_days?: number[]
          muscle_group_schedule?: Json
          parent_routine_id?: string | null
          primary_goals?: string[]
          routine_name?: string
          routine_type?: string
          session_duration_minutes?: number
          split_type?: string
          updated_at?: string
          user_id?: string
          version_number?: number
          weekly_routine_data?: Json
        }
        Relationships: []
      }
      ai_nudges: {
        Row: {
          created_at: string | null
          id: string
          message: string
          nudge_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          nudge_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          nudge_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_predictions: {
        Row: {
          confidence: number | null
          context: Json | null
          created_at: string | null
          id: string
          predicted_value: string | null
          prediction_type: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          context?: Json | null
          created_at?: string | null
          id?: string
          predicted_value?: string | null
          prediction_type: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          context?: Json | null
          created_at?: string | null
          id?: string
          predicted_value?: string | null
          prediction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_routines: {
        Row: {
          created_at: string
          current_day_in_week: number | null
          current_week: number | null
          days_per_week: number
          equipment_needed: string[]
          estimated_duration_minutes: number
          fitness_level: string
          generation_metadata: Json | null
          id: string
          is_active: boolean | null
          locked_days: Json | null
          muscle_group_schedule: Json | null
          parent_routine_id: string | null
          routine_data: Json
          routine_goal: string
          routine_name: string
          routine_type: string
          split_type: string
          start_date: string | null
          total_weeks: number | null
          updated_at: string
          user_id: string
          version_number: number | null
          weekly_routine_data: Json | null
        }
        Insert: {
          created_at?: string
          current_day_in_week?: number | null
          current_week?: number | null
          days_per_week: number
          equipment_needed?: string[]
          estimated_duration_minutes: number
          fitness_level: string
          generation_metadata?: Json | null
          id?: string
          is_active?: boolean | null
          locked_days?: Json | null
          muscle_group_schedule?: Json | null
          parent_routine_id?: string | null
          routine_data: Json
          routine_goal: string
          routine_name: string
          routine_type?: string
          split_type: string
          start_date?: string | null
          total_weeks?: number | null
          updated_at?: string
          user_id: string
          version_number?: number | null
          weekly_routine_data?: Json | null
        }
        Update: {
          created_at?: string
          current_day_in_week?: number | null
          current_week?: number | null
          days_per_week?: number
          equipment_needed?: string[]
          estimated_duration_minutes?: number
          fitness_level?: string
          generation_metadata?: Json | null
          id?: string
          is_active?: boolean | null
          locked_days?: Json | null
          muscle_group_schedule?: Json | null
          parent_routine_id?: string | null
          routine_data?: Json
          routine_goal?: string
          routine_name?: string
          routine_type?: string
          split_type?: string
          start_date?: string | null
          total_weeks?: number | null
          updated_at?: string
          user_id?: string
          version_number?: number | null
          weekly_routine_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_routines_parent_routine_id_fkey"
            columns: ["parent_routine_id"]
            isOneToOne: false
            referencedRelation: "ai_routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_routines_parent_routine_id_fkey"
            columns: ["parent_routine_id"]
            isOneToOne: false
            referencedRelation: "routine_performance_analytics"
            referencedColumns: ["routine_id"]
          },
        ]
      }
      analyzer_failures: {
        Row: {
          body_excerpt: string | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          id: string
          phase: string
          provider: string
          request_id: string | null
          run_id: string
          status: string
          status_text: string | null
        }
        Insert: {
          body_excerpt?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          phase: string
          provider: string
          request_id?: string | null
          run_id: string
          status: string
          status_text?: string | null
        }
        Update: {
          body_excerpt?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          phase?: string
          provider?: string
          request_id?: string | null
          run_id?: string
          status?: string
          status_text?: string | null
        }
        Relationships: []
      }
      app_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          meta: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      arena_challenges: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          metadata: Json
          season_month: number | null
          season_year: number | null
          slug: string | null
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          season_month?: number | null
          season_year?: number | null
          slug?: string | null
          starts_at?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          season_month?: number | null
          season_year?: number | null
          slug?: string | null
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      arena_chat_messages: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      arena_events: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          kind: string
          occurred_at: string
          points: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          kind: string
          occurred_at?: string
          points: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_events_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_friend_overtake_notifs: {
        Row: {
          friend_id: string
          last_sent_at: string
          month: number
          user_id: string
          year: number
        }
        Insert: {
          friend_id: string
          last_sent_at?: string
          month: number
          user_id: string
          year: number
        }
        Update: {
          friend_id?: string
          last_sent_at?: string
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      arena_groups: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_groups_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_leaderboard_rollups: {
        Row: {
          challenge_id: string
          month: number
          rank: number
          score: number
          section: string
          user_id: string
          year: number
        }
        Insert: {
          challenge_id: string
          month: number
          rank: number
          score?: number
          section?: string
          user_id: string
          year: number
        }
        Update: {
          challenge_id?: string
          month?: number
          rank?: number
          score?: number
          section?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "arena_leaderboard_rollups_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_memberships: {
        Row: {
          challenge_id: string
          group_id: string | null
          id: string
          joined_at: string
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          group_id?: string | null
          id?: string
          joined_at?: string
          status?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          group_id?: string | null
          id?: string
          joined_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_memberships_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "arena_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_monthly_winners: {
        Row: {
          created_at: string
          id: number
          rank: number
          score: number
          season_month: string
          trophy_level: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          rank: number
          score: number
          season_month: string
          trophy_level: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          rank?: number
          score?: number
          season_month?: string
          trophy_level?: string
          user_id?: string
        }
        Relationships: []
      }
      arena_rollups_hist: {
        Row: {
          challenge_id: string
          month: number
          rank: number
          score: number
          section: string
          user_id: string
          year: number
        }
        Insert: {
          challenge_id: string
          month: number
          rank: number
          score: number
          section: string
          user_id: string
          year: number
        }
        Update: {
          challenge_id?: string
          month?: number
          rank?: number
          score?: number
          section?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      arena_ui_heartbeat: {
        Row: {
          at: string
          id: string
          label: string
        }
        Insert: {
          at?: string
          id?: string
          label: string
        }
        Update: {
          at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          rarity: string
          requirement_duration: number | null
          requirement_type: string
          requirement_value: number
          title: string
          tracker_type: string | null
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          rarity?: string
          requirement_duration?: number | null
          requirement_type: string
          requirement_value: number
          title: string
          tracker_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          rarity?: string
          requirement_duration?: number | null
          requirement_type?: string
          requirement_value?: number
          title?: string
          tracker_type?: string | null
        }
        Relationships: []
      }
      billboard_comments: {
        Row: {
          body: string
          created_at: string | null
          event_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          event_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          event_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billboard_comments_event_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "billboard_events"
            referencedColumns: ["id"]
          },
        ]
      }
      billboard_events: {
        Row: {
          author_system: string | null
          author_user_id: string | null
          body: string | null
          challenge_id: string
          created_at: string | null
          id: string
          kind: string
          meta: Json | null
          pinned: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_system?: string | null
          author_user_id?: string | null
          body?: string | null
          challenge_id: string
          created_at?: string | null
          id?: string
          kind: string
          meta?: Json | null
          pinned?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_system?: string | null
          author_user_id?: string | null
          body?: string | null
          challenge_id?: string
          created_at?: string | null
          id?: string
          kind?: string
          meta?: Json | null
          pinned?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billboard_events_challenge_fk"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      billboard_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          event_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          event_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          event_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billboard_reactions_event_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "billboard_events"
            referencedColumns: ["id"]
          },
        ]
      }
      body_scan_reminders: {
        Row: {
          created_at: string
          id: string
          last_scan_at: string
          next_due_scan_at: string
          reminder_sent_at: string | null
          scan_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_scan_at: string
          next_due_scan_at: string
          reminder_sent_at?: string | null
          scan_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_scan_at?: string
          next_due_scan_at?: string
          reminder_sent_at?: string | null
          scan_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_scan_results: {
        Row: {
          arms_score: number
          back_score: number
          body_scan_id: string
          chest_score: number
          core_score: number
          created_at: string
          glutes_score: number
          id: string
          legs_score: number
          shoulders_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          arms_score?: number
          back_score?: number
          body_scan_id: string
          chest_score?: number
          core_score?: number
          created_at?: string
          glutes_score?: number
          id?: string
          legs_score?: number
          shoulders_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          arms_score?: number
          back_score?: number
          body_scan_id?: string
          chest_score?: number
          core_score?: number
          created_at?: string
          glutes_score?: number
          id?: string
          legs_score?: number
          shoulders_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_scans: {
        Row: {
          ai_generated_at: string | null
          ai_insights: string | null
          back_image_url: string | null
          created_at: string
          id: string
          image_url: string
          is_primary_monthly: boolean
          month: number | null
          pose_metadata: Json | null
          pose_score: number | null
          scan_index: number | null
          side_image_url: string | null
          type: string
          updated_at: string
          user_id: string
          weight: number | null
          year: number | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_insights?: string | null
          back_image_url?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary_monthly?: boolean
          month?: number | null
          pose_metadata?: Json | null
          pose_score?: number | null
          scan_index?: number | null
          side_image_url?: string | null
          type: string
          updated_at?: string
          user_id: string
          weight?: number | null
          year?: number | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_insights?: string | null
          back_image_url?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary_monthly?: boolean
          month?: number | null
          pose_metadata?: Json | null
          pose_score?: number | null
          scan_index?: number | null
          side_image_url?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
          year?: number | null
        }
        Relationships: []
      }
      breathing_nudge_preferences: {
        Row: {
          created_at: string
          nudges_enabled: boolean
          push_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          nudges_enabled?: boolean
          push_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          nudges_enabled?: boolean
          push_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      breathing_nudges: {
        Row: {
          created_at: string
          delivered_at: string
          id: string
          nudge_message: string
          nudge_reason: string
          nudge_type: string
          updated_at: string
          user_action: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          id?: string
          nudge_message: string
          nudge_reason: string
          nudge_type: string
          updated_at?: string
          user_action?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          id?: string
          nudge_message?: string
          nudge_reason?: string
          nudge_type?: string
          updated_at?: string
          user_action?: string
          user_id?: string
        }
        Relationships: []
      }
      breathing_reminders: {
        Row: {
          created_at: string
          id: string
          recurrence: string
          reminder_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recurrence?: string
          reminder_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recurrence?: string
          reminder_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      breathing_streaks: {
        Row: {
          created_at: string
          current_streak: number
          last_completed_date: string | null
          longest_streak: number
          total_sessions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_sessions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_sessions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          end_at: string
          id: string
          influencer_id: string
          is_paid: boolean | null
          max_participants: number | null
          price_cents: number | null
          published_at: string | null
          start_at: string
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          end_at: string
          id?: string
          influencer_id: string
          is_paid?: boolean | null
          max_participants?: number | null
          price_cents?: number | null
          published_at?: string | null
          start_at: string
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          end_at?: string
          id?: string
          influencer_id?: string
          is_paid?: boolean | null
          max_participants?: number | null
          price_cents?: number | null
          published_at?: string | null
          start_at?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "v_influencer_earnings"
            referencedColumns: ["influencer_id"]
          },
          {
            foreignKeyName: "challenge_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "v_influencer_public_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_invitations: {
        Row: {
          id: string
          invited_at: string
          invitee_id: string
          inviter_id: string
          private_challenge_id: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          id?: string
          invited_at?: string
          invitee_id: string
          inviter_id: string
          private_challenge_id?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          invited_at?: string
          invitee_id?: string
          inviter_id?: string
          private_challenge_id?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_invitations_private_challenge_id_fkey"
            columns: ["private_challenge_id"]
            isOneToOne: false
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_join: {
        Row: {
          challenge_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_join_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_members: {
        Row: {
          challenge_id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          challenge_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          challenge_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_members_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_members_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_messages: {
        Row: {
          challenge_id: string
          content: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          content: string
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          content?: string
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_messages_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_messages_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_order: {
        Row: {
          affiliate_partner_id: string | null
          amount_cents: number
          buyer_user_id: string
          challenge_id: string
          created_at: string | null
          currency: string
          id: string
          influencer_id: string
          status: string
          stripe_session_id: string | null
          updated_at: string | null
        }
        Insert: {
          affiliate_partner_id?: string | null
          amount_cents: number
          buyer_user_id: string
          challenge_id: string
          created_at?: string | null
          currency?: string
          id?: string
          influencer_id: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliate_partner_id?: string | null
          amount_cents?: number
          buyer_user_id?: string
          challenge_id?: string
          created_at?: string | null
          currency?: string
          id?: string
          influencer_id?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_order_affiliate_partner_id_fkey"
            columns: ["affiliate_partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_order_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_order_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_order_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "v_influencer_earnings"
            referencedColumns: ["influencer_id"]
          },
          {
            foreignKeyName: "challenge_order_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "v_influencer_public_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress_logs: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          log_date: string
          notes: string | null
          participation_id: string | null
          progress_value: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          participation_id?: string | null
          progress_value: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          participation_id?: string | null
          progress_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_logs_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "user_challenge_participations"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_teams: {
        Row: {
          challenge_id: string | null
          created_at: string
          creator_id: string
          current_score: number
          id: string
          member_ids: string[]
          name: string
          team_rank: number | null
          total_progress: number
          updated_at: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          creator_id: string
          current_score?: number
          id?: string
          member_ids?: string[]
          name: string
          team_rank?: number | null
          total_progress?: number
          updated_at?: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          creator_id?: string
          current_score?: number
          id?: string
          member_ids?: string[]
          name?: string
          team_rank?: number | null
          total_progress?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_teams_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          category: string | null
          cover_emoji: string | null
          created_at: string
          description: string | null
          duration_days: number
          id: string
          invite_code: string | null
          owner_user_id: string
          title: string
          visibility: Database["public"]["Enums"]["challenge_visibility"]
        }
        Insert: {
          category?: string | null
          cover_emoji?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          invite_code?: string | null
          owner_user_id: string
          title: string
          visibility?: Database["public"]["Enums"]["challenge_visibility"]
        }
        Update: {
          category?: string | null
          cover_emoji?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          invite_code?: string | null
          owner_user_id?: string
          title?: string
          visibility?: Database["public"]["Enums"]["challenge_visibility"]
        }
        Relationships: []
      }
      coach_interactions: {
        Row: {
          coach_type: string
          created_at: string
          id: string
          interaction_count: number
          last_praised_at: string | null
          praise_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_type: string
          created_at?: string
          id?: string
          interaction_count?: number
          last_praised_at?: string | null
          praise_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_type?: string
          created_at?: string
          id?: string
          interaction_count?: number
          last_praised_at?: string | null
          praise_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          id: string
          percent_off: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          percent_off: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          percent_off?: number
        }
        Relationships: []
      }
      custom_routines: {
        Row: {
          created_at: string
          duration: string
          id: string
          notes: string | null
          routine_type: string
          title: string
          updated_at: string
          user_id: string
          weekly_plan: Json
        }
        Insert: {
          created_at?: string
          duration: string
          id?: string
          notes?: string | null
          routine_type?: string
          title: string
          updated_at?: string
          user_id: string
          weekly_plan?: Json
        }
        Update: {
          created_at?: string
          duration?: string
          id?: string
          notes?: string | null
          routine_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          weekly_plan?: Json
        }
        Relationships: []
      }
      daily_nutrition_targets: {
        Row: {
          calculated_at: string
          calories: number | null
          carbs: number | null
          created_at: string
          daily_performance_score: number | null
          fat: number | null
          fiber: number | null
          flagged_ingredients: string[] | null
          hydration_ml: number | null
          id: string
          priority_micronutrients: string[] | null
          profile_version: number | null
          protein: number | null
          saturated_fat: number | null
          sodium: number | null
          sugar: number | null
          supplement_count: number | null
          supplement_recommendations: Json | null
          target_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calculated_at?: string
          calories?: number | null
          carbs?: number | null
          created_at?: string
          daily_performance_score?: number | null
          fat?: number | null
          fiber?: number | null
          flagged_ingredients?: string[] | null
          hydration_ml?: number | null
          id?: string
          priority_micronutrients?: string[] | null
          profile_version?: number | null
          protein?: number | null
          saturated_fat?: number | null
          sodium?: number | null
          sugar?: number | null
          supplement_count?: number | null
          supplement_recommendations?: Json | null
          target_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calculated_at?: string
          calories?: number | null
          carbs?: number | null
          created_at?: string
          daily_performance_score?: number | null
          fat?: number | null
          fiber?: number | null
          flagged_ingredients?: string[] | null
          hydration_ml?: number | null
          id?: string
          priority_micronutrients?: string[] | null
          profile_version?: number | null
          protein?: number | null
          saturated_fat?: number | null
          sodium?: number | null
          sugar?: number | null
          supplement_count?: number | null
          supplement_recommendations?: Json | null
          target_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_goals: {
        Row: {
          ai_adjusted: boolean
          created_at: string | null
          id: string
          last_adjusted_at: string | null
          sessions_per_week_target: number
          updated_at: string | null
          user_id: string
          weekly_target_minutes: number
        }
        Insert: {
          ai_adjusted?: boolean
          created_at?: string | null
          id?: string
          last_adjusted_at?: string | null
          sessions_per_week_target?: number
          updated_at?: string | null
          user_id: string
          weekly_target_minutes?: number
        }
        Update: {
          ai_adjusted?: boolean
          created_at?: string | null
          id?: string
          last_adjusted_at?: string | null
          sessions_per_week_target?: number
          updated_at?: string | null
          user_id?: string
          weekly_target_minutes?: number
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          activity_type: string
          calories_burned: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          intensity_level: string | null
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          intensity_level?: string | null
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          intensity_level?: string | null
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          enabled?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          enabled?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      follower_notifications_queue: {
        Row: {
          challenge_id: string
          created_at: string
          follower_id: string
          id: string
          influencer_id: string
          notification_type: string
          sent: boolean
        }
        Insert: {
          challenge_id: string
          created_at?: string
          follower_id: string
          id?: string
          influencer_id: string
          notification_type?: string
          sent?: boolean
        }
        Update: {
          challenge_id?: string
          created_at?: string
          follower_id?: string
          id?: string
          influencer_id?: string
          notification_type?: string
          sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "follower_notifications_queue_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follower_notifications_queue_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      food_enrichment_cache: {
        Row: {
          confidence: number
          created_at: string
          expires_at: string | null
          id: string
          low_value: boolean
          query: string
          query_hash: string
          response_data: Json
          source: string
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          low_value?: boolean
          query: string
          query_hash: string
          response_data: Json
          source: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          low_value?: boolean
          query?: string
          query_hash?: string
          response_data?: Json
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      food_recognitions: {
        Row: {
          confidence_scores: number[] | null
          created_at: string
          detected_labels: string[] | null
          id: string
          image_url: string | null
          raw_response: Json | null
          user_id: string
        }
        Insert: {
          confidence_scores?: number[] | null
          created_at?: string
          detected_labels?: string[] | null
          id?: string
          image_url?: string | null
          raw_response?: Json | null
          user_id: string
        }
        Update: {
          confidence_scores?: number[] | null
          created_at?: string
          detected_labels?: string[] | null
          id?: string
          image_url?: string | null
          raw_response?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      food_text_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          items: Json
          normalized_q: string
          q: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          items?: Json
          normalized_q: string
          q: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          items?: Json
          normalized_q?: string
          q?: string
        }
        Relationships: []
      }
      habit: {
        Row: {
          category: string | null
          created_at: string
          end_date: string | null
          goal_target: number | null
          goal_type: Database["public"]["Enums"]["habit_goal_type"]
          id: string
          min_viable: boolean
          name: string
          start_date: string
          status: Database["public"]["Enums"]["habit_status"]
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          end_date?: string | null
          goal_target?: number | null
          goal_type: Database["public"]["Enums"]["habit_goal_type"]
          id?: string
          min_viable?: boolean
          name: string
          start_date?: string
          status?: Database["public"]["Enums"]["habit_status"]
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          end_date?: string | null
          goal_target?: number | null
          goal_type?: Database["public"]["Enums"]["habit_goal_type"]
          id?: string
          min_viable?: boolean
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["habit_status"]
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_completion_log: {
        Row: {
          amount: number | null
          completed: boolean
          duration_min: number | null
          id: string
          logged_at: string
          meta: Json | null
          slug: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          completed?: boolean
          duration_min?: number | null
          id?: string
          logged_at?: string
          meta?: Json | null
          slug: string
          user_id?: string
        }
        Update: {
          amount?: number | null
          completed?: boolean
          duration_min?: number | null
          id?: string
          logged_at?: string
          meta?: Json | null
          slug?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template_export"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template_health"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_templates"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "v_habit_logs_norm"
            referencedColumns: ["habit_slug"]
          },
        ]
      }
      habit_log: {
        Row: {
          client_log_id: string
          created_at: string
          habit_id: string
          id: string
          note: string | null
          partial: number | null
          source: string
          ts: string
          user_id: string
          value: number | null
        }
        Insert: {
          client_log_id: string
          created_at?: string
          habit_id: string
          id?: string
          note?: string | null
          partial?: number | null
          source?: string
          ts: string
          user_id: string
          value?: number | null
        }
        Update: {
          client_log_id?: string
          created_at?: string
          habit_id?: string
          id?: string
          note?: string | null
          partial?: number | null
          source?: string
          ts?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_log_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_nudges: {
        Row: {
          attempts: number
          channel: string | null
          created_at: string
          error: string | null
          habit_slug: string
          id: string
          meta: Json | null
          scheduled_date: string
          scheduled_for: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          channel?: string | null
          created_at?: string
          error?: string | null
          habit_slug: string
          id?: string
          meta?: Json | null
          scheduled_date: string
          scheduled_for?: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string | null
          created_at?: string
          error?: string | null
          habit_slug?: string
          id?: string
          meta?: Json | null
          scheduled_date?: string
          scheduled_for?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_reminders: {
        Row: {
          created_at: string
          day_of_week: number | null
          frequency: string
          habit_slug: string
          id: string
          is_enabled: boolean
          time_local: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          frequency: string
          habit_slug: string
          id?: string
          is_enabled?: boolean
          time_local?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          frequency?: string
          habit_slug?: string
          id?: string
          is_enabled?: boolean
          time_local?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_habit_reminders_slug"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_template"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fk_habit_reminders_slug"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_template_export"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fk_habit_reminders_slug"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_template_health"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fk_habit_reminders_slug"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_templates"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fk_habit_reminders_slug"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "v_habit_logs_norm"
            referencedColumns: ["habit_slug"]
          },
        ]
      }
      habit_search_events: {
        Row: {
          category: string | null
          created_at: string
          domain: Database["public"]["Enums"]["habit_domain"] | null
          id: number
          q: string
          results: number | null
          top_slug: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          domain?: Database["public"]["Enums"]["habit_domain"] | null
          id?: number
          q: string
          results?: number | null
          top_slug?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          domain?: Database["public"]["Enums"]["habit_domain"] | null
          id?: number
          q?: string
          results?: number | null
          top_slug?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      habit_search_synonyms: {
        Row: {
          created_at: string
          id: number
          synonym: string
          term: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: number
          synonym: string
          term: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: number
          synonym?: string
          term?: string
          weight?: number
        }
        Relationships: []
      }
      habit_strength: {
        Row: {
          habit_id: string
          last_recalc_at: string | null
          score: number
        }
        Insert: {
          habit_id: string
          last_recalc_at?: string | null
          score?: number
        }
        Update: {
          habit_id?: string
          last_recalc_at?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_strength_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: true
            referencedRelation: "habit"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_template: {
        Row: {
          category: string | null
          coach_copy: Json | null
          coach_tones: Json | null
          contraindications: string | null
          created_at: string
          cues_and_stacking: string | null
          default_target: number | null
          difficulty: string | null
          domain: Database["public"]["Enums"]["habit_domain"]
          equipment: string | null
          estimated_minutes: number | null
          goal_type: Database["public"]["Enums"]["habit_goal_type"]
          id: string
          is_active: boolean
          is_public: boolean | null
          min_viable: string | null
          name: string
          slug: string
          sources: string | null
          suggested_rules: Json | null
          summary: string | null
          tags: string | null
          time_windows: Json | null
        }
        Insert: {
          category?: string | null
          coach_copy?: Json | null
          coach_tones?: Json | null
          contraindications?: string | null
          created_at?: string
          cues_and_stacking?: string | null
          default_target?: number | null
          difficulty?: string | null
          domain: Database["public"]["Enums"]["habit_domain"]
          equipment?: string | null
          estimated_minutes?: number | null
          goal_type: Database["public"]["Enums"]["habit_goal_type"]
          id?: string
          is_active?: boolean
          is_public?: boolean | null
          min_viable?: string | null
          name: string
          slug: string
          sources?: string | null
          suggested_rules?: Json | null
          summary?: string | null
          tags?: string | null
          time_windows?: Json | null
        }
        Update: {
          category?: string | null
          coach_copy?: Json | null
          coach_tones?: Json | null
          contraindications?: string | null
          created_at?: string
          cues_and_stacking?: string | null
          default_target?: number | null
          difficulty?: string | null
          domain?: Database["public"]["Enums"]["habit_domain"]
          equipment?: string | null
          estimated_minutes?: number | null
          goal_type?: Database["public"]["Enums"]["habit_goal_type"]
          id?: string
          is_active?: boolean
          is_public?: boolean | null
          min_viable?: string | null
          name?: string
          slug?: string
          sources?: string | null
          suggested_rules?: Json | null
          summary?: string | null
          tags?: string | null
          time_windows?: Json | null
        }
        Relationships: []
      }
      habit_template_audit: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          changed_role: string | null
          id: number
          new_row: Json | null
          old_row: Json | null
          slug: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          changed_role?: string | null
          id?: number
          new_row?: Json | null
          old_row?: Json | null
          slug?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          changed_role?: string | null
          id?: number
          new_row?: Json | null
          old_row?: Json | null
          slug?: string | null
        }
        Relationships: []
      }
      habit_user_preferences: {
        Row: {
          created_at: string | null
          id: string
          preferred_tone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferred_tone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferred_tone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hall_of_fame_tributes: {
        Row: {
          champion_user_id: string
          champion_year: number
          created_at: string
          id: string
          is_pinned: boolean
          message: string
          reactions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          champion_user_id: string
          champion_year?: number
          created_at?: string
          id?: string
          is_pinned?: boolean
          message: string
          reactions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          champion_user_id?: string
          champion_year?: number
          created_at?: string
          id?: string
          is_pinned?: boolean
          message?: string
          reactions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hall_of_fame_winners: {
        Row: {
          created_at: string | null
          final_score: number
          group_id: number
          id: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          final_score: number
          group_id: number
          id?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          final_score?: number
          group_id?: number
          id?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      hydration_logs: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          minute_key: number | null
          name: string
          trigger_tags: string[] | null
          type: string
          user_id: string
          volume: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          minute_key?: number | null
          name: string
          trigger_tags?: string[] | null
          type?: string
          user_id: string
          volume: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          minute_key?: number | null
          name?: string
          trigger_tags?: string[] | null
          type?: string
          user_id?: string
          volume?: number
        }
        Relationships: []
      }
      influencer: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          category_tags: string[] | null
          connect_account_id: string | null
          created_at: string | null
          default_currency: string | null
          display_name: string
          handle: string
          headline: string | null
          id: string
          is_listed: boolean | null
          listed_at: string | null
          location_city: string | null
          location_country: string | null
          niches: string[] | null
          payouts_enabled: boolean | null
          social_links: Json | null
          socials: Json | null
          tagline: string | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          category_tags?: string[] | null
          connect_account_id?: string | null
          created_at?: string | null
          default_currency?: string | null
          display_name: string
          handle: string
          headline?: string | null
          id?: string
          is_listed?: boolean | null
          listed_at?: string | null
          location_city?: string | null
          location_country?: string | null
          niches?: string[] | null
          payouts_enabled?: boolean | null
          social_links?: Json | null
          socials?: Json | null
          tagline?: string | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          category_tags?: string[] | null
          connect_account_id?: string | null
          created_at?: string | null
          default_currency?: string | null
          display_name?: string
          handle?: string
          headline?: string | null
          id?: string
          is_listed?: boolean | null
          listed_at?: string | null
          location_city?: string | null
          location_country?: string | null
          niches?: string[] | null
          payouts_enabled?: boolean | null
          social_links?: Json | null
          socials?: Json | null
          tagline?: string | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      influencer_follow: {
        Row: {
          created_at: string | null
          follower_id: string
          id: string
          influencer_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          id?: string
          influencer_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          id?: string
          influencer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_follow_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_follow_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "v_influencer_earnings"
            referencedColumns: ["influencer_id"]
          },
          {
            foreignKeyName: "influencer_follow_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "v_influencer_public_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_followers: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          influencer_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          influencer_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          influencer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_followers_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      influencers: {
        Row: {
          auto_notify_followers: boolean
          bio: string | null
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          profile_image_url: string | null
          social_links: Json | null
          updated_at: string
          user_id: string
          username: string | null
          welcome_message: string | null
        }
        Insert: {
          auto_notify_followers?: boolean
          bio?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          profile_image_url?: string | null
          social_links?: Json | null
          updated_at?: string
          user_id: string
          username?: string | null
          welcome_message?: string | null
        }
        Update: {
          auto_notify_followers?: boolean
          bio?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          profile_image_url?: string | null
          social_links?: Json | null
          updated_at?: string
          user_id?: string
          username?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      ingredient_flags: {
        Row: {
          category: string
          common_aliases: string[] | null
          created_at: string
          description: string
          id: string
          name: string
          severity: string
        }
        Insert: {
          category: string
          common_aliases?: string[] | null
          created_at?: string
          description: string
          id?: string
          name: string
          severity: string
        }
        Update: {
          category?: string
          common_aliases?: string[] | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          severity?: string
        }
        Relationships: []
      }
      manual_nutrition_targets: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string
          fat: number | null
          fiber: number | null
          hydration_ml: number | null
          id: string
          is_enabled: boolean
          protein: number | null
          saturated_fat: number | null
          sodium: number | null
          sugar: number | null
          supplement_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          hydration_ml?: number | null
          id?: string
          is_enabled?: boolean
          protein?: number | null
          saturated_fat?: number | null
          sodium?: number | null
          sugar?: number | null
          supplement_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          hydration_ml?: number | null
          id?: string
          is_enabled?: boolean
          protein?: number | null
          saturated_fat?: number | null
          sodium?: number | null
          sugar?: number | null
          supplement_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          created_at: string
          id: string
          notes: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_scores: {
        Row: {
          created_at: string
          id: string
          meal_id: string | null
          rating_text: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_id?: string | null
          rating_text?: string | null
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_id?: string | null
          rating_text?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_scores_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "nutrition_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_scores_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "nutrition_logs_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_sets: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_suggestions: {
        Row: {
          created_at: string
          date: string
          id: string
          message: string
          score_triggered: number | null
          type: Database["public"]["Enums"]["suggestion_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          message: string
          score_triggered?: number | null
          type: Database["public"]["Enums"]["suggestion_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          message?: string
          score_triggered?: number | null
          type?: Database["public"]["Enums"]["suggestion_type"]
          user_id?: string
        }
        Relationships: []
      }
      meditation_nudge_history: {
        Row: {
          created_at: string
          id: string
          nudge_message: string | null
          nudge_reason: string | null
          nudge_type: string
          user_action: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nudge_message?: string | null
          nudge_reason?: string | null
          nudge_type: string
          user_action: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nudge_message?: string | null
          nudge_reason?: string | null
          nudge_type?: string
          user_action?: string
          user_id?: string
        }
        Relationships: []
      }
      meditation_nudge_preferences: {
        Row: {
          allow_ai_suggestions: boolean | null
          allow_push: boolean | null
          allow_recovery_triggers: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_ai_suggestions?: boolean | null
          allow_push?: boolean | null
          allow_recovery_triggers?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_ai_suggestions?: boolean | null
          allow_push?: boolean | null
          allow_recovery_triggers?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meditation_reminders: {
        Row: {
          created_at: string
          id: string
          recurrence: string
          time_of_day: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recurrence?: string
          time_of_day: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recurrence?: string
          time_of_day?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meditation_sessions: {
        Row: {
          audio_path: string | null
          audio_url: string
          category: string
          created_at: string | null
          description: string
          duration: number
          id: string
          image_url: string | null
          is_free: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_path?: string | null
          audio_url: string
          category: string
          created_at?: string | null
          description: string
          duration: number
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_path?: string | null
          audio_url?: string
          category?: string
          created_at?: string | null
          description?: string
          duration?: number
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      meditation_streaks: {
        Row: {
          current_streak: number | null
          last_completed_date: string | null
          total_sessions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          last_completed_date?: string | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          last_completed_date?: string | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meditation_user_scores: {
        Row: {
          average_meditation_time: string | null
          created_at: string
          id: string
          last_calculated_at: string | null
          nudge_acceptance_rate: number | null
          streak_score: number | null
          total_nudges_accepted: number | null
          total_nudges_received: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_meditation_time?: string | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          nudge_acceptance_rate?: number | null
          streak_score?: number | null
          total_nudges_accepted?: number | null
          total_nudges_received?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_meditation_time?: string | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          nudge_acceptance_rate?: number | null
          streak_score?: number | null
          total_nudges_accepted?: number | null
          total_nudges_received?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_exercise_reports: {
        Row: {
          created_at: string
          days_skipped: number
          id: string
          missed_target_areas: string[] | null
          month_end: string
          month_start: string
          most_frequent_muscle_groups: string[] | null
          motivational_title: string
          personalized_message: string
          report_data: Json
          smart_suggestions: string
          total_calories_burned: number
          total_duration_minutes: number
          total_workouts_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_skipped?: number
          id?: string
          missed_target_areas?: string[] | null
          month_end: string
          month_start: string
          most_frequent_muscle_groups?: string[] | null
          motivational_title: string
          personalized_message: string
          report_data?: Json
          smart_suggestions: string
          total_calories_burned?: number
          total_duration_minutes?: number
          total_workouts_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_skipped?: number
          id?: string
          missed_target_areas?: string[] | null
          month_end?: string
          month_start?: string
          most_frequent_muscle_groups?: string[] | null
          motivational_title?: string
          personalized_message?: string
          report_data?: Json
          smart_suggestions?: string
          total_calories_burned?: number
          total_duration_minutes?: number
          total_workouts_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_rankings: {
        Row: {
          completion_date: string
          created_at: string
          display_name: string
          final_score: number
          final_streak: number
          id: string
          month_year: string
          podium_position: number
          total_interactions: number
          user_id: string
          username: string
        }
        Insert: {
          completion_date: string
          created_at?: string
          display_name: string
          final_score?: number
          final_streak?: number
          id?: string
          month_year: string
          podium_position: number
          total_interactions?: number
          user_id: string
          username: string
        }
        Update: {
          completion_date?: string
          created_at?: string
          display_name?: string
          final_score?: number
          final_streak?: number
          id?: string
          month_year?: string
          podium_position?: number
          total_interactions?: number
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          created_at: string
          id: string
          month_end_date: string
          month_start_date: string
          overall_score: number | null
          report_data: Json
          summary_text: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_end_date: string
          month_start_date: string
          overall_score?: number | null
          report_data?: Json
          summary_text?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_end_date?: string
          month_start_date?: string
          overall_score?: number | null
          report_data?: Json
          summary_text?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_summaries: {
        Row: {
          average_score: number | null
          created_at: string | null
          days_with_meals: number | null
          id: string
          meals_logged_count: number | null
          message: string
          month_start: string
          previous_month_average: number | null
          ranking_position: number | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string | null
          days_with_meals?: number | null
          id?: string
          meals_logged_count?: number | null
          message: string
          month_start: string
          previous_month_average?: number | null
          ranking_position?: number | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          created_at?: string | null
          days_with_meals?: number | null
          id?: string
          meals_logged_count?: number | null
          message?: string
          month_start?: string
          previous_month_average?: number | null
          ranking_position?: number | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_workout_awards: {
        Row: {
          award_level: string
          created_at: string | null
          id: string
          month: number
          updated_at: string | null
          user_id: string
          workout_count: number
          year: number
        }
        Insert: {
          award_level: string
          created_at?: string | null
          id?: string
          month: number
          updated_at?: string | null
          user_id: string
          workout_count?: number
          year: number
        }
        Update: {
          award_level?: string
          created_at?: string | null
          id?: string
          month?: number
          updated_at?: string | null
          user_id?: string
          workout_count?: number
          year?: number
        }
        Relationships: []
      }
      mood_checkin_prefs: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          reminder_time_local: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          reminder_time_local?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          reminder_time_local?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_checkin_sends: {
        Row: {
          date_key: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          date_key: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          date_key?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_logs: {
        Row: {
          ai_detected_tags: string[] | null
          created_at: string
          date: string
          energy: number | null
          id: string
          journal_text: string | null
          mood: number | null
          trigger_tags: string[] | null
          updated_at: string
          user_id: string
          wellness: number | null
        }
        Insert: {
          ai_detected_tags?: string[] | null
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          journal_text?: string | null
          mood?: number | null
          trigger_tags?: string[] | null
          updated_at?: string
          user_id: string
          wellness?: number | null
        }
        Update: {
          ai_detected_tags?: string[] | null
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          journal_text?: string | null
          mood?: number | null
          trigger_tags?: string[] | null
          updated_at?: string
          user_id?: string
          wellness?: number | null
        }
        Relationships: []
      }
      mood_predictions: {
        Row: {
          confidence: string
          created_at: string
          emoji: string
          factors: string[]
          id: string
          message: string
          predicted_energy: number
          predicted_mood: number
          prediction_date: string
          user_id: string
          user_rating: number | null
        }
        Insert: {
          confidence?: string
          created_at?: string
          emoji?: string
          factors?: string[]
          id?: string
          message: string
          predicted_energy: number
          predicted_mood: number
          prediction_date: string
          user_id: string
          user_rating?: number | null
        }
        Update: {
          confidence?: string
          created_at?: string
          emoji?: string
          factors?: string[]
          id?: string
          message?: string
          predicted_energy?: number
          predicted_mood?: number
          prediction_date?: string
          user_id?: string
          user_rating?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nudge_event: {
        Row: {
          created_at: string
          habit_id: string | null
          id: string
          result: string | null
          scheduled_at: string
          sent_at: string | null
          trigger: string
          type: Database["public"]["Enums"]["nudge_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          habit_id?: string | null
          id?: string
          result?: string | null
          scheduled_at: string
          sent_at?: string | null
          trigger: string
          type: Database["public"]["Enums"]["nudge_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          habit_id?: string | null
          id?: string
          result?: string | null
          scheduled_at?: string
          sent_at?: string | null
          trigger?: string
          type?: Database["public"]["Enums"]["nudge_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudge_event_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit"
            referencedColumns: ["id"]
          },
        ]
      }
      nudge_events: {
        Row: {
          created_at: string
          event: string
          id: string
          nudge_id: string
          reason: string | null
          run_id: string | null
          ts: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          nudge_id: string
          reason?: string | null
          run_id?: string | null
          ts?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          nudge_id?: string
          reason?: string | null
          run_id?: string | null
          ts?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number | null
          carbs: number | null
          confidence: number | null
          created_at: string
          deleted_at: string | null
          fat: number | null
          fiber: number | null
          food_name: string
          id: string
          image_url: string | null
          ingredient_analysis: Json | null
          is_mock: boolean
          processing_level: string | null
          protein: number | null
          quality_reasons: string[] | null
          quality_score: number | null
          quality_verdict: string | null
          report_snapshot: Json | null
          saturated_fat: number | null
          serving_size: string | null
          snapshot_version: string | null
          sodium: number | null
          source: string | null
          source_meta: Json | null
          sugar: number | null
          trigger_tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          confidence?: number | null
          created_at?: string
          deleted_at?: string | null
          fat?: number | null
          fiber?: number | null
          food_name: string
          id?: string
          image_url?: string | null
          ingredient_analysis?: Json | null
          is_mock?: boolean
          processing_level?: string | null
          protein?: number | null
          quality_reasons?: string[] | null
          quality_score?: number | null
          quality_verdict?: string | null
          report_snapshot?: Json | null
          saturated_fat?: number | null
          serving_size?: string | null
          snapshot_version?: string | null
          sodium?: number | null
          source?: string | null
          source_meta?: Json | null
          sugar?: number | null
          trigger_tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          confidence?: number | null
          created_at?: string
          deleted_at?: string | null
          fat?: number | null
          fiber?: number | null
          food_name?: string
          id?: string
          image_url?: string | null
          ingredient_analysis?: Json | null
          is_mock?: boolean
          processing_level?: string | null
          protein?: number | null
          quality_reasons?: string[] | null
          quality_score?: number | null
          quality_verdict?: string | null
          report_snapshot?: Json | null
          saturated_fat?: number | null
          serving_size?: string | null
          snapshot_version?: string | null
          sodium?: number | null
          source?: string | null
          source_meta?: Json | null
          sugar?: number | null
          trigger_tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      private_challenge_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          private_challenge_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          private_challenge_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          private_challenge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_challenge_messages_private_challenge_id_fkey"
            columns: ["private_challenge_id"]
            isOneToOne: false
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_challenge_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      private_challenge_participations: {
        Row: {
          completed_at: string | null
          completed_days: number
          completion_percentage: number
          daily_completions: Json
          id: string
          is_creator: boolean
          joined_at: string
          last_progress_update: string | null
          private_challenge_id: string | null
          progress_value: number
          streak_count: number
          team_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_days?: number
          completion_percentage?: number
          daily_completions?: Json
          id?: string
          is_creator?: boolean
          joined_at?: string
          last_progress_update?: string | null
          private_challenge_id?: string | null
          progress_value?: number
          streak_count?: number
          team_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_days?: number
          completion_percentage?: number
          daily_completions?: Json
          id?: string
          is_creator?: boolean
          joined_at?: string
          last_progress_update?: string | null
          private_challenge_id?: string | null
          progress_value?: number
          streak_count?: number
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_challenge_participations_private_challenge_id_fkey"
            columns: ["private_challenge_id"]
            isOneToOne: false
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_challenge_participations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "challenge_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      private_challenges: {
        Row: {
          auto_team_enabled: boolean | null
          badge_icon: string
          banner_image_url: string | null
          brand_name: string | null
          category: string
          challenge_type: string
          clicks: number
          created_at: string
          creator_id: string
          description: string
          duration_days: number
          follower_only: boolean
          id: string
          invited_user_ids: string[]
          is_sponsored: boolean
          is_team_challenge: boolean
          max_participants: number
          product_url: string | null
          promo_code: string | null
          reward_description: string | null
          reward_image_url: string | null
          start_date: string
          status: string
          target_metric: string | null
          target_unit: string | null
          target_value: number | null
          team_ranking_basis: string | null
          team_size: number | null
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          auto_team_enabled?: boolean | null
          badge_icon?: string
          banner_image_url?: string | null
          brand_name?: string | null
          category: string
          challenge_type?: string
          clicks?: number
          created_at?: string
          creator_id: string
          description: string
          duration_days: number
          follower_only?: boolean
          id?: string
          invited_user_ids?: string[]
          is_sponsored?: boolean
          is_team_challenge?: boolean
          max_participants?: number
          product_url?: string | null
          promo_code?: string | null
          reward_description?: string | null
          reward_image_url?: string | null
          start_date: string
          status?: string
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          team_ranking_basis?: string | null
          team_size?: number | null
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          auto_team_enabled?: boolean | null
          badge_icon?: string
          banner_image_url?: string | null
          brand_name?: string | null
          category?: string
          challenge_type?: string
          clicks?: number
          created_at?: string
          creator_id?: string
          description?: string
          duration_days?: number
          follower_only?: boolean
          id?: string
          invited_user_ids?: string[]
          is_sponsored?: boolean
          is_team_challenge?: boolean
          max_participants?: number
          product_url?: string | null
          promo_code?: string | null
          reward_description?: string | null
          reward_image_url?: string | null
          start_date?: string
          status?: string
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          team_ranking_basis?: string | null
          team_size?: number | null
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_challenge_messages: {
        Row: {
          challenge_id: string
          created_at: string
          emoji: string | null
          id: string
          tagged_users: string[] | null
          text: string | null
          user_id: string
          username: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          emoji?: string | null
          id?: string
          tagged_users?: string[] | null
          text?: string | null
          user_id: string
          username: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          emoji?: string | null
          id?: string
          tagged_users?: string[] | null
          text?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_challenge_messages_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "public_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      public_challenge_participations: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_creator: boolean
          joined_at: string
          progress_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_creator?: boolean
          joined_at?: string
          progress_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_creator?: boolean
          joined_at?: string
          progress_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_challenge_participations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "public_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      public_challenges: {
        Row: {
          badge_icon: string
          category: string
          challenge_type: string
          created_at: string
          description: string
          difficulty_level: string
          duration_days: number
          goal_description: string
          id: string
          is_active: boolean
          is_limited_time: boolean
          is_new: boolean
          is_trending: boolean
          limited_time_end: string | null
          participant_count: number
          target_metric: string | null
          target_unit: string | null
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          badge_icon?: string
          category: string
          challenge_type?: string
          created_at?: string
          description: string
          difficulty_level?: string
          duration_days: number
          goal_description: string
          id?: string
          is_active?: boolean
          is_limited_time?: boolean
          is_new?: boolean
          is_trending?: boolean
          limited_time_end?: string | null
          participant_count?: number
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          badge_icon?: string
          category?: string
          challenge_type?: string
          created_at?: string
          description?: string
          difficulty_level?: string
          duration_days?: number
          goal_description?: string
          id?: string
          is_active?: boolean
          is_limited_time?: boolean
          is_new?: boolean
          is_trending?: boolean
          limited_time_end?: string | null
          participant_count?: number
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      qa_enrichment_results: {
        Row: {
          cache_was_hit: boolean | null
          confidence: number | null
          created_at: string
          id: string
          ingredients_len: number | null
          kcal_100g: number | null
          pass_fail: string | null
          query: string
          run_id: string
          serving_grams: number | null
          source: string | null
        }
        Insert: {
          cache_was_hit?: boolean | null
          confidence?: number | null
          created_at?: string
          id?: string
          ingredients_len?: number | null
          kcal_100g?: number | null
          pass_fail?: string | null
          query: string
          run_id: string
          serving_grams?: number | null
          source?: string | null
        }
        Update: {
          cache_was_hit?: boolean | null
          confidence?: number | null
          created_at?: string
          id?: string
          ingredients_len?: number | null
          kcal_100g?: number | null
          pass_fail?: string | null
          query?: string
          run_id?: string
          serving_grams?: number | null
          source?: string | null
        }
        Relationships: []
      }
      rank20_billboard_messages: {
        Row: {
          author_id: string | null
          body: string
          challenge_id: string
          created_at: string
          id: string
          title: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          challenge_id: string
          created_at?: string
          id?: string
          title?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          challenge_id?: string
          created_at?: string
          id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_billboard_challenge"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      rank20_chat_messages: {
        Row: {
          body: string
          challenge_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          challenge_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          challenge_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_challenge"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      rank20_chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank20_chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "rank20_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      rank20_groups: {
        Row: {
          batch_number: number
          challenge_id: string | null
          created_at: string
          id: string
          is_closed: boolean
        }
        Insert: {
          batch_number?: never
          challenge_id?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
        }
        Update: {
          batch_number?: never
          challenge_id?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_rank20_groups_challenge"
            columns: ["challenge_id"]
            isOneToOne: true
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      rank20_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank20_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rank20_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_challenge_metrics: {
        Row: {
          breathing_sessions: number | null
          created_at: string
          final_recovery_score: number | null
          id: string
          meditation_sessions: number | null
          month_year: string
          muscle_recovery_sessions: number | null
          rank_position: number | null
          recovery_streak_bonus: number | null
          sleep_sessions: number | null
          stretching_sessions: number | null
          total_recovery_sessions: number | null
          updated_at: string
          user_id: string
          yoga_sessions: number | null
        }
        Insert: {
          breathing_sessions?: number | null
          created_at?: string
          final_recovery_score?: number | null
          id?: string
          meditation_sessions?: number | null
          month_year: string
          muscle_recovery_sessions?: number | null
          rank_position?: number | null
          recovery_streak_bonus?: number | null
          sleep_sessions?: number | null
          stretching_sessions?: number | null
          total_recovery_sessions?: number | null
          updated_at?: string
          user_id: string
          yoga_sessions?: number | null
        }
        Update: {
          breathing_sessions?: number | null
          created_at?: string
          final_recovery_score?: number | null
          id?: string
          meditation_sessions?: number | null
          month_year?: string
          muscle_recovery_sessions?: number | null
          rank_position?: number | null
          recovery_streak_bonus?: number | null
          sleep_sessions?: number | null
          stretching_sessions?: number | null
          total_recovery_sessions?: number | null
          updated_at?: string
          user_id?: string
          yoga_sessions?: number | null
        }
        Relationships: []
      }
      recovery_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          mood_after: string | null
          mood_before: string | null
          notes: string | null
          recovery_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mood_after?: string | null
          mood_before?: string | null
          notes?: string | null
          recovery_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mood_after?: string | null
          mood_before?: string | null
          notes?: string | null
          recovery_type?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_reminders: {
        Row: {
          content_id: string | null
          content_type: string
          created_at: string | null
          id: string
          reminder_time: string
          repeat_pattern: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          content_type: string
          created_at?: string | null
          id?: string
          reminder_time: string
          repeat_pattern?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          reminder_time?: string
          repeat_pattern?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recovery_session_logs: {
        Row: {
          category: string
          completed_at: string
          created_at: string
          duration_minutes: number
          id: string
          is_favorite: boolean
          session_id: string
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string
          created_at?: string
          duration_minutes: number
          id?: string
          is_favorite?: boolean
          session_id: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_favorite?: boolean
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder: {
        Row: {
          created_at: string
          enabled: boolean
          habit_id: string
          id: string
          kind: Database["public"]["Enums"]["reminder_kind"]
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          habit_id: string
          id?: string
          kind: Database["public"]["Enums"]["reminder_kind"]
          payload: Json
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          habit_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["reminder_kind"]
          payload?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          id: string
          logged_at: string
          notes: string | null
          reminder_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          logged_at?: string
          notes?: string | null
          reminder_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          logged_at?: string
          notes?: string | null
          reminder_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          channel: string
          created_at: string
          custom_days: number[] | null
          food_item_data: Json | null
          frequency_type: string
          frequency_value: number | null
          id: string
          is_active: boolean
          label: string
          last_triggered_at: string | null
          next_run_at: string | null
          next_trigger_at: string | null
          payload: Json
          reminder_time: string
          schedule: string
          timezone: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          custom_days?: number[] | null
          food_item_data?: Json | null
          frequency_type?: string
          frequency_value?: number | null
          id?: string
          is_active?: boolean
          label: string
          last_triggered_at?: string | null
          next_run_at?: string | null
          next_trigger_at?: string | null
          payload?: Json
          reminder_time?: string
          schedule: string
          timezone?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          custom_days?: number[] | null
          food_item_data?: Json | null
          frequency_type?: string
          frequency_value?: number | null
          id?: string
          is_active?: boolean
          label?: string
          last_triggered_at?: string | null
          next_run_at?: string | null
          next_trigger_at?: string | null
          payload?: Json
          reminder_time?: string
          schedule?: string
          timezone?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          layout: Json | null
          logic_config: Json | null
          report_type: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          layout?: Json | null
          logic_config?: Json | null
          report_type: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          layout?: Json | null
          logic_config?: Json | null
          report_type?: string
          title?: string | null
        }
        Relationships: []
      }
      report_view_logs: {
        Row: {
          device_type: string | null
          id: string
          interaction_type: string | null
          report_date: string
          report_type: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          device_type?: string | null
          id?: string
          interaction_type?: string | null
          report_date: string
          report_type: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          device_type?: string | null
          id?: string
          interaction_type?: string | null
          report_date?: string
          report_type?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      routine_generation_history: {
        Row: {
          created_at: string
          generation_parameters: Json
          generation_type: string
          id: string
          new_routine_data: Json | null
          previous_routine_data: Json | null
          routine_id: string
          target_day: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          generation_parameters?: Json
          generation_type: string
          id?: string
          new_routine_data?: Json | null
          previous_routine_data?: Json | null
          routine_id: string
          target_day?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          generation_parameters?: Json
          generation_type?: string
          id?: string
          new_routine_data?: Json | null
          previous_routine_data?: Json | null
          routine_id?: string
          target_day?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_generation_history_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "ai_generated_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_history: {
        Row: {
          ai_feedback: string | null
          completed_steps: string[]
          completion_score: number | null
          created_at: string
          date_completed: string
          duration_minutes: number
          id: string
          routine_id: string
          skipped_steps: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          completed_steps?: string[]
          completion_score?: number | null
          created_at?: string
          date_completed?: string
          duration_minutes: number
          id?: string
          routine_id: string
          skipped_steps?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          completed_steps?: string[]
          completion_score?: number | null
          created_at?: string
          date_completed?: string
          duration_minutes?: number
          id?: string
          routine_id?: string
          skipped_steps?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      runtime_flags: {
        Row: {
          enabled: boolean
          name: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_health_reports: {
        Row: {
          barcode: string | null
          created_at: string
          id: string
          image_url: string | null
          portion_grams: number | null
          quality_score: number | null
          report_snapshot: Json
          source: string
          source_meta: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          portion_grams?: number | null
          quality_score?: number | null
          report_snapshot?: Json
          source: string
          source_meta?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          portion_grams?: number | null
          quality_score?: number | null
          report_snapshot?: Json
          source?: string
          source_meta?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_meal_set_reports: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          items_snapshot: Json
          name: string
          overall_score: number | null
          report_snapshot: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          items_snapshot?: Json
          name: string
          overall_score?: number | null
          report_snapshot?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          items_snapshot?: Json
          name?: string
          overall_score?: number | null
          report_snapshot?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_rule: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          params: Json
          time_windows: Json[] | null
          type: string
          tz: string
          user_id: string
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          params?: Json
          time_windows?: Json[] | null
          type: string
          tz?: string
          user_id: string
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          params?: Json
          time_windows?: Json[] | null
          type?: string
          tz?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_rule_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_details: Json
          event_type: string
          id: string
          ip_address: unknown | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_details?: Json
          event_type: string
          id?: string
          ip_address?: unknown | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_details?: Json
          event_type?: string
          id?: string
          ip_address?: unknown | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: string | null
          event_type: string
          function_name: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          event_type: string
          function_name: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          event_type?: string
          function_name?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      share_cards: {
        Row: {
          created_at: string
          description: string | null
          hash: string | null
          id: string
          image_url: string
          is_public: boolean
          owner_user_id: string
          size: string
          template: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          hash?: string | null
          id?: string
          image_url: string
          is_public?: boolean
          owner_user_id: string
          size?: string
          template: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          hash?: string | null
          id?: string
          image_url?: string
          is_public?: boolean
          owner_user_id?: string
          size?: string
          template?: string
          title?: string | null
        }
        Relationships: []
      }
      signup_error_logs: {
        Row: {
          err: string | null
          id: number
          meta: Json | null
          step: string | null
          ts: string | null
          user_id: string | null
        }
        Insert: {
          err?: string | null
          id?: number
          meta?: Json | null
          step?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Update: {
          err?: string | null
          id?: number
          meta?: Json | null
          step?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sleep_nudge_preferences: {
        Row: {
          created_at: string
          nudges_enabled: boolean
          push_notifications_enabled: boolean
          smart_nudges_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          nudges_enabled?: boolean
          push_notifications_enabled?: boolean
          smart_nudges_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          nudges_enabled?: boolean
          push_notifications_enabled?: boolean
          smart_nudges_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_nudges: {
        Row: {
          created_at: string
          delivered_at: string
          id: string
          nudge_message: string
          nudge_reason: string
          nudge_type: string
          updated_at: string
          user_action: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          id?: string
          nudge_message: string
          nudge_reason: string
          nudge_type: string
          updated_at?: string
          user_action?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          id?: string
          nudge_message?: string
          nudge_reason?: string
          nudge_type?: string
          updated_at?: string
          user_action?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_reminders: {
        Row: {
          created_at: string
          id: string
          recurrence: string
          time_of_day: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recurrence?: string
          time_of_day?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recurrence?: string
          time_of_day?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_streaks: {
        Row: {
          created_at: string
          current_streak: number
          last_completed_date: string | null
          longest_streak: number
          total_sessions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_sessions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_sessions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_boosts: {
        Row: {
          challenge_id: string | null
          challenge_name: string | null
          created_at: string
          friend_id: string
          friend_name: string
          id: string
          shown: boolean
          triggered_at: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          challenge_name?: string | null
          created_at?: string
          friend_id: string
          friend_name: string
          id?: string
          shown?: boolean
          triggered_at?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          challenge_name?: string | null
          created_at?: string
          friend_id?: string
          friend_name?: string
          id?: string
          shown?: boolean
          triggered_at?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streak_state: {
        Row: {
          current_len: number
          frozen_until: string | null
          habit_id: string
          id: string
          last_log_date: string | null
          longest_len: number
          repair_tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_len?: number
          frozen_until?: string | null
          habit_id: string
          id?: string
          last_log_date?: string | null
          longest_len?: number
          repair_tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_len?: number
          frozen_until?: string | null
          habit_id?: string
          id?: string
          last_log_date?: string | null
          longest_len?: number
          repair_tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_state_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: true
            referencedRelation: "habit"
            referencedColumns: ["id"]
          },
        ]
      }
      subtext_events: {
        Row: {
          category: string
          created_at: string
          event: string
          id: string
          picked_id: string
          reason: string | null
          run_id: string | null
          ts: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          event: string
          id?: string
          picked_id: string
          reason?: string | null
          run_id?: string | null
          ts?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          event?: string
          id?: string
          picked_id?: string
          reason?: string | null
          run_id?: string | null
          ts?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplement_logs: {
        Row: {
          created_at: string
          dosage: number
          frequency: string | null
          id: string
          image_url: string | null
          name: string
          trigger_tags: string[] | null
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dosage: number
          frequency?: string | null
          id?: string
          image_url?: string | null
          name: string
          trigger_tags?: string[] | null
          unit: string
          user_id: string
        }
        Update: {
          created_at?: string
          dosage?: number
          frequency?: string | null
          id?: string
          image_url?: string | null
          name?: string
          trigger_tags?: string[] | null
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      team_up_prompts_shown: {
        Row: {
          action_taken: string | null
          buddy_user_id: string
          challenge_id: string
          id: string
          shown_at: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          buddy_user_id: string
          challenge_id: string
          id?: string
          shown_at?: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          buddy_user_id?: string
          challenge_id?: string
          id?: string
          shown_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thermotherapy_nudge_preferences: {
        Row: {
          created_at: string
          nudges_enabled: boolean
          push_notifications_enabled: boolean
          smart_nudges_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          nudges_enabled?: boolean
          push_notifications_enabled?: boolean
          smart_nudges_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          nudges_enabled?: boolean
          push_notifications_enabled?: boolean
          smart_nudges_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thermotherapy_nudges: {
        Row: {
          created_at: string
          delivered_at: string
          id: string
          nudge_message: string
          nudge_reason: string
          nudge_type: string
          updated_at: string
          user_action: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          id?: string
          nudge_message: string
          nudge_reason: string
          nudge_type: string
          updated_at?: string
          user_action?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          id?: string
          nudge_message?: string
          nudge_reason?: string
          nudge_type?: string
          updated_at?: string
          user_action?: string
          user_id?: string
        }
        Relationships: []
      }
      thermotherapy_reminders: {
        Row: {
          created_at: string
          id: string
          recurrence: string
          time_of_day: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recurrence?: string
          time_of_day?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recurrence?: string
          time_of_day?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thermotherapy_streaks: {
        Row: {
          created_at: string
          current_streak: number
          last_completed_date: string | null
          longest_streak: number
          total_sessions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_sessions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_sessions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      toxin_detections: {
        Row: {
          created_at: string
          detected_ingredients: string[]
          id: string
          nutrition_log_id: string | null
          serving_count: number
          toxin_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detected_ingredients?: string[]
          id?: string
          nutrition_log_id?: string | null
          serving_count?: number
          toxin_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detected_ingredients?: string[]
          id?: string
          nutrition_log_id?: string | null
          serving_count?: number
          toxin_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toxin_detections_nutrition_log_id_fkey"
            columns: ["nutrition_log_id"]
            isOneToOne: false
            referencedRelation: "nutrition_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toxin_detections_nutrition_log_id_fkey"
            columns: ["nutrition_log_id"]
            isOneToOne: false
            referencedRelation: "nutrition_logs_clean"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          created_at: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_participations: {
        Row: {
          best_streak: number
          challenge_id: string | null
          completed_at: string | null
          completion_percentage: number
          current_progress: number
          daily_completions: Json
          end_date: string
          id: string
          is_completed: boolean
          joined_at: string
          last_progress_update: string | null
          start_date: string
          streak_count: number
          total_target: number
          user_id: string
        }
        Insert: {
          best_streak?: number
          challenge_id?: string | null
          completed_at?: string | null
          completion_percentage?: number
          current_progress?: number
          daily_completions?: Json
          end_date: string
          id?: string
          is_completed?: boolean
          joined_at?: string
          last_progress_update?: string | null
          start_date?: string
          streak_count?: number
          total_target: number
          user_id: string
        }
        Update: {
          best_streak?: number
          challenge_id?: string | null
          completed_at?: string | null
          completion_percentage?: number
          current_progress?: number
          daily_completions?: Json
          end_date?: string
          id?: string
          is_completed?: boolean
          joined_at?: string
          last_progress_update?: string | null
          start_date?: string
          streak_count?: number
          total_target?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_participations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "public_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contacts: {
        Row: {
          contact_hash: string
          contact_name: string
          contact_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          contact_hash: string
          contact_name: string
          contact_type?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          contact_hash?: string
          contact_name?: string
          contact_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_custom_habit: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string
          domain: Database["public"]["Enums"]["habit_domain"]
          icon: string | null
          id: string
          is_archived: boolean
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty: string
          domain: Database["public"]["Enums"]["habit_domain"]
          icon?: string | null
          id?: string
          is_archived?: boolean
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string
          domain?: Database["public"]["Enums"]["habit_domain"]
          icon?: string | null
          id?: string
          is_archived?: boolean
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          flag_key: string
          id: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag_key: string
          id?: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag_key?: string
          id?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_flags_flag_fk"
            columns: ["flag_key"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["key"]
          },
        ]
      }
      user_fitness_preferences: {
        Row: {
          available_equipment: string[]
          created_at: string
          days_per_week: number
          fitness_level: string
          id: string
          injury_considerations: string[]
          intensity_preference: string
          preferred_split: string
          preferred_workout_times: string[]
          primary_goals: string[]
          rest_preferences: Json
          session_duration_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_equipment?: string[]
          created_at?: string
          days_per_week?: number
          fitness_level?: string
          id?: string
          injury_considerations?: string[]
          intensity_preference?: string
          preferred_split?: string
          preferred_workout_times?: string[]
          primary_goals?: string[]
          rest_preferences?: Json
          session_duration_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_equipment?: string[]
          created_at?: string
          days_per_week?: number
          fitness_level?: string
          id?: string
          injury_considerations?: string[]
          intensity_preference?: string
          preferred_split?: string
          preferred_workout_times?: string[]
          primary_goals?: string[]
          rest_preferences?: Json
          session_duration_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          followed_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          followed_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          followed_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          name: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          name: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          name?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      user_habit: {
        Row: {
          created_at: string
          id: string
          is_paused: boolean
          next_due_at: string | null
          notes: string | null
          reminder_at: string | null
          schedule: Json
          slug: string
          snooze_until: string | null
          start_date: string
          status: string
          target: number | null
          target_per_week: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_paused?: boolean
          next_due_at?: string | null
          notes?: string | null
          reminder_at?: string | null
          schedule?: Json
          slug: string
          snooze_until?: string | null
          start_date?: string
          status?: string
          target?: number | null
          target_per_week?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_paused?: boolean
          next_due_at?: string | null
          notes?: string | null
          reminder_at?: string | null
          schedule?: Json
          slug?: string
          snooze_until?: string | null
          start_date?: string
          status?: string
          target?: number | null
          target_per_week?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template_export"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template_health"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_templates"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "v_habit_logs_norm"
            referencedColumns: ["habit_slug"]
          },
        ]
      }
      user_habit_badges: {
        Row: {
          awarded_at: string
          badge: string
          habit_slug: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge: string
          habit_slug: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge?: string
          habit_slug?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_levels: {
        Row: {
          current_xp: number
          last_leveled_up_at: string | null
          level: number
          user_id: string
          xp_to_next_level: number
        }
        Insert: {
          current_xp?: number
          last_leveled_up_at?: string | null
          level?: number
          user_id: string
          xp_to_next_level?: number
        }
        Update: {
          current_xp?: number
          last_leveled_up_at?: string | null
          level?: number
          user_id?: string
          xp_to_next_level?: number
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_privacy_settings: {
        Row: {
          allow_challenge_friend_requests: boolean
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_challenge_friend_requests?: boolean
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_challenge_friend_requests?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_product_prefs: {
        Row: {
          created_at: string
          id: string
          portion_display: string | null
          portion_grams: number
          product_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          portion_display?: string | null
          portion_grams: number
          product_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          portion_display?: string | null
          portion_grams?: number
          product_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          constraints: string[]
          goals: string[]
          preferences: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          constraints?: string[]
          goals?: string[]
          preferences?: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          constraints?: string[]
          goals?: string[]
          preferences?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          allergy_severity: string | null
          avatar_url: string | null
          avatar_variant_1: string | null
          avatar_variant_2: string | null
          avatar_variant_3: string | null
          body_composition_goals: string[] | null
          calculated_bmr: number | null
          calculated_tdee: number | null
          caricature_generation_count: number | null
          caricature_history: Json | null
          caricature_urls: string[] | null
          communication_style: string | null
          completed_sections: string[] | null
          created_at: string
          cross_contamination_sensitivity: boolean | null
          cultural_dietary_restrictions: string[] | null
          current_hydration_streak: number | null
          current_nutrition_streak: number | null
          current_supplement_streak: number | null
          current_supplements: Json | null
          daily_lifestyle: string | null
          deficiency_concerns: string[] | null
          diet_styles: string[] | null
          eating_window: string | null
          exercise_frequency: string | null
          exercise_types: string[] | null
          fasting_schedule: string | null
          fcm_token: string | null
          first_name: string
          followers_count: number | null
          following_count: number | null
          food_allergies: Json | null
          foods_to_avoid: string | null
          gender: string | null
          hall_of_fame_winner: boolean | null
          health_conditions: string[] | null
          health_monitoring_preferences: string[] | null
          height_cm: number | null
          height_feet: number | null
          height_inches: number | null
          height_unit: string | null
          hydration_target_ml: number | null
          id: string
          last_caricature_generation: string | null
          last_hydration_log_date: string | null
          last_name: string
          last_nutrition_log_date: string | null
          last_profile_update: string | null
          last_supplement_log_date: string | null
          longest_hydration_streak: number | null
          longest_nutrition_streak: number | null
          longest_supplement_streak: number | null
          main_health_goal: string | null
          meal_frequency: number | null
          medications: string[] | null
          onboarding_completed: boolean | null
          onboarding_defaults_applied: boolean
          onboarding_skipped: boolean | null
          phone: string | null
          priority_micronutrients: string[] | null
          profile_completion_percentage: number | null
          progress_tracking_priorities: string[] | null
          recovery_sleep_quality: string | null
          reminder_frequency: string | null
          selected_avatar_variant: number | null
          selected_badge_title: string | null
          selected_trackers: string[]
          shares_count: number
          show_onboarding_reminder: boolean | null
          snacking_patterns: string | null
          social_eating_preferences: string | null
          specific_health_conditions: Json | null
          supplement_goals: string[] | null
          supplement_preferences: string | null
          target_calories: number | null
          target_carbs: number | null
          target_fat: number | null
          target_fiber: number | null
          target_protein: number | null
          target_weight: number | null
          total_badges_earned: number | null
          toxin_sensitivity_level: string | null
          updated_at: string
          user_id: string
          weight: number | null
          weight_goal_timeline: string | null
          weight_goal_type: string | null
          weight_unit: string | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          allergy_severity?: string | null
          avatar_url?: string | null
          avatar_variant_1?: string | null
          avatar_variant_2?: string | null
          avatar_variant_3?: string | null
          body_composition_goals?: string[] | null
          calculated_bmr?: number | null
          calculated_tdee?: number | null
          caricature_generation_count?: number | null
          caricature_history?: Json | null
          caricature_urls?: string[] | null
          communication_style?: string | null
          completed_sections?: string[] | null
          created_at?: string
          cross_contamination_sensitivity?: boolean | null
          cultural_dietary_restrictions?: string[] | null
          current_hydration_streak?: number | null
          current_nutrition_streak?: number | null
          current_supplement_streak?: number | null
          current_supplements?: Json | null
          daily_lifestyle?: string | null
          deficiency_concerns?: string[] | null
          diet_styles?: string[] | null
          eating_window?: string | null
          exercise_frequency?: string | null
          exercise_types?: string[] | null
          fasting_schedule?: string | null
          fcm_token?: string | null
          first_name?: string
          followers_count?: number | null
          following_count?: number | null
          food_allergies?: Json | null
          foods_to_avoid?: string | null
          gender?: string | null
          hall_of_fame_winner?: boolean | null
          health_conditions?: string[] | null
          health_monitoring_preferences?: string[] | null
          height_cm?: number | null
          height_feet?: number | null
          height_inches?: number | null
          height_unit?: string | null
          hydration_target_ml?: number | null
          id?: string
          last_caricature_generation?: string | null
          last_hydration_log_date?: string | null
          last_name?: string
          last_nutrition_log_date?: string | null
          last_profile_update?: string | null
          last_supplement_log_date?: string | null
          longest_hydration_streak?: number | null
          longest_nutrition_streak?: number | null
          longest_supplement_streak?: number | null
          main_health_goal?: string | null
          meal_frequency?: number | null
          medications?: string[] | null
          onboarding_completed?: boolean | null
          onboarding_defaults_applied?: boolean
          onboarding_skipped?: boolean | null
          phone?: string | null
          priority_micronutrients?: string[] | null
          profile_completion_percentage?: number | null
          progress_tracking_priorities?: string[] | null
          recovery_sleep_quality?: string | null
          reminder_frequency?: string | null
          selected_avatar_variant?: number | null
          selected_badge_title?: string | null
          selected_trackers?: string[]
          shares_count?: number
          show_onboarding_reminder?: boolean | null
          snacking_patterns?: string | null
          social_eating_preferences?: string | null
          specific_health_conditions?: Json | null
          supplement_goals?: string[] | null
          supplement_preferences?: string | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          target_fiber?: number | null
          target_protein?: number | null
          target_weight?: number | null
          total_badges_earned?: number | null
          toxin_sensitivity_level?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
          weight_goal_timeline?: string | null
          weight_goal_type?: string | null
          weight_unit?: string | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          allergy_severity?: string | null
          avatar_url?: string | null
          avatar_variant_1?: string | null
          avatar_variant_2?: string | null
          avatar_variant_3?: string | null
          body_composition_goals?: string[] | null
          calculated_bmr?: number | null
          calculated_tdee?: number | null
          caricature_generation_count?: number | null
          caricature_history?: Json | null
          caricature_urls?: string[] | null
          communication_style?: string | null
          completed_sections?: string[] | null
          created_at?: string
          cross_contamination_sensitivity?: boolean | null
          cultural_dietary_restrictions?: string[] | null
          current_hydration_streak?: number | null
          current_nutrition_streak?: number | null
          current_supplement_streak?: number | null
          current_supplements?: Json | null
          daily_lifestyle?: string | null
          deficiency_concerns?: string[] | null
          diet_styles?: string[] | null
          eating_window?: string | null
          exercise_frequency?: string | null
          exercise_types?: string[] | null
          fasting_schedule?: string | null
          fcm_token?: string | null
          first_name?: string
          followers_count?: number | null
          following_count?: number | null
          food_allergies?: Json | null
          foods_to_avoid?: string | null
          gender?: string | null
          hall_of_fame_winner?: boolean | null
          health_conditions?: string[] | null
          health_monitoring_preferences?: string[] | null
          height_cm?: number | null
          height_feet?: number | null
          height_inches?: number | null
          height_unit?: string | null
          hydration_target_ml?: number | null
          id?: string
          last_caricature_generation?: string | null
          last_hydration_log_date?: string | null
          last_name?: string
          last_nutrition_log_date?: string | null
          last_profile_update?: string | null
          last_supplement_log_date?: string | null
          longest_hydration_streak?: number | null
          longest_nutrition_streak?: number | null
          longest_supplement_streak?: number | null
          main_health_goal?: string | null
          meal_frequency?: number | null
          medications?: string[] | null
          onboarding_completed?: boolean | null
          onboarding_defaults_applied?: boolean
          onboarding_skipped?: boolean | null
          phone?: string | null
          priority_micronutrients?: string[] | null
          profile_completion_percentage?: number | null
          progress_tracking_priorities?: string[] | null
          recovery_sleep_quality?: string | null
          reminder_frequency?: string | null
          selected_avatar_variant?: number | null
          selected_badge_title?: string | null
          selected_trackers?: string[]
          shares_count?: number
          show_onboarding_reminder?: boolean | null
          snacking_patterns?: string | null
          social_eating_preferences?: string | null
          specific_health_conditions?: Json | null
          supplement_goals?: string[] | null
          supplement_preferences?: string | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          target_fiber?: number | null
          target_protein?: number | null
          target_weight?: number | null
          total_badges_earned?: number | null
          toxin_sensitivity_level?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
          weight_goal_timeline?: string | null
          weight_goal_type?: string | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      user_ranking_history: {
        Row: {
          id: string
          new_rank: number
          old_rank: number
          rank_change: number
          timestamp: string
          user_id: string
        }
        Insert: {
          id?: string
          new_rank: number
          old_rank: number
          rank_change: number
          timestamp?: string
          user_id: string
        }
        Update: {
          id?: string
          new_rank?: number
          old_rank?: number
          rank_change?: number
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_action_audit: {
        Row: {
          args_json: Json
          correlation_id: string
          created_at: string
          error_message: string | null
          error_text: string | null
          id: string
          ok: boolean
          succeeded: boolean
          tool: string
          user_id: string
        }
        Insert: {
          args_json: Json
          correlation_id: string
          created_at?: string
          error_message?: string | null
          error_text?: string | null
          id?: string
          ok: boolean
          succeeded?: boolean
          tool: string
          user_id: string
        }
        Update: {
          args_json?: Json
          correlation_id?: string
          created_at?: string
          error_message?: string | null
          error_text?: string | null
          id?: string
          ok?: boolean
          succeeded?: boolean
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_audit: {
        Row: {
          action: string
          created_at: string | null
          id: string
          payload: Json | null
          tool_name: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          payload?: Json | null
          tool_name?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          payload?: Json | null
          tool_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      voice_quota: {
        Row: {
          month_key: string
          plan_minutes: number
          used_seconds_month: number
          user_id: string
        }
        Insert: {
          month_key?: string
          plan_minutes?: number
          used_seconds_month?: number
          user_id: string
        }
        Update: {
          month_key?: string
          plan_minutes?: number
          used_seconds_month?: number
          user_id?: string
        }
        Relationships: []
      }
      voice_session: {
        Row: {
          cost_cents: number | null
          ended_at: string | null
          id: string
          started_at: string | null
          total_seconds: number | null
          user_id: string
        }
        Insert: {
          cost_cents?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          total_seconds?: number | null
          user_id: string
        }
        Update: {
          cost_cents?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          total_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
      voice_turn: {
        Row: {
          audio_url: string | null
          created_at: string | null
          id: string
          ms_asr: number | null
          ms_tts: number | null
          role: string
          session_id: string
          text: string | null
          tokens_output: number | null
          tokens_prompt: number | null
          tool_name: string | null
          tool_payload: Json | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          ms_asr?: number | null
          ms_tts?: number | null
          role: string
          session_id: string
          text?: string | null
          tokens_output?: number | null
          tokens_prompt?: number | null
          tool_name?: string | null
          tool_payload?: Json | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          id?: string
          ms_asr?: number | null
          ms_tts?: number | null
          role?: string
          session_id?: string
          text?: string | null
          tokens_output?: number | null
          tokens_prompt?: number | null
          tool_name?: string | null
          tool_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_turn_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "voice_session"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_exercise_insights: {
        Row: {
          created_at: string
          days_skipped: number
          id: string
          missed_target_areas: string[] | null
          most_frequent_muscle_groups: string[] | null
          motivational_headline: string
          progress_message: string
          suggestion_tip: string
          total_calories_burned: number
          total_duration_minutes: number
          updated_at: string
          user_id: string
          volume_trend: string | null
          week_end_date: string
          week_start_date: string
          workouts_completed: number
        }
        Insert: {
          created_at?: string
          days_skipped?: number
          id?: string
          missed_target_areas?: string[] | null
          most_frequent_muscle_groups?: string[] | null
          motivational_headline: string
          progress_message: string
          suggestion_tip: string
          total_calories_burned?: number
          total_duration_minutes?: number
          updated_at?: string
          user_id: string
          volume_trend?: string | null
          week_end_date: string
          week_start_date: string
          workouts_completed?: number
        }
        Update: {
          created_at?: string
          days_skipped?: number
          id?: string
          missed_target_areas?: string[] | null
          most_frequent_muscle_groups?: string[] | null
          motivational_headline?: string
          progress_message?: string
          suggestion_tip?: string
          total_calories_burned?: number
          total_duration_minutes?: number
          updated_at?: string
          user_id?: string
          volume_trend?: string | null
          week_end_date?: string
          week_start_date?: string
          workouts_completed?: number
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          created_at: string
          id: string
          overall_score: number | null
          report_data: Json
          summary_text: string | null
          title: string
          updated_at: string
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          overall_score?: number | null
          report_data?: Json
          summary_text?: string | null
          title: string
          updated_at?: string
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          overall_score?: number | null
          report_data?: Json
          summary_text?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
      weekly_summaries: {
        Row: {
          average_score: number | null
          created_at: string | null
          days_with_meals: number | null
          id: string
          meals_logged_count: number | null
          message: string
          previous_week_average: number | null
          user_id: string
          week_start: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string | null
          days_with_meals?: number | null
          id?: string
          meals_logged_count?: number | null
          message: string
          previous_week_average?: number | null
          user_id: string
          week_start: string
        }
        Update: {
          average_score?: number | null
          created_at?: string | null
          days_with_meals?: number | null
          id?: string
          meals_logged_count?: number | null
          message?: string
          previous_week_average?: number | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      workout_adaptations: {
        Row: {
          adaptation_reasons: Json
          adaptation_type: string
          adapted_workout_data: Json
          ai_coach_feedback: string | null
          created_at: string
          day_number: number
          id: string
          is_active: boolean
          original_workout_data: Json
          performance_metrics: Json
          routine_id: string
          updated_at: string
          user_id: string
          week_number: number
        }
        Insert: {
          adaptation_reasons?: Json
          adaptation_type: string
          adapted_workout_data?: Json
          ai_coach_feedback?: string | null
          created_at?: string
          day_number: number
          id?: string
          is_active?: boolean
          original_workout_data?: Json
          performance_metrics?: Json
          routine_id: string
          updated_at?: string
          user_id: string
          week_number: number
        }
        Update: {
          adaptation_reasons?: Json
          adaptation_type?: string
          adapted_workout_data?: Json
          ai_coach_feedback?: string | null
          created_at?: string
          day_number?: number
          id?: string
          is_active?: boolean
          original_workout_data?: Json
          performance_metrics?: Json
          routine_id?: string
          updated_at?: string
          user_id?: string
          week_number?: number
        }
        Relationships: []
      }
      workout_completions: {
        Row: {
          completed_at: string
          created_at: string
          difficulty_feedback: string | null
          duration_minutes: number
          exercises_count: number
          id: string
          journal_entry: string | null
          motivational_message: string | null
          muscles_worked: string[]
          sets_count: number
          updated_at: string
          user_id: string
          workout_data: Json | null
          workout_id: string | null
          workout_type: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          difficulty_feedback?: string | null
          duration_minutes: number
          exercises_count?: number
          id?: string
          journal_entry?: string | null
          motivational_message?: string | null
          muscles_worked?: string[]
          sets_count?: number
          updated_at?: string
          user_id: string
          workout_data?: Json | null
          workout_id?: string | null
          workout_type: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          difficulty_feedback?: string | null
          duration_minutes?: number
          exercises_count?: number
          id?: string
          journal_entry?: string | null
          motivational_message?: string | null
          muscles_worked?: string[]
          sets_count?: number
          updated_at?: string
          user_id?: string
          workout_data?: Json | null
          workout_id?: string | null
          workout_type?: string
        }
        Relationships: []
      }
      workout_feedback: {
        Row: {
          adaptation_suggestions: Json | null
          coach_comment: string
          created_at: string
          emoji: string
          id: string
          intensity_level: string | null
          mood_label: string
          performance_score: number | null
          routine_id: string | null
          sets_completed: number
          sets_skipped: number
          total_sets: number
          updated_at: string
          user_id: string
          user_response: string | null
          user_response_emoji: string | null
          workout_duration_minutes: number | null
          workout_log_id: string | null
          workout_title: string | null
        }
        Insert: {
          adaptation_suggestions?: Json | null
          coach_comment: string
          created_at?: string
          emoji: string
          id?: string
          intensity_level?: string | null
          mood_label: string
          performance_score?: number | null
          routine_id?: string | null
          sets_completed?: number
          sets_skipped?: number
          total_sets?: number
          updated_at?: string
          user_id: string
          user_response?: string | null
          user_response_emoji?: string | null
          workout_duration_minutes?: number | null
          workout_log_id?: string | null
          workout_title?: string | null
        }
        Update: {
          adaptation_suggestions?: Json | null
          coach_comment?: string
          created_at?: string
          emoji?: string
          id?: string
          intensity_level?: string | null
          mood_label?: string
          performance_score?: number | null
          routine_id?: string | null
          sets_completed?: number
          sets_skipped?: number
          total_sets?: number
          updated_at?: string
          user_id?: string
          user_response?: string | null
          user_response_emoji?: string | null
          workout_duration_minutes?: number | null
          workout_log_id?: string | null
          workout_title?: string | null
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          completed_at: string
          created_at: string
          day_index: number
          day_name: string
          duration_seconds: number | null
          exercise_name: string
          exercise_type: string
          id: string
          notes: string | null
          reps_completed: string | null
          routine_id: string | null
          sets_completed: number | null
          skipped_set_reasons: string[] | null
          skipped_sets: number
          target_reps: string | null
          target_sets: number | null
          updated_at: string
          user_id: string
          weight_used: number | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          day_index: number
          day_name: string
          duration_seconds?: number | null
          exercise_name: string
          exercise_type?: string
          id?: string
          notes?: string | null
          reps_completed?: string | null
          routine_id?: string | null
          sets_completed?: number | null
          skipped_set_reasons?: string[] | null
          skipped_sets?: number
          target_reps?: string | null
          target_sets?: number | null
          updated_at?: string
          user_id: string
          weight_used?: number | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          day_index?: number
          day_name?: string
          duration_seconds?: number | null
          exercise_name?: string
          exercise_type?: string
          id?: string
          notes?: string | null
          reps_completed?: string | null
          routine_id?: string | null
          sets_completed?: number | null
          skipped_set_reasons?: string[] | null
          skipped_sets?: number
          target_reps?: string | null
          target_sets?: number | null
          updated_at?: string
          user_id?: string
          weight_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "ai_generated_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_performance_logs: {
        Row: {
          completed_exercises_count: number
          completed_sets_count: number
          created_at: string
          day_number: number
          difficulty_rating: string | null
          energy_level: number | null
          extra_rest_seconds: number
          id: string
          muscle_groups_worked: string[]
          notes: string | null
          performance_score: number | null
          planned_duration_minutes: number | null
          routine_id: string
          skipped_steps_count: number
          total_duration_minutes: number
          total_exercises_count: number
          total_sets_count: number
          user_id: string
          week_number: number
          workout_title: string
        }
        Insert: {
          completed_exercises_count?: number
          completed_sets_count?: number
          created_at?: string
          day_number: number
          difficulty_rating?: string | null
          energy_level?: number | null
          extra_rest_seconds?: number
          id?: string
          muscle_groups_worked?: string[]
          notes?: string | null
          performance_score?: number | null
          planned_duration_minutes?: number | null
          routine_id: string
          skipped_steps_count?: number
          total_duration_minutes: number
          total_exercises_count?: number
          total_sets_count?: number
          user_id: string
          week_number: number
          workout_title: string
        }
        Update: {
          completed_exercises_count?: number
          completed_sets_count?: number
          created_at?: string
          day_number?: number
          difficulty_rating?: string | null
          energy_level?: number | null
          extra_rest_seconds?: number
          id?: string
          muscle_groups_worked?: string[]
          notes?: string | null
          performance_score?: number | null
          planned_duration_minutes?: number | null
          routine_id?: string
          skipped_steps_count?: number
          total_duration_minutes?: number
          total_exercises_count?: number
          total_sets_count?: number
          user_id?: string
          week_number?: number
          workout_title?: string
        }
        Relationships: []
      }
      workout_routines: {
        Row: {
          ai_routine_id: string | null
          completed_at: string | null
          completion_status: string | null
          created_at: string | null
          day_of_week: string
          difficulty_level: string | null
          estimated_duration: number | null
          exercises: Json | null
          id: string
          is_locked: boolean | null
          performance_notes: string | null
          progression_notes: string | null
          rest_periods: Json | null
          target_muscles: string[] | null
          updated_at: string | null
          user_id: string
          week_number: number
          workout_type: string | null
        }
        Insert: {
          ai_routine_id?: string | null
          completed_at?: string | null
          completion_status?: string | null
          created_at?: string | null
          day_of_week: string
          difficulty_level?: string | null
          estimated_duration?: number | null
          exercises?: Json | null
          id?: string
          is_locked?: boolean | null
          performance_notes?: string | null
          progression_notes?: string | null
          rest_periods?: Json | null
          target_muscles?: string[] | null
          updated_at?: string | null
          user_id: string
          week_number?: number
          workout_type?: string | null
        }
        Update: {
          ai_routine_id?: string | null
          completed_at?: string | null
          completion_status?: string | null
          created_at?: string | null
          day_of_week?: string
          difficulty_level?: string | null
          estimated_duration?: number | null
          exercises?: Json | null
          id?: string
          is_locked?: boolean | null
          performance_notes?: string | null
          progression_notes?: string | null
          rest_periods?: Json | null
          target_muscles?: string[] | null
          updated_at?: string | null
          user_id?: string
          week_number?: number
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_routines_ai_routine_id_fkey"
            columns: ["ai_routine_id"]
            isOneToOne: false
            referencedRelation: "ai_routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_routines_ai_routine_id_fkey"
            columns: ["ai_routine_id"]
            isOneToOne: false
            referencedRelation: "routine_performance_analytics"
            referencedColumns: ["routine_id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          calories_burned: number | null
          completed_at: string | null
          completed_exercises: number
          created_at: string
          day_index: number
          day_name: string
          id: string
          is_completed: boolean | null
          routine_id: string | null
          session_notes: string | null
          started_at: string
          total_duration_minutes: number | null
          total_exercises: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string | null
          completed_exercises?: number
          created_at?: string
          day_index: number
          day_name: string
          id?: string
          is_completed?: boolean | null
          routine_id?: string | null
          session_notes?: string | null
          started_at?: string
          total_duration_minutes?: number | null
          total_exercises?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string | null
          completed_exercises?: number
          created_at?: string
          day_index?: number
          day_name?: string
          id?: string
          is_completed?: boolean | null
          routine_id?: string | null
          session_notes?: string | null
          started_at?: string
          total_duration_minutes?: number | null
          total_exercises?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "ai_generated_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_xp_logs: {
        Row: {
          base_xp: number
          bonus_xp: number
          created_at: string | null
          id: string
          performance_score: number | null
          reason: string | null
          routine_id: string | null
          total_xp: number
          user_id: string
        }
        Insert: {
          base_xp?: number
          bonus_xp?: number
          created_at?: string | null
          id?: string
          performance_score?: number | null
          reason?: string | null
          routine_id?: string | null
          total_xp?: number
          user_id: string
        }
        Update: {
          base_xp?: number
          bonus_xp?: number
          created_at?: string | null
          id?: string
          performance_score?: number | null
          reason?: string | null
          routine_id?: string | null
          total_xp?: number
          user_id?: string
        }
        Relationships: []
      }
      xp_config: {
        Row: {
          action_hydration_log: number
          action_meal_log: number
          action_recovery_log: number
          action_workout_logged: number
          created_at: string
          curve_base: number
          curve_exp: number
          curve_min_next: number
          daily_post_cap_multiplier: number
          daily_reset_hour: number
          daily_soft_cap: number
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          action_hydration_log?: number
          action_meal_log?: number
          action_recovery_log?: number
          action_workout_logged?: number
          created_at?: string
          curve_base?: number
          curve_exp?: number
          curve_min_next?: number
          daily_post_cap_multiplier?: number
          daily_reset_hour?: number
          daily_soft_cap?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          action_hydration_log?: number
          action_meal_log?: number
          action_recovery_log?: number
          action_workout_logged?: number
          created_at?: string
          curve_base?: number
          curve_exp?: number
          curve_min_next?: number
          daily_post_cap_multiplier?: number
          daily_reset_hour?: number
          daily_soft_cap?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      yearly_exercise_reports: {
        Row: {
          created_at: string
          days_active: number
          days_skipped: number
          id: string
          missed_muscle_groups: string[] | null
          most_frequent_muscle_groups: string[] | null
          motivational_title: string
          personalized_message: string
          report_data: Json
          smart_suggestions: string
          total_calories_burned: number
          total_duration_minutes: number
          total_workouts_completed: number
          updated_at: string
          user_id: string
          year_end: string
          year_over_year_progress: Json | null
          year_start: string
        }
        Insert: {
          created_at?: string
          days_active?: number
          days_skipped?: number
          id?: string
          missed_muscle_groups?: string[] | null
          most_frequent_muscle_groups?: string[] | null
          motivational_title: string
          personalized_message: string
          report_data?: Json
          smart_suggestions: string
          total_calories_burned?: number
          total_duration_minutes?: number
          total_workouts_completed?: number
          updated_at?: string
          user_id: string
          year_end: string
          year_over_year_progress?: Json | null
          year_start: string
        }
        Update: {
          created_at?: string
          days_active?: number
          days_skipped?: number
          id?: string
          missed_muscle_groups?: string[] | null
          most_frequent_muscle_groups?: string[] | null
          motivational_title?: string
          personalized_message?: string
          report_data?: Json
          smart_suggestions?: string
          total_calories_burned?: number
          total_duration_minutes?: number
          total_workouts_completed?: number
          updated_at?: string
          user_id?: string
          year_end?: string
          year_over_year_progress?: Json | null
          year_start?: string
        }
        Relationships: []
      }
      yearly_hall_of_fame: {
        Row: {
          avg_hydration_streak: number | null
          avg_nutrition_streak: number | null
          avg_supplement_streak: number | null
          created_at: string
          display_name: string
          id: string
          monthly_trophies: number
          rank_position: number
          total_active_days: number
          total_messages: number
          user_id: string
          username: string
          year: number
          yearly_score: number
        }
        Insert: {
          avg_hydration_streak?: number | null
          avg_nutrition_streak?: number | null
          avg_supplement_streak?: number | null
          created_at?: string
          display_name: string
          id?: string
          monthly_trophies?: number
          rank_position: number
          total_active_days?: number
          total_messages?: number
          user_id: string
          username: string
          year: number
          yearly_score?: number
        }
        Update: {
          avg_hydration_streak?: number | null
          avg_nutrition_streak?: number | null
          avg_supplement_streak?: number | null
          created_at?: string
          display_name?: string
          id?: string
          monthly_trophies?: number
          rank_position?: number
          total_active_days?: number
          total_messages?: number
          user_id?: string
          username?: string
          year?: number
          yearly_score?: number
        }
        Relationships: []
      }
      yearly_reports: {
        Row: {
          created_at: string
          id: string
          overall_score: number | null
          report_data: Json
          summary_text: string | null
          title: string
          updated_at: string
          user_id: string
          year_end_date: string
          year_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          overall_score?: number | null
          report_data?: Json
          summary_text?: string | null
          title: string
          updated_at?: string
          user_id: string
          year_end_date: string
          year_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          overall_score?: number | null
          report_data?: Json
          summary_text?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          year_end_date?: string
          year_start_date?: string
        }
        Relationships: []
      }
      yearly_score_preview: {
        Row: {
          avg_hydration_streak: number | null
          avg_nutrition_streak: number | null
          avg_supplement_streak: number | null
          created_at: string
          display_name: string
          id: string
          last_updated: string
          monthly_trophies: number
          rank_position: number
          total_active_days: number
          total_messages: number
          user_id: string
          username: string
          year: number
          yearly_score: number
        }
        Insert: {
          avg_hydration_streak?: number | null
          avg_nutrition_streak?: number | null
          avg_supplement_streak?: number | null
          created_at?: string
          display_name: string
          id?: string
          last_updated?: string
          monthly_trophies?: number
          rank_position: number
          total_active_days?: number
          total_messages?: number
          user_id: string
          username: string
          year: number
          yearly_score?: number
        }
        Update: {
          avg_hydration_streak?: number | null
          avg_nutrition_streak?: number | null
          avg_supplement_streak?: number | null
          created_at?: string
          display_name?: string
          id?: string
          last_updated?: string
          monthly_trophies?: number
          rank_position?: number
          total_active_days?: number
          total_messages?: number
          user_id?: string
          username?: string
          year?: number
          yearly_score?: number
        }
        Relationships: []
      }
      yoga_nudge_preferences: {
        Row: {
          created_at: string
          nudges_enabled: boolean
          push_notifications_enabled: boolean
          smart_nudges_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          nudges_enabled?: boolean
          push_notifications_enabled?: boolean
          smart_nudges_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          nudges_enabled?: boolean
          push_notifications_enabled?: boolean
          smart_nudges_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      yoga_nudges: {
        Row: {
          created_at: string
          delivered_at: string
          id: string
          nudge_message: string
          nudge_reason: string
          nudge_type: string
          updated_at: string
          user_action: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          id?: string
          nudge_message: string
          nudge_reason: string
          nudge_type: string
          updated_at?: string
          user_action?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          id?: string
          nudge_message?: string
          nudge_reason?: string
          nudge_type?: string
          updated_at?: string
          user_action?: string
          user_id?: string
        }
        Relationships: []
      }
      yoga_reminders: {
        Row: {
          created_at: string
          id: string
          recurrence: string
          time_of_day: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recurrence?: string
          time_of_day?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recurrence?: string
          time_of_day?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      yoga_streaks: {
        Row: {
          created_at: string
          current_streak: number
          last_completed_date: string | null
          longest_streak: number
          total_sessions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_sessions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_sessions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      activity_steps_daily: {
        Row: {
          date: string | null
          source_count: number | null
          steps: number | null
          user_id: string | null
        }
        Relationships: []
      }
      arena_billboard: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          rank: number | null
          score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      arena_billboard_mv: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          rank: number | null
          score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      arena_billboard_with_profiles: {
        Row: {
          avatar_url: string | null
          points: number | null
          rank: number | null
          season_at: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      arena_last_month_winners: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          rank: number | null
          score: number | null
          season_month: string | null
          trophy_level: string | null
          user_id: string | null
        }
        Relationships: []
      }
      arena_leaderboard_view: {
        Row: {
          avatar_url: string | null
          challenge_id: string | null
          display_name: string | null
          points: number | null
          rank: number | null
          streak: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_rank20_groups_challenge"
            columns: ["challenge_id"]
            isOneToOne: true
            referencedRelation: "private_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges_with_counts: {
        Row: {
          category: string | null
          cover_emoji: string | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          end_at: string | null
          id: string | null
          invite_code: string | null
          owner_user_id: string | null
          participants: number | null
          title: string | null
          visibility: Database["public"]["Enums"]["challenge_visibility"] | null
        }
        Insert: {
          category?: string | null
          cover_emoji?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          end_at?: never
          id?: string | null
          invite_code?: string | null
          owner_user_id?: string | null
          participants?: never
          title?: string | null
          visibility?:
            | Database["public"]["Enums"]["challenge_visibility"]
            | null
        }
        Update: {
          category?: string | null
          cover_emoji?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          end_at?: never
          id?: string | null
          invite_code?: string | null
          owner_user_id?: string | null
          participants?: never
          title?: string | null
          visibility?:
            | Database["public"]["Enums"]["challenge_visibility"]
            | null
        }
        Relationships: []
      }
      habit_template_categories: {
        Row: {
          category: string | null
          domain: Database["public"]["Enums"]["habit_domain"] | null
        }
        Relationships: []
      }
      habit_template_export: {
        Row: {
          category: string | null
          default_target: number | null
          difficulty: string | null
          domain: Database["public"]["Enums"]["habit_domain"] | null
          estimated_minutes: number | null
          goal_type: Database["public"]["Enums"]["habit_goal_type"] | null
          min_viable: string | null
          name: string | null
          slug: string | null
          sources: string | null
          summary: string | null
          tags: string | null
        }
        Insert: {
          category?: string | null
          default_target?: number | null
          difficulty?: string | null
          domain?: Database["public"]["Enums"]["habit_domain"] | null
          estimated_minutes?: number | null
          goal_type?: Database["public"]["Enums"]["habit_goal_type"] | null
          min_viable?: string | null
          name?: string | null
          slug?: string | null
          sources?: string | null
          summary?: string | null
          tags?: string | null
        }
        Update: {
          category?: string | null
          default_target?: number | null
          difficulty?: string | null
          domain?: Database["public"]["Enums"]["habit_domain"] | null
          estimated_minutes?: number | null
          goal_type?: Database["public"]["Enums"]["habit_goal_type"] | null
          min_viable?: string | null
          name?: string | null
          slug?: string | null
          sources?: string | null
          summary?: string | null
          tags?: string | null
        }
        Relationships: []
      }
      habit_template_health: {
        Row: {
          bad_bool_target: boolean | null
          bad_minutes: boolean | null
          missing_target: boolean | null
          name: string | null
          slug: string | null
        }
        Insert: {
          bad_bool_target?: never
          bad_minutes?: never
          missing_target?: never
          name?: string | null
          slug?: string | null
        }
        Update: {
          bad_bool_target?: never
          bad_minutes?: never
          missing_target?: never
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      habit_templates: {
        Row: {
          category: string | null
          coach_copy: Json | null
          coach_tones: Json | null
          contraindications: string | null
          created_at: string | null
          cues_and_stacking: string | null
          default_target: number | null
          difficulty: string | null
          domain: Database["public"]["Enums"]["habit_domain"] | null
          equipment: string | null
          estimated_minutes: number | null
          goal_type: Database["public"]["Enums"]["habit_goal_type"] | null
          id: string | null
          min_viable: string | null
          name: string | null
          slug: string | null
          sources: string | null
          suggested_rules: Json | null
          summary: string | null
          tags: string | null
          time_windows: Json | null
        }
        Insert: {
          category?: string | null
          coach_copy?: Json | null
          coach_tones?: Json | null
          contraindications?: string | null
          created_at?: string | null
          cues_and_stacking?: string | null
          default_target?: number | null
          difficulty?: string | null
          domain?: Database["public"]["Enums"]["habit_domain"] | null
          equipment?: string | null
          estimated_minutes?: number | null
          goal_type?: Database["public"]["Enums"]["habit_goal_type"] | null
          id?: string | null
          min_viable?: string | null
          name?: string | null
          slug?: string | null
          sources?: string | null
          suggested_rules?: Json | null
          summary?: string | null
          tags?: string | null
          time_windows?: Json | null
        }
        Update: {
          category?: string | null
          coach_copy?: Json | null
          coach_tones?: Json | null
          contraindications?: string | null
          created_at?: string | null
          cues_and_stacking?: string | null
          default_target?: number | null
          difficulty?: string | null
          domain?: Database["public"]["Enums"]["habit_domain"] | null
          equipment?: string | null
          estimated_minutes?: number | null
          goal_type?: Database["public"]["Enums"]["habit_goal_type"] | null
          id?: string | null
          min_viable?: string | null
          name?: string | null
          slug?: string | null
          sources?: string | null
          suggested_rules?: Json | null
          summary?: string | null
          tags?: string | null
          time_windows?: Json | null
        }
        Relationships: []
      }
      muscle_group_trends: {
        Row: {
          avg_sets_per_exercise: number | null
          completion_rate: number | null
          muscle_group: string | null
          prev_week_sets: number | null
          skip_rate: number | null
          top_exercises: string[] | null
          total_exercises: number | null
          total_sets: number | null
          total_skipped: number | null
          trend_direction: string | null
          unique_exercises: number | null
          user_id: string | null
          week_start: string | null
        }
        Relationships: []
      }
      muscle_group_weekly_analysis: {
        Row: {
          avg_duration_seconds: number | null
          avg_sets_completed: number | null
          muscle_group: string | null
          routine_id: string | null
          times_trained: number | null
          user_id: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "ai_generated_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_logs_clean: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number | null
          carbs: number | null
          confidence: number | null
          created_at: string | null
          deleted_at: string | null
          fat: number | null
          fiber: number | null
          food_name: string | null
          id: string | null
          image_url: string | null
          ingredient_analysis: Json | null
          is_mock: boolean | null
          processing_level: string | null
          protein: number | null
          quality_reasons: string[] | null
          quality_score: number | null
          quality_verdict: string | null
          report_snapshot: Json | null
          saturated_fat: number | null
          serving_size: string | null
          snapshot_version: string | null
          sodium: number | null
          source: string | null
          source_meta: Json | null
          sugar: number | null
          trigger_tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          confidence?: number | null
          created_at?: string | null
          deleted_at?: string | null
          fat?: number | null
          fiber?: number | null
          food_name?: string | null
          id?: string | null
          image_url?: string | null
          ingredient_analysis?: Json | null
          is_mock?: boolean | null
          processing_level?: string | null
          protein?: number | null
          quality_reasons?: string[] | null
          quality_score?: number | null
          quality_verdict?: string | null
          report_snapshot?: Json | null
          saturated_fat?: number | null
          serving_size?: string | null
          snapshot_version?: string | null
          sodium?: number | null
          source?: string | null
          source_meta?: Json | null
          sugar?: number | null
          trigger_tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          confidence?: number | null
          created_at?: string | null
          deleted_at?: string | null
          fat?: number | null
          fiber?: number | null
          food_name?: string | null
          id?: string | null
          image_url?: string | null
          ingredient_analysis?: Json | null
          is_mock?: boolean | null
          processing_level?: string | null
          protein?: number | null
          quality_reasons?: string[] | null
          quality_score?: number | null
          quality_verdict?: string | null
          report_snapshot?: Json | null
          saturated_fat?: number | null
          serving_size?: string | null
          snapshot_version?: string | null
          sodium?: number | null
          source?: string | null
          source_meta?: Json | null
          sugar?: number | null
          trigger_tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      routine_performance_analytics: {
        Row: {
          avg_completion_percentage: number | null
          avg_duration_seconds: number | null
          completed_workouts: number | null
          routine_id: string | null
          routine_name: string | null
          total_workouts: number | null
          user_id: string | null
          week_start: string | null
        }
        Relationships: []
      }
      v_affiliate_summary: {
        Row: {
          influencer_id: string | null
          partner_count: number | null
          program_id: string | null
          total_clicks: number | null
          total_commission_cents: number | null
          total_conversions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_program_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: true
            referencedRelation: "influencer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_program_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: true
            referencedRelation: "v_influencer_earnings"
            referencedColumns: ["influencer_id"]
          },
          {
            foreignKeyName: "affiliate_program_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: true
            referencedRelation: "v_influencer_public_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      v_habit_consistency: {
        Row: {
          done_30d: number | null
          habit_slug: string | null
          user_id: string | null
          window_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_template"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_template_export"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_template_health"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_templates"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "v_habit_logs_norm"
            referencedColumns: ["habit_slug"]
          },
        ]
      }
      v_habit_logs_norm: {
        Row: {
          habit_slug: string | null
          note: string | null
          occurred_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_habit_streaks: {
        Row: {
          current_streak: number | null
          done_today: boolean | null
          habit_slug: string | null
          last_done_on: string | null
          longest_streak: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_template"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_template_export"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_template_health"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "habit_templates"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_habit_slug_fkey"
            columns: ["habit_slug"]
            isOneToOne: false
            referencedRelation: "v_habit_logs_norm"
            referencedColumns: ["habit_slug"]
          },
        ]
      }
      v_influencer_earnings: {
        Row: {
          influencer_id: string | null
          paid_earnings_cents: number | null
          paid_orders_count: number | null
          total_earnings_cents: number | null
          total_orders: number | null
        }
        Relationships: []
      }
      v_influencer_public_cards: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category_tags: string[] | null
          display_name: string | null
          handle: string | null
          headline: string | null
          id: string | null
          listed_at: string | null
          location_city: string | null
          location_country: string | null
          social_links: Json | null
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category_tags?: string[] | null
          display_name?: string | null
          handle?: string | null
          headline?: string | null
          id?: string | null
          listed_at?: string | null
          location_city?: string | null
          location_country?: string | null
          social_links?: Json | null
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category_tags?: string[] | null
          display_name?: string | null
          handle?: string | null
          headline?: string | null
          id?: string | null
          listed_at?: string | null
          location_city?: string | null
          location_country?: string | null
          social_links?: Json | null
          verified?: boolean | null
        }
        Relationships: []
      }
      v_nudge_daily_metrics: {
        Row: {
          cta: number | null
          ctr_pct: number | null
          day: string | null
          dismiss_pct: number | null
          dismissed: number | null
          nudge_id: string | null
          shown: number | null
          users: number | null
        }
        Relationships: []
      }
      v_nudge_weekly_overview: {
        Row: {
          cta: number | null
          ctr_pct: number | null
          nudge_id: string | null
          shown: number | null
          users: number | null
          week: string | null
        }
        Relationships: []
      }
      v_platform_metrics: {
        Row: {
          as_of: string | null
          gmv_cents: number | null
          net_revenue_cents: number | null
          new_users_30d: number | null
          paid_orders_all: number | null
          refunds_count: number | null
          total_users: number | null
        }
        Relationships: []
      }
      v_subtext_daily_metrics: {
        Row: {
          category: string | null
          cta: number | null
          ctr_pct: number | null
          day: string | null
          picked_id: string | null
          shown: number | null
          users: number | null
        }
        Relationships: []
      }
      vw_habit_progress_month: {
        Row: {
          completions: number | null
          minutes: number | null
          period_start: string | null
          slug: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template_export"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template_health"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_templates"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "v_habit_logs_norm"
            referencedColumns: ["habit_slug"]
          },
        ]
      }
      vw_habit_progress_week: {
        Row: {
          completions: number | null
          minutes: number | null
          period_start: string | null
          slug: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template_export"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_template_health"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "habit_templates"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "habit_completion_log_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "v_habit_logs_norm"
            referencedColumns: ["habit_slug"]
          },
        ]
      }
      workout_intensity_distribution: {
        Row: {
          avg_duration_seconds: number | null
          completion_category: string | null
          exercise_count: number | null
          month_start: string | null
          routine_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "ai_generated_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_progress_analytics: {
        Row: {
          avg_completion_rate: number | null
          performance_tier: string | null
          routine_name: string | null
          total_sessions: number | null
          user_id: string | null
          week_start: string | null
        }
        Relationships: []
      }
      workout_skipping_analysis: {
        Row: {
          avg_skipped_per_exercise: number | null
          exercises_with_skips: number | null
          month_start: string | null
          routine_id: string | null
          total_exercises: number | null
          total_skipped_sets: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "ai_generated_routines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _active_rank20_challenge_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _arena_enroll_for: {
        Args: { p_user: string }
        Returns: {
          challenge_id: string
          group_id: string
        }[]
      }
      _current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _ensure_rank20_challenge: {
        Args: { _group_id: string }
        Returns: string
      }
      _fn_exists: {
        Args: { fn_name: string }
        Returns: boolean
      }
      _rank20_sync_group_flag: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      accept_challenge_invitation: {
        Args: { invitation_id_param: string }
        Returns: boolean
      }
      accept_friend_request: {
        Args: { request_id: string }
        Returns: boolean
      }
      activate_routine_safely: {
        Args:
          | {
              target_routine_id: string
              target_routine_type?: string
              target_table_name: string
              target_user_id: string
            }
          | {
              target_routine_id: string
              target_table_name: string
              target_user_id: string
            }
        Returns: Json
      }
      add_friend_from_contact: {
        Args: { contact_user_id: string }
        Returns: boolean
      }
      add_user_xp: {
        Args: {
          p_activity_id?: string
          p_activity_type: string
          p_base_xp: number
          p_bonus_xp?: number
          p_reason?: string
          p_user_id: string
        }
        Returns: undefined
      }
      add_workout_xp: {
        Args: {
          p_reason?: string
          p_routine_id: string
          p_score: number
          p_user_id: string
        }
        Returns: undefined
      }
      app_notifs_mark_all_read: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      app_notifs_mark_read: {
        Args: { p_ids: string[] }
        Returns: undefined
      }
      app_notify: {
        Args: {
          p_body?: string
          p_kind: string
          p_meta?: Json
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      apply_daily_cap: {
        Args:
          | { p_client_tz?: string; p_total_award: number; p_user_id: string }
          | { p_proposed_xp: number; p_user_id: string }
        Returns: number
      }
      arena_award_points: {
        Args:
          | {
              p_challenge_id: string
              p_idem_key: string
              p_kind: string
              p_points: number
            }
          | { p_challenge_id: string; p_kind: string; p_points: number }
        Returns: undefined
      }
      arena_close_previous_month: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      arena_debug_award_points: {
        Args: { p_note?: string; p_points: number }
        Returns: undefined
      }
      arena_enroll_me: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      arena_ensure_active_challenge: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      arena_get_active_challenge: {
        Args: Record<PropertyKey, never>
        Returns: {
          end_date: string
          id: string
          month: number
          season: number
          slug: string
          start_date: string
          title: string
          year: number
        }[]
      }
      arena_get_active_group_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      arena_get_billboard: {
        Args: {
          p_limit?: number
          p_month?: number
          p_section?: string
          p_year?: number
        }
        Returns: {
          avatar_url: string
          display_name: string
          rank: number
          score: number
          user_id: string
        }[]
      }
      arena_get_friends_leaderboard_with_profiles: {
        Args: {
          p_challenge_id?: string
          p_limit?: number
          p_month?: number
          p_section?: string
          p_year?: number
        }
        Returns: {
          avatar_url: string
          display_name: string
          rank: number
          score: number
          user_id: string
          username: string
        }[]
      }
      arena_get_leaderboard: {
        Args: {
          p_challenge_id?: string
          p_limit?: number
          p_month?: number
          p_offset?: number
          p_section?: string
          p_year?: number
        }
        Returns: {
          rank: number
          score: number
          user_id: string
        }[]
      }
      arena_get_leaderboard_by_domain: {
        Args: {
          p_domain: string
          p_group_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          rank: number
          score: number
          user_id: string
        }[]
      }
      arena_get_leaderboard_with_profiles: {
        Args: {
          challenge_id_param?: string
          limit_param?: number
          month_param?: number
          offset_param?: number
          section_param?: string
          year_param?: number
        }
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          rank: number
          streak: number
          user_id: string
        }[]
      }
      arena_get_members: {
        Args: {
          challenge_id_param?: string
          limit_param?: number
          offset_param?: number
        }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      arena_get_my_membership: {
        Args: { challenge_id_param?: string }
        Returns: {
          challenge_id: string
          is_enrolled: boolean
          joined_at: string
          user_id: string
        }[]
      }
      arena_get_my_rank: {
        Args: {
          p_challenge_id?: string
          p_month?: number
          p_section?: string
          p_year?: number
        }
        Returns: {
          rank: number
          score: number
        }[]
      }
      arena_notify_friend_overtakes: {
        Args: {
          p_challenge_id?: string
          p_cooldown_hours?: number
          p_month?: number
          p_section?: string
          p_top_cutoff?: number
          p_year?: number
        }
        Returns: undefined
      }
      arena_post_message: {
        Args: { p_content: string }
        Returns: string
      }
      arena_recompute_and_refresh: {
        Args:
          | Record<PropertyKey, never>
          | {
              p_challenge_id?: string
              p_limit?: number
              p_month?: number
              p_section?: string
              p_year?: number
            }
        Returns: undefined
      }
      arena_recompute_rollups_monthly: {
        Args: {
          p_challenge_id?: string
          p_limit?: number
          p_month?: number
          p_section?: string
          p_year?: number
        }
        Returns: undefined
      }
      arena_recompute_rollups_with_notifications: {
        Args: {
          p_challenge_id?: string
          p_limit?: number
          p_month?: number
          p_section?: string
          p_year?: number
        }
        Returns: undefined
      }
      arena_refresh_billboard_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      arena_ui_server_smoketest: {
        Args: Record<PropertyKey, never>
        Returns: {
          challenge_id: string
          path: string
        }[]
      }
      arena_ui_server_smoketest_ping: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      assign_monthly_recovery_rankings: {
        Args: { target_month_year?: string }
        Returns: undefined
      }
      assign_rank20: {
        Args: { _user_id: string }
        Returns: {
          batch_number: number
          challenge_id: string
          group_id: string
        }[]
      }
      auto_assign_teams: {
        Args: { challenge_id_param: string; team_size_param?: number }
        Returns: number
      }
      award_nutrition_xp: {
        Args: {
          p_activity_id?: string
          p_activity_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      award_points_secure: {
        Args: { p_base_amount: number; p_multiplier?: number; p_reason: string }
        Returns: undefined
      }
      award_recovery_xp: {
        Args: {
          p_duration_minutes?: number
          p_recovery_type: string
          p_session_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      batch_load_nutrition_data: {
        Args: { date_param: string; user_id_param: string }
        Returns: Json
      }
      bootstrap_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      calculate_challenge_progress: {
        Args: { participation_id_param: string }
        Returns: undefined
      }
      calculate_minute_key: {
        Args: { ts: string }
        Returns: number
      }
      calculate_next_trigger: {
        Args: { reminder_id: string }
        Returns: string
      }
      calculate_performance_score: {
        Args: {
          completed_exercises: number
          completed_sets: number
          difficulty_rating: string
          skipped_steps: number
          total_exercises: number
          total_sets: number
        }
        Returns: number
      }
      calculate_private_challenge_progress: {
        Args: { participation_id_param: string }
        Returns: undefined
      }
      calculate_recovery_score: {
        Args: {
          breathing_count: number
          meditation_count: number
          muscle_recovery_count: number
          sleep_count: number
          streak_bonus?: number
          stretching_count: number
          yoga_count: number
        }
        Returns: number
      }
      calculate_scan_index: {
        Args: { p_user_id: string; p_year: number }
        Returns: number
      }
      calculate_workout_forecast: {
        Args: { target_user_id: string }
        Returns: {
          confidence_score: number
          forecast_week: number
          predicted_completion_rate: number
          predicted_skipped_sets: number
          predicted_workouts: number
          trend_direction: string
        }[]
      }
      calculate_yearly_score: {
        Args: { target_user_id: string; target_year: number }
        Returns: number
      }
      cancel_friend_request: {
        Args: { request_id: string }
        Returns: boolean
      }
      check_and_award_all_badges: {
        Args: { target_user_id: string }
        Returns: Json
      }
      check_social_badges: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      cleanup_food_enrichment_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_rank20_dupes: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      compute_next_due_at: {
        Args: { p_reminder_at: string; p_schedule: Json; p_start_date: string }
        Returns: string
      }
      count_admins: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      current_rank20_challenge_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      diag_rank20: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      ensure_mood_prefs: {
        Args: { p_time?: string; p_tz: string; p_user: string }
        Returns: undefined
      }
      ensure_rank20_membership: {
        Args: Record<PropertyKey, never>
        Returns: {
          challenge_id: string
          group_id: string
        }[]
      }
      ensure_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      expire_stale_friend_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      find_user_friends: {
        Args: { contact_hashes: string[] }
        Returns: {
          contact_hash: string
          email: string
          phone: string
          user_id: string
        }[]
      }
      get_active_challenge_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_challenge_podium_winners: {
        Args: { challenge_id_param: string; month_year?: string }
        Returns: {
          completion_date: string
          display_name: string
          final_score: number
          final_streak: number
          podium_position: number
          total_interactions: number
          user_id: string
          username: string
        }[]
      }
      get_completed_challenges_for_month: {
        Args: { target_month?: string }
        Returns: {
          challenge_id: string
          challenge_name: string
          completion_date: string
          participant_count: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_follow_status: {
        Args: { target_user_id: string }
        Returns: {
          followers_count: number
          following_count: number
          is_followed_by: boolean
          is_following: boolean
        }[]
      }
      get_mutual_counts: {
        Args: { target_ids: string[] }
        Returns: {
          mutuals: number
          target_id: string
        }[]
      }
      get_mutual_friends: {
        Args: { current_user_id: string }
        Returns: {
          friend_email: string
          friend_id: string
          friend_name: string
          friend_phone: string
        }[]
      }
      get_my_feature_flags: {
        Args: Record<PropertyKey, never>
        Returns: {
          flag_key: string
          global_enabled: boolean
          has_user_override: boolean
          resolved_enabled: boolean
          user_enabled: boolean
        }[]
      }
      get_pending_friend_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          direction: string
          request_id: string
          requested_email: string
          requested_id: string
          requested_name: string
          requester_email: string
          requester_id: string
          requester_name: string
          status: string
        }[]
      }
      get_potential_accountability_buddies: {
        Args: { current_user_id: string }
        Returns: {
          buddy_email: string
          buddy_name: string
          buddy_rank_position: number
          buddy_user_id: string
          challenge_id: string
          challenge_name: string
          completion_date: string
          current_user_rank_position: number
          shared_ranking_group: boolean
        }[]
      }
      get_privacy_settings_for_users: {
        Args: { target_ids: string[] }
        Returns: {
          allow_challenge_friend_requests: boolean
          user_id: string
        }[]
      }
      get_security_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_smart_friend_recommendations: {
        Args: { current_user_id: string }
        Returns: {
          friend_email: string
          friend_id: string
          friend_name: string
          friend_phone: string
          interaction_metadata: Json
          relevance_score: number
        }[]
      }
      get_top_100_yearly_users: {
        Args: { target_year?: number }
        Returns: {
          avg_hydration_streak: number
          avg_nutrition_streak: number
          avg_supplement_streak: number
          display_name: string
          monthly_trophies: number
          rank_position: number
          total_active_days: number
          total_messages: number
          user_id: string
          username: string
          yearly_score: number
        }[]
      }
      get_user_active_routine: {
        Args: { user_id_param: string }
        Returns: {
          current_day_in_week: number
          current_week: number
          is_active: boolean
          routine_id: string
          routine_name: string
          routine_type: string
          start_date: string
          table_source: string
        }[]
      }
      get_user_private_challenge_access: {
        Args: { challenge_id_param: string }
        Returns: boolean
      }
      get_workout_trends_summary: {
        Args: { target_user_id: string }
        Returns: {
          avg_weekly_workouts: number
          consistency_rating: string
          overall_completion_rate: number
          overall_skip_rate: number
          top_exercise_categories: string[]
          total_weeks_analyzed: number
          trend_direction: string
        }[]
      }
      get_xp_reset_window: {
        Args: { p_client_tz?: string; p_user_id: string }
        Returns: {
          end_utc: string
          start_utc: string
        }[]
      }
      habit_template_recommend: {
        Args: {
          p_domain?: Database["public"]["Enums"]["habit_domain"]
          p_limit?: number
          p_max_difficulty?: string
          p_max_minutes?: number
          p_user: string
        }
        Returns: {
          category: string
          difficulty: string
          domain: Database["public"]["Enums"]["habit_domain"]
          estimated_minutes: number
          goal_type: Database["public"]["Enums"]["habit_goal_type"]
          id: string
          name: string
          reason: string
          score: number
          slug: string
          summary: string
          tags: string
        }[]
      }
      habit_template_search: {
        Args: {
          p_category?: string
          p_domain?: Database["public"]["Enums"]["habit_domain"]
          p_limit?: number
          p_offset?: number
          p_q: string
        }
        Returns: {
          category: string
          coach_copy: Json
          contraindications: string
          created_at: string
          cues_and_stacking: string
          default_target: number
          difficulty: string
          domain: Database["public"]["Enums"]["habit_domain"]
          equipment: string
          estimated_minutes: number
          goal_type: Database["public"]["Enums"]["habit_goal_type"]
          id: string
          min_viable: string
          name: string
          score: number
          slug: string
          sources: string
          suggested_rules: Json
          summary: string
          tags: string
          time_windows: Json
        }[]
      }
      habit_template_upsert_many: {
        Args: { payloads: Json }
        Returns: number
      }
      habit_template_upsert_one: {
        Args: { payload: Json }
        Returns: string
      }
      habit_templates_trending_fn: {
        Args: { p_limit?: number }
        Returns: {
          adds_last_14d: number
          category: string
          domain: Database["public"]["Enums"]["habit_domain"]
          id: string
          name: string
          slug: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_challenge_clicks: {
        Args: { challenge_id_param: string }
        Returns: undefined
      }
      increment_challenge_views: {
        Args: { challenge_id_param: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_feature_enabled: {
        Args: { feature_key: string }
        Returns: boolean
      }
      is_feature_enabled_jsonb: {
        Args: { feature_key: string }
        Returns: Json
      }
      is_member_of_rank20_group: {
        Args: { group_id_param: string; uid?: string }
        Returns: boolean
      }
      is_premium: {
        Args: { uid?: string }
        Returns: boolean
      }
      log_security_event: {
        Args: { event_data: Json }
        Returns: undefined
      }
      log_security_violation: {
        Args: { details: string; metadata?: Json; violation_type: string }
        Returns: undefined
      }
      mark_nudge_error: {
        Args: { p_err: string; p_id: string }
        Returns: undefined
      }
      mark_nudge_sent: {
        Args: { p_id: string }
        Returns: undefined
      }
      my_active_private_challenges: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          challenge_type: string
          created_at: string
          id: string
          title: string
        }[]
      }
      my_billboard_challenges: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          challenge_type: string
          created_at: string
          id: string
          title: string
        }[]
      }
      my_billboard_comment_post: {
        Args: { _body: string; _event_id: string }
        Returns: {
          avatar_url: string
          body: string
          created_at: string
          display_name: string
          event_id: string
          id: string
          user_id: string
        }[]
      }
      my_billboard_comments_list: {
        Args: { _event_id: string; _limit?: number }
        Returns: {
          avatar_url: string
          body: string
          created_at: string
          display_name: string
          event_id: string
          id: string
          user_id: string
        }[]
      }
      my_private_challenges_by_domain: {
        Args: { _domain: string }
        Returns: {
          category: string
          created_at: string
          id: string
          title: string
        }[]
      }
      my_public_challenges_by_domain: {
        Args: { _domain: string }
        Returns: {
          category: string
          created_at: string
          id: string
          title: string
        }[]
      }
      my_rank20_active_challenge_id_fallback: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      my_rank20_challenge_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      my_rank20_chat_list: {
        Args:
          | { _before?: string; _limit?: number }
          | {
              _before_created_at?: string
              _before_id?: string
              _limit?: number
            }
        Returns: {
          avatar_url: string
          body: string
          created_at: string
          display_name: string
          id: string
          user_id: string
        }[]
      }
      my_rank20_chat_post: {
        Args: { _body: string }
        Returns: undefined
      }
      my_rank20_chosen_challenge: {
        Args: Record<PropertyKey, never>
        Returns: {
          member_count: number
          private_challenge_id: string
        }[]
      }
      my_rank20_chosen_challenge_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      my_rank20_chosen_challenge_id_safe: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      my_rank20_group_members: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          display_name: string
          joined_at: string
          user_id: string
        }[]
      }
      my_rank20_latest_announcement: {
        Args: Record<PropertyKey, never>
        Returns: {
          body: string
          created_at: string
          id: string
          title: string
        }[]
      }
      my_rank20_leaderboard: {
        Args:
          | Record<PropertyKey, never>
          | { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          rank: number
          streak: number
          user_id: string
        }[]
      }
      my_rank20_leaderboard_combined: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          rank: number
          streak: number
          user_id: string
        }[]
      }
      my_rank20_leaderboard_exercise: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          rank: number
          streak: number
          user_id: string
        }[]
      }
      my_rank20_leaderboard_nutrition: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          rank: number
          streak: number
          user_id: string
        }[]
      }
      my_rank20_leaderboard_recovery: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          rank: number
          streak: number
          user_id: string
        }[]
      }
      my_rank20_members: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          display_name: string
          group_id: string
          joined_at: string
          user_id: string
        }[]
      }
      my_rank20_react_toggle: {
        Args: { _emoji: string; _message_id: string }
        Returns: undefined
      }
      my_rank20_reactions_for: {
        Args: { _message_ids: string[] }
        Returns: {
          count: number
          emoji: string
          message_id: string
        }[]
      }
      process_yearly_hall_of_fame: {
        Args: { target_year: number }
        Returns: Json
      }
      rank20_chosen_challenge_id: {
        Args: Record<PropertyKey, never>
        Returns: {
          member_count: number
          private_challenge_id: string
        }[]
      }
      rank20_enroll_me: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rank20_enroll_user: {
        Args: { _user: string }
        Returns: undefined
      }
      rank20_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          display_name: string
          points: number
          streak: number
          user_id: string
        }[]
      }
      rank20_membership: {
        Args: Record<PropertyKey, never>
        Returns: {
          challenge_id: string
          group_id: string
        }[]
      }
      record_team_up_prompt_action: {
        Args: {
          action_param: string
          buddy_user_id_param: string
          challenge_id_param: string
        }
        Returns: boolean
      }
      reject_friend_request: {
        Args: { request_id: string }
        Returns: boolean
      }
      rpc_add_user_habit: {
        Args: {
          p_notes?: string
          p_reminder_at?: string
          p_schedule?: Json
          p_slug: string
          p_target?: number
        }
        Returns: string
      }
      rpc_add_user_habits_bulk: {
        Args: { p_items: Json }
        Returns: {
          slug: string
          user_habit_id: string
        }[]
      }
      rpc_check_and_award_badges_by_slug: {
        Args: { p_habit_slug: string }
        Returns: Json
      }
      rpc_claim_nudges: {
        Args: { p_limit?: number }
        Returns: {
          habit_slug: string
          id: string
          user_id: string
        }[]
      }
      rpc_create_custom_habit: {
        Args: {
          p_days_of_week?: number[]
          p_description?: string
          p_difficulty: string
          p_domain: Database["public"]["Enums"]["habit_domain"]
          p_frequency?: string
          p_icon?: string
          p_target_per_week?: number
          p_time_local?: string
          p_title: string
          p_use_auto?: boolean
        }
        Returns: string
      }
      rpc_delete_all_paused_user_habits: {
        Args: { p_purge_logs?: boolean }
        Returns: number
      }
      rpc_delete_user_habit: {
        Args: { p_purge_logs?: boolean; p_slug: string }
        Returns: undefined
      }
      rpc_dispatch_habit_reminders: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      rpc_dispatch_habit_reminders_sql: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      rpc_ensure_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rpc_get_domain_activity: {
        Args: { p_days?: number }
        Returns: {
          domain: Database["public"]["Enums"]["habit_domain"]
          logs_count: number
        }[]
      }
      rpc_get_due_habits: {
        Args: { p_after_minutes?: number; p_before_minutes?: number }
        Returns: {
          domain: string
          name: string
          next_due_at: string
          slug: string
          summary: string
          user_habit_id: string
        }[]
      }
      rpc_get_habit_history: {
        Args: { p_days?: number; p_slug: string }
        Returns: {
          count: number
          d: string
        }[]
      }
      rpc_get_habit_progress: {
        Args: { p_window?: string }
        Returns: {
          day: string
          logs_count: number
        }[]
      }
      rpc_get_my_habits_with_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          difficulty: string
          domain: Database["public"]["Enums"]["habit_domain"]
          habit_slug: string
          is_paused: boolean
          last_30d_count: number
          target_per_week: number
          title: string
        }[]
      }
      rpc_habit_kpis: {
        Args: { p_start?: string; period?: string }
        Returns: {
          active_habits: number
          overall_adherence_pct: number
          streak_leader_days: number
          streak_leader_slug: string
          total_completions: number
          total_expected: number
          total_minutes: number
        }[]
      }
      rpc_habit_report: {
        Args: { p_start?: string; period?: string }
        Returns: {
          adherence_pct: number
          completions: number
          current_streak: number
          domain: string
          expected_count: number
          last_logged_at: string
          minutes: number
          name: string
          reminder_at: string
          slug: string
          user_habit_id: string
        }[]
      }
      rpc_list_active_habits: {
        Args: { p_domain?: Database["public"]["Enums"]["habit_domain"] }
        Returns: {
          category: string
          description: string
          difficulty: string
          domain: Database["public"]["Enums"]["habit_domain"]
          id: string
          slug: string
          title: string
        }[]
      }
      rpc_list_my_badges: {
        Args: Record<PropertyKey, never>
        Returns: {
          awarded_at: string
          badge: string
          habit_slug: string
        }[]
      }
      rpc_log_habit: {
        Args: {
          p_amount?: number
          p_completed?: boolean
          p_duration_min?: number
          p_meta?: Json
          p_slug: string
        }
        Returns: string
      }
      rpc_log_habit_by_slug: {
        Args: { p_habit_slug: string; p_note?: string; p_occurred_at?: string }
        Returns: Json
      }
      rpc_mark_habit_done: {
        Args: { p_date?: string; p_habit_slug: string; p_notes?: string }
        Returns: undefined
      }
      rpc_pause_habit: {
        Args: { p_habit_slug: string }
        Returns: undefined
      }
      rpc_pause_user_habit_by_slug: {
        Args: { p_habit_slug: string; p_paused: boolean }
        Returns: {
          created_at: string
          id: string
          is_paused: boolean
          next_due_at: string | null
          notes: string | null
          reminder_at: string | null
          schedule: Json
          slug: string
          snooze_until: string | null
          start_date: string
          status: string
          target: number | null
          target_per_week: number
          updated_at: string
          user_id: string
        }
      }
      rpc_recommend_habits: {
        Args: Record<PropertyKey, never>
        Returns: {
          domain: string
          name: string
          reason: string
          slug: string
        }[]
      }
      rpc_recommend_habits_v2: {
        Args: { p_per_domain?: number; p_profile?: Json }
        Returns: {
          domain: string
          name: string
          reason: string
          score: number
          slug: string
        }[]
      }
      rpc_resume_habit: {
        Args: { p_habit_slug: string }
        Returns: undefined
      }
      rpc_set_habit_reminder: {
        Args: {
          p_frequency?: string
          p_habit_slug: string
          p_reminder_time: string
        }
        Returns: undefined
      }
      rpc_snooze_habit: {
        Args: { p_minutes?: number; p_user_habit_id: string }
        Returns: undefined
      }
      rpc_start_habit: {
        Args: {
          p_frequency?: string
          p_habit_slug: string
          p_reminder_time?: string
        }
        Returns: undefined
      }
      rpc_undo_last_log_by_slug: {
        Args: { p_habit_slug: string }
        Returns: Json
      }
      rpc_update_user_habit: {
        Args: {
          p_notes?: string
          p_reminder_at?: string
          p_schedule?: Json
          p_target?: number
          p_user_habit_id: string
        }
        Returns: undefined
      }
      rpc_upsert_habit_reminder_by_slug: {
        Args: {
          p_day_of_week?: number
          p_enabled?: boolean
          p_frequency: string
          p_habit_slug: string
          p_time_local?: string
        }
        Returns: {
          created_at: string
          day_of_week: number | null
          frequency: string
          habit_slug: string
          id: string
          is_enabled: boolean
          time_local: string | null
          user_id: string
        }
      }
      rpc_upsert_habit_templates: {
        Args: { p_templates: Json }
        Returns: number
      }
      rpc_upsert_user_habit_by_slug: {
        Args: { p_habit_slug: string; p_target_per_week?: number }
        Returns: {
          created_at: string
          id: string
          is_paused: boolean
          next_due_at: string | null
          notes: string | null
          reminder_at: string | null
          schedule: Json
          slug: string
          snooze_until: string | null
          start_date: string
          status: string
          target: number | null
          target_per_week: number
          updated_at: string
          user_id: string
        }
      }
      rpc_upsert_user_profile: {
        Args: { p_constraints?: Json; p_goals?: Json; p_preferences?: Json }
        Returns: undefined
      }
      run_arena_chat_healthcheck: {
        Args: { p_user_id?: string }
        Returns: {
          info: Json
          step: string
        }[]
      }
      same_group: {
        Args: { u: string; v: string }
        Returns: boolean
      }
      search_users_by_username_email: {
        Args: { search_term: string }
        Returns: {
          current_hydration_streak: number
          current_nutrition_streak: number
          current_supplement_streak: number
          display_name: string
          email: string
          first_name: string
          last_name: string
          user_id: string
          username: string
        }[]
      }
      secure_upsert_habit_templates: {
        Args: { payload: Json }
        Returns: undefined
      }
      seed_billboard_events: {
        Args: { _challenge_id: string }
        Returns: undefined
      }
      send_friend_request: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      set_user_feature_flag: {
        Args: { enabled_param: boolean; flag_key_param: string }
        Returns: boolean
      }
      set_user_feature_flag_jsonb: {
        Args: { flag_key_param: string; value_param: Json }
        Returns: boolean
      }
      test_recommendation_performance: {
        Args: Record<PropertyKey, never>
        Returns: {
          execution_time: string
          result: string
          test_name: string
        }[]
      }
      test_user_profile_rls: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          result: string
          test_name: string
        }[]
      }
      toggle_feature_flag: {
        Args: { enabled_param: boolean; key_param: string }
        Returns: boolean
      }
      track_coach_interaction: {
        Args: {
          p_coach_type: string
          p_interaction_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      trigger_yearly_scores_preview_update: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      triggermeditationnudge: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_body_scan_reminder: {
        Args: { p_scan_date?: string; p_user_id: string }
        Returns: undefined
      }
      update_private_challenge_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_recovery_challenge_metrics: {
        Args: { target_month_year: string; target_user_id: string }
        Returns: undefined
      }
      update_team_scores: {
        Args: { challenge_id_param: string }
        Returns: undefined
      }
      upsert_privacy_settings: {
        Args: { allow: boolean }
        Returns: undefined
      }
      validate_role_assignment: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      validate_security_event: {
        Args: { event_data: Json }
        Returns: boolean
      }
      xp_cumulative_for_level: {
        Args: { level_in: number }
        Returns: number
      }
      xp_required_for_level: {
        Args: { level_in: number }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "recovery_challenge_participant"
        | "influencer"
      challenge_visibility: "public" | "private"
      habit_domain: "nutrition" | "exercise" | "recovery" | "lifestyle"
      habit_goal_type: "bool" | "count" | "duration"
      habit_status: "active" | "paused" | "archived"
      member_role: "owner" | "member"
      member_status: "joined" | "left" | "banned"
      nudge_type: "reminder" | "encourage" | "recovery" | "celebration"
      reminder_kind: "time" | "event"
      suggestion_type: "praise" | "warning" | "tip"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "recovery_challenge_participant",
        "influencer",
      ],
      challenge_visibility: ["public", "private"],
      habit_domain: ["nutrition", "exercise", "recovery", "lifestyle"],
      habit_goal_type: ["bool", "count", "duration"],
      habit_status: ["active", "paused", "archived"],
      member_role: ["owner", "member"],
      member_status: ["joined", "left", "banned"],
      nudge_type: ["reminder", "encourage", "recovery", "celebration"],
      reminder_kind: ["time", "event"],
      suggestion_type: ["praise", "warning", "tip"],
    },
  },
} as const
