import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageCircle, Send, X, User, UserCheck, Gavel, Paperclip, Download, FileText, Image as ImageIcon, File } from 'lucide-react';
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
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || isUploading) return;

    const file = files[0]; // Take first file only
    const uploadResult = await uploadFile(file, caseId);
    
    if (uploadResult) {
      // Send file message
      try {
        const { error } = await supabase
          .from('case_messages')
          .insert({
            case_id: caseId,
            role: 'lawyer',
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

  const renderFileMessage = (message: ChatMessage) => {
    const file = message.metadata?.file;
    if (!file) return null;

    const isImage = file.type.startsWith('image/');

    return (
      <div className="space-y-2">
        {isImage ? (
          <>
            <div className="max-w-xs">
              <img
                src={file.url}
                alt={file.name}
                className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(file.url, '_blank')}
              />
            </div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <ImageIcon className="w-4 h-4" />
              <span>{file.name}</span>
              <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
            </div>
          </>
        ) : (
          <div 
            className="flex items-center gap-2 text-sm opacity-90 cursor-pointer hover:opacity-100 transition-opacity"
            onClick={() => window.open(file.url, '_blank')}
          >
            <FileText className="w-4 h-4" />
            <span className="underline">{file.name}</span>
            <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
          </div>
        )}
      </div>
    );
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
          <div className="space-y-1 px-2">
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
                    } ${isLastInGroup ? 'mb-5' : 'mb-2'}`}
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
                        {message.message_type === 'file' ? (
                          renderFileMessage(message)
                        ) : (
                          message.content
                        )}
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
              onChange={(e) => {
                e.stopPropagation();
                handleFileUpload(e.target.files);
              }}
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isUploading || sending}
              className="px-3"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message to the client..."
              disabled={sending || isUploading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending || isUploading}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};