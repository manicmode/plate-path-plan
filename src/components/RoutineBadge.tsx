import { Badge } from '@/components/ui/badge';

interface RoutineBadgeProps {
  source: 'custom' | 'ai-generated' | 'ai-legacy' | 'mock';
  isActive?: boolean;
}

export function RoutineBadge({ source, isActive }: RoutineBadgeProps) {
  return null;
}