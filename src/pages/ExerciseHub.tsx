import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Clock, Flame, Timer, Calendar } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';

const ExerciseHub = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('workout-log');
  const [isAddWorkoutModalOpen, setIsAddWorkoutModalOpen] = useState(false);
  const [isCreateRoutineModalOpen, setIsCreateRoutineModalOpen] = useState(false);
  const [isExploreMoreModalOpen, setIsExploreMoreModalOpen] = useState(false);
  
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

  // Mock routine data
  const mockRoutines = [
    {
      id: 1,
      title: "Full Body Blast",
      emoji: "💥",
      description: "3-day strength circuit",
      gradient: "from-red-400 to-orange-500"
    },
    {
      id: 2,
      title: "Cardio Power",
      emoji: "🏃",
      description: "High-intensity cardio",
      gradient: "from-blue-400 to-cyan-500"
    },
    {
      id: 3,
      title: "Zen & Stretch",
      emoji: "🧘",
      description: "Flexibility & mindfulness",
      gradient: "from-purple-400 to-pink-500"
    },
    {
      id: 4,
      title: "Core Crusher",
      emoji: "🔥",
      description: "Abs & core strengthening",
      gradient: "from-yellow-400 to-red-500"
    }
  ];

  // Mock progress data
  const mockWeeklyData = [
    { day: 'Mon', workouts: 2, height: '60%' },
    { day: 'Tue', workouts: 1, height: '30%' },
    { day: 'Wed', workouts: 3, height: '90%' },
    { day: 'Thu', workouts: 0, height: '0%' },
    { day: 'Fri', workouts: 2, height: '60%' },
    { day: 'Sat', workouts: 1, height: '30%' },
    { day: 'Sun', workouts: 2, height: '60%' }
  ];

  const mockStats = [
    {
      icon: Clock,
      title: "Avg. Workout Duration",
      value: "42 min",
      gradient: "from-blue-400 to-cyan-500",
      iconColor: "text-blue-500"
    },
    {
      icon: Flame,
      title: "Avg. Calories Burned",
      value: "310 kcal",
      gradient: "from-orange-400 to-red-500",
      iconColor: "text-orange-500"
    },
    {
      icon: Calendar,
      title: "Workout Days This Month",
      value: "16 days",
      gradient: "from-green-400 to-emerald-500",
      iconColor: "text-green-500"
    }
  ];

  // Mock pre-made plans data
  const mockPlans = [
    {
      id: 1,
      name: "Strength Builder",
      emoji: "🏋️‍♂️",
      description: "4-week heavy lifting program",
      gradient: "from-red-400 to-orange-600"
    },
    {
      id: 2,
      name: "Dance Fit",
      emoji: "💃",
      description: "Fun cardio through dance routines",
      gradient: "from-pink-400 to-purple-600"
    },
    {
      id: 3,
      name: "Mind & Body Flow",
      emoji: "🧘",
      description: "Gentle yoga & breathwork for stress relief",
      gradient: "from-green-400 to-teal-600"
    },
    {
      id: 4,
      name: "Endurance Challenge",
      emoji: "🏔",
      description: "Build stamina with uphill cardio",
      gradient: "from-blue-400 to-indigo-600"
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
                ) : tab.id === 'my-routines' ? (
                  /* My Routines Tab - Enhanced */
                  <div className="space-y-6">
                    {/* Create New Routine Button */}
                    <Card className="w-full shadow-lg border-border bg-card">
                      <CardContent className="p-6">
                        <Button
                          onClick={() => setIsCreateRoutineModalOpen(true)}
                          className="w-full h-14 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Plus className="mr-2 h-5 w-5" />
                          Create New Routine
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Your Saved Routines Header */}
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Your Saved Routines</h2>
                      <p className="text-muted-foreground">Custom workout plans tailored for you</p>
                    </div>

                    {/* Routines Grid - 2x2 */}
                    <div className="grid grid-cols-2 gap-4">
                      {mockRoutines.map((routine) => (
                        <Card key={routine.id} className="w-full shadow-lg border-border bg-card hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                          <CardContent className="p-0">
                            <div className={`bg-gradient-to-r ${routine.gradient} p-1 rounded-t-lg`} />
                            <div className="p-4">
                              <div className="text-center space-y-3">
                                {/* Emoji */}
                                <div className="text-4xl">{routine.emoji}</div>
                                
                                {/* Title */}
                                <h3 className="text-lg font-bold text-foreground leading-tight">{routine.title}</h3>
                                
                                {/* Description */}
                                <p className="text-sm text-muted-foreground">{routine.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Empty State (if no routines) */}
                    {mockRoutines.length === 0 && (
                      <Card className="w-full shadow-lg border-border bg-card">
                        <CardContent className="p-8 text-center">
                          <div className="text-4xl mb-4">🧠</div>
                          <h3 className="text-xl font-bold text-foreground mb-2">No routines yet</h3>
                          <p className="text-muted-foreground mb-6">Create your first custom workout routine!</p>
                          <Button
                            onClick={() => setIsCreateRoutineModalOpen(true)}
                            className="bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-white"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Routine
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : tab.id === 'progress-reports' ? (
                  /* Progress & Reports Tab - Enhanced */
                  <div className="space-y-6">
                    {/* Progress Overview Header */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Your Progress Overview</h2>
                      <p className="text-muted-foreground">Track your training consistency and performance over time</p>
                    </div>

                    {/* Weekly Workout Frequency Chart */}
                    <Card className="w-full shadow-lg border-border bg-card">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-foreground mb-4">Weekly Workout Frequency</h3>
                        
                        {/* Mock Bar Chart */}
                        <div className="flex items-end justify-between h-32 mb-4">
                          {mockWeeklyData.map((day, index) => (
                            <div key={day.day} className="flex flex-col items-center space-y-2 flex-1">
                              <div className="w-full flex justify-center">
                                <div 
                                  className={`w-8 bg-gradient-to-t from-emerald-400 to-cyan-500 rounded-t-md transition-all duration-500 ease-out`}
                                  style={{ height: day.height }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground font-medium">{day.day}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Chart Legend */}
                        <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded"></div>
                            <span>Workouts completed</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stats Summary Section */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-foreground text-center">Performance Stats</h3>
                      
                      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-6'}`}>
                        {mockStats.map((stat, index) => {
                          const IconComponent = stat.icon;
                          return (
                            <Card key={index} className="shadow-lg border-border bg-card hover:shadow-xl transition-all duration-300">
                              <CardContent className="p-0">
                                <div className={`bg-gradient-to-r ${stat.gradient} p-1 rounded-t-lg`} />
                                <div className="p-6 text-center">
                                  <div className="flex justify-center mb-3">
                                    <IconComponent className={`h-8 w-8 ${stat.iconColor}`} />
                                  </div>
                                  <h4 className="text-sm font-medium text-muted-foreground mb-2">{stat.title}</h4>
                                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {/* Additional Progress Insights */}
                    <Card className="w-full shadow-lg border-border bg-card">
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl mb-4">📈</div>
                        <h3 className="text-lg font-bold text-foreground mb-2">Progress Insights</h3>
                        <p className="text-muted-foreground text-sm">
                          You're doing great! Keep up the consistency to reach your fitness goals.
                        </p>
                        <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-muted text-muted-foreground border border-border">
                          <span className="text-sm font-medium">Detailed analytics coming soon</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : tab.id === 'pre-made-plans' ? (
                  /* Pre-Made Plans Tab - Enhanced */
                  <div className="space-y-6">
                    {/* Curated Plans Header */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Curated Workout Plans</h2>
                      <p className="text-muted-foreground">Choose a plan and start training with confidence</p>
                    </div>

                    {/* Pre-Made Plans Grid - 2x2 */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {mockPlans.map((plan) => (
                        <Card key={plan.id} className="w-full shadow-lg border-border bg-card hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                          <CardContent className="p-0">
                            <div className={`bg-gradient-to-br ${plan.gradient} p-6 rounded-t-lg`}>
                              <div className="text-center space-y-3 text-white">
                                {/* Emoji */}
                                <div className="text-4xl filter drop-shadow-lg">{plan.emoji}</div>
                                
                                {/* Plan Name */}
                                <h3 className="text-lg font-bold leading-tight drop-shadow-md">{plan.name}</h3>
                              </div>
                            </div>
                            <div className="p-4 bg-card">
                              {/* Description */}
                              <p className="text-sm text-muted-foreground text-center leading-relaxed">{plan.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Explore More Plans Button */}
                    <Card className="w-full shadow-lg border-border bg-card">
                      <CardContent className="p-6">
                        <Button
                          onClick={() => setIsExploreMoreModalOpen(true)}
                          className="w-full h-14 bg-gradient-to-r from-purple-400 to-pink-600 hover:from-purple-500 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Explore More Plans
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Additional Info Card */}
                    <Card className="w-full shadow-lg border-border bg-card">
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl mb-4">🧩</div>
                        <h3 className="text-lg font-bold text-foreground mb-2">Personalized Recommendations</h3>
                        <p className="text-muted-foreground text-sm">
                          Plans are tailored to different fitness levels and goals. Start where you feel comfortable!
                        </p>
                      </CardContent>
                    </Card>
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

      {/* Explore More Plans Modal */}
      <Dialog open={isExploreMoreModalOpen} onOpenChange={setIsExploreMoreModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Explore More Plans</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🧩</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">More Workout Plans</h3>
            <p className="text-muted-foreground">Coming soon!</p>
            <Button 
              onClick={() => setIsExploreMoreModalOpen(false)}
              className="mt-6 bg-gradient-to-r from-purple-400 to-pink-600 hover:from-purple-500 hover:to-pink-700 text-white"
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