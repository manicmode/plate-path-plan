import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TabItem {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
}

interface CreatorTabsProps {
  value: string;
  onChange: (value: string) => void;
  items: TabItem[];
  className?: string;
}

export const CreatorTabs: React.FC<CreatorTabsProps> = ({
  value,
  onChange,
  items,
  className
}) => {
  const tabsRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = items.findIndex(item => item.key === value);
    
    if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      onChange(items[currentIndex - 1].key);
    } else if (e.key === 'ArrowRight' && currentIndex < items.length - 1) {
      e.preventDefault();
      onChange(items[currentIndex + 1].key);
    }
  };

  return (
    <div className={cn("sticky top-3 z-20 mb-6", className)}>
      <div className="rounded-xl bg-black/50 backdrop-blur p-1 md:p-2 overflow-x-auto md:overflow-visible pointer-events-auto relative z-20">
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Dashboard sections"
          className="grid grid-cols-6 gap-1 min-w-max md:min-w-0"
          onKeyDown={handleKeyDown}
        >
          {items.map((item) => {
            const IconComponent = item.icon;
            const isActive = value === item.key;
            
            return (
              <button
                key={item.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${item.key}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange(item.key)}
                className={cn(
                  "flex items-center justify-center gap-1 md:gap-2 px-2 py-3 text-xs md:text-sm rounded-lg transition-all duration-200",
                  "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none",
                  "min-h-[44px] min-w-[44px]",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary/80 text-slate-900 dark:text-slate-900 shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-900"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <IconComponent className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-slate-900 dark:text-slate-900" : ""
                )} />
                <span className="hidden md:inline truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};