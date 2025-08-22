import { supabase } from "@/integrations/supabase/client";
import { requireSession } from "@/lib/ensureAuth";

// Tool schemas for the voice agent
export interface LogFoodTool {
  description: string;
  calories?: number;
  when?: string;
}

export interface LogExerciseTool {
  activity: string;
  minutes?: number;
  intensity?: "low" | "moderate" | "high";
  when?: string;
}

export interface OpenPageTool {
  path: string;
}

export type ToolCallArgs = LogFoodTool | LogExerciseTool | OpenPageTool;

export interface ToolCallResult {
  ok: boolean;
  message: string;
}

/**
 * Handles tool calls from the voice agent
 */
export async function handleToolCall(
  toolName: string, 
  args: ToolCallArgs
): Promise<ToolCallResult> {
  console.log(`[VoiceAgent] Tool call: ${toolName}`, args);
  
  try {
    // Ensure user is authenticated
    const user = await requireSession();

    switch (toolName) {
      case "log_food":
        return await handleLogFood(user.id, args as LogFoodTool);
        
      case "log_exercise":
        return await handleLogExercise(user.id, args as LogExerciseTool);
        
      case "open_page":
        return await handleOpenPage(args as OpenPageTool);
        
      default:
        return {
          ok: false,
          message: `Unknown tool: ${toolName}`
        };
    }
  } catch (error) {
    console.error(`[VoiceAgent] Tool call error:`, error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Logs food entry to nutrition_logs table
 */
async function handleLogFood(userId: string, args: LogFoodTool): Promise<ToolCallResult> {
  const { description, calories = 0, when } = args;
  
  try {
    // Parse when timestamp if provided, otherwise use current time
    const timestamp = when ? new Date(when) : new Date();
    
    const { error } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: userId,
        food_name: description,
        calories: calories,
        // Set default nutritional values - can be enhanced later
        protein: Math.round(calories * 0.15 / 4), // Rough estimate: 15% of calories from protein
        carbs: Math.round(calories * 0.55 / 4), // Rough estimate: 55% from carbs  
        fat: Math.round(calories * 0.30 / 9), // Rough estimate: 30% from fat
        fiber: 0,
        sugar: 0,
        sodium: 0,
        confidence: 50, // Low confidence for voice entries
        source: 'voice_agent',
        created_at: timestamp.toISOString()
      });

    if (error) {
      console.error('[VoiceAgent] Error logging food:', error);
      return {
        ok: false,
        message: `Failed to log food: ${error.message}`
      };
    }

    const calorieText = calories > 0 ? ` (${calories} calories)` : '';
    return {
      ok: true,
      message: `Logged "${description}"${calorieText} to your nutrition log`
    };
  } catch (error) {
    console.error('[VoiceAgent] Food logging error:', error);
    return {
      ok: false,
      message: "Failed to log food entry"
    };
  }
}

/**
 * Logs exercise entry to exercise_logs table  
 */
async function handleLogExercise(userId: string, args: LogExerciseTool): Promise<ToolCallResult> {
  const { activity, minutes = 30, intensity = "moderate", when } = args;
  
  try {
    // Parse when timestamp if provided, otherwise use current time
    const timestamp = when ? new Date(when) : new Date();
    
    // Rough calorie estimation based on intensity and duration
    const caloriesPerMinute = intensity === "high" ? 12 : intensity === "moderate" ? 8 : 5;
    const estimatedCalories = Math.round(minutes * caloriesPerMinute);
    
    const { error } = await supabase
      .from('exercise_logs')
      .insert({
        user_id: userId,
        activity_type: activity,
        duration_minutes: minutes,
        intensity_level: intensity,
        calories_burned: estimatedCalories,
        created_at: timestamp.toISOString()
      });

    if (error) {
      console.error('[VoiceAgent] Error logging exercise:', error);
      return {
        ok: false,
        message: `Failed to log exercise: ${error.message}`
      };
    }

    return {
      ok: true,
      message: `Logged ${minutes} minutes of ${activity} (${intensity} intensity, ~${estimatedCalories} calories)`
    };
  } catch (error) {
    console.error('[VoiceAgent] Exercise logging error:', error);
    return {
      ok: false,
      message: "Failed to log exercise entry"
    };
  }
}

/**
 * Opens a page in the app
 */
async function handleOpenPage(args: OpenPageTool): Promise<ToolCallResult> {
  const { path } = args;
  
  try {
    // Validate that path is safe (starts with /)
    if (!path.startsWith('/')) {
      return {
        ok: false,
        message: "Invalid page path - must start with /"
      };
    }
    
    // Navigate to the page
    window.location.href = path;
    
    return {
      ok: true,
      message: `Navigating to ${path}`
    };
  } catch (error) {
    console.error('[VoiceAgent] Page navigation error:', error);
    return {
      ok: false,
      message: "Failed to navigate to page"
    };
  }
}