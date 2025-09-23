import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, User, UserCheck, Gavel } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLawyerChatNotifications } from '@/hooks/useLawyerChatNotifications';
import { toast } from '@/hooks/use-toast';

interface LawyerDirectChatInterfaceProps {
  caseId: string;
  caseTitle: string;
  clientName: string;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  is_read: boolean;
  metadata?: { channel?: string; [key: string]: any };
}

export const LawyerDirectChatInterface: React.FC<LawyerDirectChatInterfaceProps> = ({
  caseId,
  caseTitle,
  clientName,
  onClose
}) => {
  const { user } = useAuth();
  const { markMessagesAsRead, sendMessage } = useLawyerChatNotifications();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat messages
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('case_messages')
        .select('id, role, content, created_at, is_read')
        .eq('case_id', caseId)
        .eq('metadata->>channel', 'direct')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      
      // Mark messages as read when opening chat
      if (user) {
        await markMessagesAsRead(caseId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat messages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Send a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(caseId, newMessage.trim());
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Set up real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`lawyer-case-messages-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'case_messages',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Only process messages from the direct channel
          if (newMsg.metadata?.channel === 'direct') {
            setMessages(prev => [...prev, newMsg]);
            
            // Auto-mark as read if it's not from the current lawyer
            if (newMsg.role !== 'lawyer' && user) {
              setTimeout(() => markMessagesAsRead(caseId), 1000);
            }
          }
        }
      )
      .subscribe();

    // Initial fetch
    fetchMessages();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, user]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'lawyer':
        return <Gavel className="w-4 h-4" />;
      case 'assistant':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'user':
        return clientName || 'Client';
      case 'lawyer':
        return 'You';
      case 'assistant':
        return 'AI Assistant';
      default:
        return role;
    }
  };

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat with {clientName} - {caseTitle}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-3 pt-0">
        <ScrollArea className="flex-1 mb-3">
          <div className="space-y-0 px-2">
            {loading ? (
              <div className="text-center text-muted-foreground py-4">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No messages yet. Start the conversation with your client!
              </div>
            ) : (
              messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const nextMessage = messages[index + 1];
                const isFirstInGroup = !prevMessage || prevMessage.role !== message.role;
                const isLastInGroup = !nextMessage || nextMessage.role !== message.role;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'lawyer' ? 'justify-end' : 'justify-start'
                    } ${isLastInGroup ? 'mb-3' : 'mb-0.5'}`}
                  >
                    <div
                      className={`
                        relative inline-block max-w-[75%] px-3 py-1.5 shadow-sm
                        ${message.role === 'lawyer'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-blue-500 text-white'
                        }
                        ${isFirstInGroup && isLastInGroup
                          ? message.role === 'lawyer'
                            ? 'rounded-[18px] rounded-br-[4px]'
                            : 'rounded-[18px] rounded-bl-[4px]'
                          : isFirstInGroup
                          ? message.role === 'lawyer'
                            ? 'rounded-[18px] rounded-br-[18px]'
                            : 'rounded-[18px] rounded-bl-[18px]'
                          : isLastInGroup
                          ? message.role === 'lawyer'
                            ? 'rounded-[18px] rounded-br-[4px]'
                            : 'rounded-[18px] rounded-bl-[4px]'
                          : 'rounded-[18px]'
                        }
                      `}
                    >
                      <div className="text-[14px] leading-[1.3] break-words whitespace-pre-wrap pr-12">
                        {message.content}
                      </div>
                      <div className={`absolute bottom-1 right-2 text-[11px] opacity-70 ${
                        message.role === 'lawyer' ? 'text-gray-600' : 'text-white'
                      }`}>
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message to the client..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};