import React from "react";
import { StatsDetailsDialog } from "./StatsDetailsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Calendar, 
  User, 
  AlertCircle, 
  Eye,
  Clock
} from "lucide-react";
import { formatDate } from "@/utils/dateUtils";

interface CaseData {
  id: string;
  case_number: string;
  title: string;
  category: string;
  status: string;
  urgency: string;
  client_name?: string;
  created_at: string;
  updated_at: string;
  assigned_lawyer_id?: string;
}

interface CaseListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  cases: CaseData[];
  isLoading: boolean;
  onRefresh: () => void;
  onViewCase: (caseId: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'submitted': return 'bg-blue-100 text-blue-800';
    case 'in_progress': return 'bg-yellow-100 text-yellow-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'lawyer_assigned': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'urgent': return 'text-red-600';
    case 'high': return 'text-orange-600';
    case 'medium': return 'text-yellow-600';
    case 'low': return 'text-green-600';
    default: return 'text-gray-600';
  }
};

export function CaseListModal({
  open,
  onOpenChange,
  title,
  cases,
  isLoading,
  onRefresh,
  onViewCase,
}: CaseListModalProps) {
  if (isLoading) {
    return (
      <StatsDetailsDialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        count={0}
        isLoading={true}
        onRefresh={onRefresh}
      >
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </StatsDetailsDialog>
    );
  }

  return (
    <StatsDetailsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      count={cases.length}
      onRefresh={onRefresh}
    >
      <div className="space-y-4">
        {cases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No cases found</p>
          </div>
        ) : (
          cases.map((case_) => (
            <Card key={case_.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{case_.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {case_.case_number}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{case_.category}</span>
                      </div>
                      {case_.client_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{case_.client_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(case_.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(case_.status)}>
                        {case_.status.replace('_', ' ')}
                      </Badge>
                      <div className={`flex items-center gap-1 text-xs ${getUrgencyColor(case_.urgency)}`}>
                        <AlertCircle className="h-3 w-3" />
                        <span>{case_.urgency}</span>
                      </div>
                      {!case_.assigned_lawyer_id && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Unassigned
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewCase(case_.id)}
                    className="ml-2"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </StatsDetailsDialog>
  );
}