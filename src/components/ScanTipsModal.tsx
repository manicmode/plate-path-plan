import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Target, Eye } from 'lucide-react';

interface ScanTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScanTipsModal({ isOpen, onClose }: ScanTipsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Perfect Body Scan Tips
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Posture Tips */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Perfect Posture
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p><strong>Stand tall:</strong> Keep your back straight, shoulders back and level</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p><strong>Relax your arms:</strong> Let them hang naturally at your sides</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p><strong>Level your hips:</strong> Distribute weight evenly on both feet</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p><strong>Look forward:</strong> Keep your chin parallel to the floor</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Camera Setup */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                Camera Position
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p><strong>Arm's length:</strong> Stand about 3-4 feet from your phone</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p><strong>Center yourself:</strong> Make sure you're in the middle of the frame</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p><strong>Full body visible:</strong> From head to toe should be in frame</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p><strong>Good lighting:</strong> Face a window or use bright room lighting</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Common Mistakes */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Avoid These Mistakes
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <p><strong>Slouching:</strong> Keep your shoulders back, not hunched forward</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <p><strong>Raised arms:</strong> Don't lift your arms or put hands on hips</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <p><strong>Weight on one leg:</strong> Stand evenly on both feet</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <p><strong>Looking down:</strong> Keep your head up and look straight ahead</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scan Type Specific Tips */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Scan-Specific Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-blue-600 mb-2">📱 Front Scan</h4>
                  <p>Face the camera directly, arms at sides, feet shoulder-width apart</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-600 mb-2">↔️ Side Scan</h4>
                  <p>Turn 90° to show your profile, keep arms along your body</p>
                </div>
                <div>
                  <h4 className="font-medium text-purple-600 mb-2">🔄 Back Scan</h4>
                  <p>Face away from camera, keep shoulders level and arms relaxed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={onClose} className="flex-1">
              Got it! Let's scan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}