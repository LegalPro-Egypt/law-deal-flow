import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { MessageCircle, Send, X, Paperclip, FileText, Image as ImageIcon, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useChatFileUpload } from '@/hooks/useChatFileUpload';

interface Message {
  id: string;
  role: 'user' | 'lawyer';
  content: string;
  created_at: string;
  is_read: boolean;
  message_type?: 'text' | 'file';
  metadata?: { 
    channel?: string; 
    file?: {
      name: string;
      url: string;
      type: string;
      size: number;
    };
    [key: string]: any;
  };
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
  const { uploadFile, isUploading, uploadProgress } = useChatFileUpload();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'lawyer'>('client');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .select('id, role, content, created_at, is_read, message_type, metadata')
        .eq('case_id', caseId)
        .eq('metadata->>channel', 'direct')
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
          metadata: { channel: 'direct' }
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

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('DirectChatInterface: handleFileSelect called');
    const f = e.target.files?.[0];
    if (!f) {
      console.log('DirectChatInterface: No file selected');
      return;
    }

    console.log('DirectChatInterface: Starting file upload for:', f.name);
    try {
      const uploaded = await uploadFile(f, caseId);
      if (!uploaded) {
        console.log('DirectChatInterface: Upload failed');
        return;
      }

      console.log('DirectChatInterface: Upload successful, inserting message');
      const { error } = await supabase.from('case_messages').insert({
        case_id: caseId,
        role: (userRole === 'lawyer' ? 'lawyer' : 'user'),
        content: '',
        message_type: 'file',
        metadata: { channel: 'direct', file: uploaded } as any
      });

      if (error) {
        console.error('DirectChatInterface: Database insert error:', error);
        toast({
          title: "Error",
          description: "Failed to save file message",
          variant: "destructive",
        });
      } else {
        console.log('DirectChatInterface: Message inserted successfully');
      }
    } catch (error) {
      console.error('DirectChatInterface: Upload error:', error);
    } finally {
      // Reset file input
      e.target.value = '';
      console.log('DirectChatInterface: File input reset');
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
            // Only process messages from the direct channel
            if (newMsg.metadata?.channel === 'direct') {
              setMessages(prev => [...prev, newMsg]);
              
              // Auto-mark as read if it's not our own message
              const messageRole = newMsg.role;
              const shouldMarkAsRead = 
                (userRole === 'client' && messageRole === 'lawyer') ||
                (userRole === 'lawyer' && messageRole === 'user');
              
              if (shouldMarkAsRead) {
                markMessagesAsRead(caseId);
              }
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const renderMessageContent = (m: Message) => {
    if (m.message_type === 'file' && m.metadata?.file) {
      const f = m.metadata.file;
      if (f.type?.startsWith('image/')) {
        return (
          <div className="overflow-hidden">
            <img 
              src={f.url} 
              alt={f.name} 
              className="w-full max-w-[220px] h-auto max-h-[160px] object-contain rounded-lg" 
            />
            <div className="text-[11px] opacity-70 mt-1 break-all">
              {f.name} ({(f.size/1024).toFixed(1)} KB)
            </div>
          </div>
        );
      }
      return (
        <a href={f.url} target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-2 underline text-sm break-all">
          <FileText className="w-4 h-4" />
          {f.name} ({(f.size/1024).toFixed(1)} KB)
        </a>
      );
    }
    return <div className="text-[14px] leading-[1.4] break-words whitespace-pre-wrap">{m.content}</div>;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
        style={{ willChange: 'transform' }}
      >
        {/* Header */}
        <div className="h-16 bg-background/95 backdrop-blur-md border-b flex items-center justify-between px-4 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base truncate">{caseTitle}</h2>
              <p className="text-xs text-muted-foreground">Direct Chat</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 p-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-w-4xl mx-auto">
              {messages.map((message, index) => {
                const isOwnMessage = 
                  (userRole === 'client' && message.role === 'user') ||
                  (userRole === 'lawyer' && message.role === 'lawyer');
                
                const prevMessage = messages[index - 1];
                const isFirstInGroup = !prevMessage || prevMessage.role !== message.role;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isFirstInGroup && index !== 0 ? 'mt-4' : ''}`}
                  >
                    <div
                      className={`
                        relative inline-block max-w-[85%] md:max-w-[70%] px-3 py-2 shadow-sm
                        ${isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                        }
                        rounded-2xl transition-shadow hover:shadow-md
                      `}
                    >
                      <div className="pr-14">
                        {renderMessageContent(message)}
                      </div>
                      <div className={`absolute bottom-1.5 right-2.5 text-[11px] opacity-70`}>
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-background/95 backdrop-blur-md border-t p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto space-y-2">
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
            
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xlsx,.ppt,.pptx"
                className="hidden"
                onChange={(e) => { e.stopPropagation(); handleFileSelect(e); }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={isUploading || sending}
                className="h-11 w-11 flex-shrink-0"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={sending || isUploading}
                className="flex-1 h-11"
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending || isUploading}
                size="icon"
                className="h-11 w-11 flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              {sending ? 'Sending...' : isUploading ? 'Uploading file...' : 'Press Enter to send, Shift+Enter for new line'}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};