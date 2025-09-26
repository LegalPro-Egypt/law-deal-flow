import React from "react";
import { StatsDetailsDialog } from "./StatsDetailsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Calendar, 
  User, 
  Eye,
  Plus,
  Globe
} from "lucide-react";
import { formatDate } from "@/utils/dateUtils";

interface IntakeData {
  id: string;
  session_id: string;
  first_message_preview?: string;
  language: string;
  status: string;
  created_at: string;
  updated_at: string;
  total_messages: number;
  actual_message_count: number;
  user_id?: string;
}

interface IntakeListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intakes: IntakeData[];
  isLoading: boolean;
  onRefresh: () => void;
  onViewIntake: (intakeId: string) => void;
  onCreateCase: (intakeId: string) => void;
}

const getLanguageFlag = (language: string) => {
  switch (language) {
    case 'ar': return '🇪🇬';
    case 'en': return '🇺🇸';
    default: return '🌐';
  }
};

export function IntakeListModal({
  open,
  onOpenChange,
  intakes,
  isLoading,
  onRefresh,
  onViewIntake,
  onCreateCase,
}: IntakeListModalProps) {
  if (isLoading) {
    return (
      <StatsDetailsDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Pending Intakes"
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
      title="Pending Intakes"
      count={intakes.length}
      onRefresh={onRefresh}
    >
      <div className="space-y-4">
        {intakes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending intakes found</p>
          </div>
        ) : (
          intakes.map((intake) => (
            <Card key={intake.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getLanguageFlag(intake.language)}</span>
                      <Badge variant="outline" className="text-xs">
                        {intake.session_id.slice(-8)}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800">
                        {intake.status}
                      </Badge>
                    </div>
                    
                    {intake.first_message_preview && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        "{intake.first_message_preview}"
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{intake.actual_message_count || intake.total_messages} messages</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{intake.language.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(intake.created_at)}</span>
                      </div>
                      {intake.user_id ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">Authenticated</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-orange-600" />
                          <span className="text-orange-600">Anonymous</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewIntake(intake.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onCreateCase(intake.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Case
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </StatsDetailsDialog>
  );
}