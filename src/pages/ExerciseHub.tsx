import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';

const ExerciseHub = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('workout-log');
  
  // Use the optimized scroll-to-top hook
  useScrollToTop();

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
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExerciseHub;