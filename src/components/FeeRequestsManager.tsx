import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Clock, 
  FileText, 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Plus,
  AlertCircle
} from 'lucide-react';
import { useAdditionalFeeRequests } from '@/hooks/useAdditionalFeeRequests';
import { AdditionalFeeRequestDialog } from './AdditionalFeeRequestDialog';
import { formatDistanceToNow } from 'date-fns';

interface FeeRequestsManagerProps {
  activeCases: Array<{
    id: string;
    case_number: string;
    title: string;
    client_name?: string;
    status: string;
  }>;
}

export const FeeRequestsManager: React.FC<FeeRequestsManagerProps> = ({ activeCases }) => {
  const { requests, loading, stats } = useAdditionalFeeRequests();
  const [dialogOpen, setDialogOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" />Accepted</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const respondedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Loading fee requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRequested.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Accepted: ${stats.totalAccepted.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fee Requests</h2>
        <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No fee requests yet</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Create your first additional fee request to request extra compensation for additional work.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="responded">
              Responded ({respondedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {request.request_title}
                          {getStatusBadge(request.status)}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {request.cases?.case_number}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {request.cases?.client_name || 'Client'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDistanceToNow(new Date(request.created_at))} ago
                          </span>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${request.additional_fee_amount.toFixed(2)}
                        </div>
                        {request.timeline_extension_days > 0 && (
                          <div className="text-sm text-muted-foreground">
                            +{request.timeline_extension_days} days
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">{request.request_description}</p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Justification</h4>
                        <p className="text-sm text-muted-foreground">{request.justification}</p>
                      </div>
                      {request.payment_due_date && (
                        <>
                          <Separator />
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <span>Client response due by: {new Date(request.payment_due_date).toLocaleDateString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="responded" className="space-y-4">
            {respondedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No responded requests</p>
                </CardContent>
              </Card>
            ) : (
              respondedRequests.map((request) => (
                <Card key={request.id} className={`border-l-4 ${
                  request.status === 'accepted' ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {request.request_title}
                          {getStatusBadge(request.status)}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {request.cases?.case_number}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {request.cases?.client_name || 'Client'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Responded {formatDistanceToNow(new Date(request.client_responded_at!))} ago
                          </span>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          request.status === 'accepted' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${request.additional_fee_amount.toFixed(2)}
                        </div>
                        {request.timeline_extension_days > 0 && (
                          <div className="text-sm text-muted-foreground">
                            +{request.timeline_extension_days} days
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">{request.request_description}</p>
                      </div>
                      {request.client_response && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-medium mb-2">Client Response</h4>
                            <p className="text-sm text-muted-foreground">{request.client_response}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Create Request Dialog */}
      <AdditionalFeeRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activeCases={activeCases.filter(c => c.status === 'active' || c.status === 'work_in_progress')}
      />
    </div>
  );
};