import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultsCount: number;
  loading: boolean;
  placeholder?: string;
}

export function SearchBar({ value, onChange, resultsCount, loading, placeholder = "Search habits..." }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, onChange]);

  // Update local value when prop changes (e.g., from URL sync)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {(value.trim().length >= 2 || resultsCount > 0) && (
        <div className="text-sm text-muted-foreground">
          {loading ? (
            "Searching..."
          ) : (
            `${resultsCount} ${resultsCount === 1 ? 'result' : 'results'}`
          )}
        </div>
      )}
    </div>
  );
}