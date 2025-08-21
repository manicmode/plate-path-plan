import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Instagram, Twitter, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { QrPoster } from "./QrPoster";

interface ShareKitProps {
  profileUrl?: string;
  refCode?: string;
  challengeId?: string;
  productId?: string;
  className?: string;
  sticky?: boolean;
}

export const ShareKit = ({ 
  profileUrl = window.location.origin + "/profile",
  refCode,
  challengeId,
  productId,
  className = "",
  sticky = false 
}: ShareKitProps) => {
  const [hasCopiedBefore, setHasCopiedBefore] = useState(() => {
    return localStorage.getItem('has_copied_share_link') === 'true';
  });
  const [showQrPoster, setShowQrPoster] = useState(false);

  // Build share URL with UTM params
  const buildShareUrl = (platform?: string) => {
    const url = new URL(profileUrl);
    if (refCode) url.searchParams.set('ref', refCode);
    if (challengeId) url.searchParams.set('challenge', challengeId);
    if (productId) url.searchParams.set('product', productId);
    if (platform) {
      url.searchParams.set('utm_source', platform);
      url.searchParams.set('utm_campaign', 'influencer_dashboard');
    }
    return url.toString();
  };

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(16);
      } catch (e) {
        // Silently ignore haptic errors
      }
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.8 }
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = buildShareUrl();
    const success = await copyToClipboard(shareUrl);
    
    if (success) {
      triggerHaptic();
      toast({
        title: "Link copied!",
        description: "Your share link has been copied to clipboard.",
      });
      
      // First time copying triggers confetti
      if (!hasCopiedBefore) {
        triggerConfetti();
        setHasCopiedBefore(true);
        localStorage.setItem('has_copied_share_link', 'true');
      }
    }
  };

  const handleShareTwitter = () => {
    const shareUrl = buildShareUrl('twitter');
    const texts = [
      `I just opened spots in my new challenge 🚀 join me in the app → ${shareUrl} (limited slots!)`,
      `Need accountability? I'll coach you daily inside my challenge. Tips, check-ins, and prizes. Start today → ${shareUrl}`,
      `First 50 get a bonus plan + shoutout 🎁 join here → ${shareUrl} — let's go!`
    ];
    
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(randomText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    
    triggerHaptic();
    toast({
      title: "Opening Twitter",
      description: "Share your challenge with your followers!",
    });
  };

  const handleCopyIGCaption = async () => {
    const shareUrl = buildShareUrl('instagram');
    const captions = [
      `🌟 I just opened spots in my new challenge!

Join me for daily coaching, tips, and prizes 💪

First 50 get a bonus plan + shoutout 🎁

Link in bio ⬆️

#fitness #challenge #motivation #transformation #wellness #community`,
      
      `💪 Need accountability? I've got you covered!

Daily check-ins ✅
Expert tips ✅ 
Community support ✅
Real results ✅

Join my challenge now (link in bio)

#fitness #accountability #results #challenge`,
      
      `🚀 Limited spots available!

Join my exclusive challenge and let's transform together

What you get:
• Daily coaching
• Meal plans
• Workout routines  
• Community support

Link in bio → ${shareUrl}

#fitnesschallenge #transformation #motivation`
    ];

    const randomCaption = captions[Math.floor(Math.random() * captions.length)];
    const success = await copyToClipboard(randomCaption);
    
    if (success) {
      triggerHaptic();
      toast({
        title: "Instagram caption copied!",
        description: "Ready to paste in your Instagram post.",
      });
    }
  };

  const baseClasses = "flex gap-2 rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur p-2";
  const containerClasses = sticky 
    ? `fixed inset-x-3 bottom-3 z-40 ${baseClasses} pb-[max(env(safe-area-inset-bottom),0px)] mb-1 shadow-lg sm:hidden`
    : `${baseClasses} ${className}`;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={containerClasses}
      >
        <Button
          onClick={handleCopyLink}
          size={sticky ? "default" : "sm"}
          className="flex-1 sm:flex-initial gap-2"
          aria-label="Copy share link"
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">Copy Link</span>
          <span className="sm:hidden">Copy</span>
        </Button>
        
        <Button
          onClick={handleShareTwitter}
          variant="secondary"
          size={sticky ? "default" : "sm"}
          className="flex-1 sm:flex-initial gap-2"
          aria-label="Share on Twitter/X"
        >
          <Twitter className="h-4 w-4" />
          <span className="hidden sm:inline">Share on X</span>
          <span className="sm:hidden">X</span>
        </Button>
        
        <Button
          onClick={handleCopyIGCaption}
          variant="outline"
          size={sticky ? "default" : "sm"}
          className="flex-1 sm:flex-initial gap-2"
          aria-label="Copy Instagram caption"
        >
          <Instagram className="h-4 w-4" />
          <span className="hidden sm:inline">Copy IG Caption</span>
          <span className="sm:hidden">IG</span>
        </Button>

        <Button
          onClick={() => setShowQrPoster(true)}
          variant="outline"
          size={sticky ? "default" : "sm"}
          className="flex-1 sm:flex-initial gap-2"
          aria-label="Download QR poster"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">QR Poster</span>
          <span className="sm:hidden">QR</span>
        </Button>
      </motion.div>

      {showQrPoster && (
        <QrPoster
          shareUrl={buildShareUrl('qr')}
          onClose={() => setShowQrPoster(false)}
          onDownload={() => {
            triggerHaptic();
            toast({
              title: "QR Poster downloaded!",
              description: "Share your branded QR code everywhere.",
            });
          }}
        />
      )}
    </>
  );
};