import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { InfluencerGuard } from '@/components/auth/InfluencerGuard';
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
  ExternalLink,
  Copy,
  Share2,
  TrendingUp,
  Clock,
  Check
} from 'lucide-react';
import { useInfluencerEarnings, useTopChallenges, formatMoney } from '@/data/influencers/useInfluencerEarnings';
import { useStripeStatus, useCreateOnboardingLink, useRefreshPayoutStatus } from '@/data/influencers/useStripeConnect';
import { useInfluencerStats, useMonthlyRevenue } from '@/data/influencers/useInfluencerStats';

// New Components
import { HeaderHero } from '@/components/influencer/HeaderHero';
import { CreatorTabs } from '@/components/influencer/CreatorTabs';
import { StatCard } from '@/components/influencer/StatCard';
import { Sparkline } from '@/components/influencer/Sparkline';
import { ChallengeCard } from '@/components/influencer/ChallengeCard';
import { TopChallengesList } from '@/components/influencer/TopChallengesList';
import { ShareKit } from '@/components/influencer/ShareKit';
import { QuickBroadcast } from '@/components/influencer/QuickBroadcast';
import { PayoutsPanel } from '@/components/influencer/PayoutsPanel';
import { EmptyState } from '@/components/influencer/EmptyState';
import { FunnelCards } from '@/components/influencer/FunnelCards';
import { RangeToggle } from '@/components/analytics/RangeToggle';
import { InfluencerListingSetup } from '@/components/influencer/InfluencerListingSetup';
import { useInfluencerListing } from '@/data/influencers/useInfluencerListing';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const ProfileTab = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showListingSetup, setShowListingSetup] = useState(false);
  const { influencerData, unpublishFromHub, canPublish, validationErrors } = useInfluencerListing();

  const handleCopyProfileLink = () => {
    const profileUrl = `${window.location.origin}/profile/${user?.id}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Profile link copied!",
      description: "Share your profile with your community."
    });
  };

  const handleUnpublish = async () => {
    try {
      await unpublishFromHub.mutateAsync();
      toast({
        title: "Unpublished from Hub",
        description: "Your profile is no longer discoverable."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unpublish. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Get Listed Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Influencer Hub Listing
              {influencerData?.is_listed && (
                <Badge className="ml-auto">Live</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {influencerData?.is_listed ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Your profile is live on the Influencer Hub! People can discover and follow you.
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open('/influencer-hub?highlight=me', '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View in Hub
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleUnpublish}
                    disabled={unpublishFromHub.isPending}
                  >
                    {unpublishFromHub.isPending ? 'Unpublishing...' : 'Unpublish'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Get discovered by the community! Complete your profile and publish to the Influencer Hub.
                </div>
                
                {/* Computed validation checks */}
                {(() => {
                  const hasNameAndHandle = !!influencerData?.display_name && !!influencerData?.handle;
                  const hasBio = (influencerData?.bio?.trim().length ?? 0) >= 80;
                  const hasTags = (influencerData?.category_tags?.length ?? 0) >= 1 && (influencerData?.category_tags?.length ?? 0) <= 3;
                  const hasAvatar = !!influencerData?.avatar_url;
                  
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${hasNameAndHandle ? 'bg-green-500' : 'bg-muted'}`} />
                          Basic info (name, handle)
                          {hasNameAndHandle && <Check className="h-3 w-3 text-green-500" />}
                        </div>
                        {!hasNameAndHandle && (
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs" 
                            onClick={() => setShowListingSetup(true)}>
                            Fix
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${hasAvatar ? 'bg-green-500' : 'bg-muted'}`} />
                          Profile photo
                          {hasAvatar && <Check className="h-3 w-3 text-green-500" />}
                        </div>
                        {!hasAvatar && (
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs"
                            onClick={() => setShowListingSetup(true)}>
                            Fix
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${hasBio ? 'bg-green-500' : 'bg-muted'}`} />
                          Bio (80+ characters)
                          {hasBio && <Check className="h-3 w-3 text-green-500" />}
                        </div>
                        {!hasBio && (
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs"
                            onClick={() => setShowListingSetup(true)}>
                            Fix
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${hasTags ? 'bg-green-500' : 'bg-muted'}`} />
                          Specialty tags (1-3)
                          {hasTags && <Check className="h-3 w-3 text-green-500" />}
                        </div>
                        {!hasTags && (
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs"
                            onClick={() => setShowListingSetup(true)}>
                            Fix
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                <Button
                  onClick={() => setShowListingSetup(true)}
                  className="gap-2 w-full z-20"
                >
                  <Plus className="h-4 w-4" />
                  {influencerData ? 'Finish Setup' : 'Get Listed'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Profile Preview
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyProfileLink}
                className="ml-auto gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-sm text-muted-foreground mb-2">
                This is how your public profile looks to visitors
              </div>
              <div className="inline-block p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="font-semibold">{user?.name || 'Your Name'}</div>
                <div className="text-sm text-muted-foreground">@{user?.email?.split('@')[0] || 'username'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Listing Setup Modal */}
      <InfluencerListingSetup
        open={showListingSetup}
        onOpenChange={setShowListingSetup}
      />

      {/* Edit Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
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
                  className="bg-white/5 dark:bg-black/10 border-white/10"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  defaultValue={user?.email || ''} 
                  disabled
                  className="bg-white/5 dark:bg-black/10 border-white/10"
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
                className="bg-white/5 dark:bg-black/10 border-white/10"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile Share Profile Button */}
      <ShareKit sticky className="sm:hidden" />
    </div>
  );
};

const ChallengesTab = () => {
  const mockChallenges = [
    {
      title: "30-Day Fitness Challenge",
      participants: 127,
      revenue: 254700, // $2,547 in cents
      status: 'active' as const,
      revenueData: [180, 220, 195, 260, 240, 285, 310]
    },
    {
      title: "Mindful Morning Routine",
      participants: 89,
      revenue: 178300, // $1,783 in cents
      status: 'active' as const,
      revenueData: [120, 145, 138, 170, 155, 190, 205]
    },
    {
      title: "Healthy Meal Prep Week",
      participants: 203,
      revenue: 406000, // $4,060 in cents
      status: 'completed' as const,
      revenueData: [280, 320, 295, 350, 380, 420, 450]
    }
  ];

  const handleCreateChallenge = () => {
    toast({
      title: "Create Challenge",
      description: "Challenge creation flow would open here."
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <h3 className="text-lg font-semibold">My Challenges</h3>
        <Button onClick={handleCreateChallenge} className="hidden sm:flex gap-2">
          <Plus className="h-4 w-4" />
          Create Challenge
        </Button>
      </motion.div>
      
      {/* Challenge Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockChallenges.map((challenge, index) => (
          <motion.div
            key={challenge.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ChallengeCard
              {...challenge}
              onManage={() => toast({ title: "Opening challenge management..." })}
            />
          </motion.div>
        ))}
        
        {/* Create New Challenge Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full rounded-2xl border-dashed border-white/20 bg-white/5 dark:bg-black/20 backdrop-blur hover:bg-white/10 dark:hover:bg-black/30 transition-colors">
            <CardContent className="flex items-center justify-center h-full min-h-[200px]">
              <Button 
                variant="ghost" 
                className="text-muted-foreground flex-col gap-2 h-auto py-8"
                onClick={handleCreateChallenge}
              >
                <Plus className="h-8 w-8" />
                <span>Create New Challenge</span>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Empty State when no challenges */}
      {mockChallenges.length === 0 && (
        <EmptyState
          icon={Trophy}
          title="Launch your first challenge"
          description="Create engaging fitness challenges and grow your community in just 2 minutes."
          actionLabel="Create Challenge"
          onAction={handleCreateChallenge}
        />
      )}

      {/* Mobile Share Kit Buttons - Challenges Tab */}
      <ShareKit sticky className="sm:hidden" />
    </div>
  );
};

const ProductsTab = () => {
  const mockProducts = [
    {
      id: 1,
      name: "Premium Protein Powder",
      category: "Supplements",
      commission: 15,
      clicks: 1234,
      last7dSales: 28,
      salesData: [3, 5, 2, 7, 4, 6, 1]
    },
    {
      id: 2,
      name: "Resistance Bands Set",
      category: "Equipment",
      commission: 12,
      clicks: 892,
      last7dSales: 15,
      salesData: [2, 3, 1, 4, 2, 2, 1]
    }
  ];

  const handleAddProduct = () => {
    toast({
      title: "Add Product",
      description: "Product addition flow would open here."
    });
  };

  const handleCopyLink = (productName: string) => {
    const affiliateLink = `${window.location.origin}/product/${productName.toLowerCase().replace(/\s+/g, '-')}?ref=affiliate`;
    navigator.clipboard.writeText(affiliateLink);
    toast({
      title: "Link copied!",
      description: `Affiliate link for ${productName} copied to clipboard.`
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <h3 className="text-lg font-semibold">Promoted Products</h3>
        <Button onClick={handleAddProduct} className="hidden sm:flex gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur hover:bg-white/10 dark:hover:bg-black/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {product.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <div className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                      {product.commission}%
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Clicks</p>
                    <p className="font-semibold tabular-nums">{product.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Sales (7d)</p>
                    <p className="font-semibold tabular-nums">{product.last7dSales}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sales trend</span>
                  </div>
                  <Sparkline data={product.salesData} width={200} height={24} />
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleCopyLink(product.name)}
                    className="flex-1"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Link
                  </Button>
                  <Button size="sm" variant="outline">
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        
        {/* Add New Product Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full rounded-2xl border-dashed border-white/20 bg-white/5 dark:bg-black/20 backdrop-blur hover:bg-white/10 dark:hover:bg-black/30 transition-colors">
            <CardContent className="flex items-center justify-center h-full min-h-[200px]">
              <Button 
                variant="ghost" 
                className="text-muted-foreground flex-col gap-2 h-auto py-8"
                onClick={handleAddProduct}
              >
                <Plus className="h-8 w-8" />
                <span>Add New Product</span>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Empty State when no products */}
      {mockProducts.length === 0 && (
        <EmptyState
          icon={Package}
          title="Add a product to start earning"
          description="Promote products you love and earn commissions from your community."
          actionLabel="Add Product"
          onAction={handleAddProduct}
        />
      )}

      {/* Mobile Add Button */}
      <div className="fixed inset-x-3 bottom-3 z-40 sm:hidden pb-[max(env(safe-area-inset-bottom),0px)] mb-1">
        <Button 
          onClick={handleAddProduct} 
          className="w-full gap-2 rounded-2xl shadow-lg"
          style={{ minHeight: '44px' }}
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>
    </div>
  );
};

const AnalyticsTab = () => {
  const { data: stats, isLoading: statsLoading } = useInfluencerStats();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d'>('30d');

  const periodData = {
    '7d': stats?.last_30d_views?.slice(-7) || [],
    '30d': stats?.last_30d_views || []
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Total Followers"
          value={stats?.followers || 0}
          icon={Users}
          delta="+12% from last month"
          isPositive={true}
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Total Views"
          value={stats?.views || 0}
          icon={Eye}
          delta="+8% from last month"
          isPositive={true}
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Engagement Rate"
          value={statsLoading ? 0 : `${stats?.engagement_rate || 0}%`}
          icon={Heart}
          delta="+2.1% from last month"
          isPositive={true}
          isLoading={statsLoading}
        />
      </div>
      
      {/* Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Performance Overview</CardTitle>
              
              {/* Mobile Period Toggle */}
              <RangeToggle 
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                className="sm:hidden"
              />

              {/* Desktop Period Toggle */}
              <RangeToggle 
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                className="hidden sm:flex"
              />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-[200px] sm:h-[300px] bg-muted/20 rounded animate-pulse" />
            ) : periodData[selectedPeriod].length > 0 ? (
              <div className="h-[200px] sm:h-[300px] flex items-end justify-center">
                <Sparkline 
                  data={periodData[selectedPeriod]} 
                  width={Math.min(600, window.innerWidth - 100)} 
                  height={window.innerWidth < 640 ? 180 : 280}
                  className="w-full"
                />
              </div>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="Share your link to start generating views"
                description="Get your first analytics by sharing your profile with your community."
                className="py-8"
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const BroadcastsTab = () => {
  const mockBroadcasts = [
    {
      id: 1,
      message: "Welcome to my new fitness challenge! 💪 Let's crush our goals together!",
      timestamp: "2 hours ago",
      views: 156
    },
    {
      id: 2,
      message: "Don't forget to check out my latest product recommendations - these protein powders are game changers! 🥤",
      timestamp: "1 day ago",
      views: 89
    },
    {
      id: 3,
      message: "Just finished an amazing workout! Remember, consistency is key. What's your favorite exercise?",
      timestamp: "2 days ago",
      views: 203
    }
  ];

  const handleSendBroadcast = async (message: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Sending broadcast:', message);
  };

  const handleScheduleBroadcast = async (message: string, scheduledTime: Date) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Scheduling broadcast:', message, 'for', scheduledTime);
  };

  return (
    <div className="space-y-6">
      {/* Quick Broadcast Composer */}
      <QuickBroadcast
        onSend={handleSendBroadcast}
        onSchedule={handleScheduleBroadcast}
      />
      
      {/* Recent Broadcasts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Recent Broadcasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mockBroadcasts.length > 0 ? (
              <div className="space-y-4">
                {mockBroadcasts.map((broadcast, index) => (
                  <motion.div
                    key={broadcast.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-l-2 border-primary/30 pl-4 py-2 rounded-r-lg bg-white/5 dark:bg-black/10 hover:bg-white/10 dark:hover:bg-black/20 transition-colors cursor-pointer"
                  >
                    <p className="text-sm mb-2 leading-relaxed">{broadcast.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {broadcast.timestamp}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {broadcast.views} views
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={MessageCircle}
                title="No broadcasts yet"
                description="Start engaging with your community by sending your first broadcast."
                actionLabel="Compose Message"
                onAction={() => {}}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const EarningsTab = () => {
  const { data: earnings, isLoading: earningsLoading } = useInfluencerEarnings();
  const { data: topChallenges, isLoading: challengesLoading } = useTopChallenges();
  const { data: stripeStatus } = useStripeStatus();
  const { data: monthlyRevenue } = useMonthlyRevenue();

  const currency = stripeStatus?.default_currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Hero Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold">You're on a roll! 🚀</h2>
        {monthlyRevenue && !earningsLoading && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-muted-foreground">
              {formatMoney(monthlyRevenue.thisMonthTotal, currency)} earned this month
            </span>
            {monthlyRevenue.growthPercentage !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                monthlyRevenue.growthPercentage >= 0 
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}>
                <TrendingUp className={`h-3 w-3 ${monthlyRevenue.growthPercentage < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(monthlyRevenue.growthPercentage)}%
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Funnel Cards */}
      <FunnelCards
        data={{
          clicks: earnings?.clicks || 0,
          addToCarts: earnings?.add_to_carts || 0,
          paidOrders: earnings?.paid_orders_count || 0,
          payouts: Math.floor((earnings?.paid_earnings_cents || 0) / 2000) // Estimate payout count
        }}
        isLoading={earningsLoading}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Revenue"
          value={formatMoney(earnings?.total_earnings_cents || 0, currency)}
          icon={DollarSign}
          isLoading={earningsLoading}
          testId="stat-total-revenue"
        />

        <StatCard
          title="Paid Out"
          value={formatMoney(earnings?.paid_earnings_cents || 0, currency)}
          icon={CreditCard}
          isLoading={earningsLoading}
          testId="stat-paid-out"
        />

        <StatCard
          title="Paid Orders"
          value={earnings?.paid_orders_count || 0}
          icon={Package}
          isLoading={earningsLoading}
        />

        <StatCard
          title="All Orders"
          value={earnings?.total_orders || 0}
          icon={Users}
          isLoading={earningsLoading}
        />
      </div>

      {/* Revenue Sparkline */}
      {monthlyRevenue?.last30dRevenue && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue Trend (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Sparkline 
                data={monthlyRevenue.last30dRevenue} 
                width={Math.min(600, window.innerWidth - 100)}
                height={120}
                className="w-full"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Top Earning Challenges */}
      <TopChallengesList
        challenges={topChallenges || []}
        currency={currency}
        isLoading={challengesLoading}
      />

      {/* Share & Earn Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share & Earn More
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Share your profile and challenges to grow your community and increase earnings.
            </p>
            <ShareKit />
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile Share Kit Buttons - Earnings Tab */}
      <ShareKit sticky className="sm:hidden" />
    </div>
  );
};

const PayoutsTab = () => {
  const { data: stripeStatus, isLoading } = useStripeStatus();
  const createOnboardingLink = useCreateOnboardingLink();
  const refreshPayoutStatus = useRefreshPayoutStatus();

  return (
    <div className="space-y-6">
      <PayoutsPanel
        stripeStatus={stripeStatus}
        isLoading={isLoading}
        onSetupPayouts={() => createOnboardingLink.mutate()}
        onRefreshStatus={() => refreshPayoutStatus.mutate()}
        isRefreshing={refreshPayoutStatus.isPending}
        isSettingUp={createOnboardingLink.isPending}
      />
    </div>
  );
};


const InfluencerHubContent = () => {
  const { data: stats } = useInfluencerStats();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [monetizationSubTab, setMonetizationSubTab] = useState('earnings');

  // Handle URL params for deep linking
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    const subParam = searchParams.get('sub');
    
    if (tabParam && ['profile', 'challenges', 'products', 'analytics', 'broadcasts', 'monetization'].includes(tabParam)) {
      setActiveTab(tabParam);
      
      // Fire analytics for deep link navigation
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', `influencer.open_${tabParam}_tab`);
        if (tabParam === 'monetization' && subParam === 'payouts') {
          (window as any).gtag('event', 'influencer.open_payouts_tab');
        }
      }
    }
    
    if (subParam && activeTab === 'monetization' && ['earnings', 'payouts'].includes(subParam)) {
      setMonetizationSubTab(subParam);
    }
  }, [location.search, activeTab]);

  // Update URL when tab changes (without triggering navigation)
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    if (newTab !== 'monetization') {
      url.searchParams.delete('sub');
    }
    window.history.replaceState(null, '', url.toString());
    
    // Fire analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', `influencer.nav_${newTab}_tab`);
    }
  };

  const handleMonetizationSubTabChange = (subTab: string) => {
    setMonetizationSubTab(subTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'monetization');
    url.searchParams.set('sub', subTab);
    window.history.replaceState(null, '', url.toString());
    
    if (subTab === 'payouts' && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'influencer.open_payouts_tab');
    }
  };

  const handleInfluencerCreated = () => {
    // Auto-open payouts tab after profile creation
    setActiveTab('monetization');
    setMonetizationSubTab('payouts');
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'monetization');
    url.searchParams.set('sub', 'payouts');
    window.history.replaceState(null, '', url.toString());
  };

  // MonetizationTab component that has access to local state
  const MonetizationTab = () => {
    const subTabs = [
      { key: 'earnings', label: 'Earnings' },
      { key: 'payouts', label: 'Payouts' }
    ];

    return (
      <div className="space-y-6">
        {/* Sub-navigation for monetization */}
        <div className="flex space-x-1 rounded-lg bg-muted p-1">
          {subTabs.map((subTab) => (
            <button
              key={subTab.key}
              onClick={() => handleMonetizationSubTabChange(subTab.key)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                monetizationSubTab === subTab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`${subTab.key}-tab`}
            >
              {subTab.label}
            </button>
          ))}
        </div>

        {/* Content based on active sub-tab */}
        {monetizationSubTab === 'earnings' && <EarningsTab />}
        {monetizationSubTab === 'payouts' && <PayoutsTab />}
      </div>
    );
  };

  // Define tab items
  const tabItems = [
    { key: 'profile', icon: User, label: 'Profile' },
    { key: 'challenges', icon: Trophy, label: 'Challenges' },
    { key: 'products', icon: Package, label: 'Products' },
    { key: 'analytics', icon: BarChart3, label: 'Analytics' },
    { key: 'broadcasts', icon: Megaphone, label: 'Broadcasts' },
    { key: 'monetization', icon: DollarSign, label: 'Money' }
  ];

  // Safe mode wrapper to prevent crashes
  try {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto p-3 sm:p-6 space-y-6 max-w-7xl">
          {/* Header Hero */}
          <HeaderHero 
            monthlyGrowth={stats?.monthly_growth} 
            isLoading={!stats}
          />

          {/* Creator Tabs Navigation */}
          <CreatorTabs 
            value={activeTab}
            onChange={handleTabChange}
            items={tabItems}
          />

          {/* Tab Content with Animations */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative z-0"
          >
            {activeTab === 'profile' && (
              <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
                <ProfileTab />
              </div>
            )}

            {activeTab === 'challenges' && (
              <div id="challenges-panel" role="tabpanel" aria-labelledby="challenges-tab">
                <ChallengesTab />
              </div>
            )}

            {activeTab === 'products' && (
              <div id="products-panel" role="tabpanel" aria-labelledby="products-tab">
                <ProductsTab />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div id="analytics-panel" role="tabpanel" aria-labelledby="analytics-tab">
                <AnalyticsTab />
              </div>
            )}

            {activeTab === 'broadcasts' && (
              <div id="broadcasts-panel" role="tabpanel" aria-labelledby="broadcasts-tab">
                <BroadcastsTab />
              </div>
            )}

            {activeTab === 'monetization' && (
              <div id="monetization-panel" role="tabpanel" aria-labelledby="monetization-tab">
                <MonetizationTab />
              </div>
            )}
          </motion.div>
        </div>
        
        {/* Mobile Safe Area for Sticky Elements */}
        <div className="h-20 sm:hidden" />
      </div>
    );
  } catch (error) {
    console.error('Dashboard render error:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="max-w-md mx-auto m-6">
          <CardHeader>
            <CardTitle>Dashboard Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We're setting up your dashboard. This should only take a moment.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium"
            >
              Refresh Page
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }
};

export default function InfluencerHub() {
  return (
    <InfluencerGuard onInfluencerCreated={() => {
      // This will trigger after profile creation to open payouts
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'monetization');
      url.searchParams.set('sub', 'payouts');
      window.history.replaceState(null, '', url.toString());
      window.location.reload();
    }}>
      <InfluencerHubContent />
    </InfluencerGuard>
  );
}