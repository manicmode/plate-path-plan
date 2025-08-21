import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Instagram, Twitter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface ShareBarProps {
  profileUrl?: string;
  className?: string;
  sticky?: boolean;
}

export const ShareBar = ({ 
  profileUrl = window.location.origin + "/profile", 
  className = "",
  sticky = false 
}: ShareBarProps) => {
  const [hasCopiedBefore, setHasCopiedBefore] = useState(() => {
    return localStorage.getItem('has_copied_profile_link') === 'true';
  });

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
    const success = await copyToClipboard(profileUrl);
    
    if (success) {
      toast({
        title: "Link copied!",
        description: "Your profile link has been copied to clipboard.",
      });
      
      // First time copying triggers confetti
      if (!hasCopiedBefore) {
        triggerConfetti();
        setHasCopiedBefore(true);
        localStorage.setItem('has_copied_profile_link', 'true');
      }
    }
  };

  const handleShareTwitter = () => {
    const text = `Check out my fitness journey and join my challenges! 🏋️‍♀️💪`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
    
    toast({
      title: "Opening Twitter",
      description: "Share your profile with your followers!",
    });
  };

  const handleCopyIGCaption = async () => {
    const caption = `🌟 Join me on my fitness journey! 

Check out my latest challenges and let's crush our goals together 💪

Link in bio ⬆️

#fitness #challenge #motivation #transformation #wellness #community`;

    const success = await copyToClipboard(caption);
    
    if (success) {
      toast({
        title: "Instagram caption copied!",
        description: "Ready to paste in your Instagram post.",
      });
    }
  };

  const baseClasses = "flex gap-2 rounded-2xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur p-2";
  const containerClasses = sticky 
    ? `fixed inset-x-3 bottom-3 z-40 ${baseClasses} sm:hidden`
    : `${baseClasses} ${className}`;

  return (
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
      >
        <Instagram className="h-4 w-4" />
        <span className="hidden sm:inline">Copy IG Caption</span>
        <span className="sm:hidden">IG</span>
      </Button>
    </motion.div>
  );
};