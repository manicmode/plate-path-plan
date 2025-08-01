import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Scale, Eye, User, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface BodyScan {
  id: string;
  type: string;
  image_url: string;
  side_image_url?: string;
  back_image_url?: string;
  weight?: number;
  created_at: string;
  ai_insights?: string;
  pose_score?: number;
  scan_index?: number;
  year: number;
}

export default function BodyScanHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedScans, setGroupedScans] = useState<{ [key: string]: BodyScan[] }>({});

  useEffect(() => {
    if (user) {
      fetchBodyScanHistory();
    }
  }, [user]);

  const fetchBodyScanHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setScans(data);
        
        // Group scans by date for complete scan sessions
        const grouped = data.reduce((acc: { [key: string]: BodyScan[] }, scan) => {
          const dateKey = format(new Date(scan.created_at), 'yyyy-MM-dd');
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(scan);
          return acc;
        }, {});
        
        setGroupedScans(grouped);
      }
    } catch (error) {
      console.error('Error fetching body scan history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewScan = (scanData: BodyScan) => {
    // Navigate to individual scan result with the scan data
    navigate('/body-scan-result', { 
      state: { 
        ...scanData,
        date: scanData.created_at,
        weight: scanData.weight,
        isHistoryView: true
      } 
    });
  };

  const handleViewFullSession = (dateScans: BodyScan[]) => {
    // Find the most complete scan or the latest one
    const completeScan = dateScans.find(scan => 
      scan.side_image_url && scan.back_image_url
    ) || dateScans[0];
    
    handleViewScan(completeScan);
  };

  const getImageThumbnails = (dateScans: BodyScan[]) => {
    const frontScan = dateScans.find(scan => scan.type === 'front');
    const sideScan = dateScans.find(scan => scan.type === 'side');
    const backScan = dateScans.find(scan => scan.type === 'back');

    return {
      front: frontScan?.image_url,
      side: sideScan?.image_url || frontScan?.side_image_url,
      back: backScan?.image_url || frontScan?.back_image_url
    };
  };

  const getSummaryText = (dateScans: BodyScan[]) => {
    const scanWithInsights = dateScans.find(scan => scan.ai_insights);
    if (scanWithInsights?.ai_insights) {
      // Extract a short summary from AI insights
      const insights = scanWithInsights.ai_insights;
      const firstSection = insights.split('\n\n')[0] || insights.slice(0, 100);
      return firstSection.replace(/[🎯⚖️💪📈]/g, '').replace(/\*\*/g, '').trim();
    }
    
    const types = dateScans.map(scan => scan.type);
    if (types.length === 3) {
      return "Complete full-body scan session - excellent posture tracking!";
    } else if (types.length === 2) {
      return `${types.join(' + ')} scan - great progress tracking!`;
    } else {
      return `${types[0]} scan completed`;
    }
  };

  const totalScans = Object.keys(groupedScans).length;
  const currentYear = new Date().getFullYear();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading your scan history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">📖 Scan History</h1>
              <p className="text-muted-foreground">Track your body scan progress over time</p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold text-foreground">{totalScans}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-full bg-secondary/10">
                <Calendar className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Year</p>
                <p className="text-2xl font-bold text-foreground">
                  {Object.keys(groupedScans).filter(date => 
                    new Date(date).getFullYear() === currentYear
                  ).length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-full bg-accent/10">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recent Streak</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalScans > 0 ? '🔥 Active' : 'Start Today'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Timeline */}
        {totalScans === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Scans Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your body scan journey to track your progress over time
            </p>
            <Button onClick={() => navigate('/body-scan-ai')} className="px-8">
              Take Your First Scan
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Timeline</h2>
            
            {Object.entries(groupedScans)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, dateScans]) => {
                const thumbnails = getImageThumbnails(dateScans);
                const summaryText = getSummaryText(dateScans);
                const weight = dateScans.find(scan => scan.weight)?.weight;
                
                return (
                  <div
                    key={date}
                    className="bg-card rounded-xl border border-border p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
                    onClick={() => handleViewFullSession(dateScans)}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Thumbnails */}
                      <div className="flex space-x-2 flex-shrink-0">
                        {thumbnails.front && (
                          <div className="w-16 h-20 bg-muted/10 rounded-lg overflow-hidden">
                            <img
                              src={thumbnails.front}
                              alt="Front view"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {thumbnails.side && (
                          <div className="w-16 h-20 bg-muted/10 rounded-lg overflow-hidden">
                            <img
                              src={thumbnails.side}
                              alt="Side view"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {thumbnails.back && (
                          <div className="w-16 h-20 bg-muted/10 rounded-lg overflow-hidden">
                            <img
                              src={thumbnails.back}
                              alt="Back view"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                              {format(new Date(date), 'MMMM d, yyyy')}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(date), 'EEEE')}</span>
                              </div>
                              {weight && (
                                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                  <Scale className="h-4 w-4" />
                                  <span>{weight} lbs</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <p className="text-muted-foreground text-sm leading-relaxed overflow-hidden"
                           style={{
                             display: '-webkit-box',
                             WebkitLineClamp: 2,
                             WebkitBoxOrient: 'vertical'
                           }}>
                          {summaryText}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-2">
                            {dateScans.map((scan, index) => (
                              <span
                                key={scan.id}
                                className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full capitalize"
                              >
                                {scan.type}
                              </span>
                            ))}
                          </div>
                          
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(dateScans[0].created_at), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}