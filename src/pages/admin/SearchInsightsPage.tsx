import { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RefreshCw, Search, TrendingUp, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface TopQuery {
  q: string;
  searches: number;
  avg_results: number;
  hit_rate: number;
}

interface ZeroResultQuery {
  q: string;
  searches: number;
}

interface TopResult {
  top_slug: string;
  times_top: number;
}

export default function SearchInsightsPage() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 14),
    to: new Date()
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Data states
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [zeroResultQueries, setZeroResultQueries] = useState<ZeroResultQuery[]>([]);
  const [topResults, setTopResults] = useState<TopResult[]>([]);
  
  const { toast } = useToast();

  const fetchInsights = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const fromISO = dateRange.from.toISOString();
      const toISO = new Date(dateRange.to.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Add 1 day to include the "to" date

      // Fetch all search events for processing
      const { data: searchEvents, error: searchError } = await supabase
        .from('habit_search_events')
        .select('q, results, top_slug')
        .gte('created_at', fromISO)
        .lt('created_at', toISO);

      if (searchError) throw searchError;

      // Process top queries
      const queryMap = new Map<string, { count: number; totalResults: number; topSlugs: number }>();
      
      searchEvents?.forEach(row => {
        const q = row.q?.toLowerCase() || '';
        if (!queryMap.has(q)) {
          queryMap.set(q, { count: 0, totalResults: 0, topSlugs: 0 });
        }
        const entry = queryMap.get(q)!;
        entry.count++;
        entry.totalResults += row.results || 0;
        if (row.top_slug) entry.topSlugs++;
      });

      const processedTopQueries = Array.from(queryMap.entries())
        .map(([q, stats]) => ({
          q,
          searches: stats.count,
          avg_results: Math.round((stats.totalResults / stats.count) * 100) / 100,
          hit_rate: Math.round((stats.topSlugs / stats.count) * 1000) / 10
        }))
        .sort((a, b) => b.searches - a.searches)
        .slice(0, 50);

      setTopQueries(processedTopQueries);

      // Process zero result queries
      const zeroQueryMap = new Map<string, number>();
      searchEvents?.forEach(row => {
        if (row.results === 0) {
          const q = row.q?.toLowerCase() || '';
          zeroQueryMap.set(q, (zeroQueryMap.get(q) || 0) + 1);
        }
      });

      const processedZeroResults = Array.from(zeroQueryMap.entries())
        .map(([q, searches]) => ({ q, searches }))
        .sort((a, b) => b.searches - a.searches)
        .slice(0, 50);

      setZeroResultQueries(processedZeroResults);

      // Process top results
      const resultMap = new Map<string, number>();
      searchEvents?.forEach(row => {
        if (row.top_slug) {
          resultMap.set(row.top_slug, (resultMap.get(row.top_slug) || 0) + 1);
        }
      });

      const processedTopResults = Array.from(resultMap.entries())
        .map(([top_slug, times_top]) => ({ top_slug, times_top }))
        .sort((a, b) => b.times_top - a.times_top)
        .slice(0, 50);

      setTopResults(processedTopResults);

      toast({
        title: "Success",
        description: "Search insights updated successfully"
      });

    } catch (error) {
      console.error('Error fetching search insights:', error);
      toast({
        title: "Error",
        description: "Failed to fetch search insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchInsights();
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({
        from: date,
        to: prev.to
      }));
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({
        from: prev.from,
        to: date
      }));
    }
    setIsCalendarOpen(false);
  };

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Search Insights</h1>
            <p className="text-muted-foreground mt-2">
              Analytics from habit search behavior
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[250px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex">
                  <div className="p-3">
                    <div className="text-sm font-medium mb-2">From Date</div>
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={handleDateSelect}
                      disabled={(date) => date > new Date()}
                    />
                  </div>
                  <div className="p-3 border-l">
                    <div className="text-sm font-medium mb-2">To Date</div>
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={handleEndDateSelect}
                      disabled={(date) => date > new Date() || date < dateRange.from}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button onClick={fetchInsights} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top Queries Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Top Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md" data-testid="insights-top-queries">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Searches</TableHead>
                    <TableHead className="text-right">Avg Results</TableHead>
                    <TableHead className="text-right">Hit Rate %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : topQueries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No search data found for this date range
                      </TableCell>
                    </TableRow>
                  ) : (
                    topQueries.map((query, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{query.q}</TableCell>
                        <TableCell className="text-right">{query.searches}</TableCell>
                        <TableCell className="text-right">{query.avg_results}</TableCell>
                        <TableCell className="text-right">{query.hit_rate}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Zero Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Zero-Result Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md" data-testid="insights-zero-results">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Searches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : zeroResultQueries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        No zero-result queries found for this date range
                      </TableCell>
                    </TableRow>
                  ) : (
                    zeroResultQueries.map((query, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{query.q}</TableCell>
                        <TableCell className="text-right">{query.searches}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Top Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most-Clicked Top Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md" data-testid="insights-top-results">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Top Slug</TableHead>
                    <TableHead className="text-right">Times Shown as Top</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : topResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        No top results found for this date range
                      </TableCell>
                    </TableRow>
                  ) : (
                    topResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{result.top_slug}</TableCell>
                        <TableCell className="text-right">{result.times_top}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}