import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Sparkles, Send, User, Bot } from 'lucide-react';
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLegalChatbot } from "@/hooks/useLegalChatbot";
import { useLanguage } from "@/hooks/useLanguage";

interface LaunchingSoonChatSectionProps {
  className?: string;
}

export function LaunchingSoonChatSection({ className = "" }: LaunchingSoonChatSectionProps) {
  const [userInput, setUserInput] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { t, isRTL, getCurrentLanguage } = useLanguage();
  
  const {
    messages,
    isLoading,
    initializeConversation,
    sendMessage,
    setLanguage,
    language
  } = useLegalChatbot('qa', 'coming_soon');

  // Stable scroll function to prevent infinite loops
  const scrollToBottom = useCallback(() => {
    if (hasInteracted && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [hasInteracted]);

  useEffect(() => {
    const initChat = async () => {
      try {
        await initializeConversation();
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Stable language update - only run once on mount and when explicitly needed
  const initialLanguageSet = useRef(false);
  
  useEffect(() => {
    if (!initialLanguageSet.current) {
      const currentLang = getCurrentLanguage();
      if (currentLang && currentLang !== language) {
        setLanguage(currentLang as 'en' | 'ar' | 'de');
      }
      initialLanguageSet.current = true;
    }
  }, []);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    setHasInteracted(true);
    const message = userInput.trim();
    setUserInput('');
    
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (role: string) => {
    return role === 'user' ? (
      <User className="w-5 h-5 text-primary" />
    ) : (
      <Bot className="w-5 h-5 text-secondary" />
    );
  };

  const formatMessageContent = (content: string) => {
    if (!content) return null;
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const getText = (key: string, fallback?: string) => {
    try {
      return t(key);
    } catch {
      return fallback || key;
    }
  };

  return (
    <div 
      className={`w-full max-w-7xl mx-auto px-8 mb-20 mt-24 ${className} animate-fade-in`}
      style={{ animationDelay: '0.6s' }}
    >
      <Card className="neomorphism-card overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-br from-background to-muted border-b border-border/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <MessageCircle className="w-8 h-8 text-neomorphism-accent icon-glow" />
                  <Sparkles className="w-4 h-4 text-neomorphism-accent absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold font-futura text-gray-900">
                    {t('landing.tryLegalAssistant', 'Try Our Legal Assistant')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('landing.askLegalQuestions', 'Ask legal questions and get instant guidance')}
                  </p>
                </div>
              </div>
              <LanguageToggle />
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="h-80 p-6">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  } ${isRTL && message.role !== 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full neomorphism-input flex items-center justify-center">
                    {getMessageIcon(message.role)}
                  </div>
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary/10 text-primary-foreground border border-primary/20'
                        : 'neomorphism-input text-foreground'
                    }`}
                  >
                    <div className="text-sm leading-relaxed">
                      {formatMessageContent(message.content)}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full neomorphism-input flex items-center justify-center">
                    <Bot className="w-5 h-5 text-secondary animate-pulse" />
                  </div>
                  <div className="neomorphism-input px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-border/50 p-6 bg-gradient-to-br from-background to-muted">
            <div className="flex space-x-4">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('landing.typeMessage', 'Type your legal question...')}
                disabled={isLoading}
                className="neomorphism-input flex-1 border-0 focus:ring-2 focus:ring-primary/20"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !userInput.trim()}
                className="neomorphism-button bg-primary hover:bg-primary/90 text-primary-foreground px-6"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground text-center">
              {t('landing.legalDisclaimer', 'This AI assistant provides general legal information and is not a substitute for professional legal advice.')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}