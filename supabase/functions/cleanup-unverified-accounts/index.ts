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
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Create client with auth header for JWT verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('🧹 Starting cleanup of unverified accounts...');
    
    // Create admin client for user deletion operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: CleanupResult = {
      deletedUsers: 0,
      deletedProfiles: 0,
      errors: []
    };

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const cutoffTime = twentyFourHoursAgo.toISOString();

    console.log(`🕐 Looking for unverified accounts created before: ${cutoffTime}`);

    // Get unverified users older than 24 hours using the admin API
    const { data: users, error: fetchError } = await adminSupabase.auth.admin.listUsers({
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

    // Filter users that need to be deleted
    const usersToDelete = users.users.filter(user => {
      const isUnverified = !user.email_confirmed_at;
      const isOld = new Date(user.created_at) < twentyFourHoursAgo;
      
      if (isUnverified && isOld) {
        console.log(`🎯 Marking for deletion - User: ${user.email}, Created: ${user.created_at}`);
      }
      
      return isUnverified && isOld;
    });

    console.log(`🗑️ Found ${usersToDelete.length} users to delete`);

    // Delete users and their profiles
    for (const user of usersToDelete) {
      try {
        console.log(`🔄 Processing user: ${user.email} (${user.id})`);

        // First, delete the user profile from public.user_profiles
        const { error: profileError } = await adminSupabase
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
          const { error: tableError } = await adminSupabase
            .from(table)
            .delete()
            .eq('user_id', user.id);
            
          if (tableError) {
            console.warn(`⚠️ Warning deleting ${table} for ${user.email}:`, tableError);
          }
        }

        // Finally, delete the user from auth.users using admin API
        const { error: userError } = await adminSupabase.auth.admin.deleteUser(user.id);

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