import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageCircle, Send, X, User, Users, Paperclip, Download, FileText, Image as ImageIcon, File } from 'lucide-react';
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || isUploading) return;

    const file = files[0]; // Take first file only
    const uploadResult = await uploadFile(file, caseId);
    
    if (uploadResult) {
      // Send file message
      const messageRole = userRole === 'lawyer' ? 'lawyer' : 'user';
      
      try {
        const { error } = await supabase
          .from('case_messages')
          .insert({
            case_id: caseId,
            role: messageRole,
            content: `Shared a file: ${uploadResult.name}`,
            message_type: 'file',
            metadata: { 
              channel: 'direct',
              file: {
                name: uploadResult.name,
                url: uploadResult.url,
                type: uploadResult.type,
                size: uploadResult.size
              }
            }
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error sending file message:', error);
        toast({
          title: 'Error',
          description: 'File uploaded but failed to send message',
          variant: 'destructive',
        });
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const getMessageIcon = (role: string) => {
    return role === 'lawyer' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFileMessage = (message: Message) => {
    const file = message.metadata?.file;
    if (!file) return null;

    const isImage = file.type.startsWith('image/');

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm opacity-90">
          {getFileIcon(file.type)}
          <span>{file.name}</span>
          <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
        </div>
        
        {isImage ? (
          <div className="max-w-xs">
            <img
              src={file.url}
              alt={file.name}
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(file.url, '_blank')}
            />
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(file.url, '_blank')}
            className="flex items-center gap-2"
          >
            <Download className="w-3 h-3" />
            Download
          </Button>
        )}
      </div>
    );
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
          className="h-96 w-full rounded-md border p-3"
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
            <div className="space-y-1">
              {messages.map((message, index) => {
                const isOwnMessage = 
                  (userRole === 'client' && message.role === 'user') ||
                  (userRole === 'lawyer' && message.role === 'lawyer');
                
                const prevMessage = messages[index - 1];
                const nextMessage = messages[index + 1];
                const isFirstInGroup = !prevMessage || prevMessage.role !== message.role;
                const isLastInGroup = !nextMessage || nextMessage.role !== message.role;
                const isMiddleInGroup = !isFirstInGroup && !isLastInGroup;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                      isLastInGroup ? 'mb-5' : 'mb-2'
                    }`}
                  >
                    <div
                      className={`
                        relative inline-block max-w-[75%] px-3 py-1.5 shadow-sm
                        ${isOwnMessage
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                        }
                        ${isFirstInGroup && isLastInGroup
                          ? isOwnMessage 
                            ? 'rounded-[18px] rounded-br-[4px]'
                            : 'rounded-[18px] rounded-bl-[4px]'
                          : isFirstInGroup
                          ? isOwnMessage
                            ? 'rounded-[18px] rounded-br-[18px]'
                            : 'rounded-[18px] rounded-bl-[18px]'
                          : isLastInGroup
                          ? isOwnMessage
                            ? 'rounded-[18px] rounded-br-[4px]'
                            : 'rounded-[18px] rounded-bl-[4px]'
                          : 'rounded-[18px]'
                        }
                      `}
                    >
                      <div className="text-[14px] leading-[1.3] break-words whitespace-pre-wrap pr-12">
                        {message.message_type === 'file' ? (
                          renderFileMessage(message)
                        ) : (
                          message.content
                        )}
                      </div>
                      <div className={`absolute bottom-1 right-2 text-[11px] opacity-70 ${
                        isOwnMessage ? 'text-white' : 'text-gray-600'
                      }`}>
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="space-y-2">
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || sending}
              className="px-3"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={sending || isUploading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || isUploading}
              size="sm"
              className="px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="text-xs text-muted-foreground text-center">
          {sending ? 'Sending...' : isUploading ? 'Uploading file...' : 'Press Enter to send, Shift+Enter for new line'}
        </div>
      </CardContent>
    </Card>
  );
};