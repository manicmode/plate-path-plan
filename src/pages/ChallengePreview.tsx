import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
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
  Copy, 
  Share2, 
  Edit, 
  ExternalLink,
  CheckCircle,
  Star,
  Clock
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  banner_image_url: string;
  status: string;
  target_metric: string;
  target_value: number;
  target_unit: string;
  creator_id: string;
  reward?: string;
}

interface ChallengeStats {
  total_participants: number;
  completed_participants: number;
  completion_rate: number;
}

const ChallengePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (id) {
      fetchChallengeData();
    }
  }, [id]);

  const fetchChallengeData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch challenge details
      const { data: challengeData, error: challengeError } = await supabase
        .from('private_challenges')
        .select('*')
        .eq('id', id)
        .single();

      if (challengeError) throw challengeError;

      setChallenge(challengeData);
      setIsOwner(challengeData.creator_id === user?.id);

      // Fetch challenge stats
      const { data: participants, error: participantsError } = await supabase
        .from('private_challenge_participations')
        .select('completed_at')
        .eq('private_challenge_id', id);

      if (participantsError) throw participantsError;

      const total_participants = participants?.length || 0;
      const completed_participants = participants?.filter(p => p.completed_at).length || 0;
      const completion_rate = total_participants > 0 ? (completed_participants / total_participants) * 100 : 0;

      setStats({
        total_participants,
        completed_participants,
        completion_rate
      });

    } catch (error) {
      console.error('Error fetching challenge data:', error);
      toast.error('Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/join-challenge/${id}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareChallenge = async () => {
    if (!challenge) return;

    const inviteLink = `${window.location.origin}/join-challenge/${id}`;
    const shareText = `Join the "${challenge.title}" challenge! ${inviteLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: challenge.title,
          text: shareText,
          url: inviteLink
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Challenge info copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy');
      }
    }
  };

  const getDaysRemaining = () => {
    if (!challenge) return 0;
    const today = new Date();
    const endDate = new Date(challenge.end_date);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getChallengeStatusColor = () => {
    if (!challenge) return 'secondary';
    switch (challenge.status) {
      case 'active': return 'default';
      case 'completed': return 'outline';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Challenge Not Found</CardTitle>
            <CardDescription>
              The challenge you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/influencer-portal')}>
              Back to Portal
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
            onClick={() => navigate('/influencer-portal')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Challenge Preview</h1>
            <p className="text-muted-foreground">
              {isOwner ? 'Your challenge preview' : 'Challenge details'}
            </p>
          </div>

          {isOwner && (
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Challenge
            </Button>
          )}
        </div>

        {/* Challenge Banner */}
        {challenge.banner_image_url && (
          <div className="relative rounded-lg overflow-hidden">
            <img 
              src={challenge.banner_image_url} 
              alt={challenge.title}
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-end">
              <div className="p-6 text-white">
                <h2 className="text-3xl font-bold mb-2">{challenge.title}</h2>
                <Badge variant="secondary" className="text-white bg-white/20">
                  {challenge.challenge_type}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Challenge Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {!challenge.banner_image_url && challenge.title}
                  <Badge variant={getChallengeStatusColor()}>
                    {challenge.status}
                  </Badge>
                </CardTitle>
                {!challenge.banner_image_url && (
                  <CardDescription>
                    <Badge variant="outline">{challenge.challenge_type}</Badge>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{challenge.description}</p>
                </div>

                {challenge.reward && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Reward
                    </h3>
                    <p className="text-muted-foreground">{challenge.reward}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Time Remaining</p>
                      <p className="text-sm text-muted-foreground">
                        {getDaysRemaining()} days left
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User-Facing Join Preview */}
            <Card>
              <CardHeader>
                <CardTitle>What Participants Will See</CardTitle>
                <CardDescription>
                  This is how your challenge will appear to potential participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted rounded-lg p-6 bg-accent/30">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {challenge.banner_image_url && (
                        <img 
                          src={challenge.banner_image_url} 
                          alt={challenge.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{challenge.title}</h3>
                        <p className="text-muted-foreground text-sm mb-2">{challenge.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{challenge.challenge_type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {stats?.total_participants || 0} participants joined
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full" disabled>
                      Join Challenge (Preview)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Challenge Stats */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Challenge Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-4 bg-accent/50 rounded-lg">
                      <div className="text-2xl font-bold">{stats.total_participants}</div>
                      <div className="text-sm text-muted-foreground">Participants</div>
                    </div>
                    
                    <div className="text-center p-4 bg-accent/50 rounded-lg">
                      <div className="text-2xl font-bold">{stats.completed_participants}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    
                    <div className="text-center p-4 bg-accent/50 rounded-lg">
                      <div className="text-2xl font-bold flex items-center justify-center gap-1">
                        {stats.completion_rate >= 80 && <Star className="h-5 w-5 text-yellow-500" />}
                        {stats.completion_rate.toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Share Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Share & Promote</CardTitle>
                <CardDescription>
                  Get more people to join your challenge
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={copyInviteLink}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Invite Link
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={shareChallenge}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Challenge
                </Button>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Invite link: {window.location.origin}/join-challenge/{id}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Challenge Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Challenge Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Max Participants</span>
                  <span className="text-sm font-medium">{challenge.max_participants}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Goal</span>
                  <span className="text-sm font-medium">
                    {challenge.target_value} {challenge.target_unit}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status</span>
                  <Badge variant={getChallengeStatusColor()}>
                    {challenge.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengePreview;