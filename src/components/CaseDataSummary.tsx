import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Users, 
  Calendar, 
  MapPin, 
  DollarSign, 
  AlertTriangle,
  CheckCircle2,
  Scale
} from 'lucide-react';
import { CaseData } from '@/hooks/useLegalChatbot';

interface CaseDataSummaryProps {
  caseData: CaseData;
  clientName?: string;
  clientEmail?: string;
}

export const CaseDataSummary: React.FC<CaseDataSummaryProps> = ({
  caseData,
  clientName,
  clientEmail
}) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  return (
    <Card className="bg-gradient-card shadow-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Case Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Case Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Case Information
            </h4>
            <div className="space-y-3">
              {caseData.category && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="text-sm">{caseData.category}</p>
                  {caseData.subcategory && (
                    <p className="text-xs text-muted-foreground">
                      Subcategory: {caseData.subcategory}
                    </p>
                  )}
                </div>
              )}
              
              {caseData.urgency && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priority Level</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant={getUrgencyColor(caseData.urgency)}
                      className="flex items-center gap-1"
                    >
                      {getUrgencyIcon(caseData.urgency)}
                      {caseData.urgency.charAt(0).toUpperCase() + caseData.urgency.slice(1)} Priority
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Client Information</h4>
            <div className="space-y-3">
              {clientName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm">{clientName}</p>
                </div>
              )}
              {clientEmail && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{clientEmail}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Jurisdiction</label>
                <p className="text-sm">Egypt</p>
              </div>
            </div>
          </div>
        </div>

        {/* Extracted Entities */}
        {caseData.entities && Object.keys(caseData.entities).length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-4">Extracted Information</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {caseData.entities.parties && caseData.entities.parties.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Parties Involved
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {caseData.entities.parties.map((party, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {party}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {caseData.entities.dates && caseData.entities.dates.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Important Dates
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {caseData.entities.dates.map((date, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {date}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {caseData.entities.locations && caseData.entities.locations.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Locations
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {caseData.entities.locations.map((location, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {location}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {caseData.entities.amounts && caseData.entities.amounts.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Financial Amounts
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {caseData.entities.amounts.map((amount, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {amount}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Required Documents */}
        {caseData.requiredDocuments && caseData.requiredDocuments.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Required Documents</h4>
              <div className="grid md:grid-cols-2 gap-2">
                {caseData.requiredDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    {doc}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Next Questions */}
        {caseData.nextQuestions && caseData.nextQuestions.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Additional Information Needed</h4>
              <ul className="space-y-1">
                {caseData.nextQuestions.map((question, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    • {question}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};