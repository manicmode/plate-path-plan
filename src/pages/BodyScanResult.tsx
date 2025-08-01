import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Scale, CheckCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function BodyScanResult() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get scan data from navigation state or default values
  const scanData = location.state || {
    date: new Date(),
    weight: null
  };

  const handleViewResults = () => {
    navigate('/body-scan-results');
  };

  const handleBackToHub = () => {
    navigate('/exercise-hub');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Success Animation Container */}
        <div className="text-center space-y-8">
          {/* Success Icon */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <CheckCircle className="h-20 w-20 text-primary/30 mx-auto" />
            </div>
            <CheckCircle className="h-20 w-20 text-primary mx-auto relative z-10" />
          </div>

          {/* Main Message */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              🎉 Scan Complete!
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Thanks for completing your body scan! We've saved your results and will help you track your progress over time.
            </p>
          </div>

          {/* Scan Details Card */}
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-left">Scan Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Scan Date</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(scanData.date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              {scanData.weight && (
                <div className="flex items-center space-x-3">
                  <Scale className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium text-foreground">
                      {scanData.weight} lbs
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reminder Message */}
          <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
            <p className="text-sm text-muted-foreground">
              📅 <strong>Next Scan Reminder:</strong> Come back in 30 days for your next scan to track your progress!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleViewResults}
              className="w-full group"
            >
              View All Results
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button
              onClick={handleBackToHub}
              variant="outline"
              className="w-full"
            >
              Back to Exercise Hub
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}