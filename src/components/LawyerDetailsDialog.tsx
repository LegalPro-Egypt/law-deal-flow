import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Award, 
  Calendar, 
  MessageSquare,
  Eye,
  Clock
} from "lucide-react";

interface LawyerProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  law_firm: string | null;
  specializations: string[] | null;
  years_experience: number | null;
  bar_admissions: string[] | null;
  jurisdictions: string[] | null;
  bio: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface LawyerConversation {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  language: string;
  status: string;
  messages_count: number;
  last_message: string | null;
  last_message_time: string | null;
}

interface LawyerDetailsDialogProps {
  lawyerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LawyerDetailsDialog = ({ lawyerId, isOpen, onClose }: LawyerDetailsDialogProps) => {
  const { toast } = useToast();
  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [conversations, setConversations] = useState<LawyerConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [showConversationDetails, setShowConversationDetails] = useState(false);

  useEffect(() => {
    if (isOpen && lawyerId) {
      fetchLawyerDetails();
    }
  }, [isOpen, lawyerId]);

  const fetchLawyerDetails = async () => {
    if (!lawyerId) return;

    setLoading(true);
    try {
      // Fetch lawyer profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', lawyerId)
        .eq('role', 'lawyer')
        .single();

      if (profileError) throw profileError;
      setLawyer(profileData);

      // Fetch lawyer's QA conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          session_id,
          created_at,
          updated_at,
          language,
          status,
          messages (
            id,
            content,
            role,
            created_at
          )
        `)
        .eq('lawyer_id', lawyerId)
        .eq('mode', 'qa_lawyer')
        .order('created_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Process conversations with message counts and last message info
      const processedConversations = conversationsData.map(conv => {
        const messages = conv.messages || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        
        return {
          id: conv.id,
          session_id: conv.session_id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          language: conv.language,
          status: conv.status,
          messages_count: messages.length,
          last_message: lastMessage?.content || null,
          last_message_time: lastMessage?.created_at || null
        };
      });

      setConversations(processedConversations);

    } catch (error: any) {
      console.error('Error fetching lawyer details:', error);
      toast({
        title: "Error",
        description: "Failed to load lawyer details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationMessages = async (conversationId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConversationMessages(messages || []);
      setSelectedConversationId(conversationId);
      setShowConversationDetails(true);
    } catch (error: any) {
      console.error('Error fetching conversation messages:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation messages.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!lawyer) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl w-[95vw] h-[95vh] overflow-hidden p-0 flex flex-col gap-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {lawyer.first_name} {lawyer.last_name} - Profile & AI Chat History
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{lawyer.is_verified ? 'verified' : 'unverified'}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{conversations.length} conversations</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{conversations.reduce((total, conv) => total + conv.messages_count, 0)} total messages</span>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-6 space-y-8">
                {/* Profile Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                        <p className="text-sm">{lawyer.first_name} {lawyer.last_name}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm">{lawyer.email}</p>
                        </div>
                      </div>
                      
                      {lawyer.phone && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Office Phone</label>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm">{lawyer.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {lawyer.law_firm && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Law Firm</label>
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm">{lawyer.law_firm}</p>
                          </div>
                        </div>
                      )}
                      
                      {lawyer.years_experience && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Years of Experience</label>
                          <div className="flex items-center gap-2">
                            <Award className="h-3 w-3 text-muted-foreground" />
                            <p className="text-sm">{lawyer.years_experience} years</p>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm">{formatDate(lawyer.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex gap-2">
                      <Badge variant={lawyer.is_active ? "default" : "secondary"}>
                        {lawyer.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant={lawyer.is_verified ? "default" : "secondary"}>
                        {lawyer.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Professional Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Professional Information</h3>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {lawyer.specializations && lawyer.specializations.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">Specializations</label>
                          <div className="flex flex-wrap gap-1">
                            {lawyer.specializations.map((spec, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {lawyer.bar_admissions && lawyer.bar_admissions.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">Bar Admissions</label>
                          <div className="flex flex-wrap gap-1">
                            {lawyer.bar_admissions.map((admission, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {admission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {lawyer.jurisdictions && lawyer.jurisdictions.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">Jurisdictions</label>
                          <div className="flex flex-wrap gap-1">
                            {lawyer.jurisdictions.map((jurisdiction, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {jurisdiction}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {lawyer.bio && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">Bio</label>
                          <p className="text-sm text-muted-foreground leading-relaxed">{lawyer.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* AI Chat History Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">AI Chat History</h3>
                  </div>
                  
                  {conversations.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No AI conversations yet</p>
                      <p className="text-sm text-muted-foreground mt-1">This lawyer hasn't used the AI assistant</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {conversations.map((conversation) => (
                        <Card key={conversation.id} className="p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono">
                                {conversation.session_id.slice(0, 12)}...
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {conversation.language.toUpperCase()}
                              </Badge>
                              <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {conversation.status}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchConversationMessages(conversation.id)}
                              className="h-8"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Messages
                            </Button>
                          </div>
                          
                          <div className="grid sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              <span>{conversation.messages_count} messages</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(conversation.created_at)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Updated: {formatDate(conversation.updated_at)}</span>
                            </div>
                          </div>

                          {conversation.last_message && (
                            <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                              <span className="text-muted-foreground">Last message: </span>
                              <span>{truncateText(conversation.last_message, 120)}</span>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Conversation Messages Dialog */}
      <Dialog open={showConversationDetails} onOpenChange={setShowConversationDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conversation Messages</DialogTitle>
            <DialogDescription>
              Q&A conversation between {lawyer.first_name} {lawyer.last_name} and Legal AI
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {conversationMessages.map((message, index) => (
                <div key={message.id} className="space-y-2">
                  <div className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <div className="text-sm">
                        {message.content.split('\n').map((line: string, lineIndex: number) => (
                          <span key={lineIndex}>
                            {line}
                            {lineIndex < message.content.split('\n').length - 1 && <br />}
                          </span>
                        ))}
                      </div>
                      <div className={`text-xs mt-1 opacity-70 ${
                        message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.role === 'user' ? 'Lawyer' : 'AI Assistant'} • {formatDate(message.created_at)}
                      </div>
                    </div>
                  </div>
                  {index < conversationMessages.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};