import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getScanRecents, clearScanRecents, removeScanRecent } from '@/lib/scanRecents';
import { useToast } from '@/hooks/use-toast';

export default function RecentScans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recents, setRecents] = useState(getScanRecents());

  useEffect(() => {
    setRecents(getScanRecents());
  }, []);

  const handleClearAll = () => {
    clearScanRecents();
    setRecents([]);
    toast({
      title: "Recents cleared",
      description: "All recent scans have been removed.",
    });
  };

  const handleRemoveItem = (ts: number) => {
    removeScanRecent(ts);
    setRecents(getScanRecents());
    toast({
      title: "Item removed",
      description: "Recent scan removed from history.",
    });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'barcode': return '📱';
      case 'photo': return '📸';
      case 'manual': return '⌨️';
      case 'voice': return '🎤';
      default: return '📊';
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-slate-700 pb-24">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/scan')}
            className="text-white hover:bg-white/10 mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Recent Scans</h1>
            <p className="text-rose-100/80">Quick access to recent lookups</p>
          </div>
        </div>

        {/* Header with count and clear button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-white" />
            <Badge variant="secondary" className="bg-white/20 text-white">
              {recents.length}
            </Badge>
          </div>
          
          {recents.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Recents list */}
        <div className="space-y-4">
          {recents.length === 0 ? (
            <Card className="bg-white/10 border-white/20">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-white/50 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No recent scans
                </h3>
                <p className="text-rose-100/70 text-center">
                  Start scanning foods to see your history here
                </p>
                <Button
                  onClick={() => navigate('/scan')}
                  className="mt-4 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Start Scanning
                </Button>
              </CardContent>
            </Card>
          ) : (
            recents.map((item) => (
              <Card key={item.ts} className="bg-white/10 border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getModeIcon(item.mode)}</span>
                      <div>
                        <h3 className="font-semibold text-white">
                          {item.label}
                        </h3>
                        <p className="text-sm text-rose-100/70">
                          {item.mode} • {formatTime(item.ts)}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.ts)}
                      className="text-white hover:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}