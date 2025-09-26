import React from "react";
import { StatsDetailsDialog } from "./StatsDetailsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertCircle, 
  Calendar, 
  User, 
  Eye,
  FileText,
  Shield,
  CheckCircle,
  XCircle
} from "lucide-react";
import { formatDate } from "@/utils/dateUtils";

interface ReviewItem {
  id: string;
  type: 'case' | 'verification';
  title: string;
  description?: string;
  status: string;
  created_at: string;
  // Case specific
  case_number?: string;
  category?: string;
  urgency?: string;
  client_name?: string;
  // Verification specific
  lawyer_name?: string;
  lawyer_email?: string;
  verification_status?: string;
  profile_picture_url?: string;
}

interface ReviewsListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviews: ReviewItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onViewItem: (id: string, type: 'case' | 'verification') => void;
  onApprove?: (id: string, type: 'case' | 'verification') => void;
  onReject?: (id: string, type: 'case' | 'verification') => void;
}

const getTypeColor = (type: string) => {
  return type === 'case' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
};

const getUrgencyColor = (urgency?: string) => {
  if (!urgency) return 'text-gray-600';
  switch (urgency) {
    case 'urgent': return 'text-red-600';
    case 'high': return 'text-orange-600';
    case 'medium': return 'text-yellow-600';
    case 'low': return 'text-green-600';
    default: return 'text-gray-600';
  }
};

export function ReviewsListModal({
  open,
  onOpenChange,
  reviews,
  isLoading,
  onRefresh,
  onViewItem,
  onApprove,
  onReject,
}: ReviewsListModalProps) {
  if (isLoading) {
    return (
      <StatsDetailsDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Pending Reviews"
        count={0}
        isLoading={true}
        onRefresh={onRefresh}
      >
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
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
      title="Pending Reviews"
      count={reviews.length}
      onRefresh={onRefresh}
    >
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending reviews found</p>
          </div>
        ) : (
          reviews.map((review) => (
            <Card key={`${review.type}-${review.id}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {review.type === 'verification' && review.profile_picture_url ? (
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={review.profile_picture_url} />
                        <AvatarFallback>
                          {review.lawyer_name?.[0] || review.lawyer_email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        {review.type === 'case' ? (
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        ) : (
                          <Shield className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{review.title}</h3>
                        <Badge className={getTypeColor(review.type)}>
                          {review.type === 'case' ? 'Case Review' : 'Lawyer Verification'}
                        </Badge>
                        {review.case_number && (
                          <Badge variant="outline" className="text-xs">
                            {review.case_number}
                          </Badge>
                        )}
                      </div>
                      
                      {review.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {review.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(review.created_at)}</span>
                        </div>
                        
                        {review.type === 'case' && (
                          <>
                            {review.category && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>{review.category}</span>
                              </div>
                            )}
                            {review.client_name && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{review.client_name}</span>
                              </div>
                            )}
                            {review.urgency && (
                              <div className={`flex items-center gap-1 ${getUrgencyColor(review.urgency)}`}>
                                <AlertCircle className="h-3 w-3" />
                                <span>{review.urgency}</span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {review.type === 'verification' && (
                          <>
                            {review.lawyer_email && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{review.lawyer_email}</span>
                              </div>
                            )}
                            {review.verification_status && (
                              <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                <span>{review.verification_status.replace('_', ' ')}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewItem(review.id, review.type)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {onApprove && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onApprove(review.id, review.type)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {onReject && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReject(review.id, review.type)}
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
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