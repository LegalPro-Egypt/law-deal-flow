import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, X, Paperclip, FileText, Image as ImageIcon, File, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useChatFileUpload } from '@/hooks/useChatFileUpload';

type ChatMode = 'lawyer' | 'support';

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
  lawyerId?: string;
  lawyerName?: string;
  lawyerProfilePicture?: string;
  onClose?: () => void;
}

export const DirectChatInterface: React.FC<DirectChatInterfaceProps> = ({
  caseId,
  caseTitle,
  lawyerId,
  lawyerName,
  lawyerProfilePicture,
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
  const [chatMode, setChatMode] = useState<ChatMode>('lawyer');
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
      const channel = chatMode === 'lawyer' ? 'direct' : 'support';
      
      const { data, error } = await supabase
        .from('case_messages')
        .select('id, role, content, created_at, is_read, message_type, metadata')
        .eq('case_id', caseId)
        .eq('metadata->>channel', channel)
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
      const channel = chatMode === 'lawyer' ? 'direct' : 'support';
      
      const { error } = await supabase
        .from('case_messages')
        .insert({
          case_id: caseId,
          role: messageRole,
          content: newMessage.trim(),
          message_type: 'text',
          metadata: { channel }
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

      const channel = chatMode === 'lawyer' ? 'direct' : 'support';
      
      console.log('DirectChatInterface: Upload successful, inserting message');
      const { error } = await supabase.from('case_messages').insert({
        case_id: caseId,
        role: (userRole === 'lawyer' ? 'lawyer' : 'user'),
        content: '',
        message_type: 'file',
        metadata: { channel, file: uploaded } as any
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

    const expectedChannel = chatMode === 'lawyer' ? 'direct' : 'support';
    
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
            const msgChannel = newMsg.metadata?.channel || 'direct';
            
            // Only process messages from the active channel
            if (msgChannel === expectedChannel) {
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
  }, [caseId, userRole, chatMode]);

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

  const getInitials = (name?: string) => {
    if (!name) return 'L';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

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
        <div className="h-16 bg-background/95 backdrop-blur-md border-b flex items-center gap-4 px-4 shadow-sm flex-shrink-0">
          {/* Avatar Switcher */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Lawyer Avatar */}
            <button
              onClick={() => setChatMode('lawyer')}
              className={`relative rounded-full transition-all ${
                chatMode === 'lawyer' 
                  ? 'ring-2 ring-primary' 
                  : 'opacity-60 hover:opacity-100'
              }`}
              aria-label={`Switch to lawyer chat with ${lawyerName || 'your lawyer'}`}
            >
              <Avatar className="h-10 w-10 md:h-12 md:w-12">
                <AvatarImage src={lawyerProfilePicture} alt={lawyerName} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(lawyerName)}
                </AvatarFallback>
              </Avatar>
              {chatMode === 'lawyer' && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </button>

            {/* Support Avatar */}
            <button
              onClick={() => setChatMode('support')}
              className={`relative rounded-full transition-all ${
                chatMode === 'support' 
                  ? 'ring-2 ring-primary' 
                  : 'opacity-60 hover:opacity-100'
              }`}
              aria-label="Switch to support chat"
            >
              <Avatar className="h-10 w-10 md:h-12 md:w-12">
                <AvatarFallback className="bg-blue-500 text-white">
                  <Headphones className="w-5 h-5 md:w-6 md:h-6" />
                </AvatarFallback>
              </Avatar>
              {chatMode === 'support' && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </button>
          </div>

          {/* Title Section */}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base truncate">{caseTitle}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {chatMode === 'lawyer' 
                ? `Chat with ${lawyerName || 'Your Lawyer'}` 
                : 'Support Chat'}
            </p>
          </div>

          {/* Close Button */}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 p-0 flex-shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ overscrollBehavior: 'contain' }}>
          {chatMode === 'support' ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center text-muted-foreground max-w-md">
                <Headphones className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold text-lg mb-2">Support Chat Coming Soon</h3>
                <p className="text-sm">
                  Support chat functionality is currently being developed. 
                  Please use the lawyer chat for now or contact us directly.
                </p>
              </div>
            </div>
          ) : loading ? (
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
      </>
    </AnimatePresence>
  );
};