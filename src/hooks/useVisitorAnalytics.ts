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
  recentVisitors: VisitorAnalytics[];
  dailyVisitors: Array<{ date: string; visitors: number; pageViews: number }>;
}

export const useVisitorAnalytics = (dateRange: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ['visitor-analytics', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<AnalyticsStats> => {
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      // Get all visitor data within date range (excluding admin traffic)
      const { data: visitors, error } = await supabase
        .from('visitor_analytics')
        .select('*')
        .eq('is_excluded', false)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching visitor analytics:', error);
        throw error;
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

      // Daily visitors (last 7 days)
      const dailyStats = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayVisitors = visitorData.filter(v => 
          v.created_at.startsWith(dateStr)
        );
        
        return {
          date: dateStr,
          visitors: new Set(dayVisitors.map(v => v.visitor_hash)).size,
          pageViews: dayVisitors.reduce((sum, v) => sum + v.page_views_count, 0)
        };
      }).reverse();

      return {
        totalVisitors,
        uniqueVisitors,
        totalPageViews,
        averageSessionDuration,
        topCountries,
        topPages,
        deviceBreakdown,
        browserBreakdown,
        recentVisitors: visitorData.slice(0, 50),
        dailyVisitors: dailyStats
      };
    },
    staleTime: 0, // Always consider data stale for manual refresh
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};