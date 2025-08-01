import { Loader2, Camera, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export const BodyScanLoadingScreen = () => {
  const [showFallback, setShowFallback] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleManualNavigate = () => {
    console.log("🛠️ Manual fallback navigation triggered");
    navigate('/body-scan-result');
  };
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm">
      <div className="absolute inset-0 bg-background/80" />
      
      <div className="relative flex items-center justify-center min-h-screen">
        <div className="text-center space-y-8 px-6 max-w-md">
          {/* Animated Icon */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <Camera className="h-16 w-16 text-primary/30 mx-auto" />
            </div>
            <Camera className="h-16 w-16 text-primary mx-auto relative z-10" />
            <Sparkles className="h-8 w-8 text-secondary absolute -top-2 -right-2 animate-bounce" />
          </div>

          {/* Progress Indicator */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg font-semibold text-foreground">🧠 Analyzing your scan...</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full animate-pulse" style={{ width: "75%" }} />
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4">
            <p className="text-muted-foreground text-base">
              This may take a few seconds...
            </p>
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                🔔 You'll get a reminder in 30 days to check your progress!
              </p>
            </div>
          </div>

          {/* Animated dots */}
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>

          {/* Fallback Button */}
          {showFallback && (
            <div className="pt-4">
              <Button onClick={handleManualNavigate}>
                🚀 Continue to Results Manually
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};