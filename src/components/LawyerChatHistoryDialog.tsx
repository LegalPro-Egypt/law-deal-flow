import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  User, 
  Bot, 
  Calendar, 
  Clock,
  MessageSquare,
  FileText,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  DollarSign,
  Users,
  Scale,
  FileImage
} from "lucide-react";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  metadata?: any;
}

interface LawyerProfile {
  id: string;
  user_id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  bio: string | null;
  law_firm: string | null;
  years_experience: number | null;
  license_number: string | null;
  bar_admissions: string[] | null;
  specializations: string[] | null;
  jurisdictions: string[] | null;
  languages: string[];
  team_size: number | null;
  team_breakdown: any;
  pricing_structure: any;
  payment_structures: string[];
  consultation_methods: string[];
  professional_memberships: string[] | null;
  notable_achievements: string | null;
  verification_status: string;
  is_verified: boolean;
  is_active: boolean;
  lawyer_card_front_url: string | null;
  lawyer_card_back_url: string | null;
  credentials_documents: string[] | null;
  created_at: string;
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  language: string;
  messages: ChatMessage[];
}

interface LawyerChatHistoryDialogProps {
  lawyerId: string;
  lawyerName: string;
  children: React.ReactNode;
}

export const LawyerChatHistoryDialog = ({ 
  lawyerId, 
  lawyerName, 
  children 
}: LawyerChatHistoryDialogProps) => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [lawyerProfile, setLawyerProfile] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [cardUrls, setCardUrls] = useState<{front?: string; back?: string}>({});

  const fetchLawyerProfile = async () => {
    if (!lawyerId) return;
    
    try {
      // Fetch lawyer profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', lawyerId)
        .single();

      if (profileError) throw profileError;
      
      setLawyerProfile(profileData);

      // Fetch signed URLs for lawyer card documents
      if (profileData?.lawyer_card_front_url || profileData?.lawyer_card_back_url) {
        const urls: {front?: string; back?: string} = {};
        
        if (profileData.lawyer_card_front_url) {
          const { data: frontUrl } = await supabase.functions.invoke('get-document-signed-url', {
            body: { filePath: profileData.lawyer_card_front_url }
          });
          if (frontUrl?.signedUrl) urls.front = frontUrl.signedUrl;
        }
        
        if (profileData.lawyer_card_back_url) {
          const { data: backUrl } = await supabase.functions.invoke('get-document-signed-url', {
            body: { filePath: profileData.lawyer_card_back_url }
          });
          if (backUrl?.signedUrl) urls.back = backUrl.signedUrl;
        }
        
        setCardUrls(urls);
      }
    } catch (error: any) {
      console.error('Error fetching lawyer profile:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lawyer profile: " + error.message,
        variant: "destructive",
      });
    }
  };

  const fetchChatHistory = async () => {
    if (!lawyerId) return;
    
    try {
      // Fetch lawyer QA conversations
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('mode', 'qa_lawyer')
        .order('created_at', { ascending: false });

      if (convError) throw convError;

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        return;
      }

      // Fetch messages for each conversation
      const conversationsWithMessages = await Promise.all(
        conversationsData.map(async (conv) => {
          const { data: messagesData, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          if (msgError) {
            console.error('Error fetching messages:', msgError);
            return { ...conv, messages: [] };
          }

          return {
            ...conv,
            messages: messagesData || []
          };
        })
      );

      setConversations(conversationsWithMessages as Conversation[]);
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch chat history: " + error.message,
        variant: "destructive",
      });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchLawyerProfile(), fetchChatHistory()]);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, lawyerId]);

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const getMessageIcon = (role: string) => {
    return role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />;
  };

  const getTotalMessages = () => {
    return conversations.reduce((total, conv) => total + conv.messages.length, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {lawyerName} - Profile & AI Chat History
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {lawyerProfile?.verification_status || 'Unknown Status'}
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {conversations.length} conversations
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {getTotalMessages()} total messages
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile & Questionnaire</TabsTrigger>
            <TabsTrigger value="chat">AI Chat History</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="flex-1">
            <ScrollArea className="flex-1 pr-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !lawyerProfile ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No profile information found for this lawyer.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                          <p className="text-sm">{`${lawyerProfile.first_name || ''} ${lawyerProfile.last_name || ''}`.trim() || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <p className="text-sm">{lawyerProfile.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Phone</label>
                          <p className="text-sm">{lawyerProfile.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Status</label>
                          <div className="flex items-center gap-2">
                            <Badge variant={lawyerProfile.is_active ? "default" : "destructive"}>
                              {lawyerProfile.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant={lawyerProfile.is_verified ? "default" : "secondary"}>
                              {lawyerProfile.is_verified ? "Verified" : "Unverified"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {lawyerProfile.bio && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Biography</label>
                          <p className="text-sm mt-1">{lawyerProfile.bio}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Professional Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Professional Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Law Firm</label>
                          <p className="text-sm">{lawyerProfile.law_firm || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Years of Experience</label>
                          <p className="text-sm">{lawyerProfile.years_experience || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">License Number</label>
                          <p className="text-sm">{lawyerProfile.license_number || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Team Size</label>
                          <p className="text-sm">{lawyerProfile.team_size || 'Not provided'}</p>
                        </div>
                      </div>
                      
                      {lawyerProfile.specializations && lawyerProfile.specializations.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Specializations</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {lawyerProfile.specializations.map((spec, index) => (
                              <Badge key={index} variant="outline">{spec}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {lawyerProfile.jurisdictions && lawyerProfile.jurisdictions.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Jurisdictions</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {lawyerProfile.jurisdictions.map((jurisdiction, index) => (
                              <Badge key={index} variant="outline">{jurisdiction}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {lawyerProfile.bar_admissions && lawyerProfile.bar_admissions.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Bar Admissions</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {lawyerProfile.bar_admissions.map((admission, index) => (
                              <Badge key={index} variant="outline">{admission}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {lawyerProfile.languages && lawyerProfile.languages.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Languages</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {lawyerProfile.languages.map((language, index) => (
                              <Badge key={index} variant="outline">{language}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Business Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Business Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {lawyerProfile.consultation_methods && lawyerProfile.consultation_methods.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Consultation Methods</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {lawyerProfile.consultation_methods.map((method, index) => (
                              <Badge key={index} variant="outline">{method}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {lawyerProfile.payment_structures && lawyerProfile.payment_structures.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Payment Structures</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {lawyerProfile.payment_structures.map((structure, index) => (
                              <Badge key={index} variant="outline">{structure}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {lawyerProfile.pricing_structure && Object.keys(lawyerProfile.pricing_structure).length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Pricing Structure</label>
                          <div className="text-sm mt-1">
                            <pre className="bg-muted p-2 rounded text-xs">
                              {JSON.stringify(lawyerProfile.pricing_structure, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Additional Information */}
                  {(lawyerProfile.professional_memberships?.length || lawyerProfile.notable_achievements) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Additional Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {lawyerProfile.professional_memberships && lawyerProfile.professional_memberships.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Professional Memberships</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {lawyerProfile.professional_memberships.map((membership, index) => (
                                <Badge key={index} variant="outline">{membership}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {lawyerProfile.notable_achievements && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Notable Achievements</label>
                            <p className="text-sm mt-1">{lawyerProfile.notable_achievements}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Lawyer Card Documents */}
                  {(cardUrls.front || cardUrls.back) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileImage className="h-5 w-5" />
                          Lawyer Card Documents
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {cardUrls.front && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Front</p>
                              <img 
                                src={cardUrls.front}
                                alt="Lawyer Card Front"
                                className="w-full h-48 object-cover rounded border"
                              />
                            </div>
                          )}
                          {cardUrls.back && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Back</p>
                              <img 
                                src={cardUrls.back}
                                alt="Lawyer Card Back"
                                className="w-full h-48 object-cover rounded border"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Account Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Account Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
                        <p className="text-sm">{lawyerProfile.verification_status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                        <p className="text-sm">{format(new Date(lawyerProfile.created_at), 'PPP')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="flex-1">
            <ScrollArea className="flex-1 pr-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No chat history found for this lawyer.</p>
                  <p className="text-sm">The lawyer hasn't used the AI assistant yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {conversations.map((conversation) => (
                    <Card key={conversation.id} className="border">
                      <CardContent className="p-0">
                        {/* Conversation Header */}
                        <div className="p-4 border-b bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(new Date(conversation.created_at), 'PPP')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(conversation.created_at), 'p')}
                              </span>
                              <Badge variant="outline" className="ml-2">
                                {conversation.messages.length} messages
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="p-4 space-y-4">
                          {conversation.messages.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">
                              No messages in this conversation
                            </p>
                          ) : (
                            conversation.messages.map((message, index) => (
                              <div key={message.id} className="flex gap-3">
                                {message.role === 'assistant' && (
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    {getMessageIcon(message.role)}
                                  </div>
                                )}
                                <div
                                  className={`flex-1 ${
                                    message.role === 'user' ? 'flex justify-end' : ''
                                  }`}
                                >
                                  <div
                                    className={`max-w-[80%] rounded-lg p-3 ${
                                      message.role === 'user'
                                        ? 'bg-primary text-primary-foreground ml-auto'
                                        : 'bg-muted'
                                    }`}
                                  >
                                    <div className="text-sm">
                                      {formatMessageContent(message.content)}
                                    </div>
                                    <div className={`text-xs mt-1 opacity-70 ${
                                      message.role === 'user' 
                                        ? 'text-primary-foreground/70' 
                                        : 'text-muted-foreground'
                                    }`}>
                                      {format(new Date(message.created_at), 'p')}
                                    </div>
                                  </div>
                                </div>
                                {message.role === 'user' && (
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    {getMessageIcon(message.role)}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};