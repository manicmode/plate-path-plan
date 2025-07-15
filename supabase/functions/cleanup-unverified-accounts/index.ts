import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  deletedUsers: number;
  deletedProfiles: number;
  errors: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting cleanup of unverified accounts...');

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: CleanupResult = {
      deletedUsers: 0,
      deletedProfiles: 0,
      errors: []
    };

    // Calculate 48 hours ago (increased from 24 hours for safety)
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    const cutoffTime = fortyEightHoursAgo.toISOString();

    // Calculate 30 minutes ago for recently confirmed users safety buffer
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    const recentConfirmationCutoff = thirtyMinutesAgo.toISOString();

    console.log(`🕐 Looking for unverified accounts created before: ${cutoffTime}`);
    console.log(`🛡️ Safety buffer: Won't delete recently confirmed users (confirmed after ${recentConfirmationCutoff})`);

    // Get unverified users older than 48 hours using the admin API
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Process in batches if needed
    });

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      result.errors.push(`Failed to fetch users: ${fetchError.message}`);
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`📊 Total users found: ${users.users.length}`);

    // Filter users that need to be deleted with enhanced safety checks
    const usersToDelete = users.users.filter(user => {
      const isUnverified = !user.email_confirmed_at;
      const isOld = new Date(user.created_at) < fortyEightHoursAgo;
      
      // Additional safety check: if user was recently confirmed, don't delete
      const wasRecentlyConfirmed = user.email_confirmed_at && new Date(user.email_confirmed_at) > thirtyMinutesAgo;
      
      // Only delete if unverified AND old AND not recently confirmed
      const shouldDelete = isUnverified && isOld && !wasRecentlyConfirmed;
      
      if (shouldDelete) {
        console.log(`🎯 Marking for deletion - User: ${user.email}, Created: ${user.created_at}, Confirmed: ${user.email_confirmed_at || 'Never'}`);
      } else if (wasRecentlyConfirmed) {
        console.log(`🛡️ Skipping recently confirmed user: ${user.email}, Confirmed: ${user.email_confirmed_at}`);
      }
      
      return shouldDelete;
    });

    console.log(`🗑️ Found ${usersToDelete.length} users to delete`);

    // Delete users and their profiles
    for (const user of usersToDelete) {
      try {
        console.log(`🔄 Processing user: ${user.email} (${user.id})`);

        // First, delete the user profile from public.user_profiles
        const { error: profileError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', user.id);

        if (profileError) {
          console.warn(`⚠️ Warning deleting profile for ${user.email}:`, profileError);
          result.errors.push(`Profile deletion warning for ${user.email}: ${profileError.message}`);
        } else {
          result.deletedProfiles++;
          console.log(`✅ Deleted profile for: ${user.email}`);
        }

        // Delete any other user-related data (nutrition logs, etc.)
        const tables = ['nutrition_logs', 'hydration_logs', 'supplement_logs', 'reminders', 'reminder_logs', 'toxin_detections'];
        
        for (const table of tables) {
          const { error: tableError } = await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id);
            
          if (tableError) {
            console.warn(`⚠️ Warning deleting ${table} for ${user.email}:`, tableError);
          }
        }

        // Finally, delete the user from auth.users using admin API
        const { error: userError } = await supabase.auth.admin.deleteUser(user.id);

        if (userError) {
          console.error(`❌ Error deleting user ${user.email}:`, userError);
          result.errors.push(`User deletion failed for ${user.email}: ${userError.message}`);
        } else {
          result.deletedUsers++;
          console.log(`✅ Successfully deleted user: ${user.email}`);
        }

      } catch (error) {
        console.error(`💥 Unexpected error processing user ${user.email}:`, error);
        result.errors.push(`Unexpected error for ${user.email}: ${error.message}`);
      }
    }

    console.log('🎉 Cleanup completed!');
    console.log(`📈 Results: ${result.deletedUsers} users deleted, ${result.deletedProfiles} profiles deleted`);
    if (result.errors.length > 0) {
      console.log(`⚠️ Errors: ${result.errors.length}`);
    }

    return new Response(JSON.stringify({
      success: true,
      result,
      message: `Cleanup completed. Deleted ${result.deletedUsers} unverified accounts older than 24 hours.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('💥 Cleanup function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Failed to run cleanup operation'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);