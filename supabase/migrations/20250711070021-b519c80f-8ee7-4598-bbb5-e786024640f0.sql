-- Expand user_profiles table for comprehensive onboarding data

-- Weight and goals
ALTER TABLE public.user_profiles 
ADD COLUMN target_weight numeric,
ADD COLUMN weight_goal_type text,
ADD COLUMN weight_goal_timeline text,
ADD COLUMN body_composition_goals text[];

-- Exercise and lifestyle  
ALTER TABLE public.user_profiles
ADD COLUMN exercise_frequency text,
ADD COLUMN exercise_types text[],
ADD COLUMN daily_lifestyle text,
ADD COLUMN recovery_sleep_quality text;

-- Health details
ALTER TABLE public.user_profiles
ADD COLUMN medications text[],
ADD COLUMN specific_health_conditions jsonb,
ADD COLUMN health_monitoring_preferences text[];

-- Allergies and food restrictions
ALTER TABLE public.user_profiles
ADD COLUMN food_allergies jsonb,
ADD COLUMN allergy_severity text,
ADD COLUMN cross_contamination_sensitivity boolean DEFAULT false,
ADD COLUMN cultural_dietary_restrictions text[];

-- Eating patterns
ALTER TABLE public.user_profiles
ADD COLUMN meal_frequency integer,
ADD COLUMN fasting_schedule text,
ADD COLUMN eating_window text,
ADD COLUMN snacking_patterns text,
ADD COLUMN social_eating_preferences text;

-- Supplements and nutrients
ALTER TABLE public.user_profiles
ADD COLUMN current_supplements jsonb,
ADD COLUMN supplement_goals text[],
ADD COLUMN deficiency_concerns text[],
ADD COLUMN supplement_preferences text;

-- Calculated targets (will be set by system)
ALTER TABLE public.user_profiles
ADD COLUMN calculated_bmr numeric,
ADD COLUMN calculated_tdee numeric,
ADD COLUMN target_calories numeric,
ADD COLUMN target_protein numeric,
ADD COLUMN target_carbs numeric,
ADD COLUMN target_fat numeric,
ADD COLUMN target_fiber numeric,
ADD COLUMN priority_micronutrients text[],
ADD COLUMN toxin_sensitivity_level text DEFAULT 'medium';

-- Personalization preferences
ALTER TABLE public.user_profiles
ADD COLUMN reminder_frequency text DEFAULT 'daily',
ADD COLUMN communication_style text DEFAULT 'supportive',
ADD COLUMN progress_tracking_priorities text[];

-- Profile completion tracking
ALTER TABLE public.user_profiles
ADD COLUMN profile_completion_percentage integer DEFAULT 0,
ADD COLUMN completed_sections text[] DEFAULT '{}',
ADD COLUMN last_profile_update timestamp with time zone DEFAULT now();