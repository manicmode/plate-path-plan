import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useHeroSubtext } from '@/hooks/useHeroSubtext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { flag } from '@/lib/flags';

export default function DebugHeroSubtext() {
  const { user } = useAuth();
  const { currentDay } = useNutrition();
  const { heroMessage } = useHeroSubtext();
  const [last7Messages, setLast7Messages] = useState<string[]>([]);
  const [currentContext, setCurrentContext] = useState<any>(null);

  // Load freshness data
  useEffect(() => {
    const stored = localStorage.getItem('hero_subtext_last7');
    if (stored) {
      try {
        setLast7Messages(JSON.parse(stored));
      } catch {
        setLast7Messages([]);
      }
    }
  }, [heroMessage]);

  // Get current context data
  useEffect(() => {
    const now = new Date();
    const foods = currentDay?.foods || [];
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay();
    const currentMonth = now.getMonth() + 1;
    
    let timeOfDay: string;
    if (currentHour >= 6 && currentHour < 12) timeOfDay = 'morning';
    else if (currentHour >= 12 && currentHour < 18) timeOfDay = 'afternoon';
    else if (currentHour >= 18 && currentHour < 23) timeOfDay = 'evening';
    else timeOfDay = 'night';

    let season: string;
    if (currentMonth >= 6 && currentMonth <= 8) season = 'summer';
    else if (currentMonth >= 12 || currentMonth <= 2) season = 'winter';
    else if (currentMonth >= 9 && currentMonth <= 11) season = 'fall';
    else season = 'spring';

    const lastLogTime = foods.length > 0 ? new Date(foods[foods.length - 1].timestamp) : null;
    const hoursInactive = lastLogTime ? 
      (now.getTime() - lastLogTime.getTime()) / (1000 * 60 * 60) : 48;

    const currentStreak = Math.min(foods.length, 30);
    const firstName = user?.user_metadata?.first_name || 
                     user?.user_metadata?.full_name?.split(' ')[0] || 
                     '';

    setCurrentContext({
      timeOfDay,
      season,
      dayOfWeek,
      currentHour,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      firstName,
      currentStreak,
      hoursInactive: Math.round(hoursInactive * 10) / 10,
      foodCount: foods.length,
      isHoliday: (currentMonth === 12 && now.getDate() >= 20) || 
                 (currentMonth === 1 && now.getDate() <= 3) ||
                 (currentMonth === 11 && now.getDate() >= 20)
    });
  }, [user, currentDay]);

  const clearFreshness = () => {
    localStorage.removeItem('hero_subtext_last7');
    setLast7Messages([]);
    window.location.reload();
  };

  const simulateTimeOfDay = (time: 'morning' | 'afternoon' | 'evening' | 'night') => {
    // This would require modifying the hook to accept mock data
    // For now, just show what would happen
    console.log(`[Debug] Simulating ${time} time of day`);
  };

  const getMessageType = (message: string): string => {
    if (message.includes('maintenance') || message.includes('new feature')) return 'system';
    if (message.includes('morning') || message.includes('afternoon') || message.includes('evening') || 
        message.includes('weekend') || message.includes('Monday') || message.includes('holiday')) return 'timely';
    if (message.includes('streak') || message.includes(currentContext?.firstName) || 
        message.includes('plan')) return 'personalized';
    if (message === "Your intelligent wellness companion is ready ✨") return 'default';
    return 'motivational';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Hero Subtext Debug</h1>
          <p className="text-muted-foreground">
            Debug and test the dynamic hero subtext content engine
          </p>
        </div>

        {/* Current Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current Hero Message
              <Badge variant={flag('hero_subtext_dynamic') ? 'default' : 'secondary'}>
                {flag('hero_subtext_dynamic') ? 'Dynamic ON' : 'Static Mode'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-lg font-medium text-center">{heroMessage}</p>
                <div className="mt-2 text-center">
                  <Badge variant="outline">
                    {getMessageType(heroMessage)}
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Length: {heroMessage.length}/72 characters
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context Information */}
        {currentContext && (
          <Card>
            <CardHeader>
              <CardTitle>Current Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Time of Day:</strong> {currentContext.timeOfDay}
                </div>
                <div>
                  <strong>Season:</strong> {currentContext.season}
                </div>
                <div>
                  <strong>Day:</strong> {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentContext.dayOfWeek]}
                </div>
                <div>
                  <strong>Hour:</strong> {currentContext.currentHour}:00
                </div>
                <div>
                  <strong>Weekend:</strong> {currentContext.isWeekend ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Holiday:</strong> {currentContext.isHoliday ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>First Name:</strong> {currentContext.firstName || 'None'}
                </div>
                <div>
                  <strong>Streak:</strong> {currentContext.currentStreak}
                </div>
                <div>
                  <strong>Hours Inactive:</strong> {currentContext.hoursInactive}h
                </div>
                <div>
                  <strong>Food Logs Today:</strong> {currentContext.foodCount}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Freshness Guard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Freshness Guard (Last 7 Messages)
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearFreshness}
              >
                Clear History
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {last7Messages.length > 0 ? (
              <div className="space-y-2">
                {last7Messages.map((messageId, index) => (
                  <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                    <Badge variant="outline" className="mr-2">
                      #{index + 1}
                    </Badge>
                    {messageId}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No recent messages in history</p>
            )}
          </CardContent>
        </Card>

        {/* Feature Flag Control */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Flag Control</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">hero_subtext_dynamic</p>
                  <p className="text-sm text-muted-foreground">
                    Enable dynamic hero subtext messages
                  </p>
                </div>
                <Badge variant={flag('hero_subtext_dynamic') ? 'default' : 'secondary'}>
                  {flag('hero_subtext_dynamic') ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="p-3 bg-muted/30 rounded text-sm">
                <p><strong>To enable:</strong> Set localStorage flag:hero_subtext_dynamic = '1'</p>
                <p><strong>To disable:</strong> Set localStorage flag:hero_subtext_dynamic = '0'</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    localStorage.setItem('flag:hero_subtext_dynamic', '1');
                    window.location.reload();
                  }}
                >
                  Enable Dynamic
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    localStorage.setItem('flag:hero_subtext_dynamic', '0');
                    window.location.reload();
                  }}
                >
                  Enable Static
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Types */}
        <Card>
          <CardHeader>
            <CardTitle>Message Priority Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">1. System</Badge>
                <span className="text-sm">Maintenance, new features, alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">2. Timely</Badge>
                <span className="text-sm">Morning/afternoon/evening, weekends, holidays</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">3. Personalized</Badge>
                <span className="text-sm">Streaks, user name, recent activity, goals</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">4. Motivational</Badge>
                <span className="text-sm">General inspiration, seasonal themes</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">5. Default</Badge>
                <span className="text-sm">Fallback message</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}