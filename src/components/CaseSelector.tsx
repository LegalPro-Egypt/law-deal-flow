import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Plus, FileText } from "lucide-react";
import { Link } from "react-router-dom";

interface CaseSelectorProps {
  cases: Array<{
    id: string;
    case_number: string;
    title: string;
    status: string;
    category: string;
    created_at: string;
  }>;
  activeCase: {
    id: string;
    case_number: string;
    title: string;
    status: string;
    category: string;
  } | null;
  onCaseSelect: (caseId: string) => void;
}

const CaseSelector = ({ cases, activeCase, onCaseSelect }: CaseSelectorProps) => {
  const [open, setOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'bg-accent';
      case 'completed':
        return 'bg-success';
      case 'draft':
        return 'bg-warning';
      case 'submitted':
        return 'bg-primary';
      default:
        return 'bg-muted';
    }
  };

  const formatStatus = (status: string) => {
    return status === 'submitted' ? 'Under Review' : status.replace('_', ' ');
  };

  if (cases.length <= 1) {
    return null; // Don't show selector if only one case
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-60 justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium truncate">{activeCase?.title || "Select Case"}</div>
              <div className="text-xs text-muted-foreground">{activeCase?.case_number}</div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Your Cases ({cases.length})</h4>
            <Button size="sm" asChild>
              <Link to="/intake">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Link>
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-2">
            {cases.map((caseItem) => (
              <Button
                key={caseItem.id}
                variant={activeCase?.id === caseItem.id ? "secondary" : "ghost"}
                className="w-full justify-start h-auto p-3 mb-1"
                onClick={() => {
                  onCaseSelect(caseItem.id);
                  setOpen(false);
                }}
              >
                <div className="flex items-start space-x-3 w-full">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(caseItem.status)}`} />
                  <div className="flex-1 text-left">
                    <div className="font-medium truncate">{caseItem.title}</div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {caseItem.case_number} • {caseItem.category}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {formatStatus(caseItem.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(caseItem.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default CaseSelector;