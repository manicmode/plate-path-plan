import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Heart, Leaf, Moon, Flame } from 'lucide-react';

export const RecoveryChallengeBanner: React.FC = () => {
  const recoveryTypes = [
    { icon: '🧘‍♀️', label: 'Meditation', description: 'Mindfulness & Focus', color: 'from-purple-400 to-purple-600' },
    { icon: '🌬️', label: 'Breathing', description: 'Breathwork & Calm', color: 'from-blue-400 to-cyan-500' },
    { icon: '🧎‍♀️', label: 'Yoga', description: 'Flexibility & Balance', color: 'from-green-400 to-teal-500' },
    { icon: '😴', label: 'Sleep', description: 'Rest & Recovery', color: 'from-indigo-400 to-purple-500' },
    { icon: '🔥', label: 'Thermotherapy', description: 'Heat & Cold Therapy', color: 'from-orange-400 to-red-500' },
  ];

  return (
    <Card className="border-2 border-teal-200/50 dark:border-teal-700/50 bg-gradient-to-br from-teal-50/80 to-purple-50/80 dark:from-teal-950/20 dark:to-purple-950/20 shadow-lg mb-6">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="text-3xl animate-pulse">🧘‍♂️</div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
              Recovery Challenges
            </h3>
            <div className="text-3xl animate-pulse">🧘‍♀️</div>
          </div>
          <p className="text-muted-foreground text-sm">
            Join thousands of users building mindfulness habits through structured recovery challenges
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {recoveryTypes.map((type) => (
            <div key={type.label} className="text-center">
              <div className={`w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-r ${type.color} flex items-center justify-center text-white text-lg shadow-lg`}>
                {type.icon}
              </div>
              <div className="text-xs font-medium">{type.label}</div>
              <div className="text-xs text-muted-foreground">{type.description}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
              🌟 12 Active Challenges
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              👥 300+ Participants
            </Badge>
          </div>
          <Button 
            size="sm" 
            onClick={() => window.location.href = '/exercise-hub?tab=recovery'}
            className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white shadow-lg"
          >
            🧘‍♂️ Start Your Recovery Journey
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};