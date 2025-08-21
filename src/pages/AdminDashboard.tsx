import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminStickyBar } from '@/components/admin/AdminStickyBar';
import { EnhancedAdminChart } from '@/components/admin/EnhancedAdminChart';
import { SendBroadcastModal } from '@/components/admin/SendBroadcastModal';
import { CreateCouponModal } from '@/components/admin/CreateCouponModal';
import { useAdminStats } from '@/data/admin/useAdminStats';
import { useMyFeatureFlags } from '@/hooks/useMyFeatureFlags';
import { useFeatureFlagActions } from '@/hooks/useFeatureFlagActions';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  Users, 
  Crown, 
  BarChart3, 
  Settings, 
  Wrench,
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Eye,
  UserPlus,
  Activity,
  Database,
  RefreshCw,
  Ban,
  Star,
  Download,
  MessageCircle,
  Zap,
  Globe,
  Send,
  Percent,
  Flag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [activeSubTab, setActiveSubTab] = useState(searchParams.get('sub') || '');
  const [sendBroadcastOpen, setSendBroadcastOpen] = useState(false);
  const [createCouponOpen, setCreateCouponOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  
  const { stats, trends, loading, error, refetch, formatMoney, getTrendForStat } = useAdminStats();
  const { flags, flagsMap, loading: flagsLoading } = useMyFeatureFlags();
  const { toggleGlobalFlag, setUserFlag, loading: flagActionLoading } = useFeatureFlagActions();

  // Refresh metrics handler
  const handleRefreshMetrics = async () => {
    setRefreshing(true);
    try {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['admin:metrics'] });
      toast({
        title: "Success",
        description: "Metrics refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh metrics",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Recalculate metrics handler
  const handleRecalculateMetrics = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-recalc-metrics');
      if (error) throw error;
      
      if (data?.success) {
        await queryClient.invalidateQueries({ queryKey: ['admin:metrics'] });
        toast({
          title: "Success",
          description: data.message,
        });
      } else {
        throw new Error(data?.error || 'Failed to recalculate metrics');
      }
    } catch (error) {
      console.error('Recalculate error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to recalculate metrics",
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };

  // Sync tab state with URL
  useEffect(() => {
    const tab = searchParams.get('tab') || 'overview';
    const sub = searchParams.get('sub') || '';
    setActiveTab(tab);
    setActiveSubTab(sub);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', value);
    if (activeSubTab) {
      newSearchParams.delete('sub');
    }
    setSearchParams(newSearchParams);
    
    // Analytics
    console.log(`admin.nav_${value}`);
  };

  // Feature Flag Handlers
  const handleKillSwitchToggle = async (enabled: boolean) => {
    await toggleGlobalFlag('voice_coach_disabled', enabled);
  };

  const handleUserOverrideToggle = async (enabled: boolean) => {
    await setUserFlag('voice_coach_mvp', enabled);
  };

  // Get flag states
  const killSwitchFlag = flags.find(f => f.flag_key === 'voice_coach_disabled');
  const userOverrideFlag = flags.find(f => f.flag_key === 'voice_coach_mvp');
  
  const isKillSwitchOn = killSwitchFlag?.global_enabled || false;
  const hasUserOverride = userOverrideFlag?.has_user_override || false;
  const userOverrideEnabled = userOverrideFlag?.user_enabled || false;

  // Sample data for tables - replace with real data hooks
  const sampleUsers = [
    {
      id: '1',
      email: 'user@example.com',
      name: 'John Doe',
      role: 'user',
      status: 'active',
      created_at: '2024-01-15',
      last_active: '2024-01-20'
    },
  ];

  const sampleInfluencers = [
    {
      id: '1',
      name: 'Jane Smith',
      email: 'jane@example.com',
      followers: 10500,
      status: 'active',
      stripe_connected: true,
      earnings: 2500.00,
      challenges: 5
    },
  ];

  const userColumns = [
    { key: 'email', label: 'Email', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { 
      key: 'role', 
      label: 'Role', 
      render: (value: string) => (
        <Badge variant={value === 'admin' ? 'destructive' : 'secondary'}>
          {value}
        </Badge>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value}
        </Badge>
      )
    },
    { key: 'created_at', label: 'Joined', sortable: true },
  ];

  const influencerColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'followers', label: 'Followers', sortable: true },
    { 
      key: 'stripe_connected', 
      label: 'Stripe Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'destructive'}>
          {value ? 'Connected' : 'Pending'}
        </Badge>
      )
    },
    { 
      key: 'earnings', 
      label: 'Earnings',
      render: (value: number) => formatMoney(value * 100)
    },
  ];

  const userActions = [
    {
      label: 'View',
      icon: Eye,
      onClick: (user: any) => {
        toast({ title: `Viewing user: ${user.name}` });
      },
      variant: 'outline' as const,
    },
    {
      label: 'Edit Role',
      icon: UserPlus,
      onClick: (user: any) => {
        toast({ title: `Editing role for: ${user.name}` });
      },
      variant: 'secondary' as const,
    },
    {
      label: 'Suspend',
      icon: Ban,
      onClick: (user: any) => {
        toast({ 
          title: `Suspended user: ${user.name}`,
          description: "This action would normally require confirmation",
        });
      },
      variant: 'destructive' as const,
      condition: (user: any) => user.status === 'active',
    },
  ];

  const influencerActions = [
    {
      label: 'View Profile',
      icon: Eye,
      onClick: (influencer: any) => {
        toast({ title: `Viewing profile: ${influencer.name}` });
      },
      variant: 'outline' as const,
    },
    {
      label: 'Verify',
      icon: Star,
      onClick: (influencer: any) => {
        toast({ title: `Verified: ${influencer.name}` });
      },
      variant: 'secondary' as const,
    },
  ];

  // Generate sample sparkline data
  const generateSparklineData = () => {
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 50);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 backdrop-blur-sm border-b border-white/10"
        >
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Admin Dashboard
                </h1>
                <p className="text-white/80 text-sm md:text-base">
                  Manage users, content, and system settings
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshMetrics}
                  disabled={refreshing}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 pb-20 md:pb-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            {/* Sticky Tab Bar */}
            <div className="sticky top-0 z-20 -mx-1 md:mx-0 rounded-2xl bg-[rgba(0,0,0,.35)] backdrop-blur p-1">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-transparent">
                <TabsTrigger 
                  value="overview" 
                  className="px-4 py-2 rounded-xl data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-950 data-[state=active]:[&>svg]:text-slate-900"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="users"
                  className="px-4 py-2 rounded-xl data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-950 data-[state=active]:[&>svg]:text-slate-900"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger 
                  value="influencers"
                  className="px-4 py-2 rounded-xl data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-950 data-[state=active]:[&>svg]:text-slate-900"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Creators
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics"
                  className="px-4 py-2 rounded-xl data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-950 data-[state=active]:[&>svg]:text-slate-900"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="system"
                  className="px-4 py-2 rounded-xl data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-950 data-[state=active]:[&>svg]:text-slate-900"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  System
                </TabsTrigger>
                <TabsTrigger 
                  value="tools"
                  className="px-4 py-2 rounded-xl data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-950 data-[state=active]:[&>svg]:text-slate-900"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Tools
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* KPI Cards */}
              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard
                  title="Total Users"
                  value={stats.totalUsers}
                  icon={Users}
                  trend={getTrendForStat('totalUsers') ? {
                    value: getTrendForStat('totalUsers')!.percentage,
                    label: "vs last period",
                    isPositive: getTrendForStat('totalUsers')!.isPositive
                  } : undefined}
                  isLoading={loading}
                />
                <AdminStatCard
                  title="Active (30d)"
                  value={stats.activeUsers30d}
                  icon={Activity}
                  isLoading={loading}
                />
                <AdminStatCard
                  title="GMV"
                  value={formatMoney(stats.gmvCents)}
                  icon={DollarSign}
                  isLoading={loading}
                />
                <AdminStatCard
                  title="Net Revenue"
                  value={formatMoney(stats.netRevenueCents)}
                  icon={CreditCard}
                  isLoading={loading}
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard
                  title="New Users (7d)"
                  value={stats.newUsers7d}
                  icon={UserPlus}
                  trend={getTrendForStat('newUsers7d') ? {
                    value: getTrendForStat('newUsers7d')!.percentage,
                    label: "vs prev 7d",
                    isPositive: getTrendForStat('newUsers7d')!.isPositive
                  } : undefined}
                  isLoading={loading}
                />
                <AdminStatCard
                  title="Influencers"
                  value={stats.totalInfluencers}
                  icon={Crown}
                  isLoading={loading}
                />
                <AdminStatCard
                  title="Pending Payouts"
                  value={formatMoney(stats.pendingPayoutsCents)}
                  icon={AlertTriangle}
                  isLoading={loading}
                />
                <AdminStatCard
                  title="Refunds"
                  value={stats.refundsCount}
                  icon={RefreshCw}
                  isLoading={loading}
                />
              </div>

              {/* Growth Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EnhancedAdminChart
                  title="User Growth (7 days)"
                  data={generateSparklineData()}
                  icon={TrendingUp}
                  type="area"
                  color="hsl(var(--primary))"
                  gradient={true}
                />
                
                <EnhancedAdminChart
                  title="Revenue Trend"
                  data={generateSparklineData()}
                  icon={DollarSign}
                  type="area"
                  color="hsl(142 76% 36%)"
                  gradient={true}
                />
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <AdminTable
                title="User Management"
                data={sampleUsers}
                columns={userColumns}
                actions={userActions}
                onExport={() => toast({ title: "Exporting users..." })}
                filterable
                filterOptions={[
                  { label: 'Active', value: 'active' },
                  { label: 'Suspended', value: 'suspended' },
                  { label: 'Admins', value: 'admin' },
                ]}
                isLoading={loading}
                emptyMessage="No users found"
              />
            </TabsContent>

            {/* Influencers Tab */}
            <TabsContent value="influencers" className="space-y-6">
              <AdminTable
                title="Influencer Management"
                data={sampleInfluencers}
                columns={influencerColumns}
                actions={influencerActions}
                onExport={() => toast({ title: "Exporting influencers..." })}
                filterable
                filterOptions={[
                  { label: 'Stripe Connected', value: 'connected' },
                  { label: 'Pending Setup', value: 'pending' },
                  { label: 'High Earners', value: 'top' },
                ]}
                isLoading={loading}
                emptyMessage="No influencers found"
              />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground mb-6">
                  Advanced analytics and insights coming soon
                </p>
                <Button variant="outline" onClick={() => toast({ title: "Feature coming soon!" })}>
                  <Globe className="h-4 w-4 mr-2" />
                  View Full Analytics
                </Button>
              </motion.div>
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border border-border/50 bg-card/80 dark:bg-card/80 backdrop-blur-sm space-y-4 shadow-lg"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    System Health
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Database</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Edge Functions</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Online
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Storage</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-6 rounded-2xl border border-border/50 bg-card/80 dark:bg-card/80 backdrop-blur-sm space-y-4 shadow-lg"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Flag className="h-5 w-5" />
                    Feature Flags
                  </h3>
                  
                  {flagsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Voice Coach Kill Switch */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="text-sm font-medium">Voice Coach – Kill Switch</span>
                            <p className="text-xs text-muted-foreground">When ON, Voice Coach is disabled for everyone</p>
                          </div>
                          <Switch
                            checked={isKillSwitchOn}
                            onCheckedChange={handleKillSwitchToggle}
                            disabled={flagActionLoading}
                          />
                        </div>
                      </div>
                      
                      {/* Voice Coach User Override */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <span className={`text-sm font-medium ${isKillSwitchOn ? 'text-muted-foreground' : ''}`}>
                              Voice Coach – MVP Access (You)
                            </span>
                            <p className={`text-xs ${isKillSwitchOn ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                              {isKillSwitchOn ? 'Globally disabled' : 'Enable Voice Coach for your account to test'}
                            </p>
                          </div>
                          <Switch
                            checked={userOverrideEnabled && hasUserOverride}
                            onCheckedChange={handleUserOverrideToggle}
                            disabled={flagActionLoading || isKillSwitchOn}
                          />
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/feature-flags')}
                          className="w-full"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Manage All Flags
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-6">
              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                  className="p-6 rounded-2xl border border-border/50 bg-card/80 dark:bg-card/80 backdrop-blur-sm space-y-4 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <Send className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Send Broadcast</h3>
                      <p className="text-sm text-muted-foreground">Send system-wide notifications</p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setSendBroadcastOpen(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Broadcast
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-6 rounded-2xl border border-border/50 bg-card/80 dark:bg-card/80 backdrop-blur-sm space-y-4 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <Percent className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Create Coupon</h3>
                      <p className="text-sm text-muted-foreground">Generate discount codes</p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setCreateCouponOpen(true)}
                  >
                    <Percent className="h-4 w-4 mr-2" />
                    Create Coupon
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 rounded-2xl border border-border/50 bg-card/80 dark:bg-card/80 backdrop-blur-sm space-y-4 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Recalculate Metrics</h3>
                      <p className="text-sm text-muted-foreground">Refresh platform statistics</p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleRecalculateMetrics}
                    disabled={recalculating}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
                    {recalculating ? 'Recalculating...' : 'Recalculate'}
                  </Button>
                </motion.div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals */}
        <SendBroadcastModal 
          open={sendBroadcastOpen} 
          onOpenChange={setSendBroadcastOpen} 
        />
        <CreateCouponModal 
          open={createCouponOpen} 
          onOpenChange={setCreateCouponOpen} 
        />

        {/* Mobile Sticky Actions */}
        <div className="md:hidden">
          <AdminStickyBar
            actions={[
              {
                label: 'Refresh',
                icon: RefreshCw,
                onClick: handleRefreshMetrics,
                variant: 'outline',
              },
              {
                label: 'Export',
                icon: Download,
                onClick: () => toast({ title: "Exporting data..." }),
                variant: 'secondary',
              },
            ]}
          />
        </div>
      </div>
    </AdminGuard>
  );
};

export default AdminDashboard;