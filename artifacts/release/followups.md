# Arena V2 Follow-Up Tasks

## 1. Configure Health Monitoring
**Task:** Configure HEALTHZ_URL in repo secrets to enable monitor workflow.

**Steps:**
1. Go to GitHub repository Settings → Secrets and variables → Actions
2. Add new repository secret: `HEALTHZ_URL`
3. Set value to your deployed app URL (e.g., `https://your-app.com`)
4. Monitor workflow will automatically start checking `/healthz` every 15 minutes

**Verification:** Check Actions tab for successful "Monitor Arena Health" runs

## 2. Wire Runtime Feature Flags (Optional)
**Task:** Wire runtime flag read for `arena_v2_hard_disable` (if not already) to make hard rollback immediate without redeploy.

**Implementation Example:**
```typescript
// Add to Arena components
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

// In Arena wrapper component:
const isDisabled = useFeatureFlag('arena_v2_hard_disable');
if (isDisabled) return <div>Arena temporarily unavailable</div>;
```

**Benefit:** Allows instant UI disable via SQL without waiting for deployment