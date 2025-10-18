import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { useNotifications } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Clock, History, DollarSign, Phone, MessageCircle, FileText, CreditCard, Gavel } from "lucide-react";
import { format } from "date-fns";
import { UserMenuDropdown } from "@/components/navigation/UserMenuDropdown";

export const ClientHeader = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userInitial, setUserInitial] = useState<string>("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  
  const { notifications, newNotifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Try to get full_name from metadata, otherwise use email prefix
        const fullName = user.user_metadata?.full_name;
        if (fullName) {
          setUserName(fullName);
          setUserInitial(fullName.charAt(0).toUpperCase());
        } else if (user.email) {
          const emailPrefix = user.email.split('@')[0];
          setUserName(emailPrefix);
          setUserInitial(emailPrefix.charAt(0).toUpperCase());
        }
      }
    };

    fetchUserData();
  }, []);

  // Mark all notifications as read when dropdown is opened
  useEffect(() => {
    if (isNotificationsOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isNotificationsOpen, unreadCount, markAllAsRead]);

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

  const renderNotifications = (notificationList: typeof notifications) => (
    <div className="divide-y">
      {notificationList.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 hover:bg-muted/50 transition-colors ${
            !notification.is_read ? 'bg-muted/30' : ''
          }`}
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
    <div className="flex items-center justify-between px-4 py-3">
      {/* Left: Greeting */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">👋</span>
        <h1 className="text-lg font-semibold text-foreground">
          Hello, {userName}!
        </h1>
      </div>

      {/* Right: Notification bell + Avatar */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="relative p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <NotificationBadge count={unreadCount} className="absolute -top-1 -right-1" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-[min(92vw,420px)] p-0 overflow-x-hidden bg-background border z-[60] rounded-2xl">
            <div className="p-3">
              <div className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-lg font-semibold">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </span>
                </div>
              </div>
              <Separator />
              <div className="pt-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full bg-muted rounded-xl p-1">
                    <TabsTrigger value="new" className="text-sm rounded">
                      New ({newNotifications.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-sm rounded">
                      <History className="h-3 w-3 mr-1" />
                      History ({historyNotifications.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="new" className="mt-3">
                    <ScrollArea className="max-h-[65vh] overflow-x-hidden pr-2">
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
                  
                  <TabsContent value="history" className="mt-3">
                    <ScrollArea className="max-h-[65vh] overflow-x-hidden pr-2">
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
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Avatar - For now just shows initial, could add menu later */}
        <div
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-background font-semibold"
          aria-label="Account"
        >
          {userInitial}
        </div>
      </div>
    </div>
  );
};
