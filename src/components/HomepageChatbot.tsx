import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Scale, 
  Loader2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Languages,
  Sparkles,
  Zap
} from 'lucide-react';
import { useLegalChatbot, ChatMessage } from '@/hooks/useLegalChatbot';
import { Link } from 'react-router-dom';

interface HomepageChatbotProps {
  className?: string;
}

export const HomepageChatbot: React.FC<HomepageChatbotProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Auto-scroll to bottom when expanded
  useEffect(() => {
    if (isExpanded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isExpanded]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message);
    
    // Focus input after sending
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
        return <Bot className="h-4 w-4 text-ai-primary" />;
      case 'user':
        return <User className="h-4 w-4 text-primary" />;
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

  if (!isExpanded) {
    // Collapsed state - futuristic call-to-action banner
    return (
      <section className={`relative overflow-hidden ${className}`}>
        {/* Background effects */}
        <div className="absolute inset-0 gradient-glow opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/95" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <Card 
              className="glass-morphism cursor-pointer transition-all duration-500 hover:ai-glow-strong group animate-fade-in border-0" 
              onClick={() => setIsExpanded(true)}
            >
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* AI Avatar with floating animation */}
                    <div className="relative">
                      <div className="w-16 h-16 gradient-ai rounded-full flex items-center justify-center animate-float ai-glow group-hover:ai-glow-strong transition-all duration-300">
                        <Scale className="h-8 w-8 text-white" />
                      </div>
                      {/* Floating particles */}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-ai-primary rounded-full animate-pulse opacity-60" />
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-ai-secondary rounded-full animate-pulse opacity-40 animation-delay-1000" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-ai-primary to-ai-secondary bg-clip-text text-transparent">
                          Lexa AI
                        </h3>
                        <Sparkles className="h-5 w-5 text-ai-primary animate-pulse" />
                      </div>
                      <p className="text-lg text-muted-foreground">
                        Your AI Legal Assistant for Egyptian Law
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-ai-accent" />
                        Instant answers • No signup required • Multilingual support
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                      <Languages className="h-5 w-5 text-ai-primary" />
                      <div className="flex gap-2">
                        <span className="px-2 py-1 rounded-full bg-ai-primary/10 border border-ai-primary/20 text-ai-primary">EN</span>
                        <span className="px-2 py-1 rounded-full bg-ai-primary/10 border border-ai-primary/20 text-ai-primary">العربية</span>
                        <span className="px-2 py-1 rounded-full bg-ai-primary/10 border border-ai-primary/20 text-ai-primary">DE</span>
                      </div>
                    </div>
                    <ChevronDown className="h-6 w-6 text-ai-primary group-hover:text-ai-primary-glow transition-colors animate-bounce" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  // Expanded state - futuristic chat interface
  return (
    <section className={`relative overflow-hidden ${className}`}>
      {/* Background effects */}
      <div className="absolute inset-0 gradient-glow opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/95" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="glass-morphism ai-glow animate-fade-in border-0 overflow-hidden">
            {/* Futuristic Header */}
            <div className="relative p-6 border-b border-ai-glass-border bg-gradient-to-r from-ai-glass to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 gradient-ai rounded-full flex items-center justify-center animate-pulse-glow">
                      <Scale className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse">
                      <div className="w-full h-full bg-green-400 rounded-full animate-ping opacity-75" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold bg-gradient-to-r from-ai-primary to-ai-secondary bg-clip-text text-transparent">
                        Lexa AI
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                        Online
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Legal Q&A Assistant • Egyptian Law Expert</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Futuristic Language Selector */}
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'en' | 'ar' | 'de')}
                      className="appearance-none bg-ai-glass border border-ai-glass-border rounded-lg px-3 py-2 text-xs text-ai-primary focus:outline-none focus:ring-2 focus:ring-ai-primary/50 backdrop-blur-sm"
                    >
                      <option value="en">🇺🇸 English</option>
                      <option value="ar">🇪🇬 العربية</option>
                      <option value="de">🇩🇪 Deutsch</option>
                    </select>
                    <Languages className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-ai-primary pointer-events-none" />
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsExpanded(false)}
                    className="h-10 w-10 p-0 hover:bg-ai-glass hover:text-ai-primary transition-all duration-200"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              {/* Messages Area with futuristic styling */}
              <ScrollArea className="h-96">
                <div className="space-y-6 p-6">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-4 animate-slide-up ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-gradient-primary' 
                          : 'gradient-ai animate-pulse-glow'
                      }`}>
                        {getMessageIcon(message.role)}
                      </div>
                      
                      <div
                        className={`max-w-[75%] rounded-2xl px-6 py-4 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] ${
                          message.role === 'user'
                            ? 'bg-gradient-primary text-primary-foreground ml-auto'
                            : 'glass-morphism text-foreground border border-ai-glass-border'
                        }`}
                      >
                        <div className="text-sm leading-relaxed">
                          {formatMessageContent(message.content)}
                        </div>
                        <div className={`text-xs mt-3 flex items-center gap-2 ${
                          message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* AI Thinking indicator */}
                  {isLoading && (
                    <div className="flex items-start gap-4 animate-fade-in">
                      <div className="flex-shrink-0 w-10 h-10 gradient-ai rounded-full flex items-center justify-center animate-pulse-glow">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="glass-morphism rounded-2xl px-6 py-4 border border-ai-glass-border">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-ai-primary rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-ai-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-ai-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                          <span className="text-sm text-ai-primary font-medium">
                            Lexa is analyzing your question...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Auto-scroll anchor */}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Futuristic Input Area */}
              <div className="p-6 border-t border-ai-glass-border bg-gradient-to-r from-ai-glass/50 to-transparent backdrop-blur-sm">
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask Lexa about Egyptian law..."
                      disabled={isLoading || !conversationId}
                      className="glass-morphism border-ai-glass-border text-foreground placeholder:text-muted-foreground focus:ring-ai-primary/50 focus:border-ai-primary pr-12 py-6 text-base"
                    />
                    {/* Input glow effect */}
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-ai-primary/5 to-ai-secondary/5 opacity-0 transition-opacity duration-200 peer-focus:opacity-100 pointer-events-none" />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading || !conversationId}
                    size="lg"
                    className="gradient-ai hover:ai-glow-strong transition-all duration-200 px-6 disabled:opacity-50 disabled:hover:ai-glow-none"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {/* Enhanced Legal Disclaimer */}
                <div className="glass-morphism rounded-lg p-4 border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-200/90">
                      <strong className="text-amber-300">AI-Powered Information Only.</strong> Lexa provides general legal information about Egyptian law. For personalized legal advice, 
                      <Link 
                        to="/auth?redirect=intake" 
                        className="ml-1 text-ai-primary hover:text-ai-primary-glow underline font-medium transition-colors"
                      >
                        connect with our verified lawyers →
                      </Link>
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