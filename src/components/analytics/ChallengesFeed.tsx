import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Target, Users, Globe, Clock, Copy, Search, Sparkles, Plus } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { PublicChallengeCard } from '@/components/analytics/PublicChallengeCard';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';

interface ChallengesFeedProps {
  onCreate?: () => void;
  showJoinByCode?: boolean;
}

export const ChallengesFeed: React.FC<ChallengesFeedProps> = ({ 
  onCreate,
  showJoinByCode = true 
}) => {
  if (import.meta.env.DEV) console.log("[hooks-order-ok] ChallengesFeed");
  
  const {
    challenges: publicChallenges,
    loading,
    error,
    joinChallenge,
    isUserParticipating,
    refreshData
  } = usePublicChallenges();
  
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Listen for custom refresh events
  useEffect(() => {
    const h = () => refreshData();
    window.addEventListener('challenges:refresh', h);
    return () => window.removeEventListener('challenges:refresh', h);
  }, [refreshData]);

  const handleJoinChallenge = async (challengeId: string): Promise<boolean> => {
    const success = await joinChallenge(challengeId);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Missing Code",
        description: "Please enter a challenge code",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      // Check if it's a UUID (direct challenge ID) or invite code
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(joinCode);
      
      let challengeId = joinCode;
      
      if (!isUUID) {
        // Find challenge by invite_code
        const challenge = publicChallenges.find(c => c.invite_code === joinCode);
        if (!challenge) {
          toast({
            title: "Invalid Code",
            description: "Challenge not found with that code",
            variant: "destructive",
          });
          return;
        }
        challengeId = challenge.id;
      }

      const success = await handleJoinChallenge(challengeId);
      if (success) {
        toast({
          title: "Joined! 🎉",
          description: "You've successfully joined the challenge",
        });
        setJoinCode('');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const coachMessages = [
    "💪 Ready to crush your fitness goals today? Let's make it happen!",
    "🔥 I see you eyeing those challenges! Time to turn that motivation into ACTION!",
    "⚡ Your body is capable of amazing things. Show it what you're made of!",
    "🚀 Champions don't wait for motivation - they CREATE it. Let's GO!",
    "🎯 Every rep, every step, every challenge brings you closer to your best self!",
  ];
  
  const coachMessage = coachMessages[Math.floor(Math.random() * coachMessages.length)];

  return (
    <div className="space-y-6 p-1">
      {/* AI Coach Message */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
              >
                <Sparkles className="h-6 w-6 text-primary mt-0.5" />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">AI Fitness Coach</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Live</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {coachMessage}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Join by Code */}
      {showJoinByCode && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" />
              Join by Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter challenge ID or invite code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
              />
              <Button 
                onClick={handleJoinByCode}
                disabled={isJoining}
                className="whitespace-nowrap"
              >
                {isJoining ? 'Joining...' : 'Join'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Challenges */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Active Challenges</h2>
          <span className="text-sm text-muted-foreground">Join the community!</span>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">Error: {error.message}</p>
          </div>
        ) : publicChallenges.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No public challenges yet. Create one!</p>
            {onCreate && (
              <Button onClick={onCreate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Challenge
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicChallenges.map((challenge, index) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <PublicChallengeCard
                  challenge={challenge}
                  participation={null}
                  onJoin={handleJoinChallenge}
                  onUpdateProgress={async () => false}
                  onLeave={async () => false}
                />
                
                {/* Enhanced card overlay with copy button */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                    onClick={() => copyToClipboard(challenge.id, 'Challenge ID')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Challenge details overlay */}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {challenge.participant_count || 0}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {challenge.visibility}
                  </Badge>
                  {challenge.duration_days && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {challenge.duration_days}d
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Info - temporary */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
        Debug: items: {publicChallenges.length}, error: {error?.message || "none"}, user: {uid || "anon"}
      </div>
    </div>
  );
};