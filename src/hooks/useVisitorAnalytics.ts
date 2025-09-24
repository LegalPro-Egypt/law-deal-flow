import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VisitorAnalytics {
  id: string;
  visitor_hash: string;
  country: string | null;
  city: string | null;
  region: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  page_path: string;
  referrer_url: string | null;
  session_id: string;
  first_visit: string;
  last_visit: string;
  page_views_count: number;
  session_duration: number | null;
  is_excluded: boolean;
  is_excluded_admin: boolean;
  bot_confidence_score: number;
  bot_classification: 'human' | 'likely_human' | 'uncertain' | 'likely_bot' | 'confirmed_bot';
  detection_reasons: string[];
  meaningful_interaction: boolean;
  screen_resolution: string | null;
  timezone: string | null;
  language_preferences: string[] | null;
  ip_info: any;
  created_at: string;
  updated_at: string;
}

interface AnalyticsStats {
  totalVisitors: number;
  uniqueVisitors: number;
  totalPageViews: number;
  averageSessionDuration: number;
  topCountries: Array<{ country: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  browserBreakdown: Array<{ browser: string; count: number }>;
  botBreakdown: Array<{ classification: string; count: number }>;
  recentVisitors: VisitorAnalytics[];
  dailyVisitors: Array<{ date: string; visitors: number; pageViews: number; bots: number }>;
  botStats: {
    totalBots: number;
    confirmedBots: number;
    likelyBots: number;
    uncertainVisitors: number;
    humanVisitors: number;
  };
}

export const useVisitorAnalytics = (dateRange: { from: Date; to: Date }, rangeType?: string, botFilter: 'all' | 'humans' | 'bots' = 'humans') => {
  return useQuery({
    queryKey: ['visitor-analytics', dateRange.from.getTime(), dateRange.to.getTime(), rangeType, botFilter],
    queryFn: async (): Promise<AnalyticsStats> => {
      const fromISO = dateRange.from.toISOString();
      const toISO = dateRange.to.toISOString();
      
      console.log('Fetching analytics with date range:', {
        from: fromISO,
        to: toISO,
        rangeType,
        botFilter,
        fromDate: dateRange.from,
        toDate: dateRange.to
      });

      // Query visitor analytics with date filtering and bot detection
      let query = supabase
        .from('visitor_analytics')
        .select('*')
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .eq('is_excluded_admin', false) // Exclude admin users
        .order('created_at', { ascending: false });

      // Apply bot filtering
      if (botFilter === 'humans') {
        query = query.in('bot_classification', ['human', 'likely_human']);
      } else if (botFilter === 'bots') {
        query = query.in('bot_classification', ['likely_bot', 'confirmed_bot']);
      }
      // For 'all', don't add any bot classification filter

      const { data: visitors, error } = await query;

      if (error) {
        console.error('Analytics query error:', error);
        throw new Error(`Failed to fetch analytics: ${error.message}`);
      }

      console.log(`Found ${visitors?.length || 0} analytics records`);

      if (!visitors || visitors.length === 0) {
        console.log('No analytics data found for date range with bot filter:', botFilter);
        return {
          totalVisitors: 0,
          uniqueVisitors: 0,
          totalPageViews: 0,
          averageSessionDuration: 0,
          topCountries: [],
          topPages: [],
          deviceBreakdown: [],
          browserBreakdown: [],
          botBreakdown: [],
          recentVisitors: [],
          dailyVisitors: [],
          botStats: {
            totalBots: 0,
            confirmedBots: 0,
            likelyBots: 0,
            uncertainVisitors: 0,
            humanVisitors: 0
          }
        };
      }

      const visitorData = visitors as VisitorAnalytics[];

        // Calculate stats
        const totalVisitors = visitorData.length;
        const uniqueVisitors = new Set(visitorData.map(v => v.visitor_hash)).size;
        const totalPageViews = visitorData.reduce((sum, v) => sum + v.page_views_count, 0);
        const averageSessionDuration = visitorData.reduce((sum, v) => sum + (v.session_duration || 0), 0) / totalVisitors || 0;

        // Top countries
        const countryCount = visitorData.reduce((acc, v) => {
          if (v.country) {
            acc[v.country] = (acc[v.country] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const topCountries = Object.entries(countryCount)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Top pages
        const pageCount = visitorData.reduce((acc, v) => {
          acc[v.page_path] = (acc[v.page_path] || 0) + v.page_views_count;
          return acc;
        }, {} as Record<string, number>);
        
        const topPages = Object.entries(pageCount)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Device breakdown
        const deviceCount = visitorData.reduce((acc, v) => {
          if (v.device_type) {
            acc[v.device_type] = (acc[v.device_type] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const deviceBreakdown = Object.entries(deviceCount)
          .map(([device, count]) => ({ device, count }))
          .sort((a, b) => b.count - a.count);

        // Browser breakdown
        const browserCount = visitorData.reduce((acc, v) => {
          if (v.browser) {
            acc[v.browser] = (acc[v.browser] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const browserBreakdown = Object.entries(browserCount)
          .map(([browser, count]) => ({ browser, count }))
          .sort((a, b) => b.count - a.count);

        // Bot classification breakdown
        const botCount = visitorData.reduce((acc, v) => {
          if (v.bot_classification) {
            acc[v.bot_classification] = (acc[v.bot_classification] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const botBreakdown = Object.entries(botCount)
          .map(([classification, count]) => ({ classification, count }))
          .sort((a, b) => b.count - a.count);

        // Calculate bot statistics
        const botStats = {
          totalBots: visitorData.filter(v => ['likely_bot', 'confirmed_bot'].includes(v.bot_classification)).length,
          confirmedBots: visitorData.filter(v => v.bot_classification === 'confirmed_bot').length,
          likelyBots: visitorData.filter(v => v.bot_classification === 'likely_bot').length,
          uncertainVisitors: visitorData.filter(v => v.bot_classification === 'uncertain').length,
          humanVisitors: visitorData.filter(v => ['human', 'likely_human'].includes(v.bot_classification)).length
        };

        // Generate time-based visitor data based on range type
        let dailyVisitors: { date: string; visitors: number; pageViews: number; bots: number }[] = [];
        
        if (rangeType === 'today') {
          // Generate hourly data for today
          const hours = Array.from({ length: 24 }, (_, i) => {
            const hour = new Date(dateRange.from);
            hour.setHours(i, 0, 0, 0);
            return hour;
          });
          
          dailyVisitors = hours.map(hour => {
            const hourEnd = new Date(hour);
            hourEnd.setHours(hour.getHours() + 1);
            
            const hourlyVisitors = visitorData.filter(visitor => {
              const visitTime = new Date(visitor.created_at);
              return visitTime >= hour && visitTime < hourEnd;
            });
            
            const hourlyBots = hourlyVisitors.filter(v => 
              ['likely_bot', 'confirmed_bot'].includes(v.bot_classification)
            );
            
            return {
              date: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              visitors: new Set(hourlyVisitors.map(v => v.visitor_hash)).size,
              pageViews: hourlyVisitors.reduce((sum, v) => sum + v.page_views_count, 0),
              bots: hourlyBots.length
            };
          });
        } else {
          // Generate daily data for other ranges
          const days: Date[] = [];
          const currentDate = new Date(dateRange.from);
          
          while (currentDate <= dateRange.to) {
            days.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          dailyVisitors = days.map(day => {
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);
            
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            
            const dailyData = visitorData.filter(visitor => {
              const visitTime = new Date(visitor.created_at);
              return visitTime >= dayStart && visitTime <= dayEnd;
            });
            
            const dailyBots = dailyData.filter(v => 
              ['likely_bot', 'confirmed_bot'].includes(v.bot_classification)
            );
            
            return {
              date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              visitors: new Set(dailyData.map(v => v.visitor_hash)).size,
              pageViews: dailyData.reduce((sum, v) => sum + v.page_views_count, 0),
              bots: dailyBots.length
            };
          });
        }

        const result = {
          totalVisitors,
          uniqueVisitors,
          totalPageViews,
          averageSessionDuration,
          topCountries,
          topPages,
          deviceBreakdown,
          browserBreakdown,
          botBreakdown,
          recentVisitors: visitorData.slice(0, 50),
          dailyVisitors,
          botStats
        };

        console.log('Final analytics result:', result);
        return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      console.log('Query retry attempt:', failureCount, error?.message);
      // Only retry on network errors, not on data/query errors
      if (failureCount < 3 && (error instanceof TypeError || error?.message?.includes('network'))) {
        return true;
      }
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};