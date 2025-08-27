import { Button } from '@/components/ui/button';
import { ScanBarcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isFeatureEnabled } from '@/lib/featureFlags';

interface ScanHubLinkProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ScanHubLink({ className, variant = "default", size = "default" }: ScanHubLinkProps) {
  const navigate = useNavigate();
  
  if (!isFeatureEnabled('scan_hub_enabled')) {
    return null;
  }

  const handleClick = () => {
    console.log('scan_hub_nav_click', { 
      source: 'scan_hub_link',
      timestamp: Date.now() 
    });
    navigate('/scan');
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
    >
      <ScanBarcode className="h-4 w-4 mr-2" />
      Scan Hub
    </Button>
  );
}