import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminStickyBar } from '@/components/admin/AdminStickyBar';
import { EnhancedAdminChart } from '@/components/admin/EnhancedAdminChart';
import { useAdminStats } from '@/data/admin/useAdminStats';
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
  Globe
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [activeSubTab, setActiveSubTab] = useState(searchParams.get('sub') || '');
  
  const { stats, trends, loading, error, refetch, formatMoney, getTrendForStat } = useAdminStats();

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
                  onClick={() => {
                    refetch();
                    toast({
                      title: "Refreshing data...",
                      description: "Admin dashboard stats are being updated."
                    });
                  }}
                  disabled={loading}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            {/* Sticky Tab Bar */}
            <div className="sticky top-[104px] z-30 -mx-4 px-4 bg-background/95 backdrop-blur border-b border-border/20 pb-4">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-muted/50 backdrop-blur rounded-2xl p-1 shadow-lg">
                <TabsTrigger value="overview" className="rounded-xl">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="users" className="rounded-xl">
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="influencers" className="rounded-xl">
                  <Crown className="h-4 w-4 mr-2" />
                  Creators
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-xl">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="system" className="rounded-xl">
                  <Settings className="h-4 w-4 mr-2" />
                  System
                </TabsTrigger>
                <TabsTrigger value="tools" className="rounded-xl">
                  <Wrench className="h-4 w-4 mr-2" />
                  Tools
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <Settings className="h-5 w-5" />
                    Feature Flags
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Maintenance Mode</span>
                      <Badge variant="secondary">Off</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Registrations</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Payouts</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </div>
                </motion.div>
              </div>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Broadcast Message',
                    description: 'Send system-wide notifications',
                    icon: MessageCircle,
                    action: 'Send Broadcast'
                  },
                  {
                    title: 'Generate Coupon',
                    description: 'Create discount codes',
                    icon: Zap,
                    action: 'Create Coupon'
                  },
                  {
                    title: 'Recalc Metrics',
                    description: 'Refresh platform statistics',
                    icon: RefreshCw,
                    action: 'Recalculate'
                  },
                ].map((tool, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 rounded-2xl border border-border/50 bg-card/80 dark:bg-card/80 backdrop-blur-sm space-y-4 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <tool.icon className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">{tool.title}</h3>
                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => toast({ title: `${tool.action} triggered!` })}
                    >
                      {tool.action}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Mobile Sticky Actions */}
        <div className="md:hidden">
          <AdminStickyBar
            actions={[
              {
                label: 'Refresh',
                icon: RefreshCw,
                onClick: () => {
                  refetch();
                  toast({
                    title: "Refreshing data...",
                    description: "Admin dashboard stats are being updated."
                  });
                },
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