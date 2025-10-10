import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { MessageCircle, Send, X, Paperclip, FileText, Image as ImageIcon, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLawyerChatNotifications } from '@/hooks/useLawyerChatNotifications';
import { useChatFileUpload } from '@/hooks/useChatFileUpload';
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

export const LawyerDirectChatInterface: React.FC<LawyerDirectChatInterfaceProps> = ({
  caseId,
  caseTitle,
  clientName,
  onClose
}) => {
  const { user } = useAuth();
  const { markMessagesAsRead, sendMessage } = useLawyerChatNotifications();
  const { uploadFile, isUploading, uploadProgress } = useChatFileUpload();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat messages
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('case_messages')
        .select('id, role, content, created_at, is_read, message_type, metadata')
        .eq('case_id', caseId)
        .eq('metadata->>channel', 'direct')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []) as ChatMessage[]);
      
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

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    const uploaded = await uploadFile(f, caseId);
    if (uploaded) {
      await supabase.from('case_messages').insert({
        case_id: caseId,
        role: 'lawyer',
        content: '',
        message_type: 'file',
        metadata: { channel: 'direct', file: uploaded } as any
      });
    }
    e.target.value = '';
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

  // Lock body scroll when chat opens
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
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

  const renderMessageContent = (m: ChatMessage) => {
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
            <div className="text-[11px] opacity-70 mt-1 break-words">
              {f.name} ({(f.size/1024).toFixed(1)} KB)
            </div>
          </div>
        );
      }
      return (
        <a href={f.url} target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-2 underline text-sm break-words">
          <FileText className="w-4 h-4" />
          {f.name} ({(f.size/1024).toFixed(1)} KB)
        </a>
      );
    }
    return <div className="text-[14px] leading-[1.4] break-words whitespace-pre-wrap">{m.content}</div>;
  };

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          onClick={onClose}
          style={{ touchAction: 'none' }}
        />
        
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[61] bg-background flex flex-col"
          style={{ 
            willChange: 'transform',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
        {/* Header */}
        <div className="h-16 bg-background/95 backdrop-blur-md border-b flex items-center justify-between px-4 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base truncate">Chat with {clientName}</h2>
              <p className="text-xs text-muted-foreground truncate">{caseTitle}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 p-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ overscrollBehavior: 'contain' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No messages yet. Start the conversation with your client!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-w-4xl mx-auto">
              {messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const isFirstInGroup = !prevMessage || prevMessage.role !== message.role;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'lawyer' ? 'justify-end' : 'justify-start'
                    } ${isFirstInGroup && index !== 0 ? 'mt-4' : ''}`}
                  >
                    <div
                      className={`
                        relative inline-block max-w-[85%] md:max-w-[70%] px-3 py-2 shadow-sm
                        ${message.role === 'lawyer'
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
                        {formatMessageTime(message.created_at)}
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
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message to the client..."
                disabled={sending || isUploading}
                className="flex-1 h-11"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending || isUploading}
                size="icon"
                className="h-11 w-11 flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
      </>
    </AnimatePresence>
  );
};