import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVisitorAnalytics } from '@/hooks/useVisitorAnalytics';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Eye, 
  Clock, 
  Globe, 
  Smartphone, 
  Monitor,
  Tablet,
  Chrome,
  Globe2,
  Search,
  RefreshCw,
  Check,
  Bot,
  UserCheck,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const deviceIcons = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor
};

const browserIcons = {
  chrome: Chrome,
  firefox: Globe2,
  safari: Search,
  edge: Globe,
  unknown: Globe
};

type DateRangeOption = 'today' | '7days' | '30days' | 'alltime';

const getDateRange = (option: DateRangeOption): { from: Date; to: Date } => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  
  switch (option) {
    case 'today':
      return {
        from: startOfToday,
        to: endOfToday
      };
    case '7days':
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return {
        from: sevenDaysAgo,
        to: endOfToday
      };
    case '30days':
      const thirtyDaysAgo = new Date(startOfToday);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        from: thirtyDaysAgo,
        to: endOfToday
      };
    case 'alltime':
    default:
      return {
        from: new Date('2024-01-01T00:00:00.000Z'),
        to: endOfToday
      };
  }
};

const getDateRangeLabel = (option: DateRangeOption): string => {
  switch (option) {
    case 'today':
      return 'today';
    case '7days':
      return 'last 7 days';
    case '30days':
      return 'last 30 days';
    case 'alltime':
      return 'all time';
    default:
      return 'last 30 days';
  }
};

export const AdminAnalytics = () => {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('30days');
  const [botFilter, setBotFilter] = useState<'all' | 'humans' | 'bots'>('humans');
  const dateRange = getDateRange(selectedRange);

  const { data: analytics, isLoading, refetch, isFetching } = useVisitorAnalytics(dateRange, selectedRange, botFilter);
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Analytics refreshed",
        description: "Your visitor analytics have been updated with the latest data.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Unable to refresh analytics data. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Visitor Analytics</h2>
          <p className="text-muted-foreground">
            Track your website visitors and their behavior ({getDateRangeLabel(selectedRange)} - {botFilter})
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={botFilter} onValueChange={(value: 'all' | 'humans' | 'bots') => setBotFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="humans">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Humans Only
                </div>
              </SelectItem>
              <SelectItem value="bots">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Bots Only
                </div>
              </SelectItem>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All Traffic
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-lg w-fit">
        {([
          { key: 'today', label: 'Today' },
          { key: '7days', label: 'Last 7 Days' },
          { key: '30days', label: 'Last 30 Days' },
          { key: 'alltime', label: 'All Time' }
        ] as const).map(({ key, label }) => (
          <Button
            key={key}
            variant={selectedRange === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedRange(key)}
            className={cn(
              "transition-all",
              selectedRange === key && "shadow-sm"
            )}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalVisitors}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.uniqueVisitors} unique visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPageViews}</div>
            <p className="text-xs text-muted-foreground">
              {(analytics.totalPageViews / analytics.uniqueVisitors || 0).toFixed(1)} per visitor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(Math.floor(analytics.averageSessionDuration))}
            </div>
            <p className="text-xs text-muted-foreground">
              Average time on site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Human Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.botStats.humanVisitors}
            </div>
            <p className="text-xs text-muted-foreground">
              Real human traffic
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detected Bots</CardTitle>
            <Bot className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics.botStats.totalBots}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.botStats.confirmedBots} confirmed bots
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="traffic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="bots">Bot Detection</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedRange === 'today' ? 'Hourly Visitors' : 'Daily Visitors'}
              </CardTitle>
              <CardDescription>
                Visitor trends over the {getDateRangeLabel(selectedRange)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                 <LineChart data={analytics.dailyVisitors}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="date" />
                   <YAxis />
                   <Tooltip />
                   <Line type="monotone" dataKey="visitors" stroke="#8884d8" strokeWidth={2} name="Human Visitors" />
                   <Line type="monotone" dataKey="pageViews" stroke="#82ca9d" strokeWidth={2} name="Page Views" />
                   {botFilter === 'all' && (
                     <Line type="monotone" dataKey="bots" stroke="#ff8042" strokeWidth={2} name="Bot Traffic" />
                   )}
                 </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bots" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Bot Classification</CardTitle>
                <CardDescription>Breakdown of visitor types detected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.botBreakdown.map((item, index) => {
                    const icons = {
                      human: UserCheck,
                      likely_human: UserCheck,
                      uncertain: AlertTriangle,
                      likely_bot: Bot,
                      confirmed_bot: Shield
                    };
                    const colors = {
                      human: 'text-green-600',
                      likely_human: 'text-green-500',
                      uncertain: 'text-yellow-500',
                      likely_bot: 'text-orange-500',
                      confirmed_bot: 'text-red-600'
                    };
                    const Icon = icons[item.classification as keyof typeof icons] || Bot;
                    const colorClass = colors[item.classification as keyof typeof colors] || 'text-gray-500';
                    
                    return (
                      <div key={item.classification} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className={cn("h-4 w-4", colorClass)} />
                          <span className="capitalize">{item.classification.replace('_', ' ')}</span>
                        </div>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bot Detection Stats</CardTitle>
                <CardDescription>Summary of bot detection results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span>Human Visitors</span>
                    </div>
                    <Badge variant="secondary" className="text-green-600">
                      {analytics.botStats.humanVisitors}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span>Uncertain</span>
                    </div>
                    <Badge variant="secondary" className="text-yellow-600">
                      {analytics.botStats.uncertainVisitors}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4 text-orange-500" />
                      <span>Likely Bots</span>
                    </div>
                    <Badge variant="secondary" className="text-orange-600">
                      {analytics.botStats.likelyBots}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      <span>Confirmed Bots</span>
                    </div>
                    <Badge variant="secondary" className="text-red-600">
                      {analytics.botStats.confirmedBots}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Detection Accuracy</span>
                      <span className="text-green-600">
                        {((analytics.botStats.humanVisitors + analytics.botStats.confirmedBots) / 
                          (analytics.totalVisitors || 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visitors by Country</CardTitle>
              <CardDescription>Geographic distribution of your visitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topCountries.map((country, index) => (
                  <div key={country.country} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{country.country}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(country.count / analytics.topCountries[0].count) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{country.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
                <CardDescription>Breakdown by device category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.deviceBreakdown.map((device, index) => {
                    const Icon = deviceIcons[device.device as keyof typeof deviceIcons] || Monitor;
                    return (
                      <div key={device.device} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span className="capitalize">{device.device}</span>
                        </div>
                        <Badge variant="secondary">{device.count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browsers</CardTitle>
                <CardDescription>Popular browsers among visitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.browserBreakdown.map((browser, index) => {
                    const Icon = browserIcons[browser.browser as keyof typeof browserIcons] || Globe;
                    return (
                      <div key={browser.browser} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span className="capitalize">{browser.browser}</span>
                        </div>
                        <Badge variant="secondary">{browser.count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Pages</CardTitle>
              <CardDescription>Most visited pages on your site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topPages.map((page, index) => (
                  <div key={page.page} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {page.page}
                      </code>
                    </div>
                    <Badge variant="secondary">{page.count} views</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};