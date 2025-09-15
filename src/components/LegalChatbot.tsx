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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    messages,
    isLoading,
    conversationId,
    language,
    extractedData,
    needsPersonalDetails,
    initializeConversation,
    sendMessage,
    switchMode,
    setLanguage,
    setPersonalDetailsCompleted,
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Call onCaseDataExtracted when case data is extracted
  useEffect(() => {
    if (extractedData && onCaseDataExtracted) {
      const dataWithNeedsPersonalDetails = {
        ...extractedData,
        needsPersonalDetails
      };
      onCaseDataExtracted(dataWithNeedsPersonalDetails);
    }
  }, [extractedData, needsPersonalDetails, onCaseDataExtracted]);

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
      <CardHeader className="flex-shrink-0 pb-3 sm:pb-4">
        {/* Mobile Header */}
        <div className="block sm:hidden">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4 text-primary" />
              Lexa — LegalPro
            </CardTitle>
            <Badge variant={mode === 'qa' ? 'default' : 'secondary'} className="text-xs">
              {mode === 'qa' ? 'Q&A' : 'Intake'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar' | 'de')}
                className="text-xs border rounded px-2 py-1 bg-background"
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
                className="rounded-r-none text-xs px-2 py-1"
              >
                Q&A
              </Button>
              <Button
                variant={mode === 'intake' ? 'default' : mode === 'qa' ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => switchMode('intake')}
                className="rounded-l-none text-xs px-2 py-1"
              >
                Intake
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden sm:block">
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
                  variant={mode === 'intake' ? 'default' : mode === 'qa' ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={() => switchMode('intake')}
                  className="rounded-l-none"
                >
                  Intake
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Info */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-0">
          <div className="flex items-center gap-1">
            {conversationId ? (
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            ) : (
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
            {conversationId ? 'Connected' : 'Connecting...'}
          </div>
          {mode === 'intake' && extractedData && (
            <div className="flex items-center gap-1 flex-wrap">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              <span className="hidden sm:inline">Case data detected</span>
              <span className="sm:hidden">Case detected</span>
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

      <CardContent className="flex-1 flex flex-col p-2 sm:p-4 min-h-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-2 sm:pr-4">
          <div className="space-y-3 sm:space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 sm:gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                  {getMessageIcon(message.role)}
                </div>
                
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className="text-xs sm:text-sm leading-relaxed">
                    {formatMessageContent(message.content)}
                  </div>
                  <div className="text-xs opacity-70 mt-1 sm:mt-2">
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
            
            {/* Auto-scroll anchor */}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 pt-3 sm:pt-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                mode === 'qa' 
                  ? "Ask a legal question..."
                  : "Describe your legal situation..."
              }
              disabled={isLoading || !conversationId}
              className="flex-1 text-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || !conversationId}
              size="icon"
              className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
          </div>

          {/* Legal Disclaimer */}
          <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
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