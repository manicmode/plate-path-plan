import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Keyboard, Mic, RotateCcw } from 'lucide-react';

interface InconclusiveReportProps {
  message: string;
  onRetakePhoto: () => void;
  onManualEntry: () => void;
  onVoiceEntry: () => void;
}

export const InconclusiveReport: React.FC<InconclusiveReportProps> = ({
  message,
  onRetakePhoto,
  onManualEntry,
  onVoiceEntry
}) => {
  return (
    <div className="p-6 space-y-6">
      {/* Status Card */}
      <Card className="bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <Badge variant="secondary" className="text-sm font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              Inconclusive
            </Badge>
          </div>
          <CardTitle className="text-lg text-gray-700 dark:text-gray-300">
            Analysis Incomplete
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {message}
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={onRetakePhoto}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Retake Photo
        </Button>

        <Button
          onClick={onManualEntry}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg"
        >
          <Keyboard className="w-5 h-5 mr-2" />
          Manual Entry
        </Button>

        <Button
          onClick={onVoiceEntry}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 text-lg"
        >
          <Mic className="w-5 h-5 mr-2" />
          Voice Entry
        </Button>
      </div>
    </div>
  );
};