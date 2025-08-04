import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Trophy, 
  ExternalLink,
  Instagram,
  Twitter,
  Globe,
  Mail,
  Loader2,
  MessageSquare,
  Star
} from 'lucide-react';

interface InfluencerProfile {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  profile_image_url: string;
  category: string;
  social_links: any;
  username: string;
  welcome_message: string;
  is_active: boolean;
}

interface PublicChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  start_date: string;
  duration_days: number;
  banner_image_url: string;
  status: string;
  max_participants: number;
  participant_count?: number;
}

const PublicInfluencerProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      fetchInfluencerProfile();
    }
  }, [username]);

  const fetchInfluencerProfile = async () => {
    if (!username) return;

    try {
      setLoading(true);

      // Fetch influencer profile
      const { data: profileData, error: profileError } = await supabase
        .from('influencers')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Fetch active challenges by this influencer
      const { data: challengesData, error: challengesError } = await supabase
        .from('private_challenges')
        .select(`
          id,
          title,
          description,
          challenge_type,
          start_date,
          duration_days,
          banner_image_url,
          status,
          max_participants
        `)
        .eq('creator_id', profileData.user_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (challengesError) throw challengesError;

      // Fetch participant counts for each challenge
      const challengesWithStats = await Promise.all(
        (challengesData || []).map(async (challenge) => {
          const { data: participants } = await supabase
            .from('private_challenge_participations')
            .select('id')
            .eq('private_challenge_id', challenge.id);

          return {
            ...challenge,
            participant_count: participants?.length || 0
          } as PublicChallenge;
        })
      );

      setChallenges(challengesWithStats);

    } catch (error) {
      console.error('Error fetching influencer profile:', error);
      toast.error('Failed to load influencer profile');
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    // This would typically navigate to a join challenge page
    navigate(`/join-challenge/${challengeId}`);
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'twitter':
        return <Twitter className="h-4 w-4" />;
      case 'website':
        return <Globe className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'fitness':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'nutrition':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'wellness':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'lifestyle':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'recovery':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Influencer Not Found</CardTitle>
            <CardDescription>
              The influencer profile you're looking for doesn't exist or is not active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                {profile.profile_image_url ? (
                  <img 
                    src={profile.profile_image_url} 
                    alt={profile.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-primary/10"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-16 w-16 text-primary/50" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold">{profile.name}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                  <Badge className={`mt-2 ${getCategoryColor(profile.category)}`}>
                    {profile.category}
                  </Badge>
                </div>

                {profile.bio && (
                  <p className="text-muted-foreground">{profile.bio}</p>
                )}

                {profile.welcome_message && (
                  <div className="p-4 bg-accent/50 rounded-lg border-l-4 border-primary">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Welcome Message</p>
                        <p className="text-sm text-muted-foreground">{profile.welcome_message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {profile.social_links && profile.social_links.length > 0 && (
                  <div className="flex gap-3">
                    {profile.social_links.map((link: any, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          {getSocialIcon(link.platform)}
                          {link.platform}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Active Challenges
            </CardTitle>
            <CardDescription>
              Join {profile.name}'s current challenges and start your transformation journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            {challenges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active challenges at the moment</p>
                <p className="text-sm">Check back soon for new challenges!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {challenges.map((challenge) => (
                  <Card key={challenge.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-0">
                      {/* Challenge Banner */}
                      {challenge.banner_image_url && (
                        <div className="relative h-32 overflow-hidden rounded-t-lg">
                          <img 
                            src={challenge.banner_image_url} 
                            alt={challenge.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                        </div>
                      )}
                      
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg line-clamp-1">{challenge.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {challenge.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <Badge variant="outline">{challenge.challenge_type}</Badge>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{challenge.participant_count} joined</span>
                          </div>
                        </div>

                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <Calendar className="h-4 w-4" />
                           <span>
                             {new Date(challenge.start_date).toLocaleDateString()} - {new Date(new Date(challenge.start_date).getTime() + challenge.duration_days * 24 * 60 * 60 * 1000).toLocaleDateString()}
                           </span>
                         </div>

                        <Button 
                          className="w-full"
                          onClick={() => joinChallenge(challenge.id)}
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          Join Challenge
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">Ready to Transform Your Life?</h3>
                <p className="text-muted-foreground">
                  Join {profile.name}'s community and start your wellness journey today
                </p>
              </div>
              
              <div className="flex justify-center gap-3">
                <Button>
                  <Star className="h-4 w-4 mr-2" />
                  Follow {profile.name}
                </Button>
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Get in Touch
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicInfluencerProfile;