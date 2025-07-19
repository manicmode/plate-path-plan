import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  Heart, 
  Lightbulb, 
  MessageCircle, 
  Trophy, 
  Target,
  TrendingUp,
  Calendar,
  Zap,
  Award
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface FriendProfileViewProps {
  friend: any;
  onBack: () => void;
}

const mockProgressData = [
  { day: 'Mon', calories: 1850, protein: 120, hydration: 85 },
  { day: 'Tue', calories: 1920, protein: 115, hydration: 90 },
  { day: 'Wed', calories: 1780, protein: 125, hydration: 88 },
  { day: 'Thu', calories: 1950, protein: 130, hydration: 92 },
  { day: 'Fri', calories: 1820, protein: 118, hydration: 87 },
  { day: 'Sat', calories: 2100, protein: 140, hydration: 95 },
  { day: 'Sun', calories: 1890, protein: 122, hydration: 91 },
];

const mockGoalData = [
  { name: 'Completed', value: 75, color: '#10B981' },
  { name: 'Remaining', value: 25, color: '#F3F4F6' },
];

const mockChallenges = [
  { id: 1, name: '7-Day Hydration Challenge', status: 'active', progress: 85, participants: 12 },
  { id: 2, name: 'Protein Power Week', status: 'completed', progress: 100, participants: 8 },
  { id: 3, name: 'Mindful Eating', status: 'active', progress: 60, participants: 15 },
];

export const FriendProfileView = ({ friend, onBack }: FriendProfileViewProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-2xl">
              {friend.name?.charAt(0) || '👤'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{friend.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">💪 Muscle Gain</Badge>
              <Badge variant="outline" className="text-emerald-600">
                <Zap className="h-3 w-3 mr-1" />
                {friend.metadata?.chatCount || 0} day streak
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button className="flex-1" variant="default">
          <Heart className="h-4 w-4 mr-2" />
          👏 Send Praise
        </Button>
        <Button className="flex-1" variant="outline">
          <Lightbulb className="h-4 w-4 mr-2" />
          💡 Nudge
        </Button>
        <Button className="flex-1" variant="outline">
          <MessageCircle className="h-4 w-4 mr-2" />
          ✉️ Message
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-6">
          {/* Weekly Goal Completion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Weekly Goal Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-3xl font-bold text-primary">75%</div>
                  <div className="text-sm text-muted-foreground">Goals completed this week</div>
                </div>
                <div className="w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockGoalData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={40}
                        dataKey="value"
                      >
                        {mockGoalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">6/7</div>
                  <div className="text-xs text-muted-foreground">Days logged</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">18</div>
                  <div className="text-xs text-muted-foreground">Meals tracked</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">2.1L</div>
                  <div className="text-xs text-muted-foreground">Avg hydration</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Charts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockProgressData}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="calories" 
                      stroke="#8B5CF6" 
                      strokeWidth={3}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center mt-2">
                <Badge variant="outline">Calories Intake</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Current Challenges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Active Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockChallenges.map((challenge) => (
                  <div key={challenge.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{challenge.name}</h4>
                      <Badge 
                        variant={challenge.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {challenge.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${challenge.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{challenge.progress}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {challenge.participants} participants
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievement Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">🔥</div>
                  <div className="font-medium text-sm">Streak Master</div>
                  <div className="text-xs text-muted-foreground">7-day logging streak</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">💧</div>
                  <div className="font-medium text-sm">Hydration Hero</div>
                  <div className="text-xs text-muted-foreground">Daily water goals</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">🥗</div>
                  <div className="font-medium text-sm">Mindful Eater</div>
                  <div className="text-xs text-muted-foreground">Healthy meal choices</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">💪</div>
                  <div className="font-medium text-sm">Protein Pro</div>
                  <div className="text-xs text-muted-foreground">Protein target hits</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};