import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegacyWeekData {
  day: string;
  exercises: any[];
  [key: string]: any;
}

interface NewWeekData {
  days: {
    monday?: any;
    tuesday?: any;
    wednesday?: any;
    thursday?: any;
    friday?: any;
    saturday?: any;
    sunday?: any;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting routine format migration...');

    // Get all AI routines that need migration
    const { data: aiRoutines, error: aiError } = await supabase
      .from('ai_routines')
      .select('id, routine_data, weekly_routine_data')
      .not('routine_data', 'is', null);

    if (aiError) {
      throw new Error(`Error fetching AI routines: ${aiError.message}`);
    }

    // Get all custom routines that need migration
    const { data: customRoutines, error: customError } = await supabase
      .from('custom_routines')
      .select('id, weekly_plan')
      .not('weekly_plan', 'is', null);

    if (customError) {
      throw new Error(`Error fetching custom routines: ${customError.message}`);
    }

    let migratedCount = 0;
    const errors: string[] = [];

    // Helper function to convert day names
    function getDayKey(dayName: string): string {
      const dayMap: Record<string, string> = {
        'Day 1': 'monday',
        'Day 2': 'tuesday', 
        'Day 3': 'wednesday',
        'Day 4': 'thursday',
        'Day 5': 'friday',
        'Day 6': 'saturday',
        'Day 7': 'sunday',
        'monday': 'monday',
        'tuesday': 'tuesday',
        'wednesday': 'wednesday', 
        'thursday': 'thursday',
        'friday': 'friday',
        'saturday': 'saturday',
        'sunday': 'sunday'
      };
      
      return dayMap[dayName.toLowerCase()] || dayName.toLowerCase();
    }

    // Helper function to migrate routine data format
    function migrateRoutineData(routineData: any): any {
      if (!routineData) return routineData;

      // Check if already in new format (has weeks[].days structure)
      if (routineData.weeks && Array.isArray(routineData.weeks) && 
          routineData.weeks.length > 0 && routineData.weeks[0].days) {
        console.log('Routine already in new format, skipping...');
        return routineData;
      }

      const migratedData = { ...routineData };

      // Convert old week[] format to new weeks[].days format
      if (routineData.week && Array.isArray(routineData.week)) {
        console.log('Converting old week[] format to new weeks[].days format');
        
        const newWeeks: NewWeekData[] = [];
        const weekData: NewWeekData = { days: {} };

        // Convert each day in the old format
        routineData.week.forEach((dayData: LegacyWeekData) => {
          const dayKey = getDayKey(dayData.day);
          weekData.days[dayKey as keyof typeof weekData.days] = {
            day_name: dayData.day,
            exercises: dayData.exercises || [],
            ...dayData
          };
        });

        newWeeks.push(weekData);
        migratedData.weeks = newWeeks;
        
        // Remove old week property
        delete migratedData.week;
      }

      // Handle weekly_routine_data migration if present
      if (routineData.weekly_routine_data && routineData.weekly_routine_data.week) {
        console.log('Converting weekly_routine_data format');
        const weekData: NewWeekData = { days: {} };
        
        routineData.weekly_routine_data.week.forEach((dayData: LegacyWeekData) => {
          const dayKey = getDayKey(dayData.day);
          weekData.days[dayKey as keyof typeof weekData.days] = {
            day_name: dayData.day,
            exercises: dayData.exercises || [],
            ...dayData
          };
        });

        if (!migratedData.weeks) {
          migratedData.weeks = [weekData];
        }
        
        // Remove old weekly_routine_data
        delete migratedData.weekly_routine_data;
      }

      return migratedData;
    }

    // Migrate AI routines
    for (const routine of aiRoutines || []) {
      try {
        const migratedData = migrateRoutineData(routine.routine_data);
        
        // Only update if data was actually changed
        if (JSON.stringify(migratedData) !== JSON.stringify(routine.routine_data)) {
          const { error: updateError } = await supabase
            .from('ai_routines')
            .update({ 
              routine_data: migratedData,
              weekly_routine_data: null // Clear this field as it's now in routine_data.weeks
            })
            .eq('id', routine.id);

          if (updateError) {
            errors.push(`AI routine ${routine.id}: ${updateError.message}`);
          } else {
            migratedCount++;
            console.log(`Migrated AI routine ${routine.id}`);
          }
        }
      } catch (error) {
        errors.push(`AI routine ${routine.id}: ${error.message}`);
      }
    }

    // Migrate custom routines
    for (const routine of customRoutines || []) {
      try {
        const migratedData = migrateRoutineData(routine.weekly_plan);
        
        // Only update if data was actually changed
        if (JSON.stringify(migratedData) !== JSON.stringify(routine.weekly_plan)) {
          const { error: updateError } = await supabase
            .from('custom_routines')
            .update({ weekly_plan: migratedData })
            .eq('id', routine.id);

          if (updateError) {
            errors.push(`Custom routine ${routine.id}: ${updateError.message}`);
          } else {
            migratedCount++;
            console.log(`Migrated custom routine ${routine.id}`);
          }
        }
      } catch (error) {
        errors.push(`Custom routine ${routine.id}: ${error.message}`);
      }
    }

    console.log(`Migration completed. Migrated ${migratedCount} routines.`);
    
    if (errors.length > 0) {
      console.error('Migration errors:', errors);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Migration completed successfully`,
      migratedCount,
      totalAiRoutines: aiRoutines?.length || 0,
      totalCustomRoutines: customRoutines?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});