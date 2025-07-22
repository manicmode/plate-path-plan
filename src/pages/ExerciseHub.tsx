import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Clock, Flame, Timer } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';

const ExerciseHub = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('workout-log');
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState(false);
  
  // Use the optimized scroll-to-top hook
  useScrollToTop();

  // Mock workout data for today
  const mockWorkouts = [
    {
      id: 1,
      name: "Push Day",
      emoji: "💪",
      duration: "45 min",
      calories: "320 kcal",
      startTime: "09:30",
      endTime: "10:15",
      gradient: "from-orange-300 to-red-500"
    },
    {
      id: 2,
      name: "Morning Run",
      emoji: "🏃",
      duration: "30 min",
      calories: "280 kcal",
      startTime: "07:00",
      endTime: "07:30",
      gradient: "from-blue-300 to-cyan-500"
    },
    {
      id: 3,
      name: "Yoga Flow",
      emoji: "🧘",
      duration: "25 min",
      calories: "150 kcal",
      startTime: "18:30",
      endTime: "18:55",
      gradient: "from-purple-300 to-pink-500"
    }
  ];

  const tabs = [
    {
      id: 'workout-log',
      title: 'Workout Log',
      emoji: '📘',
      content: 'Here you will see your full workout log and stats.'
    },
    {
      id: 'my-routines',
      title: 'My Routines', 
      emoji: '🧠',
      content: 'This is where your custom workout routines will live.'
    },
    {
      id: 'progress-reports',
      title: 'Progress & Reports',
      emoji: '📈',
      content: 'Track your weekly and monthly workout stats here.'
    },
    {
      id: 'pre-made-plans',
      title: 'Pre-Made Plans',
      emoji: '🧩',
      content: 'Explore workout plans made for every fitness level.'
    }
  ];

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Header with Back Button */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          className="mr-3 p-2 hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Exercise Hub</h1>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-4 gap-3'} mb-4`}>
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? "default" : "outline"}
              className={`
                relative h-16 p-3 rounded-xl transition-all duration-300 ease-out
                flex flex-col items-center justify-center space-y-1
                ${activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                  : 'bg-card hover:bg-accent hover:text-accent-foreground border-border'
                }
              `}
            >
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} transition-transform duration-300 ${
                activeTab === tab.id ? 'scale-110' : ''
              }`}>
                {tab.emoji}
              </div>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-center leading-tight`}>
                {tab.title}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`transition-all duration-500 ease-out ${
              activeTab === tab.id 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4 absolute pointer-events-none'
            }`}
          >
            {activeTab === tab.id && (
              <>
                {/* Workout Log Tab - Enhanced */}
                {tab.id === 'workout-log' ? (
                  <div className="space-y-6">
                    {/* Add Workout Button */}
                    <Card className="w-full shadow-lg border-border bg-card">
                      <CardContent className="p-6">
                        <Button
                          onClick={() => setIsAddWorkoutModalOpen(true)}
                          className="w-full h-14 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Plus className="mr-2 h-5 w-5" />
                          Add Workout
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Today's Workouts Header */}
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Today's Workouts</h2>
                      <p className="text-muted-foreground">
                        {new Date().toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>

                    {/* Workout Entries */}
                    <div className="space-y-4">
                      {mockWorkouts.map((workout) => (
                        <Card key={workout.id} className="w-full shadow-lg border-border bg-card hover:shadow-xl transition-all duration-300">
                          <CardContent className="p-0">
                            <div className={`bg-gradient-to-r ${workout.gradient} p-1 rounded-t-lg`} />
                            <div className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="text-3xl">{workout.emoji}</div>
                                  <div>
                                    <h3 className="text-xl font-bold text-foreground">{workout.name}</h3>
                                    {workout.startTime && workout.endTime && (
                                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                                        <Timer className="mr-1 h-3 w-3" />
                                        {workout.startTime} - {workout.endTime}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-3">
                                  <Clock className="h-4 w-4 text-blue-500" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Duration</p>
                                    <p className="font-semibold text-foreground">{workout.duration}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-3">
                                  <Flame className="h-4 w-4 text-orange-500" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Calories</p>
                                    <p className="font-semibold text-foreground">{workout.calories}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Empty State (if no workouts) */}
                    {mockWorkouts.length === 0 && (
                      <Card className="w-full shadow-lg border-border bg-card">
                        <CardContent className="p-8 text-center">
                          <div className="text-4xl mb-4">📘</div>
                          <h3 className="text-xl font-bold text-foreground mb-2">No workouts today</h3>
                          <p className="text-muted-foreground mb-6">Start tracking your fitness journey!</p>
                          <Button
                            onClick={() => setIsAddWorkoutModalOpen(true)}
                            className="bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-white"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Your First Workout
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  /* Other Tabs - Keep Original Design */
                  <Card className="w-full shadow-lg border-border bg-card">
                    <CardContent className="p-8">
                      <div className="text-center space-y-6">
                        {/* Large Emoji */}
                        <div className="text-6xl mb-4">
                          {tab.emoji}
                        </div>
                        
                        {/* Title */}
                        <h2 className="text-2xl font-bold text-foreground mb-4">
                          {tab.title}
                        </h2>
                        
                        {/* Placeholder Content */}
                        <div className="max-w-md mx-auto">
                          <p className="text-muted-foreground text-lg leading-relaxed">
                            {tab.content}
                          </p>
                        </div>

                        {/* Coming Soon Badge */}
                        <div className="mt-8">
                          <div className="inline-flex items-center px-4 py-2 rounded-full bg-muted text-muted-foreground border border-border">
                            <span className="text-sm font-medium">Coming Soon</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add Workout Modal */}
      <Dialog open={isAddWorkoutModalOpen} onOpenChange={setIsAddWorkoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Add Workout</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🏋️‍♂️</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Workout Entry Modal</h3>
            <p className="text-muted-foreground">Coming soon!</p>
            <Button 
              onClick={() => setIsAddWorkoutModalOpen(false)}
              className="mt-6 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExerciseHub;