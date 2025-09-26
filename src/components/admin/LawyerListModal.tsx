import React from "react";
import { StatsDetailsDialog } from "./StatsDetailsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Calendar, 
  Mail, 
  Phone, 
  Eye,
  Shield,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { formatDate } from "@/utils/dateUtils";

interface LawyerData {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  law_firm?: string;
  specializations?: string[];
  verification_status: string;
  is_active: boolean;
  created_at: string;
  profile_picture_url?: string;
  years_experience?: number;
}

interface LawyerListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lawyers: LawyerData[];
  isLoading: boolean;
  onRefresh: () => void;
  onViewLawyer: (lawyerId: string) => void;
}

const getVerificationColor = (status: string) => {
  switch (status) {
    case 'verified': return 'bg-green-100 text-green-800';
    case 'pending_documents': return 'bg-yellow-100 text-yellow-800';
    case 'pending_basic': return 'bg-orange-100 text-orange-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getVerificationIcon = (status: string) => {
  switch (status) {
    case 'verified': return <CheckCircle className="h-3 w-3" />;
    case 'pending_documents': 
    case 'pending_basic': return <AlertCircle className="h-3 w-3" />;
    case 'rejected': return <AlertCircle className="h-3 w-3" />;
    default: return <Shield className="h-3 w-3" />;
  }
};

export function LawyerListModal({
  open,
  onOpenChange,
  lawyers,
  isLoading,
  onRefresh,
  onViewLawyer,
}: LawyerListModalProps) {
  if (isLoading) {
    return (
      <StatsDetailsDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Lawyers"
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
      title="Lawyers"
      count={lawyers.length}
      onRefresh={onRefresh}
    >
      <div className="space-y-4">
        {lawyers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No lawyers found</p>
          </div>
        ) : (
          lawyers.map((lawyer) => (
            <Card key={lawyer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={lawyer.profile_picture_url} />
                      <AvatarFallback>
                        {(lawyer.first_name?.[0] || '') + (lawyer.last_name?.[0] || lawyer.email[0]?.toUpperCase())}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {lawyer.first_name && lawyer.last_name 
                            ? `${lawyer.first_name} ${lawyer.last_name}`
                            : lawyer.email
                          }
                        </h3>
                        <Badge className={getVerificationColor(lawyer.verification_status)}>
                          {getVerificationIcon(lawyer.verification_status)}
                          <span className="ml-1">{lawyer.verification_status.replace('_', ' ')}</span>
                        </Badge>
                        {!lawyer.is_active && (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lawyer.email}</span>
                        </div>
                        {lawyer.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{lawyer.phone}</span>
                          </div>
                        )}
                        {lawyer.law_firm && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="truncate">{lawyer.law_firm}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(lawyer.created_at)}</span>
                        </div>
                      </div>
                      
                      {lawyer.specializations && lawyer.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {lawyer.specializations.slice(0, 3).map((spec, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {lawyer.specializations.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{lawyer.specializations.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {lawyer.years_experience && (
                        <div className="text-xs text-muted-foreground">
                          {lawyer.years_experience} years experience
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewLawyer(lawyer.id)}
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