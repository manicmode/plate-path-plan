export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
      challenge_messages: {
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
      food_recognitions: {
        Row: {
          confidence_scores: number[] | null
          created_at: string
          detected_labels: string[] | null
          id: string
          image_url: string | null
          raw_response: Json | null
          user_id: string | null
        }
        Insert: {
          confidence_scores?: number[] | null
          created_at?: string
          detected_labels?: string[] | null
          id?: string
          image_url?: string | null
          raw_response?: Json | null
          user_id?: string | null
        }
        Update: {
          confidence_scores?: number[] | null
          created_at?: string
          detected_labels?: string[] | null
          id?: string
          image_url?: string | null
          raw_response?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      hydration_logs: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          type: string
          user_id: string
          volume: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          type?: string
          user_id: string
          volume: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          type?: string
          user_id?: string
          volume?: number
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
          serving_size: string | null
          sodium: number | null
          source: string | null
          sugar: number | null
          user_id: string | null
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
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
          sugar?: number | null
          user_id?: string | null
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
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
          sugar?: number | null
          user_id?: string | null
        }
        Relationships: []
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
          category: string
          challenge_type: string
          created_at: string
          creator_id: string
          description: string
          duration_days: number
          id: string
          invited_user_ids: string[]
          is_team_challenge: boolean
          max_participants: number
          start_date: string
          status: string
          target_metric: string | null
          target_unit: string | null
          target_value: number | null
          team_ranking_basis: string | null
          team_size: number | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_team_enabled?: boolean | null
          badge_icon?: string
          category: string
          challenge_type?: string
          created_at?: string
          creator_id: string
          description: string
          duration_days: number
          id?: string
          invited_user_ids?: string[]
          is_team_challenge?: boolean
          max_participants?: number
          start_date: string
          status?: string
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          team_ranking_basis?: string | null
          team_size?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_team_enabled?: boolean | null
          badge_icon?: string
          category?: string
          challenge_type?: string
          created_at?: string
          creator_id?: string
          description?: string
          duration_days?: number
          id?: string
          invited_user_ids?: string[]
          is_team_challenge?: boolean
          max_participants?: number
          start_date?: string
          status?: string
          target_metric?: string | null
          target_unit?: string | null
          target_value?: number | null
          team_ranking_basis?: string | null
          team_size?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          body_composition_goals: string[] | null
          calculated_bmr: number | null
          calculated_tdee: number | null
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
          first_name: string | null
          followers_count: number | null
          following_count: number | null
          food_allergies: Json | null
          foods_to_avoid: string | null
          gender: string | null
          health_conditions: string[] | null
          health_monitoring_preferences: string[] | null
          height_cm: number | null
          height_feet: number | null
          height_inches: number | null
          height_unit: string | null
          id: string
          last_hydration_log_date: string | null
          last_name: string | null
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
          onboarding_skipped: boolean | null
          phone: string | null
          priority_micronutrients: string[] | null
          profile_completion_percentage: number | null
          progress_tracking_priorities: string[] | null
          recovery_sleep_quality: string | null
          reminder_frequency: string | null
          selected_badge_title: string | null
          selected_trackers: string[] | null
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
          body_composition_goals?: string[] | null
          calculated_bmr?: number | null
          calculated_tdee?: number | null
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
          first_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          food_allergies?: Json | null
          foods_to_avoid?: string | null
          gender?: string | null
          health_conditions?: string[] | null
          health_monitoring_preferences?: string[] | null
          height_cm?: number | null
          height_feet?: number | null
          height_inches?: number | null
          height_unit?: string | null
          id?: string
          last_hydration_log_date?: string | null
          last_name?: string | null
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
          onboarding_skipped?: boolean | null
          phone?: string | null
          priority_micronutrients?: string[] | null
          profile_completion_percentage?: number | null
          progress_tracking_priorities?: string[] | null
          recovery_sleep_quality?: string | null
          reminder_frequency?: string | null
          selected_badge_title?: string | null
          selected_trackers?: string[] | null
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
          body_composition_goals?: string[] | null
          calculated_bmr?: number | null
          calculated_tdee?: number | null
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
          first_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          food_allergies?: Json | null
          foods_to_avoid?: string | null
          gender?: string | null
          health_conditions?: string[] | null
          health_monitoring_preferences?: string[] | null
          height_cm?: number | null
          height_feet?: number | null
          height_inches?: number | null
          height_unit?: string | null
          id?: string
          last_hydration_log_date?: string | null
          last_name?: string | null
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
          onboarding_skipped?: boolean | null
          phone?: string | null
          priority_micronutrients?: string[] | null
          profile_completion_percentage?: number | null
          progress_tracking_priorities?: string[] | null
          recovery_sleep_quality?: string | null
          reminder_frequency?: string | null
          selected_badge_title?: string | null
          selected_trackers?: string[] | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_challenge_invitation: {
        Args: { invitation_id_param: string }
        Returns: boolean
      }
      accept_friend_request: {
        Args: { request_id: string }
        Returns: boolean
      }
      add_friend_from_contact: {
        Args: { contact_user_id: string }
        Returns: boolean
      }
      auto_assign_teams: {
        Args: { challenge_id_param: string; team_size_param?: number }
        Returns: number
      }
      calculate_challenge_progress: {
        Args: { participation_id_param: string }
        Returns: undefined
      }
      calculate_next_trigger: {
        Args: { reminder_id: string }
        Returns: string
      }
      calculate_private_challenge_progress: {
        Args: { participation_id_param: string }
        Returns: undefined
      }
      check_and_award_all_badges: {
        Args: { target_user_id: string }
        Returns: Json
      }
      check_social_badges: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      find_user_friends: {
        Args: { contact_hashes: string[] }
        Returns: {
          user_id: string
          email: string
          phone: string
          contact_hash: string
        }[]
      }
      get_challenge_podium_winners: {
        Args: { challenge_id_param: string; month_year?: string }
        Returns: {
          user_id: string
          username: string
          display_name: string
          final_score: number
          final_streak: number
          completion_date: string
          podium_position: number
          total_interactions: number
        }[]
      }
      get_completed_challenges_for_month: {
        Args: { target_month?: string }
        Returns: {
          challenge_id: string
          challenge_name: string
          participant_count: number
          completion_date: string
        }[]
      }
      get_follow_status: {
        Args: { target_user_id: string }
        Returns: {
          is_following: boolean
          is_followed_by: boolean
          followers_count: number
          following_count: number
        }[]
      }
      get_mutual_friends: {
        Args: { current_user_id: string }
        Returns: {
          friend_id: string
          friend_name: string
          friend_email: string
          friend_phone: string
        }[]
      }
      get_pending_friend_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          request_id: string
          requester_id: string
          requested_id: string
          requester_name: string
          requested_name: string
          requester_email: string
          requested_email: string
          created_at: string
          status: string
          direction: string
        }[]
      }
      get_potential_accountability_buddies: {
        Args: { current_user_id: string }
        Returns: {
          buddy_user_id: string
          buddy_name: string
          buddy_email: string
          challenge_name: string
          challenge_id: string
          completion_date: string
          shared_ranking_group: boolean
          buddy_rank_position: number
          current_user_rank_position: number
        }[]
      }
      get_smart_friend_recommendations: {
        Args: { current_user_id: string }
        Returns: {
          friend_id: string
          friend_name: string
          friend_email: string
          friend_phone: string
          relevance_score: number
          interaction_metadata: Json
        }[]
      }
      get_top_100_yearly_users: {
        Args: { target_year?: number }
        Returns: {
          user_id: string
          username: string
          display_name: string
          yearly_score: number
          monthly_trophies: number
          avg_nutrition_streak: number
          avg_hydration_streak: number
          avg_supplement_streak: number
          total_active_days: number
          total_messages: number
          rank_position: number
        }[]
      }
      get_user_private_challenge_access: {
        Args: { challenge_id_param: string }
        Returns: boolean
      }
      record_team_up_prompt_action: {
        Args: {
          buddy_user_id_param: string
          challenge_id_param: string
          action_param: string
        }
        Returns: boolean
      }
      reject_friend_request: {
        Args: { request_id: string }
        Returns: boolean
      }
      search_users_by_username_email: {
        Args: { search_term: string }
        Returns: {
          user_id: string
          username: string
          email: string
          display_name: string
          first_name: string
          last_name: string
          current_nutrition_streak: number
          current_hydration_streak: number
          current_supplement_streak: number
        }[]
      }
      send_friend_request: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      trigger_yearly_scores_preview_update: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_private_challenge_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_team_scores: {
        Args: { challenge_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
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
      suggestion_type: ["praise", "warning", "tip"],
    },
  },
} as const
