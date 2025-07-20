
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Tags, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

interface TagData {
  tag: string;
  count: number;
  category: string;
  recentDates: string[];
  avgMoodOnDays: number;
  avgEnergyOnDays: number;
}

export const TagInsightsSection = () => {
  const { user } = useAuth();
  const [tagData, setTagData] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('month');

  useEffect(() => {
    const fetchTagInsights = async () => {
      if (!user) return;

      try {
        const today = new Date();
        const startDate = new Date();
        if (timeRange === 'week') {
          startDate.setDate(today.getDate() - 7);
        } else {
          startDate.setMonth(today.getMonth() - 1);
        }

        const { data: moodLogs, error } = await supabase
          .from('mood_logs')
          .select('date, mood, energy, wellness, ai_detected_tags')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', today.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (error) {
          console.error('Error fetching tag insights:', error);
          return;
        }

        // Process tag data
        const tagAnalysis: Record<string, {
          count: number;
          dates: string[];
          moodScores: number[];
          energyScores: number[];
        }> = {};

        moodLogs?.forEach(log => {
          if (log.ai_detected_tags && Array.isArray(log.ai_detected_tags)) {
            log.ai_detected_tags.forEach((tag: string) => {
              if (!tagAnalysis[tag]) {
                tagAnalysis[tag] = {
                  count: 0,
                  dates: [],
                  moodScores: [],
                  energyScores: []
                };
              }
              tagAnalysis[tag].count++;
              tagAnalysis[tag].dates.push(log.date);
              if (log.mood) tagAnalysis[tag].moodScores.push(log.mood);
              if (log.energy) tagAnalysis[tag].energyScores.push(log.energy);
            });
          }
        });

        // Convert to TagData array and sort by frequency
        const processedTags: TagData[] = Object.entries(tagAnalysis)
          .map(([tag, analysis]) => ({
            tag,
            count: analysis.count,
            category: getTagCategory(tag),
            recentDates: analysis.dates.slice(-3),
            avgMoodOnDays: analysis.moodScores.length > 0 
              ? analysis.moodScores.reduce((sum, score) => sum + score, 0) / analysis.moodScores.length
              : 0,
            avgEnergyOnDays: analysis.energyScores.length > 0
              ? analysis.energyScores.reduce((sum, score) => sum + score, 0) / analysis.energyScores.length
              : 0
          }))
          .filter(tagData => tagData.count >= 2) // Only show tags that appear at least twice
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Top 10 most frequent tags

        setTagData(processedTags);
      } catch (error) {
        console.error('Error processing tag insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTagInsights();
  }, [user, timeRange]);

  const getTagCategory = (tag: string): string => {
    const categories = {
      physical: ['headache', 'bloating', 'fatigue', 'nausea', 'joint_pain', 'muscle_tension', 'digestive_issues', 'skin_problems', 'dizziness', 'pain'],
      emotional: ['anxious', 'stressed', 'depressed', 'irritable', 'motivated', 'content', 'overwhelmed', 'focused', 'happy', 'sad', 'angry', 'grateful'],
      sleep: ['insomnia', 'restless_sleep', 'oversleeping', 'sleep_quality_poor', 'sleep_quality_good', 'tired', 'well_rested'],
      energy: ['energetic', 'sluggish', 'alert', 'brain_fog', 'lethargic', 'refreshed', 'burnt_out'],
      digestive: ['bloated', 'constipated', 'stomach_ache', 'acid_reflux', 'good_digestion', 'cramps', 'indigestion']
    };

    for (const [category, tags] of Object.entries(categories)) {
      if (tags.includes(tag)) return category;
    }
    return 'other';
  };

  const getCategoryColor = (category: string): string => {
    const colors = {
      physical: 'bg-red-100 text-red-700 border-red-200',
      emotional: 'bg-blue-100 text-blue-700 border-blue-200',
      sleep: 'bg-purple-100 text-purple-700 border-purple-200',
      energy: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      digestive: 'bg-green-100 text-green-700 border-green-200',
      other: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      physical: '🩺',
      emotional: '🧠',
      sleep: '😴',
      energy: '⚡',
      digestive: '🫄',
      other: '🏷️'
    };
    return icons[category as keyof typeof icons] || icons.other;
  };

  const getImpactColor = (avgScore: number): string => {
    if (avgScore >= 7) return 'text-green-600';
    if (avgScore >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div>
        <SectionHeader icon={Tags} title="Pattern Insights" subtitle="AI-detected wellness patterns" />
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader icon={Tags} title="Pattern Insights" subtitle="AI-detected wellness patterns" />
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-6">
          {/* Time Range Toggle */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Most Common Patterns
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  timeRange === 'week'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  timeRange === 'month'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {tagData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No patterns detected yet.</p>
              <p className="text-sm">Keep logging your mood and wellness to unlock insights!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tagData.map((tag) => (
                <div
                  key={tag.tag}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getCategoryIcon(tag.category)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {tag.tag.replace(/_/g, ' ')}
                        </span>
                        <Badge className={`text-xs ${getCategoryColor(tag.category)}`}>
                          {tag.category}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{tag.count} times</span>
                        </span>
                        {tag.avgMoodOnDays > 0 && (
                          <span className={`flex items-center space-x-1 ${getImpactColor(tag.avgMoodOnDays)}`}>
                            <span>Mood: {tag.avgMoodOnDays.toFixed(1)}/10</span>
                          </span>
                        )}
                        {tag.avgEnergyOnDays > 0 && (
                          <span className={`flex items-center space-x-1 ${getImpactColor(tag.avgEnergyOnDays)}`}>
                            <span>Energy: {tag.avgEnergyOnDays.toFixed(1)}/10</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {(tag.avgMoodOnDays < 5 || tag.avgEnergyOnDays < 5) && tag.count >= 3 && (
                      <div className="flex items-center space-x-1 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">Worth monitoring</span>
                      </div>
                    )}
                    {(tag.avgMoodOnDays >= 7 && tag.avgEnergyOnDays >= 7) && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs">Positive pattern</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
