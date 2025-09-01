import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sound } from '@/lib/sound/soundManager';

interface ScanTileProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  enableSound?: boolean;
}

export function ScanTile({ 
  icon: Icon, 
  title, 
  subtitle, 
  onClick, 
  disabled = false,
  className,
  enableSound = false
}: ScanTileProps) {
  
  const handlePointerDown = () => {
    if (enableSound && !disabled) {
      Sound.ensureUnlocked();
    }
  };
  return (
    <button
      onClick={onClick}
      onPointerDown={handlePointerDown}
      disabled={disabled}
      className={cn(
        "group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-200",
        "bg-card/50 border border-border/50 hover:border-border",
        "hover:scale-105 active:scale-95",
        "min-h-[160px] w-full",
        "disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed",
        "hover:shadow-lg hover:shadow-cyan-500/10",
        "hover:ring-2 hover:ring-cyan-500/20",
        className
      )}
    >
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <Icon className="h-8 w-8 text-primary group-hover:text-cyan-400 transition-colors" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2 text-foreground group-hover:text-cyan-50 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground group-hover:text-cyan-100/80 transition-colors">
            {subtitle}
          </p>
        </div>
      </div>
      
      {/* Subtle hover effect - symmetrical radial gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/0 via-cyan-500/2 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}