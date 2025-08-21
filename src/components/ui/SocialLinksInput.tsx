import { useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { 
  Instagram, 
  Youtube, 
  Twitter, 
  Facebook, 
  Globe,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

interface SocialLink {
  platform: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  domains: string[];
}

const SOCIAL_PLATFORMS: SocialLink[] = [
  {
    platform: 'instagram',
    url: '',
    icon: Instagram,
    placeholder: 'https://instagram.com/yourhandle',
    domains: ['instagram.com', 'www.instagram.com']
  },
  {
    platform: 'tiktok', 
    url: '',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
      </svg>
    ),
    placeholder: 'https://tiktok.com/@yourhandle',
    domains: ['tiktok.com', 'www.tiktok.com']
  },
  {
    platform: 'youtube',
    url: '',
    icon: Youtube,
    placeholder: 'https://youtube.com/@yourchannel',
    domains: ['youtube.com', 'www.youtube.com', 'youtu.be']
  },
  {
    platform: 'twitter',
    url: '',
    icon: Twitter,
    placeholder: 'https://x.com/yourhandle',
    domains: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com']
  },
  {
    platform: 'facebook',
    url: '',
    icon: Facebook,
    placeholder: 'https://facebook.com/yourpage',
    domains: ['facebook.com', 'www.facebook.com', 'fb.com']
  },
  {
    platform: 'website',
    url: '',
    icon: Globe,
    placeholder: 'https://yourwebsite.com',
    domains: [] // Any domain allowed for website
  }
];

interface SocialLinksInputProps {
  values: Record<string, string>;
  onChange: (links: Record<string, string>) => void;
  className?: string;
}

export function SocialLinksInput({ values, onChange, className }: SocialLinksInputProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateUrl = (platform: string, url: string): string | null => {
    if (!url.trim()) return null; // Empty is valid

    try {
      const urlObj = new URL(url);
      const platformConfig = SOCIAL_PLATFORMS.find(p => p.platform === platform);
      
      if (!platformConfig) return null;

      // For website, any valid URL is okay
      if (platform === 'website') return null;

      // Check if domain matches allowed domains
      const isValidDomain = platformConfig.domains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );

      if (!isValidDomain) {
        return `Please enter a valid ${platform} URL (e.g., ${platformConfig.placeholder})`;
      }

      return null;
    } catch {
      return 'Please enter a valid URL starting with https://';
    }
  };

  const normalizeUrl = (url: string): string => {
    if (!url.trim()) return '';
    
    // Add https:// if no protocol provided
    if (!/^https?:\/\//.test(url)) {
      return `https://${url}`;
    }
    
    return url;
  };

  const handleUrlChange = (platform: string, rawUrl: string) => {
    const normalizedUrl = normalizeUrl(rawUrl);
    const error = validateUrl(platform, normalizedUrl);
    
    setErrors(prev => ({
      ...prev,
      [platform]: error || ''
    }));

    onChange({
      ...values,
      [platform]: normalizedUrl
    });
  };

  const handleTestLink = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {SOCIAL_PLATFORMS.map((platform) => {
          const IconComponent = platform.icon;
          const currentUrl = values[platform.platform] || '';
          const hasError = errors[platform.platform];

          return (
            <div key={platform.platform} className="space-y-2">
              <Label 
                htmlFor={platform.platform}
                className="flex items-center gap-2 capitalize"
              >
                <IconComponent className="h-4 w-4" />
                {platform.platform === 'tiktok' ? 'TikTok' : platform.platform}
                <span className="text-xs text-muted-foreground ml-auto">Optional</span>
              </Label>
              
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    id={platform.platform}
                    type="url"
                    placeholder={platform.placeholder}
                    value={currentUrl}
                    onChange={(e) => handleUrlChange(platform.platform, e.target.value)}
                    className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  
                  {hasError && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {hasError}
                    </div>
                  )}
                </div>

                {currentUrl && !hasError && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestLink(currentUrl)}
                    className="shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
        <div className="text-sm">
          <p className="font-medium mb-1">Social Links Tips:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Links are optional but help followers connect with you</li>
            <li>• Use your full profile URLs (e.g., https://instagram.com/yourhandle)</li>
            <li>• Links will appear as clickable icons on your profile card</li>
          </ul>
        </div>
      </div>
    </div>
  );
}