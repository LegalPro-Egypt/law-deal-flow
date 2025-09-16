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
  Sparkles
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
  user_id: string;
  assigned_lawyer_id?: string;
  assigned_admin_id?: string;
}

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
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
  const [loading, setLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<CaseDocument | null>(null);
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

      // Fetch conversation if linked
      const { data: conversationData } = await supabase
        .from('conversations')
        .select(`
          id,
          messages (
            id,
            role,
            content,
            created_at
          )
        `)
        .eq('case_id', caseId)
        .single();

      if (conversationData?.messages) {
        setConversation(conversationData.messages);
      }

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('id, file_name, file_type, file_size, file_url, document_category, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      setDocuments(documentsData || []);

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

  const downloadDocument = async (doc: CaseDocument) => {
    try {
      const response = await fetch(doc.file_url);
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
    }
  };

  const viewDocument = (doc: CaseDocument) => {
    const isImage = doc.file_type.startsWith('image/');
    const isPDF = doc.file_type === 'application/pdf';
    
    if (isImage || isPDF) {
      setPreviewDocument(doc);
    } else {
      // For other file types, open in new tab
      window.open(doc.file_url, '_blank');
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="entities">Extracted Data</TabsTrigger>
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
                {conversation.length > 0 ? (
                  <div className="space-y-4">
                    {/* Conversation Statistics */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {conversation.length} messages in conversation
                          </span>
                          <span className="text-muted-foreground">
                            Started: {formatDate(conversation[0]?.created_at)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Conversation Messages */}
                    {conversation.map((message, index) => (
                      <Card key={message.id} className={message.role === 'user' ? 'ml-8' : 'mr-8'}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {message.role === 'user' ? (
                              <User className="h-4 w-4 text-blue-600" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-green-600" />
                            )}
                            <span className="font-medium capitalize">{message.role}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDate(message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No conversation found</h3>
                      <p className="text-muted-foreground">This case doesn't have an associated AI conversation.</p>
                    </CardContent>
                  </Card>
                )}
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
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadDocument(doc)}
                                className="flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Download
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

              <TabsContent value="entities" className="space-y-4">
                {caseDetails.extracted_entities && Object.keys(caseDetails.extracted_entities).length > 0 ? (
                  <div className="grid gap-4">
                    {Object.entries(caseDetails.extracted_entities).map(([key, value]) => (
                      <Card key={key}>
                        <CardHeader>
                          <CardTitle className="capitalize text-sm">{key.replace('_', ' ')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-2">
                              {value.map((item: string, index: number) => (
                                <Badge key={index} variant="outline">{item}</Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm">{String(value)}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No extracted data</h3>
                      <p className="text-muted-foreground">No entities were extracted from this case.</p>
                    </CardContent>
                  </Card>
                )}
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