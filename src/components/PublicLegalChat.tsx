import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Languages, 
  Scale, 
  Loader2,
  AlertCircle,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { useLegalChatbot } from '@/hooks/useLegalChatbot';
import { Link } from 'react-router-dom';

interface PublicLegalChatProps {
  className?: string;
}

export const PublicLegalChat: React.FC<PublicLegalChatProps> = ({ className }) => {
  const [inputMessage, setInputMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didInitAutoScroll = useRef(false);
  const hasInteracted = useRef(false);

  const {
    messages,
    isLoading,
    conversationId,
    language,
    initializeConversation,
    sendMessage,
    setLanguage,
  } = useLegalChatbot('qa');

// Lazily initialize conversation on user interaction
const ensureInitialized = async () => {
  if (!conversationId) {
    await initializeConversation(); // No userId for anonymous users
  }
};

// Auto-scroll to bottom (only after user interaction; skip initial welcome)
useEffect(() => {
  if (!hasInteracted.current) return;
  if (!didInitAutoScroll.current) {
    didInitAutoScroll.current = true;
    return;
  }
  bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}, [messages]);

const handleSendMessage = async () => {
  if (!inputMessage.trim() || isLoading) return;
  
  hasInteracted.current = true;
  await ensureInitialized();
  
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

  return (
    <Card className={`w-full max-w-4xl mx-auto scroll-anchor-none ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Free Legal Q&A
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                Egyptian Law
              </Badge>
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar' | 'de')}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            {/* Case Intake Button */}
            <Link to="/auth?redirect=intake">
              <Button size="sm" className="bg-accent hover:bg-accent-hover">
                <UserPlus className="h-4 w-4 mr-1" />
                Start Case Intake
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Ask questions about Egyptian law. No signup required! For full case management, use Case Intake.
        </p>
      </CardHeader>

      <Separator />

      <CardContent className="p-4">
        {/* Messages Area */}
        <div className="h-96 mb-4">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <p className="font-medium">Welcome to LegalPro's Free Legal Q&A</p>
                  <p className="text-sm mt-2">
                    Ask any question about Egyptian law. I'm here to help provide legal information.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <div className="text-sm leading-relaxed">
                      {formatMessageContent(message.content)}
                    </div>
                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        AI is analyzing your question...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about Egyptian law, legal procedures, rights..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Case Intake CTA */}
          <div className="bg-gradient-card p-4 rounded-lg border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-medium text-sm">Need Full Legal Support?</h4>
                <p className="text-xs text-muted-foreground">
                  Start case intake to get matched with verified lawyers and secure legal help.
                </p>
              </div>
              <Link to="/auth?redirect=intake">
                <Button size="sm" className="bg-accent hover:bg-accent-hover shrink-0">
                  Start Case Intake
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Legal Disclaimer:</strong> This AI provides general legal information about Egyptian law, not personalized legal advice. 
                Always consult with a qualified Egyptian lawyer for specific legal matters and before making any legal decisions.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};