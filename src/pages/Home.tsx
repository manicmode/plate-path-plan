import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, CheckCircle2, ChevronRight, Dumbbell, Flame, ListChecks, LucideIcon, Timer, User2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DailyTarget {
  id: number;
  title: string;
  icon: LucideIcon;
  current: number;
  target: number;
  unit: string;
  color: string;
}

const Home = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [dailyTargets, setDailyTargets] = useState<DailyTarget[]>([]);
	const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setDailyTargets([
        { id: 1, title: 'Steps', icon: User2, current: 3200, target: 10000, unit: 'steps', color: 'blue' },
        { id: 2, title: 'Workouts', icon: Dumbbell, current: 1, target: 1, unit: 'workout', color: 'orange' },
        { id: 3, title: 'Calories Burned', icon: Flame, current: 450, target: 600, unit: 'kcal', color: 'red' },
        { id: 4, title: 'Active Time', icon: Timer, current: 25, target: 30, unit: 'min', color: 'green' },
      ]);
			setIsLoading(false);
    }, 500);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/sign-in');
      toast({
        title: "Signed out successfully.",
      })
    } catch (error) {
      toast({
        title: "Something went wrong.",
        description: "Could not sign out. Please try again.",
        variant: "destructive",
      })
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good Morning</h1>
          <p className="text-muted-foreground">Here's your daily summary</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                Signing out will end your current session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Daily Targets */}
      <ScrollArea className="mb-6">
        <div className="flex gap-4 py-2">
          {isLoading ? (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="w-[280px] p-4 border-border shadow-sm">
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-8 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/4" />
                </Card>
              ))}
            </>
          ) : (
            <>
              {dailyTargets.map((target) => (
                <Card key={target.id} className="w-[280px] p-4 border-border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full bg-${target.color}-500/20 flex items-center justify-center`}>
                      <target.icon className={`w-3 h-3 text-${target.color}-500`} />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{target.title}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{target.current} <span className="text-sm font-medium text-muted-foreground">{target.unit}</span></div>
                  <Progress value={(target.current / target.target) * 100} className="h-2 mt-4" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>{Math.round((target.current / target.target) * 100)}%</span>
                    <span>{target.target} {target.unit}</span>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-card hover:bg-accent/5 transition-colors border-border shadow-sm">
          <CardContent className="p-4">
            <button
              onClick={() => navigate('/exercise-hub', { state: { from: '/home' } })}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="font-medium text-foreground">Exercise Hub</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Track workouts & routines</p>
            </button>
          </CardContent>
        </Card>

        <Card className="bg-card hover:bg-accent/5 transition-colors border-border shadow-sm">
          <CardContent className="p-4">
            <button
              onClick={() => navigate('/meal-planner')}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <ListChecks className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-medium text-foreground">Meal Planner</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Plan your daily meals</p>
            </button>
          </CardContent>
        </Card>

        <Card className="bg-card hover:bg-accent/5 transition-colors border-border shadow-sm">
          <CardContent className="p-4">
            <button
              onClick={() => navigate('/progress-tracker')}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-medium text-foreground">Progress Tracker</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Monitor your fitness journey</p>
            </button>
          </CardContent>
        </Card>

        <Card className="bg-card hover:bg-accent/5 transition-colors border-border shadow-sm">
          <CardContent className="p-4">
            <button
              onClick={() => navigate('/calendar')}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="font-medium text-foreground">Calendar</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Schedule your activities</p>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Recent Activity</h2>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">You</span>
              </div>
              <span className="text-sm text-muted-foreground">Just now</span>
            </div>
            <p className="text-sm text-muted-foreground">Completed 30 minutes of cardio</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
