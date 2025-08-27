import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, RefreshCw, Filter, TrendingUp } from 'lucide-react';

interface MetricsData {
  day: string;
  picked_id: string;
  category: string;
  shown: number;
  cta: number;
  users: number;
  ctr_pct: number | null;
}

export default function HeroSubtextMetrics() {
  const [metrics, setMetrics] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('30');
  const [pickedIdFilter, setPickedIdFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const loadMetrics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('v_subtext_daily_metrics')
        .select('*');
      
      // Apply time filter
      if (timeFilter !== 'all') {
        const daysAgo = parseInt(timeFilter);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        query = query.gte('day', cutoffDate.toISOString().split('T')[0]);
      }
      
      // Apply picked_id filter
      if (pickedIdFilter.trim()) {
        query = query.ilike('picked_id', `%${pickedIdFilter.trim()}%`);
      }
      
      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      
      const { data, error } = await query
        .order('day', { ascending: false })
        .order('shown', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error loading metrics:', error);
      } else {
        setMetrics(data || []);
      }
    } catch (err) {
      console.error('Exception loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [timeFilter, categoryFilter]);

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMetrics();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [pickedIdFilter]);

  // Calculate totals
  const totals = metrics.reduce(
    (acc, row) => ({
      shown: acc.shown + row.shown,
      cta: acc.cta + row.cta,
      users: acc.users + row.users
    }),
    { shown: 0, cta: 0, users: 0 }
  );
  
  const overallCtr = totals.shown > 0 ? ((totals.cta / totals.shown) * 100).toFixed(2) : '0.00';

  // Get unique categories for filter
  const categories = Array.from(new Set(metrics.map(m => m.category))).filter(Boolean);

  // Group by picked_id for sparkline data
  const sparklineData = metrics.reduce((acc, row) => {
    if (!acc[row.picked_id]) {
      acc[row.picked_id] = [];
    }
    acc[row.picked_id].push({ day: row.day, shown: row.shown, ctr: row.ctr_pct || 0 });
    return acc;
  }, {} as Record<string, Array<{ day: string; shown: number; ctr: number }>>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Hero Subtext Metrics
          </h1>
          <p className="text-muted-foreground">
            Analyze hero subtext performance and engagement data
          </p>
        </div>
        
        <Button onClick={loadMetrics} disabled={loading}>
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Picked ID Contains</label>
              <Input
                placeholder="Search picked_id..."
                value={pickedIdFilter}
                onChange={(e) => setPickedIdFilter(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totals.shown.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Shown</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totals.cta.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total CTAs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totals.users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unique Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{overallCtr}%</div>
            <p className="text-xs text-muted-foreground">Overall CTR</p>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading metrics...
            </div>
          ) : metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left">Day</th>
                    <th className="border border-border p-3 text-left">Picked ID</th>
                    <th className="border border-border p-3 text-left">Category</th>
                    <th className="border border-border p-3 text-left">Shown</th>
                    <th className="border border-border p-3 text-left">CTA</th>
                    <th className="border border-border p-3 text-left">Users</th>
                    <th className="border border-border p-3 text-left">CTR %</th>
                    <th className="border border-border p-3 text-left">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((row, i) => {
                    const trend = sparklineData[row.picked_id]?.slice(0, 7) || [];
                    const avgCtr = trend.length > 0 
                      ? trend.reduce((sum, d) => sum + d.ctr, 0) / trend.length 
                      : 0;
                    
                    return (
                      <tr key={i} className="hover:bg-muted/50">
                        <td className="border border-border p-3">
                          {new Date(row.day).toLocaleDateString()}
                        </td>
                        <td className="border border-border p-3">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {row.picked_id}
                          </code>
                        </td>
                        <td className="border border-border p-3">
                          <Badge variant="outline">{row.category}</Badge>
                        </td>
                        <td className="border border-border p-3 font-medium">
                          {row.shown.toLocaleString()}
                        </td>
                        <td className="border border-border p-3 font-medium">
                          {row.cta.toLocaleString()}
                        </td>
                        <td className="border border-border p-3">
                          {row.users.toLocaleString()}
                        </td>
                        <td className="border border-border p-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              (row.ctr_pct || 0) > 5 ? 'text-green-600' : 
                              (row.ctr_pct || 0) > 2 ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}>
                              {(row.ctr_pct || 0).toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="border border-border p-3">
                          <div className="flex items-center">
                            {trend.length > 1 && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className={`h-3 w-3 ${
                                  avgCtr > 3 ? 'text-green-500' : 
                                  avgCtr > 1 ? 'text-yellow-500' : 
                                  'text-red-500'
                                }`} />
                                <span className="text-xs text-muted-foreground">
                                  {avgCtr.toFixed(1)}% avg
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No metrics data found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Data will appear here after hero subtext events are logged
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performers */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">By Impressions</h4>
                <div className="space-y-2">
                  {metrics
                    .sort((a, b) => b.shown - a.shown)
                    .slice(0, 5)
                    .map((row, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <code className="text-sm">{row.picked_id}</code>
                          <div className="text-xs text-muted-foreground">{row.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{row.shown.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">shown</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">By CTR</h4>
                <div className="space-y-2">
                  {metrics
                    .filter(row => row.shown >= 10) // Only include messages with meaningful volume
                    .sort((a, b) => (b.ctr_pct || 0) - (a.ctr_pct || 0))
                    .slice(0, 5)
                    .map((row, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <code className="text-sm">{row.picked_id}</code>
                          <div className="text-xs text-muted-foreground">{row.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">{(row.ctr_pct || 0).toFixed(2)}%</div>
                          <div className="text-xs text-muted-foreground">{row.shown} shown</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}