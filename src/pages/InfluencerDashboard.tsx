import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { InfluencerGuard } from '@/components/auth/InfluencerGuard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Trophy, 
  Package, 
  BarChart3, 
  Megaphone,
  Edit3,
  Save,
  Plus,
  Calendar,
  Users,
  Eye,
  Heart,
  MessageCircle,
  DollarSign,
  CreditCard,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useInfluencerEarnings, useTopChallenges, formatMoney } from '@/data/influencers/useInfluencerEarnings';
import { useStripeStatus, useCreateOnboardingLink, useRefreshPayoutStatus } from '@/data/influencers/useStripeConnect';
import { Skeleton } from '@/components/ui/skeleton';

const ProfileTab = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="ml-auto"
            >
              {isEditing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Display Name</Label>
              <Input 
                id="name" 
                defaultValue={user?.name || ''} 
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                defaultValue={user?.email || ''} 
                disabled
              />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio" 
              placeholder="Tell your followers about yourself..."
              disabled={!isEditing}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ChallengesTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">My Challenges</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Challenge
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">30-Day Fitness Challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Participants: 127</p>
              <p>Status: Active</p>
              <p>Duration: 30 days</p>
            </div>
            <Button size="sm" variant="outline" className="mt-3">
              Manage
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center h-32">
            <Button variant="ghost" className="text-muted-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Create New Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ProductsTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Promoted Products</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Premium Protein Powder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Category: Supplements</p>
              <p>Commission: 15%</p>
              <p>Clicks: 1,234</p>
            </div>
            <Button size="sm" variant="outline" className="mt-3">
              View Details
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center h-32">
            <Button variant="ghost" className="text-muted-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add New Product
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AnalyticsTab = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,341</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,231</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last month</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Analytics chart placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const BroadcastsTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Broadcasts</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Compose Message
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Broadcast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="What would you like to share with your followers?"
            rows={4}
          />
          <div className="flex gap-2">
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Send Now
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Broadcasts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm">Welcome to my new fitness challenge!</p>
              <p className="text-xs text-muted-foreground">2 hours ago • 156 views</p>
            </div>
            <div className="border-l-2 border-muted pl-4">
              <p className="text-sm">Don't forget to check out my latest product recommendations</p>
              <p className="text-xs text-muted-foreground">1 day ago • 89 views</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const EarningsTab = () => {
  const { data: earnings, isLoading: earningsLoading } = useInfluencerEarnings();
  const { data: topChallenges, isLoading: challengesLoading } = useTopChallenges();
  const { data: stripeStatus } = useStripeStatus();
  
  if (earningsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatMoney(earnings?.total_earnings_cents || 0, stripeStatus?.default_currency || 'USD')}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-paid-out">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatMoney(earnings?.paid_earnings_cents || 0, stripeStatus?.default_currency || 'USD')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {earnings?.paid_orders_count || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {earnings?.total_orders || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Earning Challenges */}
      <Card>
        <CardHeader>
          <CardTitle>Top Earning Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          {challengesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : topChallenges && topChallenges.length > 0 ? (
            <div className="space-y-3">
              {topChallenges.map((challenge) => (
                <div key={challenge.challenge_id} className="flex justify-between items-center">
                  <div className="text-sm font-medium">{challenge.challenge_title}</div>
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {formatMoney(challenge.total_revenue_cents, stripeStatus?.default_currency || 'USD')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No paid orders yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PayoutsTab = () => {
  const { data: stripeStatus, isLoading } = useStripeStatus();
  const createOnboardingLink = useCreateOnboardingLink();
  const refreshPayoutStatus = useRefreshPayoutStatus();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSetupPayouts = () => {
    createOnboardingLink.mutate();
  };

  const handleRefreshStatus = () => {
    refreshPayoutStatus.mutate();
  };

  const handleOpenStripe = () => {
    window.open('https://dashboard.stripe.com', '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stripeStatus?.connect_account_id ? (
            <>
              <p className="text-muted-foreground">
                Connect your Stripe account to receive payouts from paid challenges.
              </p>
              <Button 
                onClick={handleSetupPayouts}
                disabled={createOnboardingLink.isPending}
              >
                {createOnboardingLink.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Set up payouts
              </Button>
            </>
          ) : !stripeStatus.payouts_enabled ? (
            <>
              <p className="text-muted-foreground">
                Complete your Stripe onboarding to enable payouts.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRefreshStatus}
                  disabled={refreshPayoutStatus.isPending}
                >
                  {refreshPayoutStatus.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh status
                </Button>
                <Button variant="outline" onClick={handleSetupPayouts}>
                  Complete onboarding
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CreditCard className="h-4 w-4" />
                <span className="font-medium">Stripe Connect • Payouts enabled</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleRefreshStatus}
                  disabled={refreshPayoutStatus.isPending}
                >
                  {refreshPayoutStatus.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh status
                </Button>
                <Button variant="outline" onClick={handleOpenStripe}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Stripe
                </Button>
              </div>
            </>
          )}

          <div className="pt-4 border-t text-xs text-muted-foreground">
            <p>
              Payments from paid challenges appear as orders. After Stripe settles funds, 
              payouts go to your connected bank account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const MonetizationTab = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="earnings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earnings" data-testid="earnings-tab">
            Earnings
          </TabsTrigger>
          <TabsTrigger value="payouts" data-testid="payouts-tab">
            Payouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earnings">
          <EarningsTab />
        </TabsContent>

        <TabsContent value="payouts">
          <PayoutsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const InfluencerDashboardContent = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user?.avatar_url} />
          <AvatarFallback>
            {user?.name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'Influencer'}!</h1>
          <p className="text-muted-foreground">Manage your influence and grow your community</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Challenges</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Broadcasts</span>
          </TabsTrigger>
          <TabsTrigger value="monetization" data-testid="monetization-tab" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Monetization</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="challenges">
          <ChallengesTab />
        </TabsContent>

        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="broadcasts">
          <BroadcastsTab />
        </TabsContent>

        <TabsContent value="monetization">
          <MonetizationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default function InfluencerDashboard() {
  return (
    <InfluencerGuard>
      <InfluencerDashboardContent />
    </InfluencerGuard>
  );
}