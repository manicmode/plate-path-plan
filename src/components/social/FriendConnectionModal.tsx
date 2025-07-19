import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChallengeSelectionModal } from '@/components/challenge/ChallengeSelectionModal';
import { Trophy, Users } from 'lucide-react';

interface FriendConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  friendId: string;
}

export const FriendConnectionModal: React.FC<FriendConnectionModalProps> = ({
  isOpen,
  onClose,
  friendName,
  friendId
}) => {
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Users className="h-6 w-6 text-primary" />
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  You and {friendName} are now friends!
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Celebration Message */}
            <div className="text-center bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-4">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-lg font-semibold text-primary">
                Perfect accountability partners!
              </p>
              <p className="text-sm text-muted-foreground">
                Start a challenge together and keep each other motivated
              </p>
            </div>

            <Separator className="my-6" />

            {/* Challenge Together Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-center">🔥 Ready to Challenge Each Other?</h3>
              <p className="text-sm text-muted-foreground text-center">
                Start a challenge together to stay motivated and achieve your goals!
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => setShowChallengeModal(true)}
                  className="w-full"
                  size="lg"
                >
                  🎯 Challenge Together
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChallengeModal(true)}
                    className="text-xs"
                  >
                    💧 7-Day Water Boost
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChallengeModal(true)}
                    className="text-xs"
                  >
                    🥗 Clean Eating Week
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <Button onClick={onClose} variant="outline" className="w-full">
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Selection Modal */}
      <ChallengeSelectionModal
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        friendId={friendId}
        friendName={friendName}
      />
    </>
  );
};