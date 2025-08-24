import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Heart, Star, StarOff, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RecoveryLog, RecoveryFavorite, RECOVERY_PROTOCOLS, INTENSITY_OPTIONS } from '@/types/logging';
import { createLogService } from '@/services/logService';
import { useAuth } from '@/contexts/auth';
import { ActivityEvents } from '@/lib/analytics';
import { useTabState } from '@/hooks/useTabState';
import { useDebounce } from '@/hooks/useDebounce';

export const RecoveryCard = () => {
  const { user } = useAuth();
  const [logService] = useState(() => createLogService(user?.id));
  const [activeTab, setActiveTab] = useTabState('recovery', 'log', user?.id);
  
  // Form state
  const [formData, setFormData] = useState({
    datetime: new Date().toISOString().slice(0, 16),
    protocol: '',
    durationMin: '',
    intensity: '' as 'LOW' | 'MED' | 'HIGH' | '',
    notes: ''
  });
  
  // Data state
  const [recentLogs, setRecentLogs] = useState<RecoveryLog[]>([]);
  const [favorites, setFavorites] = useState<RecoveryFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounced protocol search
  const debouncedProtocol = useDebounce(formData.protocol, 300);
  const filteredProtocols = useMemo(() => 
    RECOVERY_PROTOCOLS.filter(protocol => 
      protocol.toLowerCase().includes(debouncedProtocol.toLowerCase())
    ).slice(0, 8),
    [debouncedProtocol]
  );

  // Load data on mount
  useEffect(() => {
    loadRecentLogs();
    loadFavorites();
  }, []);

  const loadRecentLogs = async () => {
    try {
      const logs = await logService.listRecentRecovery(10);
      setRecentLogs(logs);
    } catch (error) {
      console.error('Error loading recent recovery logs:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const favorites = await logService.listRecoveryFavorites();
      setFavorites(favorites);
    } catch (error) {
      console.error('Error loading recovery favorites:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      datetime: new Date().toISOString().slice(0, 16),
      protocol: '',
      durationMin: '',
      intensity: '',
      notes: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.protocol) {
      toast.error('Please select a recovery protocol');
      return;
    }

    setIsLoading(true);
    try {
      const recoveryLog: RecoveryLog = {
        id: crypto.randomUUID(),
        userId: user?.id,
        createdAt: new Date(formData.datetime).toISOString(),
        protocol: formData.protocol,
        durationMin: formData.durationMin ? parseInt(formData.durationMin) : undefined,
        intensity: formData.intensity || undefined,
        notes: formData.notes || undefined
      };

      await logService.logRecovery(recoveryLog);
      await loadRecentLogs();
      resetForm();
      toast.success('Recovery session logged successfully!');
      
      // Fire analytics event
      ActivityEvents.recoveryFav({
        protocol: recoveryLog.protocol,
        duration: recoveryLog.durationMin,
        intensity: recoveryLog.intensity,
        timestamp: recoveryLog.createdAt
      });
      
      // Fire analytics event
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('log_recovery_submitted', {
          protocol: recoveryLog.protocol,
          duration: recoveryLog.durationMin,
          intensity: recoveryLog.intensity,
          timestamp: recoveryLog.createdAt
        });
      }
    } catch (error) {
      console.error('Error logging recovery:', error);
      toast.error('Failed to log recovery session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addToFavorites = async () => {
    if (!formData.protocol) {
      toast.error('Please select a protocol to favorite');
      return;
    }

    try {
      const favorite: RecoveryFavorite = {
        id: crypto.randomUUID(),
        name: `${formData.protocol}${formData.durationMin ? ` (${formData.durationMin}m)` : ''}${formData.intensity ? ` - ${formData.intensity}` : ''}`,
        protocol: formData.protocol,
        durationMin: formData.durationMin ? parseInt(formData.durationMin) : undefined,
        intensity: formData.intensity || undefined,
        notes: formData.notes || undefined
      };

      await logService.saveRecoveryFavorite(favorite);
      await loadFavorites();
      toast.success('Added to favorites!');

      // Fire analytics event
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('recovery_favorited', {
          protocol: favorite.protocol,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast.error('Failed to add to favorites');
    }
  };

  const useRecentLog = (log: RecoveryLog) => {
    setFormData({
      datetime: new Date().toISOString().slice(0, 16),
      protocol: log.protocol,
      durationMin: log.durationMin?.toString() || '',
      intensity: log.intensity || '',
      notes: log.notes || ''
    });
  };

  const useFavorite = (favorite: RecoveryFavorite) => {
    setFormData({
      datetime: new Date().toISOString().slice(0, 16),
      protocol: favorite.protocol,
      durationMin: favorite.durationMin?.toString() || '',
      intensity: favorite.intensity || '',
      notes: favorite.notes || ''
    });
  };

  const deleteFavorite = async (id: string) => {
    try {
      await logService.deleteRecoveryFavorite(id);
      await loadFavorites();
      toast.success('Favorite removed');
    } catch (error) {
      toast.error('Failed to remove favorite');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Recovery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3" role="tablist">
            <TabsTrigger value="log" role="tab" aria-selected={activeTab === 'log'}>Log</TabsTrigger>
            <TabsTrigger value="recent" role="tab" aria-selected={activeTab === 'recent'}>Recent</TabsTrigger>
            <TabsTrigger value="favorites" role="tab" aria-selected={activeTab === 'favorites'}>Favorites</TabsTrigger>
          </TabsList>
          
          <TabsContent value="log" className="space-y-4" role="tabpanel" aria-labelledby="log-tab">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="datetime">Date/Time</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={formData.datetime}
                  onChange={(e) => setFormData(prev => ({ ...prev, datetime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="protocol">Protocol</Label>
                <Select
                  value={formData.protocol}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, protocol: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECOVERY_PROTOCOLS.map(protocol => (
                      <SelectItem key={protocol} value={protocol}>
                        {protocol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.durationMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMin: e.target.value }))}
                  placeholder="20"
                />
              </div>
              <div>
                <Label htmlFor="intensity">Intensity</Label>
                <Select
                  value={formData.intensity}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, intensity: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENSITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="How did it feel? Any benefits noticed..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Logging...' : 'Log Recovery'}
              </Button>
              <Button
                variant="outline"
                onClick={addToFavorites}
                disabled={!formData.protocol}
              >
                <Star className="h-4 w-4 mr-2" />
                Favorite
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4" role="tabpanel" aria-labelledby="recent-tab">
            {recentLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No recent logs yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{log.protocol}</div>
                      <div className="text-sm text-muted-foreground">
                        {log.durationMin && `${log.durationMin}m`}
                        {log.intensity && ` · ${log.intensity}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => useRecentLog(log)}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4" role="tabpanel" aria-labelledby="favorites-tab">
            {favorites.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nothing saved yet. Create one from the Log tab.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {favorites.map((favorite) => (
                  <div
                    key={favorite.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{favorite.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">{favorite.protocol}</Badge>
                        {favorite.durationMin && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {favorite.durationMin}m
                          </Badge>
                        )}
                        {favorite.intensity && (
                          <Badge variant="outline" className="text-xs">
                            {favorite.intensity}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => useFavorite(favorite)}
                      >
                        Use
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteFavorite(favorite.id)}
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};