import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useContractHistory } from '@/hooks/useContractHistory';
import { Loader2, FileText, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ContractVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  currentVersion: number;
}

export const ContractVersionHistory = ({
  isOpen,
  onClose,
  contractId,
  currentVersion,
}: ContractVersionHistoryProps) => {
  const { history, isLoading } = useContractHistory(contractId);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const toggleVersion = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted';
      case 'pending_admin_review':
        return 'bg-warning';
      case 'changes_requested':
        return 'bg-destructive';
      case 'sent':
      case 'viewed':
      case 'signed':
        return 'bg-success';
      default:
        return 'bg-muted';
    }
  };

  const getChangeSourceLabel = (source: string | null) => {
    switch (source) {
      case 'admin':
        return 'Admin requested changes';
      case 'client':
        return 'Client requested changes';
      case 'lawyer':
        return 'Lawyer revision';
      default:
        return 'Initial version';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Contract Version History</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Current version: {currentVersion}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No version history available</p>
              <p className="text-sm mt-2">Previous versions will appear here after changes are made</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((version) => (
                <Collapsible
                  key={version.id}
                  open={expandedVersions.has(version.id)}
                  onOpenChange={() => toggleVersion(version.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-4 h-auto hover:bg-accent"
                      >
                        <div className="flex items-start gap-4 text-left">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Version {version.version}</Badge>
                              <Badge className={getStatusColor(version.status)}>
                                {version.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(version.created_at), 'PPp')}
                              </span>
                              {version.change_source && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {getChangeSourceLabel(version.change_source)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedVersions.has(version.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="p-4 border-t bg-muted/30 space-y-4">
                        {version.change_notes && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Change Notes</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {version.change_notes}
                            </p>
                          </div>
                        )}

                        {version.admin_notes && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Admin Feedback</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {version.admin_notes}
                            </p>
                          </div>
                        )}

                        {version.client_change_request && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Client Change Request</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {version.client_change_request}
                            </p>
                          </div>
                        )}

                        {version.content_en && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Contract Content (English)</h4>
                            <ScrollArea className="h-48 rounded border bg-background p-3">
                              <p className="text-sm whitespace-pre-wrap">{version.content_en}</p>
                            </ScrollArea>
                          </div>
                        )}

                        {version.content_ar && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Contract Content (Arabic)</h4>
                            <ScrollArea className="h-48 rounded border bg-background p-3" dir="rtl">
                              <p className="text-sm whitespace-pre-wrap">{version.content_ar}</p>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
