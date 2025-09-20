import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Scale, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useLegalChatbot, ChatMessage } from '@/hooks/useLegalChatbot';
import { Link } from 'react-router-dom';

interface HomepageChatbotProps {
  className?: string;
}

export const HomepageChatbot: React.FC<HomepageChatbotProps> = ({ className }) => {
  const [inputMessage, setInputMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const {
    messages,
    isLoading,
    conversationId,
    language,
    initializeConversation,
    sendMessage,
    setLanguage,
  } = useLegalChatbot('qa');

  // Initialize anonymous conversation on mount
  useEffect(() => {
    if (!conversationId) {
      initializeConversation(); // No userId for anonymous sessions
    }
  }, [conversationId, initializeConversation]);

  // Auto-scroll to bottom when messages change (only after user interaction)
  useEffect(() => {
    if (hasInteracted && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, hasInteracted]);


  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    setHasInteracted(true);
    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message);
    
    // Focus input after sending (after interaction)
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (role: ChatMessage['role']) => {
    switch (role) {
      case 'assistant':
        return <Bot className="h-4 w-4 text-primary" />;
      case 'user':
        return <User className="h-4 w-4 text-white" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatMessageContent = (content: string | null) => {
    if (!content) return 'No response content';
    
    const lines = content.split('\n');
    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Always visible professional chat interface
  return (
    <section className={`py-16 bg-muted/30 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Professional Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get Free Legal Answers with{" "}
              <span className="text-primary">Lexa AI</span>
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Ask our AI legal assistant about Egyptian law • No signup required • 
              Instant answers in multiple languages • Connect with verified lawyers when you need more
            </p>
          </div>

          {/* Chat Interface Card */}
          <Card className="shadow-lg border-0 overflow-hidden bg-background">
            {/* Professional Header */}
            <CardHeader className="bg-gradient-primary text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Scale className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white">Lexa Legal Assistant</CardTitle>
                    <p className="text-sm text-white/80">Egyptian Law Expert • Available 24/7</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'ar' | 'de')}
                    className="appearance-none bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="ar">🇪🇬 العربية</option>
                    <option value="de">🇩🇪 Deutsch</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Messages Area with professional styling */}
              <ScrollArea className="h-96">
                <div className="space-y-4 p-6">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 animate-fade-in ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-primary' 
                          : 'bg-muted border border-border'
                      }`}>
                        {getMessageIcon(message.role)}
                      </div>
                      
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted border border-border'
                        }`}
                      >
                        <div className="text-sm leading-relaxed">
                          {formatMessageContent(message.content)}
                        </div>
                        <div className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex items-start gap-3 animate-fade-in">
                      <div className="flex-shrink-0 w-8 h-8 bg-muted border border-border rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted border border-border rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Lexa is thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Auto-scroll anchor */}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Professional Input Area */}
              <div className="p-6 border-t bg-muted/50">
                <div className="flex gap-3 mb-4">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Lexa about Egyptian law..."
                    disabled={isLoading || !conversationId}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading || !conversationId}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Professional Legal Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Information Only:</strong> Lexa provides general legal information about Egyptian law. 
                      For personalized legal advice, {" "}
                      <Link 
                        to="/auth?redirect=intake" 
                        className="text-primary hover:text-primary/80 underline font-medium"
                      >
                        connect with our verified lawyers
                      </Link>
                      .
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};