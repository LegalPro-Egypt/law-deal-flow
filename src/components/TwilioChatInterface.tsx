import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Send, 
  Phone, 
  PhoneOff, 
  Users, 
  Clock,
  FileText,
  Download
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TwilioAccessToken } from '@/hooks/useTwilioSession';

// Mock Twilio Chat SDK types
interface MockChatClient {
  initialize: () => Promise<void>;
  getConversationBySid: (sid: string) => Promise<MockConversation>;
  on: (event: string, callback: (data: any) => void) => void;
  shutdown: () => void;
}

interface MockConversation {
  sid: string;
  sendMessage: (message: string) => Promise<MockMessage>;
  getMessages: () => Promise<MockMessage[]>;
  join: () => Promise<void>;
  on: (event: string, callback: (data: any) => void) => void;
  getParticipants: () => Promise<MockParticipant[]>;
}

interface MockMessage {
  id: string;
  body: string;
  author: string;
  timestamp: Date;
  type: 'text' | 'media';
}

interface MockParticipant {
  identity: string;
  sid: string;
  isOnline: boolean;
}

interface TwilioChatInterfaceProps {
  accessToken: TwilioAccessToken;
  onDisconnect: () => void;
  onRecordingToggle: (recording: boolean) => void;
  recordingEnabled: boolean;
}

export const TwilioChatInterface: React.FC<TwilioChatInterfaceProps> = ({
  accessToken,
  onDisconnect,
  onRecordingToggle,
  recordingEnabled
}) => {
  const [client, setClient] = useState<MockChatClient | null>(null);
  const [conversation, setConversation] = useState<MockConversation | null>(null);
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [participants, setParticipants] = useState<MockParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mock Twilio Chat Client initialization
  useEffect(() => {
    let isMounted = true;

    const initializeChatClient = async () => {
      try {
        // Mock chat client
        const mockClient: MockChatClient = {
          initialize: async () => {
            console.log('Chat client initialized');
          },
          getConversationBySid: async (sid: string) => {
            return {
              sid,
              sendMessage: async (message: string) => {
                const mockMessage: MockMessage = {
                  id: `msg_${Date.now()}`,
                  body: message,
                  author: accessToken.identity,
                  timestamp: new Date(),
                  type: 'text'
                };
                return mockMessage;
              },
              getMessages: async () => {
                return messages;
              },
              join: async () => {
                console.log('Joined conversation');
              },
              on: (event: string, callback: (data: any) => void) => {
                // Mock event listeners
                if (event === 'messageAdded') {
                  // Simulate receiving messages
                  setTimeout(() => {
                    const mockResponse: MockMessage = {
                      id: `msg_${Date.now()}_response`,
                      body: `Response to: "${newMessage}"`,
                      author: 'lawyer-user-id',
                      timestamp: new Date(),
                      type: 'text'
                    };
                    callback({ message: mockResponse });
                  }, 2000);
                }
              },
              getParticipants: async () => {
                return [
                  {
                    identity: accessToken.identity,
                    sid: 'participant_1',
                    isOnline: true
                  },
                  {
                    identity: 'lawyer-user-id',
                    sid: 'participant_2',
                    isOnline: Math.random() > 0.3
                  }
                ];
              }
            };
          },
          on: (event: string, callback: (data: any) => void) => {
            // Mock client events
          },
          shutdown: () => {
            console.log('Chat client shutdown');
          }
        };

        await mockClient.initialize();
        
        if (!isMounted) return;
        
        setClient(mockClient);
        
        // Get conversation
        const conv = await mockClient.getConversationBySid(accessToken.roomName);
        await conv.join();
        
        if (!isMounted) return;
        
        setConversation(conv);
        setConnected(true);

        // Set up message listener
        conv.on('messageAdded', (data: any) => {
          if (isMounted) {
            setMessages(prev => [...prev, data.message]);
          }
        });

        // Load initial messages and participants
        const [initialMessages, conversationParticipants] = await Promise.all([
          conv.getMessages(),
          conv.getParticipants()
        ]);

        if (isMounted) {
          setMessages(initialMessages);
          setParticipants(conversationParticipants);
        }

        toast({
          title: 'Chat Connected',
          description: 'Successfully joined the conversation',
        });

      } catch (error) {
        console.error('Error initializing chat:', error);
        if (isMounted) {
          toast({
            title: 'Connection Error',
            description: 'Failed to connect to chat',
            variant: 'destructive',
          });
        }
      }
    };

    initializeChatClient();

    return () => {
      isMounted = false;
      if (client) {
        client.shutdown();
      }
    };
  }, [accessToken]);

  const sendMessage = useCallback(async () => {
    if (!conversation || !newMessage.trim()) return;

    try {
      const message = await conversation.sendMessage(newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      toast({
        title: 'Message Sent',
        description: 'Your message has been delivered',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Send Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  }, [conversation, newMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date();
    const isToday = timestamp.toDateString() === now.toDateString();
    
    if (isToday) {
      return formatTime(timestamp);
    } else {
      return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + formatTime(timestamp);
    }
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const onlineParticipants = participants.filter(p => p.isOnline);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Chat Session</CardTitle>
            </div>
            {connected && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                Connected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{onlineParticipants.length} online</span>
            </div>
            <div className={`flex items-center gap-1 text-sm ${getConnectionColor()}`}>
              <div className="w-2 h-2 bg-current rounded-full" />
              <span className="capitalize">{connectionQuality}</span>
            </div>
          </div>
        </div>
        
        {/* Chat controls */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant={recordingEnabled ? "destructive" : "outline"}
              size="sm"
              onClick={() => onRecordingToggle(!recordingEnabled)}
            >
              <FileText className="w-4 h-4 mr-1" />
              {recordingEnabled ? 'Stop Recording' : 'Start Recording'}
            </Button>
            
            {recordingEnabled && (
              <Badge variant="destructive" className="animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full mr-1" />
                Recording
              </Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
          >
            <PhoneOff className="w-4 h-4 mr-1" />
            End Chat
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        {/* Messages area */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.author === accessToken.identity;
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {message.author.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                  
                  {isOwn && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {message.author.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
            
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">LA</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message input */}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={!connected}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!connected || !newMessage.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Connection status */}
        {!connected && (
          <div className="text-center text-sm text-muted-foreground">
            Connecting to chat...
          </div>
        )}
      </CardContent>
    </Card>
  );
};