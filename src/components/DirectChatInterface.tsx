import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, User, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useChatNotifications } from '@/hooks/useChatNotifications';

interface Message {
  id: string;
  role: 'user' | 'lawyer';
  content: string;
  created_at: string;
  is_read: boolean;
}

interface DirectChatInterfaceProps {
  caseId: string;
  caseTitle: string;
  onClose?: () => void;
}

export const DirectChatInterface: React.FC<DirectChatInterfaceProps> = ({
  caseId,
  caseTitle,
  onClose
}) => {
  const { user } = useAuth();
  const { markMessagesAsRead } = useChatNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'lawyer'>('client');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get user's role
  useEffect(() => {
    const getUserRole = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setUserRole(profile?.role === 'lawyer' ? 'lawyer' : 'client');
    };

    getUserRole();
  }, [user]);

  // Fetch chat messages
  const fetchMessages = async () => {
    if (!caseId) return;

    try {
      const { data, error } = await supabase
        .from('case_messages')
        .select('id, role, content, created_at, is_read')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []) as Message[]);
      
      // Mark messages as read when chat opens
      if (data && data.length > 0) {
        await markMessagesAsRead(caseId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    
    try {
      const messageRole = userRole === 'lawyer' ? 'lawyer' : 'user';
      
      const { error } = await supabase
        .from('case_messages')
        .insert({
          case_id: caseId,
          role: messageRole,
          content: newMessage.trim(),
          message_type: 'text',
          metadata: {}
        });

      if (error) throw error;

      setNewMessage('');
      // Messages will be updated via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!caseId) return;

    fetchMessages();

    const channel = supabase
      .channel(`case-${caseId}-messages`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_messages',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            setMessages(prev => [...prev, newMsg]);
            
            // Auto-mark as read if it's not our own message
            const messageRole = newMsg.role;
            const shouldMarkAsRead = 
              (userRole === 'client' && messageRole === 'lawyer') ||
              (userRole === 'lawyer' && messageRole === 'user');
            
            if (shouldMarkAsRead) {
              markMessagesAsRead(caseId);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, userRole]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when component mounts
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead(caseId);
    }
  }, [caseId, messages.length]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageIcon = (role: string) => {
    return role === 'lawyer' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat - {caseTitle}
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Messages Area */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-96 w-full rounded-md border p-4"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = 
                  (userRole === 'client' && message.role === 'user') ||
                  (userRole === 'lawyer' && message.role === 'lawyer');
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        {getMessageIcon(message.role)}
                        <Badge variant="outline" className="text-xs">
                          {message.role === 'lawyer' ? 'Lawyer' : 'Client'}
                        </Badge>
                        <span className="text-xs opacity-70">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            size="sm"
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Status */}
        <div className="text-xs text-muted-foreground text-center">
          {sending ? 'Sending...' : 'Press Enter to send, Shift+Enter for new line'}
        </div>
      </CardContent>
    </Card>
  );
};