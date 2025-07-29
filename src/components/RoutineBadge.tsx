import { Badge } from '@/components/ui/badge';

interface RoutineBadgeProps {
  source: 'custom' | 'ai-generated' | 'ai-legacy' | 'mock';
  isActive?: boolean;
}

export function RoutineBadge({ source, isActive }: RoutineBadgeProps) {
  if (source === 'mock') return null;

  const getBadgeProps = () => {
    switch (source) {
      case 'custom':
        return {
          variant: 'secondary' as const,
          text: 'Custom',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'ai-generated':
        return {
          variant: 'default' as const,
          text: isActive ? 'AI Active' : 'AI Generated',
          className: isActive 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-purple-100 text-purple-800 border-purple-200'
        };
      case 'ai-legacy':
        return {
          variant: 'outline' as const,
          text: isActive ? 'AI Active' : 'AI Legacy',
          className: isActive 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-indigo-100 text-indigo-800 border-indigo-200'
        };
      default:
        return {
          variant: 'outline' as const,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const { variant, text, className } = getBadgeProps();

  return (
    <Badge variant={variant} className={className}>
      {text}
    </Badge>
  );
}