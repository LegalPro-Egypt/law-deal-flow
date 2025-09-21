import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  FileText, 
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  Download,
  Eye,
  Sparkles,
  Scale,
  AlertTriangle,
  BookOpen,
  Shield,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DocumentPreview } from './DocumentPreview';
import { getClientNameForRole, shouldShowContactInfo } from '@/utils/clientPrivacy';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useContentTranslation } from '@/hooks/useContentTranslation';

interface CaseDetailsDialogProps {
  caseId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CaseDetails {
  id: string;
  case_number: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  urgency: string;
  status: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  language: string;
  jurisdiction: string;
  created_at: string;
  updated_at: string;
  ai_summary?: string;
  extracted_entities?: any;
  legal_analysis?: any;
  case_complexity_score?: number;
  client_responses_summary?: any;
  user_id: string;
  assigned_lawyer_id?: string;
  assigned_admin_id?: string;
}

interface ConversationMessage {
  id: string;
  case_id: string;
  role: string;
  content: string;
  message_type: string;
  metadata?: any;
  created_at: string;
}

interface CaseDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  document_category?: string;
  created_at: string;
}

export const CaseDetailsDialog: React.FC<CaseDetailsDialogProps> = ({ 
  caseId, 
  isOpen, 
  onClose 
}) => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { translateIfNeeded, isTranslating } = useContentTranslation();
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [caseAnalysis, setCaseAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<CaseDocument | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [translatedContent, setTranslatedContent] = useState<{
    aiSummary?: string;
    legalAnalysis?: any;
  }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && caseId) {
      fetchCaseDetails();
      
      // Set up realtime subscription for case messages
      const channel = supabase
        .channel('case-messages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'case_messages',
            filter: `case_id=eq.${caseId}`
          },
          (payload) => {
            console.log('Realtime case message update:', payload);
            // Refetch conversation when messages change
            fetchConversation();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, caseId]);

  // Translation effect - translate content when case details change or language changes
  useEffect(() => {
    const translateCaseContent = async () => {
      if (!caseDetails) return;

      const caseLanguage = caseDetails.language || 'en';
      
      // Translate AI summary if needed
      if (caseDetails.ai_summary) {
        const translatedSummary = await translateIfNeeded(
          caseDetails.ai_summary,
          caseLanguage,
          'ai_summary',
          `case_${caseDetails.id}_summary`
        );
        
        if (translatedSummary !== caseDetails.ai_summary) {
          setTranslatedContent(prev => ({
            ...prev,
            aiSummary: translatedSummary
          }));
        }
      }

      // Translate legal analysis if needed
      if (caseAnalysis) {
        try {
          const analysisString = typeof caseAnalysis === 'string' 
            ? caseAnalysis 
            : JSON.stringify(caseAnalysis);
          
          const translatedAnalysis = await translateIfNeeded(
            analysisString,
            caseLanguage,
            'legal_analysis',
            `case_${caseDetails.id}_analysis`
          );
          
          if (translatedAnalysis !== analysisString) {
            const parsedAnalysis = typeof caseAnalysis === 'string' 
              ? translatedAnalysis 
              : JSON.parse(translatedAnalysis);
            
            setTranslatedContent(prev => ({
              ...prev,
              legalAnalysis: parsedAnalysis
            }));
          }
        } catch (error) {
          console.error('Error translating legal analysis:', error);
        }
      }
    };

    translateCaseContent();
  }, [caseDetails, caseAnalysis, translateIfNeeded]);

  const fetchConversation = async () => {
    if (!caseId) return;
    
    try {
      // Fetch case messages directly using case_id - ADMIN MUST USE SERVICE KEY
      console.log('Fetching case messages for case_id:', caseId);
      const { data: messages, error: messagesError } = await supabase
        .from('case_messages')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching case messages:', messagesError);
        toast({
          title: t('caseDetails.toast.messageFetchError'),
          description: t('caseDetails.toast.messageFetchErrorDesc', { error: messagesError.message }),
          variant: "destructive",
        });
      }

      const finalMessages = messages || [];
      console.log(`Fetched ${finalMessages.length} messages for case ${caseId}`);
      
      // Health check logging
      if (finalMessages.length === 0) {
        console.warn(`No messages found for case ${caseId} - this may indicate a data flow issue`);
      } else {
        const newestMessage = finalMessages[finalMessages.length - 1];
        console.log('Health check - Case:', caseId, 'Messages:', finalMessages.length, 'Newest:', newestMessage?.created_at);
      }

      // De-duplicate before setting state to avoid duplicate bubbles
      setConversation(dedupeMessages(finalMessages));
    } catch (error: any) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchCaseDetails = async () => {
    if (!caseId) return;
    
    setLoading(true);
    try {
      // Fetch case details
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;
      setCaseDetails(caseData);

      // Fetch conversation
      await fetchConversation();

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('id, file_name, file_type, file_size, file_url, document_category, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      setDocuments(documentsData || []);

      // Fetch case analysis
      const { data: analysisData } = await supabase
        .from('case_analysis')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCaseAnalysis(analysisData);

    } catch (error: any) {
      console.error('Error fetching case details:', error);
      toast({
        title: t('caseDetails.toast.error'),
        description: t('caseDetails.toast.fetchError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-500';
      case 'under_review': return 'bg-yellow-500';
      case 'assigned': return 'bg-purple-500';
      case 'in_progress': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'intake': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Helper functions for translations
  const getStatusTranslation = (status: string) => {
    const statusKey = status.toLowerCase().replace(/\s+/g, '_');
    return t(`caseDetails.status.${statusKey}`, status.replace('_', ' ').toUpperCase());
  };

  const getUrgencyTranslation = (urgency: string) => {
    return t(`caseDetails.urgency.${urgency.toLowerCase()}`, urgency.toUpperCase());
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return `0 ${t('caseDetails.documents.fileSize.bytes')}`;
    const k = 1024;
    const sizes = ['bytes', 'kb', 'mb', 'gb'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${size} ${t(`caseDetails.documents.fileSize.${sizes[i]}`)}`;
  };

  // De-duplicate messages by deterministic key to guard against double inserts
  const dedupeMessages = (msgs: ConversationMessage[]) => {
    const seen = new Set<string>();
    const result: ConversationMessage[] = [];
    for (const m of msgs || []) {
      const key = `${m.case_id}|${m.role}|${m.content}|${m.created_at}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(m);
      }
    }
    return result;
  };

  // Sanitize AI summary to enforce neutral third-person POV using client name when available
  const sanitizeAiSummary = (text?: string, clientName?: string) => {
    if (!text) return '';
    const name = clientName && clientName.trim().length > 0 ? clientName.trim() : null;
    // Replace common second-person pronouns with third-person equivalents
    let s = text
      .replace(/\bYou\b/g, name ? name : 'The client')
      .replace(/\byou\b/g, name ? name : 'the client')
      .replace(/\bYour\b/g, name ? `${name}'s` : "The client's")
      .replace(/\byour\b/g, name ? `${name}'s` : "the client's");
    return s;
  };


  const generateSummary = async () => {
    if (!caseId) return;

    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-conversation-summary', {
        body: { caseId, clientName: caseDetails?.client_name }
      });

      if (error) throw error;

      // Update the local state with the generated summary
      setCaseDetails(prev => prev ? { ...prev, ai_summary: data.summary } : null);
      
      toast({
        title: t('caseDetails.toast.summaryGenerated'),
        description: t('caseDetails.toast.summaryGeneratedDesc'),
      });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: t('caseDetails.toast.error'),
        description: t('caseDetails.toast.summaryError'),
        variant: "destructive",
      });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const generateLegalAnalysis = async () => {
    if (!caseId || conversation.length === 0) return;

    setGeneratingAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-legal-analysis', {
        body: { 
          messages: conversation,
          category: caseDetails?.category || 'General',
          language: caseDetails?.language || 'en',
          caseId: caseId
        }
      });

      if (error) throw error;

      // Add delay to ensure database write completes before refetch
      await new Promise(resolve => setTimeout(resolve, 1000));

      // The edge function will save to case_analysis table directly
      // Refresh the case analysis data with retry logic
      let analysisData = null;
      for (let i = 0; i < 3; i++) {
        const { data: freshAnalysis } = await supabase
          .from('case_analysis')
          .select('*')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (freshAnalysis && freshAnalysis.status === 'completed') {
          analysisData = freshAnalysis;
          break;
        }
        
        // Wait before retry
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setCaseAnalysis(analysisData);
      
      toast({
        title: t('caseDetails.toast.analysisGenerated'),
        description: t('caseDetails.toast.analysisGeneratedDesc'),
      });
    } catch (error: any) {
      console.error('Error generating legal analysis:', error);
      toast({
        title: t('caseDetails.toast.error'),
        description: t('caseDetails.toast.analysisError'),
        variant: "destructive",
      });
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const downloadDocument = async (doc: CaseDocument) => {
    try {
      setLoadingStates(prev => ({ ...prev, [`download-${doc.id}`]: true }));
      
      // Get signed URL for download
      const { data, error } = await supabase.functions.invoke('get-document-signed-url', {
        body: { documentId: doc.id }
      });

      if (error || !data?.signedUrl) {
        throw new Error('Failed to get download URL');
      }

      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: t('caseDetails.toast.downloadStarted'),
        description: t('caseDetails.toast.downloadStartedDesc', { fileName: doc.file_name }),
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: t('caseDetails.toast.downloadFailed'),
        description: t('caseDetails.toast.downloadFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [`download-${doc.id}`]: false }));
    }
  };

  const viewDocument = async (doc: CaseDocument) => {
    try {
      setLoadingStates(prev => ({ ...prev, [`view-${doc.id}`]: true }));
      
      const isImage = doc.file_type.startsWith('image/');
      const isPDF = doc.file_type === 'application/pdf';
      
      if (isImage || isPDF) {
        // Get signed URL for viewing in preview
        const { data, error } = await supabase.functions.invoke('get-document-signed-url', {
          body: { documentId: doc.id }
        });

        if (error || !data?.signedUrl) {
          throw new Error('Failed to get document URL');
        }

        // Create document object with signed URL for preview
        const documentWithSignedUrl = {
          ...doc,
          file_url: data.signedUrl
        };

        setPreviewDocument(documentWithSignedUrl);
      } else {
        // For other file types, get signed URL and open in new tab
        const { data, error } = await supabase.functions.invoke('get-document-signed-url', {
          body: { documentId: doc.id }
        });

        if (error || !data?.signedUrl) {
          throw new Error('Failed to get document URL');
        }

        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: t('caseDetails.toast.viewFailed'),
        description: t('caseDetails.toast.viewFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [`view-${doc.id}`]: false }));
    }
  };

  if (!isOpen || !caseId) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('caseDetails.title')}
              {caseDetails && (
                <Badge variant="outline">{caseDetails.case_number}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t('caseDetails.loading')}</p>
              </div>
            </div>
          ) : caseDetails ? (
            <Tabs defaultValue="overview" className="h-full">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1 gap-1">
                <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-2">
                  {t('caseDetails.tabs.overview')}
                </TabsTrigger>
                <TabsTrigger value="conversation" className="text-xs sm:text-sm px-2 py-2">
                  {t('caseDetails.tabs.conversation')}
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs sm:text-sm px-2 py-2">
                  {t('caseDetails.tabs.documents')}
                </TabsTrigger>
                <TabsTrigger value="legal-analysis" className="text-xs sm:text-sm px-2 py-2">
                  {t('caseDetails.tabs.legalAnalysis')}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh] mt-4">
                <TabsContent value="overview" className="space-y-4">
                  {/* Case Status and Priority */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">{t('caseDetails.status.title')}</span>
                        </div>
                        <Badge className={`mt-2 ${getStatusColor(caseDetails.status)}`}>
                          {getStatusTranslation(caseDetails.status)}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">{t('caseDetails.urgency.title')}</span>
                        </div>
                        <Badge className={`mt-2 ${getUrgencyColor(caseDetails.urgency)}`}>
                          {getUrgencyTranslation(caseDetails.urgency)}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">{t('caseDetails.caseInfo.created')}</span>
                        </div>
                        <p className="mt-2 text-sm">{formatDate(caseDetails.created_at)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Case Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('caseDetails.caseInfo.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium">{t('caseDetails.caseInfo.caseTitle')}</h4>
                        <p className="text-sm text-muted-foreground">{caseDetails.title}</p>
                      </div>
                      <div>
                        <h4 className="font-medium">{t('caseDetails.caseInfo.category')}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{caseDetails.category}</Badge>
                          {caseDetails.subcategory && (
                            <Badge variant="outline">{caseDetails.subcategory}</Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium">{t('caseDetails.caseInfo.description')}</h4>
                        <p className="text-sm text-muted-foreground">{caseDetails.description}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Client Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('caseDetails.clientInfo.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{getClientNameForRole(caseDetails.client_name, profile?.role)}</span>
                      </div>
                      {shouldShowContactInfo(profile?.role) && (
                        <>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{caseDetails.client_email}</span>
                          </div>
                          {caseDetails.client_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{caseDetails.client_phone}</span>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* AI Summary */}
                  {caseDetails.ai_summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          {t('caseDetails.aiSummary.title')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isTranslating ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span>{t('common.loading')}</span>
                          </div>
                        ) : (
                          <p className="text-sm">
                            {translatedContent.aiSummary || caseDetails.ai_summary}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="conversation" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">{t('caseDetails.conversation.title')}</h3>
                      <Button
                        onClick={generateSummary}
                        disabled={generatingSummary || conversation.length === 0}
                        size="sm"
                        variant="outline"
                      >
                        {generatingSummary ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                            {t('caseDetails.conversation.generating')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            {t('caseDetails.conversation.generateSummary')}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Health Check Info */}
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                         <div className="text-xs text-muted-foreground space-y-1">
                           <div><strong>{t('caseDetails.conversation.healthCheck')}</strong></div>
                           <div>{t('caseDetails.conversation.caseId')} {caseId}</div>
                           <div>{t('caseDetails.conversation.messageCount')} {conversation.length}</div>
                           {conversation.length > 0 && (
                             <div>{t('caseDetails.conversation.newestMessage')} {formatDate(conversation[conversation.length - 1]?.created_at || '')}</div>
                           )}
                           {caseDetails?.client_name && (
                             <div>{t('caseDetails.conversation.clientName')} {caseDetails.client_name}</div>
                           )}
                         </div>
                      </CardContent>
                    </Card>

                    <ScrollArea className="h-96 border rounded-lg p-4">
                      {conversation.length > 0 ? (
                        <div className="space-y-4">
                          {conversation.map((message, index) => (
                            <div
                              key={message.id || index}
                              className={`flex ${
                                isRTL 
                                  ? (message.role === 'user' ? 'justify-start' : 'justify-end')
                                  : (message.role === 'user' ? 'justify-end' : 'justify-start')
                              }`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {message.role === 'user' ? t('caseDetails.conversation.client') : t('caseDetails.conversation.assistant')}
                                  </span>
                                  <span className="text-xs opacity-70">
                                    {formatDate(message.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>{t('caseDetails.conversation.noMessages')}</p>
                          <p className="text-xs mt-1">{t('caseDetails.conversation.noMessagesDesc')}</p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  {documents.length > 0 ? (
                    <div className="grid gap-4">
                      {documents.map((doc) => (
                        <Card key={doc.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-8 w-8 text-blue-600" />
                                <div>
                                  <h4 className="font-medium">{doc.file_name}</h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{doc.file_type.toUpperCase()}</span>
                                    <span>•</span>
                                    <span>{formatFileSize(doc.file_size)}</span>
                                    <span>•</span>
                                    <span>{formatDate(doc.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.document_category && (
                                  <Badge variant="outline">{doc.document_category}</Badge>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewDocument(doc)}
                                  disabled={loadingStates[`view-${doc.id}`]}
                                >
                                  {loadingStates[`view-${doc.id}`] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadDocument(doc)}
                                  disabled={loadingStates[`download-${doc.id}`]}
                                >
                                  {loadingStates[`download-${doc.id}`] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t('caseDetails.documents.noDocuments')}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {t('caseDetails.documents.noDocumentsDesc')}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="legal-analysis" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{t('caseDetails.legalAnalysis.title')}</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={fetchCaseDetails}
                        size="sm"
                        variant="ghost"
                      >
                        {t('caseDetails.legalAnalysis.refresh')}
                      </Button>
                      <Button
                        onClick={generateLegalAnalysis}
                        disabled={generatingAnalysis || conversation.length === 0}
                        size="sm"
                        variant="outline"
                      >
                        {generatingAnalysis ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                            {t('caseDetails.legalAnalysis.generating')}
                          </>
                        ) : (
                          <>
                            <Scale className="h-4 w-4 mr-2" />
                            {t('caseDetails.legalAnalysis.generate')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Health Check Info */}
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div><strong>{t('caseDetails.legalAnalysis.healthTitle')}</strong></div>
                        <div>{t('caseDetails.conversation.caseId')} {caseId}</div>
                        {caseAnalysis ? (
                          <div>{t('caseDetails.legalAnalysis.analysisCreated')} {formatDate(caseAnalysis.created_at)}</div>
                        ) : (
                          <div>{t('caseDetails.legalAnalysis.noAnalysis')}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {caseAnalysis?.analysis_data ? (
                    <div className="space-y-4">
                      {/* Case Summary */}
                      {caseAnalysis.analysis_data.caseSummary && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              {t('caseDetails.legalAnalysis.caseSummary')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">
                              {translatedContent.legalAnalysis?.caseSummary || caseAnalysis.analysis_data.caseSummary}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Applicable Laws */}
                      {caseAnalysis.analysis_data.applicableLaws && caseAnalysis.analysis_data.applicableLaws.length > 0 && (
                        <Card>
                           <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                               <Scale className="h-4 w-4" />
                               {t('caseDetails.legalAnalysis.applicableLaws')}
                             </CardTitle>
                           </CardHeader>
                           <CardContent>
                             <div className="space-y-3">
                               {(translatedContent.legalAnalysis?.applicableLaws || caseAnalysis.analysis_data.applicableLaws).map((law: any, index: number) => (
                                 <div key={index} className="p-3 border rounded-lg">
                                   <h4 className="font-medium">{law.law}</h4>
                                   {law.articles && law.articles.length > 0 && (
                                     <div className="mt-2 flex flex-wrap gap-1">
                                       {law.articles.map((article: string, i: number) => (
                                         <Badge key={i} variant="outline" className="text-xs">
                                           {t('caseDetails.legalAnalysis.article')} {article}
                                         </Badge>
                                       ))}
                                     </div>
                                   )}
                                   {law.relevance && (
                                     <p className="text-sm text-muted-foreground mt-2">{law.relevance}</p>
                                   )}
                                 </div>
                               ))}
                             </div>
                           </CardContent>
                        </Card>
                      )}

                      {/* Legal Strategy */}
                      {(translatedContent.legalAnalysis?.legalStrategy || caseAnalysis.analysis_data.legalStrategy) && (
                        <Card>
                           <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                               <Target className="h-4 w-4" />
                               {t('caseDetails.legalAnalysis.legalStrategy')}
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                             {(translatedContent.legalAnalysis?.legalStrategy?.immediateSteps || caseAnalysis.analysis_data.legalStrategy.immediateSteps) && (
                               <div>
                                 <h4 className="font-medium mb-2">{t('caseDetails.legalAnalysis.immediateSteps')}</h4>
                                 <ul className="list-disc pl-5 space-y-1">
                                   {(translatedContent.legalAnalysis?.legalStrategy?.immediateSteps || caseAnalysis.analysis_data.legalStrategy.immediateSteps).map((step: string, i: number) => (
                                     <li key={i} className="text-sm">{step}</li>
                                   ))}
                                 </ul>
                               </div>
                             )}
                              {(translatedContent.legalAnalysis?.legalStrategy?.documentation || caseAnalysis.analysis_data.legalStrategy.documentation) && (
                                <div>
                                  <h4 className="font-medium mb-2">{t('caseDetails.legalAnalysis.requiredDocumentation')}</h4>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {(translatedContent.legalAnalysis?.legalStrategy?.documentation || caseAnalysis.analysis_data.legalStrategy.documentation).map((doc: string, i: number) => (
                                      <li key={i} className="text-sm">{doc}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {(translatedContent.legalAnalysis?.legalStrategy?.timeline || caseAnalysis.analysis_data.legalStrategy.timeline) && (
                                <div>
                                  <h4 className="font-medium mb-2">{t('caseDetails.legalAnalysis.timeline')}</h4>
                                  <p className="text-sm">{translatedContent.legalAnalysis?.legalStrategy?.timeline || caseAnalysis.analysis_data.legalStrategy.timeline}</p>
                                </div>
                              )}
                           </CardContent>
                        </Card>
                      )}

                      {/* Case Complexity */}
                      {caseAnalysis.analysis_data.caseComplexity && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Case Complexity Assessment
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Complexity Level:</span>
                                <Badge variant={
                                  caseAnalysis.analysis_data.caseComplexity.level === 'high' ? 'destructive' :
                                  caseAnalysis.analysis_data.caseComplexity.level === 'medium' ? 'default' : 'secondary'
                                }>
                                  {caseAnalysis.analysis_data.caseComplexity.level?.toUpperCase()}
                                </Badge>
                              </div>
                              {caseAnalysis.analysis_data.caseComplexity.estimatedCost && (
                                <div>
                                  <span className="text-sm font-medium">Estimated Cost: </span>
                                  <span className="text-sm">{caseAnalysis.analysis_data.caseComplexity.estimatedCost}</span>
                                </div>
                              )}
                              {caseAnalysis.analysis_data.caseComplexity.factors && caseAnalysis.analysis_data.caseComplexity.factors.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Complexity Factors:</h4>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {caseAnalysis.analysis_data.caseComplexity.factors.map((factor: string, i: number) => (
                                      <li key={i} className="text-sm">{factor}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {generatingAnalysis ? t('caseDetails.legalAnalysis.pending') : t('caseDetails.legalAnalysis.noAnalysisAvailable')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {t('caseDetails.legalAnalysis.generateDesc')}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('caseDetails.notFound')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {previewDocument && (
        <DocumentPreview
          document={previewDocument}
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </>
  );
};