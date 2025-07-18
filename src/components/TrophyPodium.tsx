import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';

interface TrophyCount {
  gold: number;
  silver: number;
  bronze: number;
}

export function TrophyPodium() {
  const [trophyData, setTrophyData] = useState<TrophyCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrophyCounts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase.functions.invoke('get-trophy-counts');
        
        if (error) {
          console.error('Error fetching trophy counts:', error);
          setError('Failed to load trophy data');
          return;
        }
        
        setTrophyData(data);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Failed to load trophy data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrophyCounts();
  }, []);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex justify-center items-center">
          <div className="animate-pulse text-muted-foreground">Loading trophy shelf...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="flex justify-center items-center text-destructive">
          {error}
        </div>
      </Card>
    );
  }

  if (!trophyData) {
    return null;
  }

  const totalTrophies = trophyData.gold + trophyData.silver + trophyData.bronze;

  return (
    <Card className="p-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 via-gray-400 to-amber-600 bg-clip-text text-transparent">
          Trophy Collection
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          {totalTrophies === 0 
            ? "Start competing to earn your first trophy!" 
            : `${totalTrophies} total achievement${totalTrophies !== 1 ? 's' : ''}`}
        </p>
      </div>

      {totalTrophies === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center space-y-4">
            <div className="text-6xl opacity-30">🏆</div>
            <p className="text-muted-foreground">Your trophy shelf awaits...</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Podium Base */}
          <div className="flex justify-center items-end gap-4 mb-4">
            {/* Silver - Left (2nd Place) */}
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="mb-3 hover:scale-110 transition-transform duration-300">
                <div className="text-4xl md:text-5xl transform hover:rotate-12 transition-transform duration-300">
                  🥈
                </div>
              </div>
              <div className="bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-lg w-16 md:w-20 h-20 md:h-24 flex items-start justify-center pt-2 shadow-lg border border-gray-300">
                <span className="text-lg md:text-xl font-bold text-gray-700">
                  {trophyData.silver > 0 ? `(${trophyData.silver})` : '(0)'}
                </span>
              </div>
              <div className="bg-gradient-to-b from-slate-200 to-slate-300 w-20 md:w-24 h-3 rounded-b shadow-md"></div>
            </div>

            {/* Gold - Center (1st Place) */}
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="mb-3 hover:scale-110 transition-transform duration-300">
                <div className="text-5xl md:text-6xl transform hover:rotate-12 transition-transform duration-300 drop-shadow-lg">
                  🥇
                </div>
              </div>
              <div className="bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-lg w-20 md:w-24 h-28 md:h-32 flex items-start justify-center pt-2 shadow-xl border border-yellow-500 ring-2 ring-yellow-400/30">
                <span className="text-xl md:text-2xl font-bold text-yellow-800">
                  {trophyData.gold > 0 ? `(${trophyData.gold})` : '(0)'}
                </span>
              </div>
              <div className="bg-gradient-to-b from-amber-200 to-amber-300 w-24 md:w-28 h-4 rounded-b shadow-lg"></div>
            </div>

            {/* Bronze - Right (3rd Place) */}
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="mb-3 hover:scale-110 transition-transform duration-300">
                <div className="text-4xl md:text-5xl transform hover:rotate-12 transition-transform duration-300">
                  🥉
                </div>
              </div>
              <div className="bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-lg w-16 md:w-20 h-16 md:h-20 flex items-start justify-center pt-2 shadow-lg border border-amber-700">
                <span className="text-lg md:text-xl font-bold text-amber-100">
                  {trophyData.bronze > 0 ? `(${trophyData.bronze})` : '(0)'}
                </span>
              </div>
              <div className="bg-gradient-to-b from-amber-300 to-amber-400 w-20 md:w-24 h-3 rounded-b shadow-md"></div>
            </div>
          </div>

          {/* Podium Labels */}
          <div className="flex justify-center items-end gap-4 mt-2">
            <div className="w-16 md:w-20 text-center">
              <span className="text-xs md:text-sm font-semibold text-muted-foreground">2nd</span>
            </div>
            <div className="w-20 md:w-24 text-center">
              <span className="text-sm md:text-base font-bold text-primary">1st</span>
            </div>
            <div className="w-16 md:w-20 text-center">
              <span className="text-xs md:text-sm font-semibold text-muted-foreground">3rd</span>
            </div>
          </div>

          {/* Achievement Sparkles */}
          {totalTrophies > 0 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-4 left-1/4 text-yellow-400 animate-pulse">✨</div>
              <div className="absolute top-8 right-1/4 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }}>✨</div>
              <div className="absolute bottom-12 left-1/3 text-yellow-400 animate-pulse" style={{ animationDelay: '1s' }}>✨</div>
              <div className="absolute bottom-8 right-1/3 text-yellow-400 animate-pulse" style={{ animationDelay: '1.5s' }}>✨</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}