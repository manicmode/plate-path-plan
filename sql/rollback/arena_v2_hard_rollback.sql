-- Arena V2 Hard Rollback (Emergency UI Disable)
-- WARNING: This is for critical issues only. Use soft rollback first.
-- This script creates a feature flag to hide Arena UI but requires code deployment to respect the flag.

BEGIN;

-- Create runtime flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.runtime_flags (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

-- Enable RLS on runtime flags
ALTER TABLE public.runtime_flags ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read flags (for UI)
CREATE POLICY IF NOT EXISTS "Anyone can read runtime flags" 
ON public.runtime_flags FOR SELECT 
USING (true);

-- Only service role can modify flags
CREATE POLICY IF NOT EXISTS "Only service role can modify runtime flags"
ON public.runtime_flags FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_runtime_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_runtime_flags_updated_at
  BEFORE UPDATE ON public.runtime_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_runtime_flags_updated_at();

-- Set the hard disable flag
INSERT INTO public.runtime_flags (name, enabled, description)
VALUES (
  'arena_v2_hard_disable', 
  true,
  'Emergency disable flag for Arena V2 UI. When true, Arena components should be hidden.'
)
ON CONFLICT (name) 
DO UPDATE SET 
  enabled = true,
  updated_at = now(),
  description = 'Emergency disable flag for Arena V2 UI. When true, Arena components should be hidden.';

-- Log the rollback action
INSERT INTO public.runtime_flags (name, enabled, description)
VALUES (
  'arena_v2_rollback_timestamp',
  true,
  'Timestamp of last Arena V2 hard rollback: ' || now()::text
)
ON CONFLICT (name)
DO UPDATE SET
  enabled = true,
  updated_at = now(),
  description = 'Timestamp of last Arena V2 hard rollback: ' || now()::text;

COMMIT;

-- Verification query
SELECT 
  name,
  enabled,
  description,
  updated_at
FROM public.runtime_flags 
WHERE name LIKE 'arena_v2_%'
ORDER BY updated_at DESC;

/*
USAGE NOTES:

1. This script sets arena_v2_hard_disable = true
2. Your application code should check this flag and hide Arena UI when true
3. Example React hook:

```typescript
const useFeatureFlag = (flagName: string) => {
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    const checkFlag = async () => {
      const { data } = await supabase
        .from('runtime_flags')
        .select('enabled')
        .eq('name', flagName)
        .single();
      setEnabled(data?.enabled || false);
    };
    checkFlag();
  }, [flagName]);
  
  return enabled;
};

// In Arena component:
const isDisabled = useFeatureFlag('arena_v2_hard_disable');
if (isDisabled) return null;
```

4. To re-enable Arena after fix:
UPDATE public.runtime_flags 
SET enabled = false 
WHERE name = 'arena_v2_hard_disable';

5. This is non-destructive - no Arena data is deleted
6. Prefer soft rollback (arena_v2_soft_rollback.sql) for most issues
*/