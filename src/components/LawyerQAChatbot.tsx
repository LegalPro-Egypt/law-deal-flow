import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Send, 
  User, 
  Bot, 
  X, 
  Minimize2, 
  Maximize2,
  Scale,
  MessageCircle
} from "lucide-react";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LawyerQAChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const LawyerQAChatbot = ({ isOpen, onToggle }: LawyerQAChatbotProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, isRTL, getCurrentLanguage } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initialize with welcome message
      setMessages([{
        role: 'assistant',
        content: t('lawyerAssistant.welcomeMessage'),
        timestamp: new Date()
      }]);
    }
  }, [isOpen, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      console.log('Sending message to legal-chatbot:', { message: input, conversation_id: conversationId, mode: 'qa_lawyer' });
      const { data, error } = await supabase.functions.invoke('legal-chatbot', {
        body: {
          message: input,
          conversation_id: conversationId,
          mode: 'qa_lawyer',
          language: getCurrentLanguage(),
          lawyerId: user.id
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Received response from legal-chatbot:', data);

      if (data.response) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

      // Handle both conversation_id and conversationId for backward compatibility
      const newConversationId = data.conversation_id || data.conversationId;
      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
        console.log('Set conversation ID:', newConversationId);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: t('lawyerAssistant.error.title'),
        description: t('lawyerAssistant.error.description'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 ltr:right-6 rtl:left-6 h-14 w-14 rounded-full shadow-lg bg-gradient-primary hover:bg-gradient-primary/90 z-50"
        size="lg"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 ltr:right-6 rtl:left-6 z-50 shadow-xl transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'
    } ${isRTL() ? 'text-right' : ''}`}>
      <CardHeader className="p-4 bg-gradient-primary text-primary-foreground rounded-t-lg">
        <div className={`flex items-center justify-between ${isRTL() ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
            <Scale className="h-5 w-5" />
            <CardTitle className="text-lg">{t('lawyerAssistant.title')}</CardTitle>
          </div>
          <div className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0 hover:bg-white/20"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className={`flex items-center gap-2 mt-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
            {t('lawyerAssistant.badge')}
          </Badge>
          <div className={`flex items-center gap-1 text-xs text-white/80 ${isRTL() ? 'flex-row-reverse' : ''}`}>
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            {t('lawyerAssistant.status')}
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="p-0 flex-1 flex flex-col h-[calc(500px-140px)]">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' 
                        ? isRTL() ? 'justify-start' : 'justify-end'
                        : isRTL() ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {(message.role === 'assistant' && !isRTL()) || (message.role === 'user' && isRTL()) ? (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {getMessageIcon(message.role)}
                      </div>
                    ) : null}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } ${isRTL() ? 'text-right' : 'text-left'}`}
                    >
                      <div className="text-sm leading-relaxed">
                        {formatMessageContent(message.content)}
                      </div>
                      <div className={`text-xs mt-1 opacity-70 ${
                        message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {(message.role === 'user' && !isRTL()) || (message.role === 'assistant' && isRTL()) ? (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {getMessageIcon(message.role)}
                      </div>
                    ) : null}
                  </div>
                ))}
                {loading && (
                  <div className={`flex gap-3 ${isRTL() ? 'justify-end' : 'justify-start'}`}>
                    {!isRTL() && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                      <div className={`flex ${isRTL() ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                    {isRTL() && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>

          <div className="p-4 border-t">
            <div className={`flex gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('lawyerAssistant.placeholder')}
                className={`flex-1 ${isRTL() ? 'text-right' : ''}`}
                disabled={loading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={!input.trim() || loading}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className={`text-xs text-muted-foreground mt-2 text-center ${isRTL() ? 'leading-relaxed' : ''}`}>
              {t('lawyerAssistant.disclaimer')}
            </p>
          </div>
        </>
      )}
    </Card>
  );
};