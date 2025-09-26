import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminData } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  CheckCircle, 
  Eye, 
  Search, 
  Filter, 
  XCircle, 
  Trash2
} from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CaseDetailsDialog } from "@/components/CaseDetailsDialog";
import { ConversationDialog } from "@/components/ConversationDialog";

export default function AdminAIIntakesPage() {
  const { toast } = useToast();
  const { 
    pendingIntakes, 
    loading, 
    createCaseFromIntake, 
    deleteSelectedIntakes,
    refreshData
  } = useAdminData();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [intakeToDelete, setIntakeToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filteredIntakes = pendingIntakes.filter(intake => {
    const searchLower = searchTerm.toLowerCase();
    const firstMessage = intake.messages?.[0]?.content || '';
    return (
      intake.session_id.toLowerCase().includes(searchLower) ||
      firstMessage.toLowerCase().includes(searchLower) ||
      intake.language.toLowerCase().includes(searchLower)
    );
  });

  const handleCreateCase = async (conversationId: string) => {
    try {
      const newCase = await createCaseFromIntake(conversationId);
      if (newCase) {
        toast({
          title: "Success",
          description: "Case created successfully from intake conversation",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create case: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleViewConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowConversation(true);
  };

  const handleDeleteIntake = (intakeId: string) => {
    setIntakeToDelete(intakeId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteIntake = async () => {
    if (!intakeToDelete) return;
    
    try {
      await deleteSelectedIntakes([intakeToDelete]);
      setShowDeleteConfirm(false);
      setIntakeToDelete(null);
    } catch (error) {
      // Error is already handled in deleteSelectedIntakes
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Intake Conversations</h1>
          <p className="text-muted-foreground">
            Review and convert AI intake conversations into cases
          </p>
        </div>
        <Button 
          onClick={refreshData}
          variant="outline"
        >
          Refresh Data
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search intakes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {filteredIntakes.length} intake{filteredIntakes.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {filteredIntakes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Intakes</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? "No intakes match your search criteria." : "There are no pending intake conversations to review."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredIntakes.map((intake) => {
            const firstMessage = intake.messages?.[0]?.content || 'No messages';
            const messageCount = intake.messages?.length || 0;
            
            return (
              <Card key={intake.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        Session: {intake.session_id.slice(-8)}
                      </CardTitle>
                      <Badge variant="secondary">
                        {intake.language.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {messageCount} message{messageCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewConversation(intake.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCreateCase(intake.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Create Case
                      </Button>
                      <AlertDialog open={showDeleteConfirm && intakeToDelete === intake.id} onOpenChange={setShowDeleteConfirm}>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteIntake(intake.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Intake Conversation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this intake conversation? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <Button variant="destructive" onClick={confirmDeleteIntake}>
                              Delete
                            </Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <CardDescription>
                    Created: {new Date(intake.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">First Message Preview:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {firstMessage.length > 200 ? firstMessage.slice(0, 200) + '...' : firstMessage}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedCaseId && showCaseDetails && (
        <CaseDetailsDialog
          caseId={selectedCaseId}
          isOpen={showCaseDetails}
          onClose={() => {
            setShowCaseDetails(false);
            setSelectedCaseId(null);
          }}
        />
      )}

      {selectedConversationId && showConversation && (
        <ConversationDialog
          conversationId={selectedConversationId}
          isOpen={showConversation}
          onClose={() => {
            setShowConversation(false);
            setSelectedConversationId(null);
          }}
        />
      )}
    </div>
  );
}