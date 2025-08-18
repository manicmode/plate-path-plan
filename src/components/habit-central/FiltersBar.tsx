import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Filter } from 'lucide-react';
import { HabitDomain, HabitGoalType, HabitDifficulty, HabitTemplateFilters } from '@/hooks/useHabitTemplatesV2';

interface FiltersBarProps {
  filters: HabitTemplateFilters;
  onFiltersChange: (filters: HabitTemplateFilters) => void;
  categories: string[];
  equipmentOptions: string[];
  allTags: string[];
}

const DOMAINS: { value: HabitDomain; label: string }[] = [
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'recovery', label: 'Recovery' },
];

const DIFFICULTIES: { value: HabitDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const GOAL_TYPES: { value: HabitGoalType; label: string }[] = [
  { value: 'bool', label: 'Yes/No' },
  { value: 'count', label: 'Count' },
  { value: 'duration', label: 'Duration' },
];

export function FiltersBar({
  filters,
  onFiltersChange,
  categories,
  equipmentOptions,
  allTags
}: FiltersBarProps) {
  const updateFilter = (key: keyof HabitTemplateFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  const MultiSelectPopover = ({
    value,
    onValueChange,
    options,
    placeholder,
    renderValue
  }: {
    value: string[];
    onValueChange: (value: string[]) => void;
    options: string[];
    placeholder: string;
    renderValue?: (values: string[]) => string;
  }) => {
    const displayValue = renderValue ? renderValue(value) : 
      value.length === 0 ? placeholder :
      value.length === 1 ? value[0] :
      `${value.length} selected`;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between w-48">
            <span className="truncate">{displayValue}</span>
            <Filter className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`filter-${option}`}
                  checked={value.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onValueChange([...value, option]);
                    } else {
                      onValueChange(value.filter(v => v !== option));
                    }
                  }}
                />
                <label
                  htmlFor={`filter-${option}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Domain Multi-Select */}
        <MultiSelectPopover
          value={filters.domains || []}
          onValueChange={(domains) => updateFilter('domains', domains)}
          options={DOMAINS.map(d => d.value)}
          placeholder="All domains"
          renderValue={(values) => {
            if (values.length === 0) return "All domains";
            const labels = values.map(v => DOMAINS.find(d => d.value === v)?.label || v);
            return labels.length === 1 ? labels[0] : `${labels.length} domains`;
          }}
        />

        {/* Category Single Select */}
        <Select 
          value={filters.category || "__ALL__"} 
          onValueChange={(v) => updateFilter('category', v === "__ALL__" ? undefined : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Difficulty Single Select */}
        <Select 
          value={filters.difficulty || "__ALL__"} 
          onValueChange={(v) => updateFilter('difficulty', v === "__ALL__" ? undefined : v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Any</SelectItem>
            {DIFFICULTIES.map((diff) => (
              <SelectItem key={diff.value} value={diff.value}>
                {diff.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Goal Type Single Select */}
        <Select 
          value={filters.goalType || "__ALL__"} 
          onValueChange={(v) => updateFilter('goalType', v === "__ALL__" ? undefined : v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Goal type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Any</SelectItem>
            {GOAL_TYPES.map((goal) => (
              <SelectItem key={goal.value} value={goal.value}>
                {goal.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Equipment Single Select */}
        <Select 
          value={filters.equipment || "__ALL__"} 
          onValueChange={(v) => updateFilter('equipment', v === "__ALL__" ? undefined : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Any</SelectItem>
            {equipmentOptions.map((equipment) => (
              <SelectItem key={equipment} value={equipment}>
                {equipment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tags Multi-Select */}
        <MultiSelectPopover
          value={filters.tags || []}
          onValueChange={(tags) => updateFilter('tags', tags)}
          options={allTags}
          placeholder="Tags"
        />

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <X className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.domains?.map(domain => (
            <Badge key={domain} variant="secondary" className="cursor-pointer" onClick={() => {
              const newDomains = filters.domains?.filter(d => d !== domain) || [];
              updateFilter('domains', newDomains.length > 0 ? newDomains : undefined);
            }}>
              {DOMAINS.find(d => d.value === domain)?.label || domain}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          {filters.category && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter('category', undefined)}>
              {filters.category}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.difficulty && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter('difficulty', undefined)}>
              {DIFFICULTIES.find(d => d.value === filters.difficulty)?.label || filters.difficulty}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.goalType && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter('goalType', undefined)}>
              {GOAL_TYPES.find(g => g.value === filters.goalType)?.label || filters.goalType}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.equipment && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter('equipment', undefined)}>
              {filters.equipment}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {filters.tags?.map(tag => (
            <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => {
              const newTags = filters.tags?.filter(t => t !== tag) || [];
              updateFilter('tags', newTags.length > 0 ? newTags : undefined);
            }}>
              {tag}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}