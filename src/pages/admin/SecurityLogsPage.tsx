import { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SecurityLog {
  id: string;
  user_id: string | null;
  function_name: string;
  ip_address: string | null;
  event_type: string;
  details: string | null;
  created_at: string;
}

interface Filters {
  functionName: string;
  eventType: string;
  userId: string;
  ipAddress: string;
  startDate: Date | null;
  endDate: Date | null;
}

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All Event Types' },
  { value: 'unauthorized', label: 'Unauthorized' },
  { value: 'invalid_token', label: 'Invalid Token' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' }
];

const ITEMS_PER_PAGE = 25;

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<Filters>({
    functionName: '',
    eventType: '',
    userId: '',
    ipAddress: '',
    startDate: null,
    endDate: null
  });

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('security_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.functionName) {
        query = query.ilike('function_name', `%${filters.functionName}%`);
      }
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.ipAddress) {
        query = query.ilike('ip_address', `%${filters.ipAddress}%`);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        // Set to end of day
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      // Apply pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching security logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch security logs');
      toast({
        title: "Error",
        description: "Failed to fetch security logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = async () => {
    try {
      let query = supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply same filters as current view
      if (filters.functionName) {
        query = query.ilike('function_name', `%${filters.functionName}%`);
      }
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.ipAddress) {
        query = query.ilike('ip_address', `%${filters.ipAddress}%`);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Convert to CSV
      const headers = ['Timestamp', 'Function Name', 'Event Type', 'User ID', 'IP Address', 'Details'];
      const csvContent = [
        headers.join(','),
        ...(data || []).map(log => [
          `"${log.created_at}"`,
          `"${log.function_name}"`,
          `"${log.event_type}"`,
          `"${log.user_id || ''}"`,
          `"${log.ip_address || ''}"`,
          `"${(log.details || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `security_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
      link.click();
      
      toast({
        title: "Success",
        description: "Security logs exported successfully"
      });
    } catch (err) {
      console.error('Error exporting logs:', err);
      toast({
        title: "Error",
        description: "Failed to export security logs",
        variant: "destructive"
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      functionName: '',
      eventType: '',
      userId: '',
      ipAddress: '',
      startDate: null,
      endDate: null
    });
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchLogs(currentPage);
  }, [filters, currentPage]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'unauthorized':
      case 'invalid_token':
        return 'text-red-600 bg-red-50';
      case 'error':
        return 'text-orange-600 bg-orange-50';
      case 'success':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Security Logs</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchLogs(currentPage)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={exportToCsv} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Function Name</label>
                <Input
                  placeholder="Filter by function name..."
                  value={filters.functionName}
                  onChange={(e) => handleFilterChange('functionName', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Event Type</label>
                <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">User ID</label>
                <Input
                  placeholder="Filter by user ID..."
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">IP Address</label>
                <Input
                  placeholder="Filter by IP address..."
                  value={filters.ipAddress}
                  onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(filters.startDate, "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.startDate || undefined}
                      onSelect={(date) => handleFilterChange('startDate', date || null)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(filters.endDate, "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.endDate || undefined}
                      onSelect={(date) => handleFilterChange('endDate', date || null)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>
              Security Events ({totalCount} total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading security logs...
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Function Name</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No security logs found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.function_name}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                getEventTypeColor(log.event_type)
                              )}>
                                {log.event_type}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.user_id || '—'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.ip_address || '—'}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={log.details || ''}>
                              {log.details || '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} results
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center px-3 text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}