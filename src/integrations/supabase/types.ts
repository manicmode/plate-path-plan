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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_friend_from_contact: {
        Args: { contact_user_id: string }
        Returns: boolean
      }
      calculate_next_trigger: {
        Args: { reminder_id: string }
        Returns: string
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
