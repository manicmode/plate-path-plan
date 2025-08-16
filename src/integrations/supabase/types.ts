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
          name?: string
          trigger_tags?: string[] | null
          type?: string
          user_id?: string
          volume?: number
        }
        Relationships: []
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
        ]
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
          audio_url: string
          category: string
          created_at: string | null
          description: string
          duration: number
          id: string
          image_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_url: string
          category: string
          created_at?: string | null
          description: string
          duration: number
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string
          category?: string
          created_at?: string | null
          description?: string
          duration?: number
          id?: string
          image_url?: string | null
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
      nutrition_logs: {
        Row: {
          calories: number | null
          carbs: number | null
          confidence: number | null
          created_at: string
          fat: number | null
          fiber: number | null
          food_name: string
          id: string
          image_url: string | null
          ingredient_analysis: Json | null
          processing_level: string | null
          protein: number | null
          quality_reasons: string[] | null
          quality_score: number | null
          quality_verdict: string | null
          saturated_fat: number | null
          serving_size: string | null
          sodium: number | null
          source: string | null
          sugar: number | null
          trigger_tags: string[] | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          confidence?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          food_name: string
          id?: string
          image_url?: string | null
          ingredient_analysis?: Json | null
          processing_level?: string | null
          protein?: number | null
          quality_reasons?: string[] | null
          quality_score?: number | null
          quality_verdict?: string | null
          saturated_fat?: number | null
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
          sugar?: number | null
          trigger_tags?: string[] | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          confidence?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          food_name?: string
          id?: string
          image_url?: string | null
          ingredient_analysis?: Json | null
          processing_level?: string | null
          protein?: number | null
          quality_reasons?: string[] | null
          quality_score?: number | null
          quality_verdict?: string | null
          saturated_fat?: number | null
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
          sugar?: number | null
          trigger_tags?: string[] | null
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
          created_at: string
          custom_days: number[] | null
          food_item_data: Json | null
          frequency_type: string
          frequency_value: number | null
          id: string
          is_active: boolean
          label: string
          last_triggered_at: string | null
          next_trigger_at: string | null
          reminder_time: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_days?: number[] | null
          food_item_data?: Json | null
          frequency_type?: string
          frequency_value?: number | null
          id?: string
          is_active?: boolean
          label: string
          last_triggered_at?: string | null
          next_trigger_at?: string | null
          reminder_time?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_days?: number[] | null
          food_item_data?: Json | null
          frequency_type?: string
          frequency_value?: number | null
          id?: string
          is_active?: boolean
          label?: string
          last_triggered_at?: string | null
          next_trigger_at?: string | null
          reminder_time?: string
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
      apply_daily_cap: {
        Args:
          | { p_client_tz?: string; p_total_award: number; p_user_id: string }
          | { p_proposed_xp: number; p_user_id: string }
        Returns: number
      }
      arena_post_message: {
        Args: { p_content: string }
        Returns: string
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
      calculate_challenge_progress: {
        Args: { participation_id_param: string }
        Returns: undefined
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
      check_and_award_all_badges: {
        Args: { target_user_id: string }
        Returns: Json
      }
      check_social_badges: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      cleanup_rank20_dupes: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      find_user_friends: {
        Args: { contact_hashes: string[] }
        Returns: {
          contact_hash: string
          email: string
          phone: string
          user_id: string
        }[]
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
      get_mutual_friends: {
        Args: { current_user_id: string }
        Returns: {
          friend_email: string
          friend_id: string
          friend_name: string
          friend_phone: string
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
      is_member_of_rank20_group: {
        Args: { group_id_param: string; uid?: string }
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
      run_arena_chat_healthcheck: {
        Args: { p_user_id?: string }
        Returns: {
          info: Json
          step: string
        }[]
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
      seed_billboard_events: {
        Args: { _challenge_id: string }
        Returns: undefined
      }
      send_friend_request: {
        Args: { target_user_id: string }
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
      member_role: "owner" | "member"
      member_status: "joined" | "left" | "banned"
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
      member_role: ["owner", "member"],
      member_status: ["joined", "left", "banned"],
      suggestion_type: ["praise", "warning", "tip"],
    },
  },
} as const
