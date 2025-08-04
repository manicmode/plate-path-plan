import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Loader2, 
  Plus, 
  Users, 
  Calendar, 
  Award, 
  Upload, 
  Eye, 
  Copy, 
  Share2, 
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
  TrendingUp,
  Star,
  Gift,
  ChevronDown,
  ChevronUp,
  Building,
  Tag,
  Link as LinkIcon,
  FileText,
  DollarSign
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';

interface InfluencerProfile {
  id: string;
  name: string;
  bio: string;
  profile_image_url: string;
  category: string;
  social_links: any;
  is_active: boolean;
  username: string;
  welcome_message: string;
  auto_notify_followers: boolean;
}

interface PublicChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  start_date: string;
  duration_days: number;
  max_participants: number;
  banner_image_url: string;
  participant_count?: number;
  completion_rate?: number;
  status: string;
  created_at: string;
  brand_name?: string;
  promo_code?: string;
  product_url?: string;
  reward_description?: string;
  is_sponsored?: boolean;
  reward_image_url?: string;
}

interface ChallengeStats {
  total_participants: number;
  completed_participants: number;
  completion_rate: number;
}

const InfluencerPortal: React.FC = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [challengeStats, setChallengeStats] = useState<Map<string, ChallengeStats>>(new Map());
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingReward, setUploadingReward] = useState(false);
  const [showBrandSection, setShowBrandSection] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    category: '',
    profile_image_url: '',
    social_links: [],
    username: '',
    welcome_message: ''
  });

  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    challenge_type: 'fitness',
    start_date: '',
    end_date: '',
    max_participants: 100,
    reward: '',
    banner_image_url: '',
    follower_only: false,
    brand_name: '',
    promo_code: '',
    product_url: '',
    reward_description: '',
    is_sponsored: false,
    reward_image_url: ''
  });

  // Check if user has influencer role
  const isInfluencer = role === 'influencer' || role === 'admin';

  useEffect(() => {
    if (!roleLoading && !isInfluencer) {
      toast.error('Access denied. You need influencer privileges to access this portal.');
      return;
    }

    if (user?.id && isInfluencer) {
      fetchInfluencerData();
    }
  }, [user, isInfluencer, roleLoading]);

  const fetchChallengeStats = async (challengeId: string): Promise<ChallengeStats> => {
    try {
      const { data: participants, error } = await supabase
        .from('private_challenge_participations')
        .select('completed_at')
        .eq('private_challenge_id', challengeId);

      if (error) throw error;

      const total_participants = participants?.length || 0;
      const completed_participants = participants?.filter(p => p.completed_at).length || 0;
      const completion_rate = total_participants > 0 ? (completed_participants / total_participants) * 100 : 0;

      return {
        total_participants,
        completed_participants,
        completion_rate
      };
    } catch (error) {
      console.error('Error fetching challenge stats:', error);
      return { total_participants: 0, completed_participants: 0, completion_rate: 0 };
    }
  };

  const fetchInfluencerData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch influencer profile
      const { data: profileData, error: profileError } = await supabase
        .from('influencers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData);
        setProfileForm({
          name: profileData.name || '',
          bio: profileData.bio || '',
          category: profileData.category || '',
          profile_image_url: profileData.profile_image_url || '',
          social_links: Array.isArray(profileData.social_links) ? profileData.social_links : [],
          username: profileData.username || '',
          welcome_message: profileData.welcome_message || ''
        });
        
        // Fetch follower count
        const { data: followers } = await supabase
          .from('influencer_followers')
          .select('id', { count: 'exact' })
          .eq('influencer_id', profileData.id);
        
        setFollowerCount(followers?.length || 0);
      }

      // Fetch challenges created by this influencer
      const { data: challengesData, error: challengesError } = await supabase
        .from('private_challenges')
        .select(`
          id,
          title,
          description,
          challenge_type,
          start_date,
          duration_days,
          max_participants,
          status,
          banner_image_url,
          created_at,
          brand_name,
          promo_code,
          product_url,
          reward_description,
          is_sponsored,
          reward_image_url
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (challengesError) {
        console.error('Error fetching challenges:', challengesError);
      } else {
        setChallenges(challengesData || []);
        
        // Fetch stats for each challenge
        const statsMap = new Map<string, ChallengeStats>();
        for (const challenge of challengesData || []) {
          const stats = await fetchChallengeStats(challenge.id);
          statsMap.set(challenge.id, stats);
        }
        setChallengeStats(statsMap);
      }

    } catch (error) {
      console.error('Error fetching influencer data:', error);
      toast.error('Failed to load influencer data');
    } finally {
      setLoading(false);
    }
  };

  const uploadBannerImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('challenge-banners')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('challenge-banners')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setUploadingBanner(true);
      const imageUrl = await uploadBannerImage(file);
      setChallengeForm(prev => ({ ...prev, banner_image_url: imageUrl }));
      toast.success('Banner uploaded successfully!');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const uploadRewardImage = async (file: File) => {
    try {
      setUploadingReward(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('challenge-rewards')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('challenge-rewards')
        .getPublicUrl(filePath);

      setChallengeForm(prev => ({ ...prev, reward_image_url: publicUrl }));
      toast.success('Reward image uploaded successfully!');

    } catch (error) {
      console.error('Error uploading reward image:', error);
      toast.error('Failed to upload reward image');
    } finally {
      setUploadingReward(false);
    }
  };

  const saveProfile = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      const profileData = {
        user_id: user.id,
        name: profileForm.name,
        bio: profileForm.bio,
        category: profileForm.category,
        profile_image_url: profileForm.profile_image_url,
        social_links: profileForm.social_links,
        username: profileForm.username,
        welcome_message: profileForm.welcome_message
      };

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('influencers')
          .update(profileData)
          .eq('id', profile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('influencers')
          .insert([profileData])
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
      }

      toast.success('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      if (error.code === '23505') {
        toast.error('Username already taken. Please choose a different one.');
      } else {
        toast.error('Failed to save profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const createChallenge = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      const challengeData = {
        creator_id: user.id,
        title: challengeForm.title,
        description: challengeForm.description,
        challenge_type: challengeForm.challenge_type,
        start_date: challengeForm.start_date,
        max_participants: challengeForm.max_participants,
        banner_image_url: challengeForm.banner_image_url,
        duration_days: Math.ceil((new Date(challengeForm.end_date).getTime() - new Date(challengeForm.start_date).getTime()) / (1000 * 60 * 60 * 24)),
        status: 'pending',
        target_metric: 'custom',
        target_value: 1,
        target_unit: 'completion',
        category: 'fitness',
        follower_only: challengeForm.follower_only,
        brand_name: challengeForm.brand_name || null,
        promo_code: challengeForm.promo_code || null,
        product_url: challengeForm.product_url || null,
        reward_description: challengeForm.reward_description || null,
        is_sponsored: challengeForm.is_sponsored,
        reward_image_url: challengeForm.reward_image_url || null
      };

      const { error } = await supabase
        .from('private_challenges')
        .insert([challengeData]);

      if (error) throw error;

      toast.success('Challenge created successfully!');
      setShowCreateChallenge(false);
      setChallengeForm({
        title: '',
        description: '',
        challenge_type: 'fitness',
        start_date: '',
        end_date: '',
        max_participants: 100,
        reward: '',
        banner_image_url: '',
        follower_only: false,
        brand_name: '',
        promo_code: '',
        product_url: '',
        reward_description: '',
        is_sponsored: false,
        reward_image_url: ''
      });
      setShowBrandSection(false);
      fetchInfluencerData();
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
    } finally {
      setSaving(false);
    }
  };

  const copyInviteLink = async (challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    const inviteLink = `${window.location.origin}/join-challenge/${challengeId}`;
    
    let shareText = `Join my ${challenge?.title || 'challenge'}! 🏃‍♀️\n`;
    
    // Add brand reward info if sponsored
    if (challenge?.is_sponsored && challenge?.brand_name) {
      shareText += `🎁 Sponsored by ${challenge.brand_name}`;
      if (challenge.promo_code) {
        shareText += ` — Use ${challenge.promo_code} for exclusive benefits`;
      }
      if (challenge.product_url) {
        shareText += `: ${challenge.product_url}`;
      }
      shareText += '\n';
    }
    
    shareText += `Sign up here: ${inviteLink}`;
    
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Invite link with reward info copied!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const copyPublicProfileLink = async () => {
    if (!profile?.username) {
      toast.error('Please set a username first');
      return;
    }
    const profileLink = `${window.location.origin}/influencer/${profile.username}`;
    try {
      await navigator.clipboard.writeText(profileLink);
      toast.success('Profile link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareToSocial = async (challengeId: string, challengeTitle: string) => {
    const inviteLink = `${window.location.origin}/join-challenge/${challengeId}`;
    const shareText = `Join my "${challengeTitle}" challenge! ${inviteLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: challengeTitle,
          text: shareText,
          url: inviteLink
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Challenge info copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy');
      }
    }
  };

  const getCompletionBadgeColor = (rate: number) => {
    if (rate >= 80) return 'default'; // Green for high completion
    if (rate >= 50) return 'secondary'; // Yellow for medium completion
    return 'outline'; // Gray for low completion
  };

  const getCompletionIcon = (rate: number) => {
    if (rate >= 80) return <Star className="h-3 w-3 mr-1" />;
    if (rate >= 50) return <TrendingUp className="h-3 w-3 mr-1" />;
    return null;
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isInfluencer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need influencer privileges to access this portal.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🌟 Influencer Portal</h1>
          <p className="text-muted-foreground">Manage your profile and create engaging challenges for your community</p>
          
          {/* Public Profile Link */}
          {profile?.username && (
            <div className="mt-4 p-4 bg-accent/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">This is what your followers will see:</p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto font-normal text-primary"
                    onClick={() => navigate(`/influencer/${profile.username}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Public Profile
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={copyPublicProfileLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Profile Editor
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">💡</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This is your public profile. Edit your info to attract followers.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Update your public influencer profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your display name"
                />
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  placeholder="unique_username"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be your public URL: /influencer/{profileForm.username || 'username'}
                </p>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell your audience about yourself..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="welcome_message">Welcome Message</Label>
                <Textarea
                  id="welcome_message"
                  value={profileForm.welcome_message}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, welcome_message: e.target.value }))}
                  placeholder="A special message for your followers..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={profileForm.category}
                  onValueChange={(value) => setProfileForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your expertise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="nutrition">Nutrition</SelectItem>
                    <SelectItem value="wellness">Wellness</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="recovery">Recovery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="profile_image">Profile Image URL</Label>
                <Input
                  id="profile_image"
                  value={profileForm.profile_image_url}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, profile_image_url: e.target.value }))}
                  placeholder="https://your-image-url.com"
                />
              </div>

              <Button onClick={saveProfile} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Profile
              </Button>
            </CardContent>
          </Card>

          {/* Create Challenge */}
          <Card>
            <CardHeader>
              <CardTitle>Create Challenge</CardTitle>
              <CardDescription>
                Design engaging challenges for your community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={showCreateChallenge} onOpenChange={setShowCreateChallenge}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Challenge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Challenge</DialogTitle>
                    <DialogDescription>
                      Fill in the details for your new community challenge
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); createChallenge(); }}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="challenge-title">Title</Label>
                        <Input
                          id="challenge-title"
                          value={challengeForm.title}
                          onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="30-Day Fitness Challenge"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="challenge-description">Description</Label>
                        <Textarea
                          id="challenge-description"
                          value={challengeForm.description}
                          onChange={(e) => setChallengeForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe what participants will do..."
                          rows={3}
                          required
                        />
                      </div>

                      {/* Banner Upload */}
                      <div>
                        <Label htmlFor="banner-upload">Banner Image</Label>
                        <div className="mt-2">
                          {challengeForm.banner_image_url ? (
                            <div className="relative">
                              <img 
                                src={challengeForm.banner_image_url} 
                                alt="Challenge banner" 
                                className="w-full h-32 object-cover rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => setChallengeForm(prev => ({ ...prev, banner_image_url: '' }))}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerUpload}
                                className="hidden"
                                id="banner-upload"
                                disabled={uploadingBanner}
                              />
                              <label htmlFor="banner-upload" className="cursor-pointer">
                                <div className="flex flex-col items-center">
                                  {uploadingBanner ? (
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                                  ) : (
                                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                  )}
                                  <p className="text-sm text-muted-foreground">
                                    {uploadingBanner ? 'Uploading...' : 'Click to upload banner image'}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    JPEG, PNG up to 10MB
                                  </p>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="challenge-type">Type</Label>
                          <Select
                            value={challengeForm.challenge_type}
                            onValueChange={(value) => setChallengeForm(prev => ({ ...prev, challenge_type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fitness">Fitness</SelectItem>
                              <SelectItem value="nutrition">Nutrition</SelectItem>
                              <SelectItem value="hydration">Hydration</SelectItem>
                              <SelectItem value="habit">Habit Building</SelectItem>
                              <SelectItem value="wellness">Wellness</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="max-participants">Max Participants</Label>
                          <Input
                            id="max-participants"
                            type="number"
                            value={challengeForm.max_participants}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 100 }))}
                            min="1"
                            max="1000"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start-date">Start Date</Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={challengeForm.start_date}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, start_date: e.target.value }))}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="end-date">End Date</Label>
                          <Input
                            id="end-date"
                            type="date"
                            value={challengeForm.end_date}
                            onChange={(e) => setChallengeForm(prev => ({ ...prev, end_date: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="reward">Reward</Label>
                        <Input
                          id="reward"
                          value={challengeForm.reward}
                          onChange={(e) => setChallengeForm(prev => ({ ...prev, reward: e.target.value }))}
                          placeholder="What do participants get for completing?"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="follower_only">Challenge Visibility</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="follower_only"
                            checked={challengeForm.follower_only}
                            onCheckedChange={(checked) => setChallengeForm(prev => ({ ...prev, follower_only: checked }))}
                          />
                          <Label htmlFor="follower_only" className="text-sm text-muted-foreground">
                            🔒 Only visible to followers
                          </Label>
                        </div>
                      </div>

                      {/* Brand Collaboration Section */}
                      <Collapsible open={showBrandSection} onOpenChange={setShowBrandSection}>
                        <CollapsibleTrigger asChild>
                          <Button type="button" variant="outline" className="w-full justify-between">
                            <div className="flex items-center gap-2">
                              <Gift className="h-4 w-4" />
                              💼 Add Brand Reward
                            </div>
                            {showBrandSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-accent/30">
                          <div className="flex items-center space-x-2 mb-4">
                            <Switch
                              id="is_sponsored"
                              checked={challengeForm.is_sponsored}
                              onCheckedChange={(checked) => setChallengeForm(prev => ({ ...prev, is_sponsored: checked }))}
                            />
                            <Label htmlFor="is_sponsored" className="text-sm font-medium">
                              ⭐ This is a sponsored challenge
                            </Label>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="brand_name" className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                Brand Name
                              </Label>
                              <Input
                                id="brand_name"
                                placeholder="e.g., CleanGreens"
                                value={challengeForm.brand_name}
                                onChange={(e) => setChallengeForm(prev => ({ ...prev, brand_name: e.target.value }))}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="promo_code" className="flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Promo Code
                              </Label>
                              <Input
                                id="promo_code"
                                placeholder="e.g., VOYAGE10"
                                value={challengeForm.promo_code}
                                onChange={(e) => setChallengeForm(prev => ({ ...prev, promo_code: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="product_url" className="flex items-center gap-2">
                              <LinkIcon className="h-4 w-4" />
                              Product URL
                            </Label>
                            <Input
                              id="product_url"
                              placeholder="https://brand.com/product"
                              value={challengeForm.product_url}
                              onChange={(e) => setChallengeForm(prev => ({ ...prev, product_url: e.target.value }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reward_description" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Reward Description
                            </Label>
                            <Textarea
                              id="reward_description"
                              placeholder="e.g., 10% off all products with free shipping"
                              value={challengeForm.reward_description}
                              onChange={(e) => setChallengeForm(prev => ({ ...prev, reward_description: e.target.value }))}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Reward Image (optional)
                            </Label>
                            <div className="flex gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('reward-image-upload')?.click()}
                                disabled={uploadingReward}
                                className="flex-1"
                              >
                                {uploadingReward ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                Upload Brand Logo/Product
                              </Button>
                              <input
                                id="reward-image-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) uploadRewardImage(file);
                                }}
                                className="hidden"
                              />
                            </div>
                            {challengeForm.reward_image_url && (
                              <div className="mt-2">
                                <img 
                                  src={challengeForm.reward_image_url} 
                                  alt="Reward preview" 
                                  className="w-20 h-20 object-cover rounded border"
                                />
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <div className="flex gap-2 pt-4">
                        <Button 
                          type="submit" 
                          disabled={saving}
                          className="flex-1"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Create Challenge
                        </Button>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => setShowCreateChallenge(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* My Challenges List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Challenges
            </CardTitle>
            <CardDescription>
              All challenges you've created for your community
            </CardDescription>
          </CardHeader>
          <CardContent>
            {challenges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No challenges created yet</p>
                <p className="text-sm">Create your first challenge to engage your community!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {challenges.map((challenge) => {
                  const stats = challengeStats.get(challenge.id);
                  return (
                    <div key={challenge.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex gap-4">
                        {/* Banner Image */}
                        {challenge.banner_image_url && (
                          <div className="flex-shrink-0">
                            <img 
                              src={challenge.banner_image_url} 
                              alt={challenge.title}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg truncate">{challenge.title}</h3>
                                {challenge.is_sponsored && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    <Star className="h-3 w-3 mr-1" />
                                    Sponsored
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{challenge.description}</p>
                              
                              {/* Brand info if sponsored */}
                              {challenge.is_sponsored && challenge.brand_name && (
                                <div className="mb-2 p-2 bg-yellow-50/50 rounded border border-yellow-200/50">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Gift className="h-4 w-4 text-yellow-600" />
                                    <span className="font-medium text-yellow-800">
                                      Sponsored by {challenge.brand_name}
                                    </span>
                                  </div>
                                  {challenge.reward_description && (
                                    <p className="text-xs text-yellow-700 mt-1">{challenge.reward_description}</p>
                                  )}
                                </div>
                              )}
                              
                              {/* Challenge Stats */}
                              {stats && (
                                <div className="flex items-center gap-4 mb-2">
                                  <div className="flex items-center gap-1 text-sm">
                                    <Users className="h-4 w-4" />
                                    <span>{stats.total_participants} participants</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>{stats.completed_participants} completed</span>
                                  </div>
                                  <Badge 
                                    variant={getCompletionBadgeColor(stats.completion_rate)}
                                    className="flex items-center gap-1"
                                  >
                                    {getCompletionIcon(stats.completion_rate)}
                                    {stats.completion_rate.toFixed(0)}% success
                                  </Badge>
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <Badge variant="outline">{challenge.challenge_type}</Badge>
                                 <div className="flex items-center gap-1">
                                   <Calendar className="h-4 w-4" />
                                   {new Date(challenge.start_date).toLocaleDateString()} - {new Date(new Date(challenge.start_date).getTime() + challenge.duration_days * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                 </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant={challenge.status === 'active' ? "default" : "secondary"}>
                                {challenge.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 mt-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/challenge-preview/${challenge.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyInviteLink(challenge.id)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Link
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => shareToSocial(challenge.id, challenge.title)}
                            >
                              <Share2 className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InfluencerPortal;