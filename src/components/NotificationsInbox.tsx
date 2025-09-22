import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, FileText, Clock, CheckCircle } from "lucide-react";
import { ProposalReviewDialog } from "./ProposalReviewDialog";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

interface Notification {
  id: string;
  case_id?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_required: boolean;
  created_at: string;
  metadata?: any;
}

interface Proposal {
  id: string;
  case_id: string;
  lawyer_id: string;
  consultation_fee: number;
  remaining_fee: number;
  total_fee: number;
  timeline: string;
  strategy: string;
  generated_content: string;
  status: string;
  created_at: string;
  viewed_at?: string;
}

export const NotificationsInbox = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentLanguage } = useLanguage();

  useEffect(() => {
    fetchNotifications();
    fetchProposals();
    
    // Set up real-time subscription for notifications
    let channel: any = null;
    
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    }
  };

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleViewProposal = async (proposalId: string) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    // Mark proposal as viewed if not already
    if (!proposal.viewed_at) {
      try {
        await supabase
          .from('proposals')
          .update({ 
            viewed_at: new Date().toISOString(),
            status: 'viewed'
          })
          .eq('id', proposalId);

        setProposals(prev => 
          prev.map(p => p.id === proposalId ? 
            { ...p, viewed_at: new Date().toISOString(), status: 'viewed' } : p
          )
        );
      } catch (error) {
        console.error('Error updating proposal view status:', error);
      }
    }

    setSelectedProposal(proposal);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'proposal_received':
        return <FileText className="h-4 w-4" />;
      case 'proposal_accepted':
      case 'proposal_rejected':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationVariant = (type: string, isRead: boolean) => {
    if (isRead) return "secondary";
    switch (type) {
      case 'proposal_received':
        return "default";
      case 'proposal_accepted':
        return "default";
      case 'proposal_rejected':
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {currentLanguage === 'ar' ? 'صندوق الإشعارات' : 'Notifications Inbox'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {currentLanguage === 'ar' ? 'صندوق الإشعارات' : 'Notifications Inbox'}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {currentLanguage === 'ar' ? 'لا توجد إشعارات' : 'No notifications yet'}
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    !notification.is_read 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-background'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      !notification.is_read ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{notification.title}</h4>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant={getNotificationVariant(notification.type, notification.is_read)}>
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(notification.created_at).toLocaleDateString()}
                        </div>
                        
                        {notification.action_required && notification.type === 'proposal_received' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const proposalId = notification.metadata?.proposal_id;
                              if (proposalId) {
                                handleViewProposal(proposalId);
                                markAsRead(notification.id);
                              }
                            }}
                          >
                            {currentLanguage === 'ar' ? 'مراجعة العرض' : 'View Proposal'}
                          </Button>
                        )}
                        
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            {currentLanguage === 'ar' ? 'تم القراءة' : 'Mark as Read'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProposal && (
        <ProposalReviewDialog
          open={!!selectedProposal}
          onOpenChange={() => setSelectedProposal(null)}
          proposal={selectedProposal}
          onProposalUpdate={fetchProposals}
        />
      )}
    </>
  );
};