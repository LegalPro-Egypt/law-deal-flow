import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Mail, Building, Briefcase, MessageSquare } from 'lucide-react';

interface LawyerRequest {
  id: string;
  email: string;
  full_name: string;
  law_firm: string | null;
  specializations: string[] | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export const LawyerRequestsManager = () => {
  const [requests, setRequests] = useState<LawyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('lawyer_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as LawyerRequest[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch lawyer requests: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('lawyer_requests')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes[requestId] || null,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: `Request ${status}`,
        description: `The lawyer request has been ${status}.`,
      });

      fetchRequests(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update request: " + error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lawyer Access Requests</CardTitle>
          <CardDescription>Loading requests...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lawyer Access Requests</CardTitle>
          <CardDescription>
            Review and manage lawyer access requests. Total: {requests.length}
          </CardDescription>
        </CardHeader>
      </Card>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No lawyer requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{request.full_name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {request.email}
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {request.law_firm && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{request.law_firm}</span>
                    </div>
                  )}
                  
                  {request.specializations && request.specializations.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{request.specializations.join(', ')}</span>
                    </div>
                  )}
                </div>

                {request.message && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Message:</span>
                    </div>
                    <p className="text-sm bg-muted p-3 rounded-md">{request.message}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Submitted: {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
                </div>

                {request.status === 'pending' && (
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <Label htmlFor={`notes-${request.id}`}>Review Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${request.id}`}
                        placeholder="Add any notes about this decision..."
                        value={reviewNotes[request.id] || ''}
                        onChange={(e) => setReviewNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateRequestStatus(request.id, 'approved')}
                        disabled={processingId === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => updateRequestStatus(request.id, 'rejected')}
                        disabled={processingId === request.id}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {request.status !== 'pending' && (
                  <div className="pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      {request.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                      {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString()}
                    </div>
                    {request.review_notes && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Review Notes:</p>
                        <p className="text-sm text-muted-foreground">{request.review_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};