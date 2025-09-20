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
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [caseAnalysis, setCaseAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<CaseDocument | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && caseId) {
      fetchCaseDetails();
    }
  }, [isOpen, caseId]);

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

      // Fetch case messages directly using case_id
      const { data: messages, error: messagesError } = await supabase
        .from('case_messages')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching case messages:', messagesError);
      }

      let finalMessages = messages || [];
      
      // If no messages found in case_messages, try fallback from messages table via conversation
      if (!finalMessages.length) {
        console.log('No messages in case_messages, trying fallback via conversations');
        const { data: conversationData } = await supabase
          .from('conversations')
          .select(`
            id,
            messages (
              id, role, content, message_type, metadata, created_at
            )
          `)
          .eq('case_id', caseId)
          .order('created_at', { ascending: true });

        if (conversationData && conversationData.length > 0) {
          // Convert messages format to match case_messages structure
          const conversationMessages = conversationData.flatMap(conv => 
            (conv.messages || []).map(msg => ({
              id: msg.id,
              case_id: caseId,
              role: msg.role,
              content: msg.content,
              message_type: msg.message_type || 'text',
              metadata: msg.metadata || {},
              created_at: msg.created_at,
              updated_at: msg.created_at // Add missing field
            }))
          );
          finalMessages = conversationMessages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          console.log('Found', finalMessages.length, 'messages via conversation fallback');
        }
      }

      setConversation(finalMessages);

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
        title: "Error",
        description: "Failed to fetch case details",
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
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateSummary = async () => {
    if (!caseId) return;

    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-conversation-summary', {
        body: { caseId }
      });

      if (error) throw error;

      // Update the local state with the generated summary
      setCaseDetails(prev => prev ? { ...prev, ai_summary: data.summary } : null);
      
      toast({
        title: "Summary Generated",
        description: "AI summary has been generated successfully",
      });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate conversation summary",
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

      // The edge function will save to case_analysis table directly
      // Refresh the case analysis data
      const { data: analysisData } = await supabase
        .from('case_analysis')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCaseAnalysis(analysisData);
      
      toast({
        title: "Legal Analysis Generated",
        description: "Comprehensive legal analysis has been generated successfully",
      });
    } catch (error: any) {
      console.error('Error generating legal analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate legal analysis",
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
        title: "Download Started",
        description: `Downloading ${doc.file_name}`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download document",
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
        title: "View Failed",
        description: "Failed to view document",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [`view-${doc.id}`]: false }));
    }
  };

  if (!isOpen || !caseId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Case Details
            {caseDetails && (
              <Badge variant="outline">{caseDetails.case_number}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading case details...</p>
            </div>
          </div>
        ) : caseDetails ? (
          <Tabs defaultValue="overview" className="h-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1 gap-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-2">
                Overview
              </TabsTrigger>
              <TabsTrigger value="conversation" className="text-xs sm:text-sm px-2 py-2">
                Chat
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm px-2 py-2">
                Files
              </TabsTrigger>
              <TabsTrigger value="legal-analysis" className="text-xs sm:text-sm px-2 py-2">
                Legal Analysis
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
                        <span className="text-sm font-medium">Status</span>
                      </div>
                      <Badge className={`mt-2 ${getStatusColor(caseDetails.status)}`}>
                        {caseDetails.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Priority</span>
                      </div>
                      <Badge className={`mt-2 ${getUrgencyColor(caseDetails.urgency)}`}>
                        {caseDetails.urgency.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">Created</span>
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
                      Case Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium">Title</h4>
                      <p className="text-sm text-muted-foreground">{caseDetails.title}</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Category</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{caseDetails.category}</Badge>
                        {caseDetails.subcategory && (
                          <Badge variant="outline">{caseDetails.subcategory}</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium">Description</h4>
                      <p className="text-sm text-muted-foreground">{caseDetails.description}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">AI Summary</h4>
                        {!caseDetails.ai_summary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={generateSummary}
                            disabled={generatingSummary || conversation.length === 0}
                            className="flex items-center gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            {generatingSummary ? 'Generating...' : 'Generate Summary'}
                          </Button>
                        )}
                      </div>
                      {caseDetails.ai_summary ? (
                        <p className="text-sm text-muted-foreground mt-2">{caseDetails.ai_summary}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {conversation.length === 0 ? 'No conversation available to summarize' : 'No summary generated yet'}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Client Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Name:</span>
                      <span>{caseDetails.client_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <span>{caseDetails.client_email}</span>
                    </div>
                    {caseDetails.client_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Phone:</span>
                        <span>{caseDetails.client_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Jurisdiction:</span>
                      <span className="capitalize">{caseDetails.jurisdiction}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="conversation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Conversation History
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const { data: caseMessages } = await supabase
                            .from('case_messages')
                            .select('*', { count: 'exact' })
                            .eq('case_id', caseId);
                          
                          const { data: conversationMessages } = await supabase
                            .from('conversations')
                            .select(`
                              id, case_id,
                              messages (*)
                            `, { count: 'exact' })
                            .eq('case_id', caseId);

                          toast({
                            title: "Debug Info",
                            description: `case_messages: ${caseMessages?.length || 0}, conversation messages: ${conversationMessages?.flatMap(c => c.messages || []).length || 0}`,
                          });
                        }}
                        className="ml-auto"
                      >
                        Test Fetch
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conversation.length > 0 ? (
                      <ScrollArea className="h-96">
                        <div className="space-y-4">
                          {conversation.map((message, index) => (
                            <div
                              key={message.id || index}
                              className={`flex ${
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {formatDate(message.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No messages yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          This case doesn't have any recorded messages yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                {loadingStates[`view-${doc.id}`] ? 'Loading...' : 'View'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadDocument(doc)}
                                disabled={loadingStates[`download-${doc.id}`]}
                                className="flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                {loadingStates[`download-${doc.id}`] ? 'Loading...' : 'Download'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No documents uploaded</h3>
                      <p className="text-muted-foreground">No documents have been uploaded for this case yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="legal-analysis" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Legal Analysis & Strategy
                      </CardTitle>
                      {!caseAnalysis && conversation.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateLegalAnalysis}
                          disabled={generatingAnalysis}
                          className="flex items-center gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          {generatingAnalysis ? 'Generating...' : 'Generate Analysis'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {caseAnalysis?.analysis_data ? (
                      <>
                        {/* Case Summary */}
                        {caseAnalysis.analysis_data.caseSummary && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              Case Summary
                            </h4>
                            <div className="bg-muted p-4 rounded-lg">
                              <p className="text-sm">{caseAnalysis.analysis_data.caseSummary}</p>
                            </div>
                          </div>
                        )}

                        {/* Applicable Laws */}
                        {caseAnalysis.analysis_data.applicableLaws && caseAnalysis.analysis_data.applicableLaws.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                              Applicable Laws & Regulations
                            </h4>
                            <div className="space-y-3">
                              {caseAnalysis.analysis_data.applicableLaws.map((law: any, index: number) => (
                                <div key={index} className="border rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">{law.law}</Badge>
                                    {law.articles && law.articles.length > 0 && (
                                      <div className="flex gap-1">
                                        {law.articles.map((article: string, idx: number) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            Art. {article}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {law.relevance && (
                                    <p className="text-sm text-muted-foreground">{law.relevance}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommended Specialization */}
                        {caseAnalysis.analysis_data.recommendedSpecialization && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-600" />
                              Recommended Legal Specialization
                            </h4>
                            <div className="border rounded-lg p-4 space-y-3">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Primary Specialization</label>
                                <div className="mt-1">
                                  <Badge variant="default" className="text-sm">
                                    {caseAnalysis.analysis_data.recommendedSpecialization.primaryArea}
                                  </Badge>
                                </div>
                              </div>
                              
                              {caseAnalysis.analysis_data.recommendedSpecialization.secondaryAreas && 
                               caseAnalysis.analysis_data.recommendedSpecialization.secondaryAreas.length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Secondary Areas</label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {caseAnalysis.analysis_data.recommendedSpecialization.secondaryAreas.map((area: string, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs">{area}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {caseAnalysis.analysis_data.recommendedSpecialization.reasoning && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Reasoning</label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {caseAnalysis.analysis_data.recommendedSpecialization.reasoning}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Legal Strategy */}
                        {caseAnalysis.analysis_data.legalStrategy && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Target className="h-4 w-4 text-green-600" />
                              Legal Strategy & Next Steps
                            </h4>
                            <div className="border rounded-lg p-4 space-y-4">
                              {caseAnalysis.analysis_data.legalStrategy.immediateSteps && 
                               caseAnalysis.analysis_data.legalStrategy.immediateSteps.length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Immediate Actions</label>
                                  <ul className="mt-2 space-y-1">
                                    {caseAnalysis.analysis_data.legalStrategy.immediateSteps.map((step: string, index: number) => (
                                      <li key={index} className="flex items-start gap-2 text-sm">
                                        <span className="text-green-600 mt-1">•</span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {caseAnalysis.analysis_data.legalStrategy.documentation && 
                               caseAnalysis.analysis_data.legalStrategy.documentation.length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Required Documentation</label>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {caseAnalysis.analysis_data.legalStrategy.documentation.map((doc: string, index: number) => (
                                      <Badge key={index} variant="outline" className="text-xs">{doc}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {caseAnalysis.analysis_data.legalStrategy.timeline && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Expected Timeline</label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {caseAnalysis.analysis_data.legalStrategy.timeline}
                                  </p>
                                </div>
                              )}

                              {caseAnalysis.analysis_data.legalStrategy.risks && 
                               caseAnalysis.analysis_data.legalStrategy.risks.length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Potential Risks</label>
                                  <ul className="mt-2 space-y-1">
                                    {caseAnalysis.analysis_data.legalStrategy.risks.map((risk: string, index: number) => (
                                      <li key={index} className="flex items-start gap-2 text-sm">
                                        <AlertTriangle className="h-3 w-3 text-orange-500 mt-1 flex-shrink-0" />
                                        <span>{risk}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {caseAnalysis.analysis_data.legalStrategy.opportunities && 
                               caseAnalysis.analysis_data.legalStrategy.opportunities.length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Favorable Aspects</label>
                                  <ul className="mt-2 space-y-1">
                                    {caseAnalysis.analysis_data.legalStrategy.opportunities.map((opportunity: string, index: number) => (
                                      <li key={index} className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                                        <span>{opportunity}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Case Complexity */}
                        {caseAnalysis.analysis_data.caseComplexity && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              Case Complexity Assessment
                            </h4>
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    caseAnalysis.analysis_data.caseComplexity.level === 'low' ? 'secondary' :
                                    caseAnalysis.analysis_data.caseComplexity.level === 'medium' ? 'default' : 'destructive'
                                  }
                                  className="capitalize"
                                >
                                  {caseAnalysis.analysis_data.caseComplexity.level} Complexity
                                </Badge>
                                {caseAnalysis.analysis_data.caseComplexity.estimatedCost && (
                                  <Badge variant="outline">
                                    {caseAnalysis.analysis_data.caseComplexity.estimatedCost}
                                  </Badge>
                                )}
                              </div>

                              {caseAnalysis.analysis_data.caseComplexity.factors && 
                               caseAnalysis.analysis_data.caseComplexity.factors.length > 0 && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Complexity Factors</label>
                                  <ul className="mt-2 space-y-1">
                                    {caseAnalysis.analysis_data.caseComplexity.factors.map((factor: string, index: number) => (
                                      <li key={index} className="flex items-start gap-2 text-sm">
                                        <span className="text-primary mt-1">•</span>
                                        <span>{factor}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Analysis Timestamp */}
                        <div className="text-sm text-muted-foreground text-center pt-4 border-t">
                          Analysis generated on {formatDate(caseAnalysis.generated_at)}
                        </div>
                      </>
                    ) : caseAnalysis?.status === 'pending' ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <h3 className="text-lg font-semibold mb-2">Analysis Pending</h3>
                        <p className="text-muted-foreground">Legal analysis is being generated...</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No legal analysis available</h3>
                        <p className="text-muted-foreground">
                          {conversation.length === 0 
                            ? 'No conversation available to analyze' 
                            : 'Legal analysis will be generated from the intake conversation'
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Case not found</h3>
              <p className="text-muted-foreground">Unable to load case details.</p>
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
        <DocumentPreview
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          document={previewDocument}
        />
      </DialogContent>
    </Dialog>
  );
};