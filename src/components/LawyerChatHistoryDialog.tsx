import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  User, 
  Bot, 
  Calendar, 
  Clock,
  MessageSquare 
} from "lucide-react";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  metadata?: any;
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  language: string;
  messages: ChatMessage[];
}

interface LawyerChatHistoryDialogProps {
  lawyerId: string;
  lawyerName: string;
  children: React.ReactNode;
}

export const LawyerChatHistoryDialog = ({ 
  lawyerId, 
  lawyerName, 
  children 
}: LawyerChatHistoryDialogProps) => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchChatHistory = async () => {
    if (!lawyerId) return;
    
    setLoading(true);
    try {
      // Fetch lawyer QA conversations
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('mode', 'qa_lawyer')
        .order('created_at', { ascending: false });

      if (convError) throw convError;

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        return;
      }

      // Fetch messages for each conversation
      const conversationsWithMessages = await Promise.all(
        conversationsData.map(async (conv) => {
          const { data: messagesData, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          if (msgError) {
            console.error('Error fetching messages:', msgError);
            return { ...conv, messages: [] };
          }

          return {
            ...conv,
            messages: messagesData || []
          };
        })
      );

      setConversations(conversationsWithMessages as Conversation[]);
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch chat history: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChatHistory();
    }
  }, [isOpen, lawyerId]);

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const getMessageIcon = (role: string) => {
    return role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />;
  };

  const getTotalMessages = () => {
    return conversations.reduce((total, conv) => total + conv.messages.length, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {lawyerName}'s AI Chat History
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {conversations.length} conversations
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {getTotalMessages()} total messages
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No chat history found for this lawyer.</p>
              <p className="text-sm">The lawyer hasn't used the AI assistant yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {conversations.map((conversation) => (
                <Card key={conversation.id} className="border">
                  <CardContent className="p-0">
                    {/* Conversation Header */}
                    <div className="p-4 border-b bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(conversation.created_at), 'PPP')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(conversation.created_at), 'p')}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {conversation.messages.length} messages
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="p-4 space-y-4">
                      {conversation.messages.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No messages in this conversation
                        </p>
                      ) : (
                        conversation.messages.map((message, index) => (
                          <div key={message.id} className="flex gap-3">
                            {message.role === 'assistant' && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {getMessageIcon(message.role)}
                              </div>
                            )}
                            <div
                              className={`flex-1 ${
                                message.role === 'user' ? 'flex justify-end' : ''
                              }`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  message.role === 'user'
                                    ? 'bg-primary text-primary-foreground ml-auto'
                                    : 'bg-muted'
                                }`}
                              >
                                <div className="text-sm">
                                  {formatMessageContent(message.content)}
                                </div>
                                <div className={`text-xs mt-1 opacity-70 ${
                                  message.role === 'user' 
                                    ? 'text-primary-foreground/70' 
                                    : 'text-muted-foreground'
                                }`}>
                                  {format(new Date(message.created_at), 'p')}
                                </div>
                              </div>
                            </div>
                            {message.role === 'user' && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {getMessageIcon(message.role)}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};