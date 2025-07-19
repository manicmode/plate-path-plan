import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TeamChallengeCreator } from '@/components/challenge/TeamChallengeCreator';
import { TeamLeaderboard } from '@/components/challenge/TeamLeaderboard';
import { ChallengeSelectionModal } from '@/components/challenge/ChallengeSelectionModal';
import { Users, Crown, Target, Zap, Trophy, Plus } from 'lucide-react';

export const TeamChallengesDemo: React.FC = () => {
  const [showTeamCreator, setShowTeamCreator] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Mock data for demonstration
  const mockChallengeId = "demo-team-challenge";
  const mockUserTeamId = "demo-team-1";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Team Challenges
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Create team challenges where friends collaborate or compete together!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature Cards */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Friend-Based Teams</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Manually invite friends to join your team
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  Custom Teams
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="h-8 w-8 text-orange-600" />
                  <div>
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100">Auto-Team Assignment</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      AI groups users by similar skill levels
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                  Smart Grouping
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Trophy className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Team Leaderboards</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Track team progress and rankings
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                  Competitive
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="h-8 w-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">Collaborative Goals</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Work together towards shared objectives
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                  Teamwork
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
            <Button
              onClick={() => setShowTeamCreator(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Team Challenge
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowChallengeModal(true)}
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Individual vs Team
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowLeaderboard(true)}
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              View Team Rankings
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg border border-primary/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              How Team Challenges Work
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Choose between manual friend selection or auto-grouping by skill level</li>
              <li>• Teams compete in collaborative challenges with shared progress tracking</li>
              <li>• Real-time leaderboards show team rankings and encouraging gap messages</li>
              <li>• Auto-team feature balances teams based on user performance data</li>
              <li>• Team challenges support all challenge types: nutrition, fitness, wellness</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Team Challenge Creator Modal */}
      <TeamChallengeCreator
        isOpen={showTeamCreator}
        onClose={() => setShowTeamCreator(false)}
      />

      {/* Challenge Selection Modal (showing team mode) */}
      <ChallengeSelectionModal
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        friendId="demo-friend"
        friendName="Demo Friend"
      />

      {/* Team Leaderboard (in a modal-like overlay) */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  Team Leaderboard Demo
                </h2>
                <Button variant="outline" onClick={() => setShowLeaderboard(false)}>
                  Close
                </Button>
              </div>
              <TeamLeaderboard
                challengeId={mockChallengeId}
                userTeamId={mockUserTeamId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};