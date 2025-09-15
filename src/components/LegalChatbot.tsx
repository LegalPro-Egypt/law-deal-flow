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
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useLegalChatbot, ChatMessage, CaseData } from '@/hooks/useLegalChatbot';
import { useToast } from '@/components/ui/use-toast';

interface LegalChatbotProps {
  mode?: 'qa' | 'intake';
  userId?: string;
  caseId?: string;
  onCaseDataExtracted?: (data: CaseData) => void;
  className?: string;
}

export const LegalChatbot: React.FC<LegalChatbotProps> = ({
  mode = 'intake',
  userId,
  caseId,
  onCaseDataExtracted,
  className
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    messages,
    isLoading,
    conversationId,
    language,
    extractedData,
    initializeConversation,
    sendMessage,
    switchMode,
    setLanguage,
  } = useLegalChatbot(mode);

  // Initialize conversation on mount
  useEffect(() => {
    if (!conversationId) {
      // For intake mode, allow initialization without userId (anonymous users)
      // For qa mode, require userId for authenticated users
      if (mode === 'intake' || userId) {
        initializeConversation(userId, caseId);
      }
    }
  }, [conversationId, userId, caseId, initializeConversation, mode]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Call onCaseDataExtracted when case data is extracted
  useEffect(() => {
    if (extractedData && onCaseDataExtracted) {
      onCaseDataExtracted(extractedData);
    }
  }, [extractedData, onCaseDataExtracted]);

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
        return <Bot className="h-4 w-4 text-primary" />;
      case 'user':
        return <User className="h-4 w-4 text-blue-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatMessageContent = (content: string | null) => {
    // Handle null/undefined content
    if (!content) {
      return 'No response content';
    }
    
    // Simple formatting for better readability
    const lines = content.split('\n');
    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <Card className={`flex flex-col h-full max-w-4xl mx-auto ${className}`}>
      <CardHeader className="flex-shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Lexa — LegalPro
            <Badge variant={mode === 'qa' ? 'default' : 'secondary'}>
              {mode === 'qa' ? 'Q&A' : 'Case Intake'}
            </Badge>
          </CardTitle>
          
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

            {/* Mode Switch */}
            <div className="flex rounded-md border">
              <Button
                variant={mode === 'qa' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => switchMode('qa')}
                className="rounded-r-none"
              >
                Q&A
              </Button>
              <Button
                variant={mode === 'intake' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => switchMode('intake')}
                className="rounded-l-none"
              >
                Intake
              </Button>
            </div>
          </div>
        </div>
        
        {/* Status Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            {conversationId ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            {conversationId ? 'Connected' : 'Connecting...'}
          </div>
          {mode === 'intake' && extractedData && (
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>Case data detected</span>
              {extractedData.category && (
                <Badge variant="outline" className="text-xs">
                  {extractedData.category}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 flex flex-col p-4 min-h-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
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
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 pt-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                mode === 'qa' 
                  ? "Ask a legal question about Egyptian law..."
                  : "Describe your legal situation..."
              }
              disabled={isLoading || !conversationId}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || !conversationId}
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

          {/* Legal Disclaimer */}
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Legal Disclaimer:</strong> This AI provides legal information based on Egyptian law, not legal advice. 
                Always consult with a qualified Egyptian lawyer for specific legal matters and before making any legal decisions.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};