import React from "react";
import { StatsDetailsDialog } from "./StatsDetailsDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Calendar, 
  Mail, 
  Phone, 
  Eye,
  FileText,
  Globe
} from "lucide-react";
import { formatDate } from "@/utils/dateUtils";

interface ClientData {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  preferred_language?: string;
  is_active: boolean;
  created_at: string;
  profile_picture_url?: string;
  total_cases?: number;
}

interface ClientListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientData[];
  isLoading: boolean;
  onRefresh: () => void;
  onViewClient: (clientId: string) => void;
}

const getLanguageFlag = (language: string) => {
  switch (language) {
    case 'ar': return '🇪🇬';
    case 'en': return '🇺🇸';
    default: return '🌐';
  }
};

export function ClientListModal({
  open,
  onOpenChange,
  clients,
  isLoading,
  onRefresh,
  onViewClient,
}: ClientListModalProps) {
  if (isLoading) {
    return (
      <StatsDetailsDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Clients"
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
      title="Clients"
      count={clients.length}
      onRefresh={onRefresh}
    >
      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No clients found</p>
          </div>
        ) : (
          clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={client.profile_picture_url} />
                      <AvatarFallback>
                        {(client.first_name?.[0] || '') + (client.last_name?.[0] || client.email[0]?.toUpperCase())}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {client.first_name && client.last_name 
                            ? `${client.first_name} ${client.last_name}`
                            : client.email
                          }
                        </h3>
                        {!client.is_active && (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Inactive
                          </Badge>
                        )}
                        {client.preferred_language && (
                          <span className="text-sm">
                            {getLanguageFlag(client.preferred_language)}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(client.created_at)}</span>
                        </div>
                        {client.preferred_language && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span>{client.preferred_language.toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      
                      {client.total_cases !== undefined && (
                        <div className="flex items-center gap-1 text-sm">
                          <FileText className="h-3 w-3 text-primary" />
                          <span className="text-primary font-medium">
                            {client.total_cases} {client.total_cases === 1 ? 'case' : 'cases'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewClient(client.id)}
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