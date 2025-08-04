import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Plus, Users, Calendar, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InfluencerProfile {
  id: string;
  name: string;
  bio: string;
  profile_image_url: string;
  category: string;
  social_links: any[];
  is_active: boolean;
}

interface PublicChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  is_active: boolean;
  participant_count?: number;
}

const InfluencerPortal: React.FC = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    category: '',
    profile_image_url: '',
    social_links: []
  });

  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    challenge_type: 'fitness',
    start_date: '',
    end_date: '',
    max_participants: 100,
    reward: '',
    banner_image_url: ''
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
          social_links: profileData.social_links || []
        });
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
          end_date,
          max_participants,
          status,
          created_at
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (challengesError) {
        console.error('Error fetching challenges:', challengesError);
      } else {
        setChallenges(challengesData || []);
      }

    } catch (error) {
      console.error('Error fetching influencer data:', error);
      toast.error('Failed to load influencer data');
    } finally {
      setLoading(false);
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
        social_links: profileForm.social_links
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
      toast.error('Failed to save profile');
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
        end_date: challengeForm.end_date,
        max_participants: challengeForm.max_participants,
        duration_days: Math.ceil((new Date(challengeForm.end_date).getTime() - new Date(challengeForm.start_date).getTime()) / (1000 * 60 * 60 * 24)),
        status: 'pending',
        target_metric: 'custom',
        target_value: 1,
        target_unit: 'completion'
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
        banner_image_url: ''
      });
      fetchInfluencerData();
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
    } finally {
      setSaving(false);
    }
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
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Challenge</DialogTitle>
                    <DialogDescription>
                      Fill in the details for your new community challenge
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="challenge-title">Title</Label>
                      <Input
                        id="challenge-title"
                        value={challengeForm.title}
                        onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="30-Day Fitness Challenge"
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
                      />
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
                        />
                      </div>

                      <div>
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={challengeForm.end_date}
                          onChange={(e) => setChallengeForm(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowCreateChallenge(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createChallenge} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create Challenge
                      </Button>
                    </div>
                  </div>
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
                {challenges.map((challenge) => (
                  <div key={challenge.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{challenge.title}</h3>
                        <p className="text-muted-foreground text-sm mb-2">{challenge.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">{challenge.challenge_type}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Max {challenge.max_participants} participants
                          </div>
                        </div>
                      </div>
                      <Badge variant={challenge.is_active ? "default" : "secondary"}>
                        {challenge.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InfluencerPortal;