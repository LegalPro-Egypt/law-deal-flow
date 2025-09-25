import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellRing, 
  Phone, 
  MessageCircle, 
  FileText, 
  CreditCard, 
  Gavel,
  Clock,
  CheckCircle,
  X,
  History,
  DollarSign
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { MoneyRequestNotification } from '@/components/MoneyRequestNotification';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationMenuProps {
  className?: string;
}

export const NotificationMenu: React.FC<NotificationMenuProps> = ({ className }) => {
  const { notifications, newNotifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const [moneyRequestNotificationOpen, setMoneyRequestNotificationOpen] = useState(false);
  const [selectedMoneyRequestId, setSelectedMoneyRequestId] = useState<string>('');

  // Mark all notifications as read when dropdown is opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen, unreadCount, markAllAsRead]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'missed_call':
        return <Phone className="h-4 w-4 text-destructive" />;
      case 'missed_message':
        return <MessageCircle className="h-4 w-4 text-warning" />;
      case 'case_activity':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'payment_request':
        return <CreditCard className="h-4 w-4 text-warning" />;
      case 'case_assigned':
        return <Gavel className="h-4 w-4 text-success" />;
      case 'proposal_received':
      case 'proposal_approved':
        return <FileText className="h-4 w-4 text-info" />;
      case 'money_request':
        return <DollarSign className="h-4 w-4 text-warning" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const formatNotificationType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Separate notifications into new and history based on 24-hour rule
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const historyNotifications = notifications.filter(n => 
    n.is_read && n.read_at && new Date(n.read_at) <= twentyFourHoursAgo
  );

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (notification.type === 'money_request' && notification.metadata?.money_request_id) {
      setSelectedMoneyRequestId(notification.metadata.money_request_id);
      setMoneyRequestNotificationOpen(true);
      markAsRead(notification.id);
    }
  };

  const renderNotifications = (notificationList: typeof notifications) => (
    <div className="divide-y">
      {notificationList.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
            !notification.is_read ? 'bg-muted/30' : ''
          }`}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="space-y-1">
                <h4 className={`text-sm font-medium truncate ${!notification.is_read ? 'font-semibold' : ''}`}>
                  {notification.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                  {notification.message}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {formatNotificationType(notification.type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 max-w-[95vw] max-h-[80vh] p-0 overflow-hidden bg-background border z-[60]">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </span>
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 m-3 mb-0">
                <TabsTrigger value="new" className="text-xs">
                  New ({newNotifications.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  History ({historyNotifications.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="new" className="mt-0">
                <ScrollArea className="h-[60vh] sm:h-96">
                  {loading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-start gap-3 animate-pulse">
                          <div className="w-8 h-8 bg-muted rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : newNotifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No new notifications</p>
                      <p className="text-sm mt-1">You're all caught up!</p>
                    </div>
                  ) : (
                    renderNotifications(newNotifications)
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="history" className="mt-0">
                <ScrollArea className="h-[60vh] sm:h-96">
                  {loading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-start gap-3 animate-pulse">
                          <div className="w-8 h-8 bg-muted rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : historyNotifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No notification history</p>
                      <p className="text-sm mt-1">Previous notifications will appear here</p>
                    </div>
                  ) : (
                    renderNotifications(historyNotifications)
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Money Request Notification Dialog */}
        <MoneyRequestNotification 
          moneyRequestId={selectedMoneyRequestId}
          open={moneyRequestNotificationOpen}
          onOpenChange={setMoneyRequestNotificationOpen}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};