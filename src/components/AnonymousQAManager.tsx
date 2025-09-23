import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cleanupOldAnonymousSessions, validateAdminAccess } from '@/utils/securityCleanup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Eye, 
  Calendar, 
  Clock, 
  Globe, 
  Trash2,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  BarChart3
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AnonymousSession {
  id: string;
  session_id: string;
  language: string;
  created_at: string;
  updated_at: string;
  status: string;
  metadata: any;
  message_count: number;
  first_message_preview: string | null;
  last_activity: string;
  source: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const AnonymousQAManager = () => {
  const { profile, session } = useAuth();
  const [sessions, setSessions] = useState<AnonymousSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<AnonymousSession | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const { toast } = useToast();

  // Security check - only admins should access this component
  const hasAdminAccess = validateAdminAccess(profile, session);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchSessions();
    }
  }, [hasAdminAccess]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      // Fetch anonymous conversations with message counts
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          session_id,
          language,
          created_at,
          updated_at,
          status,
          metadata
        `)
        .is('user_id', null)
        .eq('mode', 'qa')
        .order('created_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Get message counts and first message for each conversation
      const sessionsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conversation) => {
          // Get message count and first user message
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('id, content, role, created_at')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

          if (messagesError) {
            console.error('Error fetching messages for conversation:', conversation.id, messagesError);
            return null;
          }

          const userMessages = messages?.filter(m => m.role === 'user') || [];
          const firstUserMessage = userMessages[0];
          
          return {
            ...conversation,
            message_count: messages?.length || 0,
            first_message_preview: firstUserMessage?.content || null,
            last_activity: conversation.updated_at,
            source: (conversation.metadata as any)?.source || 'unknown'
          };
        })
      );

      // Filter out null results and sessions with no user messages
      const validSessions = sessionsWithDetails
        .filter((session): session is AnonymousSession => 
          session !== null && session.first_message_preview !== null
        );

      setSessions(validSessions);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load anonymous Q&A sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConversation = async (conversationId: string) => {
    try {
      setConversationLoading(true);
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConversationMessages(messages || []);
    } catch (error: any) {
      console.error('Error fetching conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    } finally {
      setConversationLoading(false);
    }
  };

  const handleViewConversation = async (session: AnonymousSession) => {
    setSelectedSession(session);
    setShowConversation(true);
    await fetchConversation(session.id);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // First delete all messages for this conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', sessionId);

      if (messagesError) throw messagesError;

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', sessionId);

      if (conversationError) throw conversationError;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({
        title: 'Session Deleted',
        description: 'Anonymous Q&A session has been deleted',
      });
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
    }
  };

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'abandoned': return 'bg-orange-500';
      case 'upgraded_to_intake': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const getLanguageFlag = (language: string) => {
    switch (language) {
      case 'en': return '🇺🇸';
      case 'ar': return '🇪🇬';
      case 'de': return '🇩🇪';
      default: return '🌐';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.first_message_preview?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.session_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesLanguage = languageFilter === 'all' || session.language === languageFilter;
    const matchesSource = sourceFilter === 'all' || session.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesLanguage && matchesSource;
  });

  const handleCleanupOldSessions = async () => {
    setCleanupLoading(true);
    try {
      const result = await cleanupOldAnonymousSessions();
      
      if (result.success) {
        toast({
          title: 'Cleanup Successful',
          description: result.message,
        });
        // Refresh the sessions list
        await fetchSessions();
      } else {
        toast({
          title: 'Cleanup Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: 'Error',
        description: 'Failed to cleanup old sessions',
        variant: 'destructive',
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    abandoned: sessions.filter(s => s.status === 'abandoned').length,
    upgraded: sessions.filter(s => s.status === 'upgraded_to_intake').length,
  };

  // Security check - don't render if user doesn't have admin access
  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium text-destructive mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to access anonymous session data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy Protection Notice */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 mt-1">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Privacy Protection Enabled</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Anonymous sessions are automatically cleaned up after 30 days to protect user privacy. 
                IP addresses and user agents are no longer collected.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanupOldSessions}
                disabled={cleanupLoading}
                className="mt-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-200 dark:hover:bg-yellow-900/20"
              >
                {cleanupLoading ? 'Cleaning...' : 'Run Cleanup Now'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Abandoned</p>
                <p className="text-3xl font-bold text-orange-600">{stats.abandoned}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upgraded</p>
                <p className="text-3xl font-bold text-blue-600">{stats.upgraded}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search sessions by message content or session ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="abandoned">Abandoned</option>
              <option value="upgraded_to_intake">Upgraded to Intake</option>
            </select>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
            >
              <option value="all">All Languages</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="de">German</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
            >
              <option value="all">All Sources</option>
              <option value="homepage">Homepage</option>
              <option value="coming_soon">Coming Soon</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Anonymous Q&A Sessions ({filteredSessions.length})</CardTitle>
          <CardDescription>
            Click on a session to view the full conversation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <Collapsible>
                    <CollapsibleTrigger
                      onClick={() => toggleSessionExpansion(session.id)}
                      className="w-full"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {expandedSessions.has(session.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span className="text-sm font-mono text-muted-foreground">
                              {session.session_id.slice(-8)}
                            </span>
                          </div>
                          <Badge className={getStatusColor(session.status)}>
                            {session.status}
                          </Badge>
                          {session.source === 'coming_soon' && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                              Coming Soon
                            </Badge>
                          )}
                          <div className="flex items-center gap-1">
                            <Globe className="h-4 w-4" />
                            <span>{getLanguageFlag(session.language)} {session.language.toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                          <span>{session.message_count} messages</span>
                          <span>•</span>
                          <span>{formatDate(session.created_at)}</span>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-4">
                      <div className="space-y-3">
                        {session.first_message_preview && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm font-medium mb-1">First Message:</p>
                            <p className="text-sm text-muted-foreground">
                              "{session.first_message_preview}"
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Last activity: {formatDate(session.last_activity)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewConversation(session)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Conversation
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSession(session.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))}
            
            {filteredSessions.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No sessions found</h3>
                <p className="text-muted-foreground">
                  No anonymous Q&A sessions match your current filters.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation Dialog */}
      <Dialog open={showConversation} onOpenChange={setShowConversation}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation Details
              {selectedSession && (
                <Badge className={getStatusColor(selectedSession.status)}>
                  {selectedSession.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong>Session ID:</strong>
                  <p className="font-mono">{selectedSession.session_id.slice(-12)}</p>
                </div>
                <div>
                  <strong>Language:</strong>
                  <p>{getLanguageFlag(selectedSession.language)} {selectedSession.language.toUpperCase()}</p>
                </div>
                <div>
                  <strong>Messages:</strong>
                  <p>{selectedSession.message_count}</p>
                </div>
                <div>
                  <strong>Created:</strong>
                  <p>{formatDate(selectedSession.created_at)}</p>
                </div>
              </div>
              
              <ScrollArea className="h-96 border rounded-lg p-4">
                {conversationLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversationMessages.map((message) => (
                      <div key={message.id} className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {message.role === 'user' ? (
                            <User className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Bot className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <div className="text-xs opacity-70 mt-2">
                            {formatDate(message.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnonymousQAManager;