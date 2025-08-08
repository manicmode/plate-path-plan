import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sparkles } from 'lucide-react';
import { DailyMoodModal } from './DailyMoodModal';

interface DailyCheckinButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DailyCheckinButton: React.FC<DailyCheckinButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const [showModal, setShowModal] = useState(false);

  const buttonStyles = {
    primary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
  };

  const sizeStyles = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg'
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className={`${buttonStyles[variant]} ${sizeStyles[size]} ${className} flex items-center space-x-2 rounded-2xl`}
      >
        <Moon className="h-4 w-4" />
        <span>Daily Check-In</span>
        <Sparkles className="h-3 w-3 opacity-70" />
      </Button>

      <DailyMoodModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};