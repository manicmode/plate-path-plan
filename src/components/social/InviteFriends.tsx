import React, { useState } from 'react';
import { Share2, MessageCircle, Camera, Smartphone, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export const InviteFriends = () => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Generate invite link (replace with actual app URL when deployed)
  const inviteLink = `${window.location.origin}?invite=true`;
  const inviteMessage = `🌟 Join me on PlatePathPlan - the wellness app that makes healthy living fun! Track your nutrition, compete in challenges, and achieve your goals together. Download now: ${inviteLink}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link with your friends to invite them.",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    const encodedMessage = encodeURIComponent(inviteMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleSMSShare = () => {
    const encodedMessage = encodeURIComponent(inviteMessage);
    window.open(`sms:?body=${encodedMessage}`, '_blank');
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct text sharing, so we'll copy the message
    // and suggest they share it in their story or DM
    handleCopyLink();
    toast({
      title: "Instagram sharing",
      description: "Message copied! Paste it into your Instagram story or DM.",
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on PlatePathPlan!',
          text: inviteMessage,
          url: inviteLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/20">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
              🌟 Invite a Friend
            </h3>
            <p className="text-sm text-muted-foreground">
              Friends make progress fun. Invite one to join your journey!
            </p>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 h-12 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">WhatsApp</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleInstagramShare}
              className="flex items-center gap-2 h-12 bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-700"
            >
              <Camera className="h-4 w-4" />
              <span className="text-sm">Instagram</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleSMSShare}
              className="flex items-center gap-2 h-12 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              <Smartphone className="h-4 w-4" />
              <span className="text-sm">SMS</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleNativeShare}
              className="flex items-center gap-2 h-12 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-sm">More</span>
            </Button>
          </div>

          {/* Copy Link Button */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Or copy your invite link:</p>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </Button>
          </div>

          {/* Invite Preview */}
          <div className="bg-muted/50 rounded-lg p-3 text-left">
            <p className="text-xs text-muted-foreground mb-1">Preview:</p>
            <p className="text-xs">{inviteMessage.substring(0, 120)}...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};