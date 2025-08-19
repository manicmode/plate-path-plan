import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Info } from 'lucide-react';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';
import { useToast } from '@/hooks/use-toast';

interface HabitCardProps {
  template: HabitTemplate;
  searchQuery?: string;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onDetailsClick: () => void;
  onStartHabit?: (template: HabitTemplate) => void;
  showAdminActions?: boolean;
  userActiveHabits?: string[]; // Array of slugs for active habits
}

// Text highlighting utility
const highlightText = (text: string, query: string) => {
  if (!query || query.trim().length < 2) return text;
  
  const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">{part}</mark> : part
  );
};

const getDomainColor = (domain: string) => {
  switch (domain) {
    case 'nutrition': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'exercise': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'recovery': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getGoalTypeLabel = (goalType: string) => {
  switch (goalType) {
    case 'bool': return 'Yes/No';
    case 'count': return 'Count';
    case 'duration': return 'Duration';
    default: return goalType;
  }
};

export function HabitCard({ template, searchQuery, isSelected, onSelectionChange, onDetailsClick, onStartHabit, showAdminActions = false, userActiveHabits = [] }: HabitCardProps) {
  const { toast } = useToast();

  const handleCopySlug = () => {
    navigator.clipboard.writeText(template.slug);
    toast({ title: "Copied slug to clipboard" });
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    toast({ title: "Copied JSON to clipboard" });
  };

  // Parse tags from the tags field
  const parsedTags = template.tags 
    ? template.tags.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 3)
    : [];

  // Check if user already has this habit active
  const isHabitActive = userActiveHabits.includes(template.slug);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectionChange}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-lg leading-tight">
                  {searchQuery ? highlightText(template.name, searchQuery) : template.name}
                </CardTitle>
                
                {/* Badges for domain, category, difficulty, goal type */}
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge className={getDomainColor(template.domain)}>
                    {template.domain}
                  </Badge>
                  
                  {template.category && (
                    <Badge variant="outline">
                      {searchQuery ? highlightText(template.category, searchQuery) : template.category}
                    </Badge>
                  )}
                  
                  {template.difficulty && (
                    <Badge className={getDifficultyColor(template.difficulty)}>
                      {template.difficulty}
                    </Badge>
                  )}
                  
                  <Badge variant="secondary">
                    {getGoalTypeLabel(template.goal_type)}
                  </Badge>
                </div>
              </div>
            </div>
            
            {template.summary && (
              <CardDescription className="mt-2 text-sm">
                {searchQuery ? highlightText(template.summary, searchQuery) : template.summary}
              </CardDescription>
            )}
            
            {/* Tags chips */}
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {parsedTags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {searchQuery ? highlightText(tag, searchQuery) : tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Primary CTA - Start this habit or Log now */}
          {onStartHabit && (
            <Button 
              onClick={() => onStartHabit(template)}
              className="w-full"
              variant={isHabitActive ? "outline" : "default"}
            >
              {isHabitActive ? "Log now" : "Start this habit"}
            </Button>
          )}
          
          {/* Secondary actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onDetailsClick}>
              <Info className="mr-1 h-3 w-3" />
              Details
            </Button>
            
            {/* Admin-only copy actions */}
            {showAdminActions && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopySlug}>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy slug
                </Button>
                
                <Button variant="outline" size="sm" onClick={handleCopyJSON}>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy JSON
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}