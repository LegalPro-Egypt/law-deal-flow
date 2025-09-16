import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  User, 
  Bot, 
  Calendar, 
  Languages,
  CheckCircle,
  Clock,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConversationDialogProps {
  conversationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateCase?: (conversationId: string) => void;
}

interface ConversationDetails {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  language: string;
  status: string;
  mode: string;
  user_id?: string;
  case_id?: string;
  metadata?: any;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
  metadata?: any;
}

export const ConversationDialog: React.FC<ConversationDialogProps> = ({ 
  conversationId, 
  isOpen, 
  onClose,
  onCreateCase 
}) => {
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchConversationDetails();
    }
  }, [isOpen, conversationId]);

  const fetchConversationDetails = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      // Fetch conversation details
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      setConversation(conversationData);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

    } catch (error: any) {
      console.error('Error fetching conversation details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch conversation details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = () => {
    if (conversationId && onCreateCase) {
      onCreateCase(conversationId);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'assistant':
        return <Bot className="h-4 w-4 text-primary" />;
      case 'user':
        return <User className="h-4 w-4 text-blue-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'abandoned': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  if (!isOpen || !conversationId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation Details
            {conversation && (
              <Badge variant="outline">
                {conversation.session_id.slice(0, 8)}...
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading conversation...</p>
            </div>
          </div>
        ) : conversation ? (
          <div className="space-y-4">
            {/* Conversation Info */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <Badge className={`mt-2 ${getStatusColor(conversation.status)}`}>
                    {conversation.status.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    <span className="text-sm font-medium">Language</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{conversation.language.toUpperCase()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Started</span>
                  </div>
                  <p className="mt-2 text-sm">{formatDate(conversation.created_at)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Messages</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{messages.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            {conversation.status === 'active' && !conversation.case_id && onCreateCase && (
              <div className="flex justify-end">
                <Button onClick={handleCreateCase} className="bg-gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Case from This Conversation
                </Button>
              </div>
            )}

            {/* Messages */}
            <div className="border rounded-lg">
              <div className="p-4 border-b bg-muted/50">
                <h3 className="font-semibold">Conversation History</h3>
                <p className="text-sm text-muted-foreground">
                  Complete chat history between client and AI assistant
                </p>
              </div>
              
              <ScrollArea className="h-96 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {getMessageIcon(message.role)}
                      </div>
                      
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <div className="text-sm leading-relaxed">
                          {message.content.split('\n').map((line, index) => (
                            <React.Fragment key={index}>
                              {line}
                              {index < message.content.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="text-xs opacity-70 mt-2">
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No messages found</h3>
                      <p className="text-muted-foreground">This conversation appears to be empty.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Extracted Data */}
            {conversation.metadata && conversation.metadata.extractedData && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Extracted Case Data</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(conversation.metadata.extractedData).map(([key, value]) => (
                      <div key={key}>
                        <h4 className="font-medium text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                        <p className="text-sm text-muted-foreground">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Conversation not found</h3>
              <p className="text-muted-foreground">Unable to load conversation details.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};