import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SkillCommand {
  label: string;
  prompt: string;
  icon?: string;
}

interface SkillCategory {
  title: string;
  icon: React.ReactNode;
  commands: SkillCommand[];
  isExpanded?: boolean;
}

interface SkillPanelProps {
  title: string;
  icon: React.ReactNode;
  categories: SkillCategory[];
  onCommandClick: (prompt: string) => void;
  isLoading?: boolean;
  gradientColors: string;
}

export const SkillPanel = ({ 
  title, 
  icon, 
  categories, 
  onCommandClick, 
  isLoading = false,
  gradientColors 
}: SkillPanelProps) => {
  const isMobile = useIsMobile();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryTitle: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryTitle)) {
      newExpanded.delete(categoryTitle);
    } else {
      newExpanded.add(categoryTitle);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Section Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-medium">
            Skill Panel
          </span>
        </div>
      </div>

      <Card className="glass-card border-0 rounded-3xl overflow-hidden">
        <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            {icon}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0 space-y-4`}>
          {categories.map((category, index) => (
            <Collapsible 
              key={category.title}
              open={expandedCategories.has(category.title)}
              onOpenChange={() => toggleCategory(category.title)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-between ${isMobile ? 'p-3 text-sm' : 'p-4 text-base'} bg-gradient-to-r ${gradientColors} border-border/60 hover:border-border transition-all duration-200`}
                  disabled={isLoading}
                >
                  <div className="flex items-center space-x-2">
                    {category.icon}
                    <span className="font-medium">{category.title}</span>
                  </div>
                  {expandedCategories.has(category.title) ? (
                    <ChevronDown className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} transition-transform duration-200`} />
                  ) : (
                    <ChevronRight className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} transition-transform duration-200`} />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2 space-y-2 animate-accordion-down">
                <div className="grid grid-cols-1 gap-2 pl-2">
                  {category.commands.map((command, cmdIndex) => (
                    <Button
                      key={cmdIndex}
                      variant="ghost"
                      size="sm"
                      onClick={() => onCommandClick(command.prompt)}
                      className={`${isMobile ? 'text-xs px-3 py-2 h-auto' : 'text-sm px-4 py-3 h-auto'} text-left justify-start font-normal hover:bg-muted/80 hover:scale-[1.02] transition-all duration-200 whitespace-normal leading-relaxed`}
                      disabled={isLoading}
                    >
                      <div className="flex items-start space-x-2 w-full">
                        {command.icon && (
                          <span className="text-xs mt-0.5 flex-shrink-0">{command.icon}</span>
                        )}
                        <span className="text-left">{command.label}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};