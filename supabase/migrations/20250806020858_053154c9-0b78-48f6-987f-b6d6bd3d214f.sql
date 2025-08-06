-- Check if food_logs table exists and enable RLS with policies
-- First, let's verify the table exists by trying to enable RLS
DO $$
BEGIN
    -- Enable Row Level Security on food_logs table
    ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for SELECT
    CREATE POLICY "Users can manage their own food logs - SELECT"
    ON public.food_logs
    FOR SELECT
    USING (auth.uid() = user_id);
    
    -- Create policy for INSERT
    CREATE POLICY "Users can manage their own food logs - INSERT"
    ON public.food_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
    
    -- Create policy for UPDATE
    CREATE POLICY "Users can manage their own food logs - UPDATE"
    ON public.food_logs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    -- Create policy for DELETE
    CREATE POLICY "Users can manage their own food logs - DELETE"
    ON public.food_logs
    FOR DELETE
    USING (auth.uid() = user_id);
    
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table food_logs does not exist. Please create it first or check if you meant a different table name.';
END$$;