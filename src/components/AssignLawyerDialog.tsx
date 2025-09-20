import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, Briefcase, GraduationCap, MapPin, Award, Users } from "lucide-react";

interface Lawyer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  specializations: string[];
  years_experience: number;
  law_firm?: string;
  jurisdictions?: string[];
  profile_picture_url?: string;
  verification_status: string;
  is_verified: boolean;
  bio?: string;
  languages?: string[];
  team_size?: number;
  professional_memberships?: string[];
}

interface AssignLawyerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseCategory?: string;
  onAssign: () => void;
}

export const AssignLawyerDialog = ({ isOpen, onClose, caseId, caseCategory, onAssign }: AssignLawyerDialogProps) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLawyer, setSelectedLawyer] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchApprovedLawyers();
    }
  }, [isOpen]);

  const fetchApprovedLawyers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'lawyer')
        .eq('is_verified', true)
        .eq('verification_status', 'verified')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLawyers(data || []);
    } catch (error: any) {
      console.error('Error fetching lawyers:', error);
      toast({
        title: "Error",
        description: "Failed to load lawyers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLawyer = async () => {
    if (!selectedLawyer) return;

    try {
      setAssigning(true);
      const { error } = await supabase
        .from('cases')
        .update({ assigned_lawyer_id: selectedLawyer, updated_at: new Date().toISOString() })
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: "Lawyer Assigned",
        description: "The lawyer has been successfully assigned to this case",
      });

      onAssign();
      onClose();
    } catch (error: any) {
      console.error('Error assigning lawyer:', error);
      toast({
        title: "Error",
        description: "Failed to assign lawyer: " + error.message,
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const filteredLawyers = lawyers.filter(lawyer => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${lawyer.first_name} ${lawyer.last_name}`.toLowerCase();
    const specializations = lawyer.specializations?.join(' ').toLowerCase() || '';
    const lawFirm = lawyer.law_firm?.toLowerCase() || '';
    
    return fullName.includes(searchLower) || 
           specializations.includes(searchLower) || 
           lawFirm.includes(searchLower);
  });

  const getSpecializationMatch = (lawyer: Lawyer) => {
    if (!caseCategory || !lawyer.specializations) return false;
    return lawyer.specializations.some(spec => 
      spec.toLowerCase().includes(caseCategory.toLowerCase()) ||
      caseCategory.toLowerCase().includes(spec.toLowerCase())
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Assign Lawyer to Case</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search lawyers by name, specialization, or law firm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lawyers List */}
          <div className="overflow-y-auto max-h-[50vh] space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredLawyers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No approved lawyers found</p>
              </div>
            ) : (
              filteredLawyers.map((lawyer) => {
                const isSpecializationMatch = getSpecializationMatch(lawyer);
                const isSelected = selectedLawyer === lawyer.user_id;
                
                return (
                  <Card 
                    key={lawyer.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-accent/50' : ''
                    } ${isSpecializationMatch ? 'border-primary/50' : ''}`}
                    onClick={() => setSelectedLawyer(lawyer.user_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={lawyer.profile_picture_url} />
                          <AvatarFallback>
                            {lawyer.first_name?.[0]}{lawyer.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">
                              {lawyer.first_name} {lawyer.last_name}
                            </h3>
                            {isSpecializationMatch && (
                              <Badge variant="secondary" className="text-xs">
                                Matching Specialization
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {lawyer.law_firm ? (
                              <div className="flex items-center">
                                <Briefcase className="h-4 w-4 mr-2" />
                                <span>{lawyer.law_firm}</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Briefcase className="h-4 w-4 mr-2" />
                                <span className="italic">Law firm not specified</span>
                              </div>
                            )}
                            
                            {lawyer.years_experience ? (
                              <div className="flex items-center">
                                <GraduationCap className="h-4 w-4 mr-2" />
                                <span>{lawyer.years_experience} years experience</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <GraduationCap className="h-4 w-4 mr-2" />
                                <span className="italic">Experience not specified</span>
                              </div>
                            )}
                            
                            {lawyer.jurisdictions && lawyer.jurisdictions.length > 0 ? (
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                <span>{lawyer.jurisdictions.join(', ')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                <span className="italic">Jurisdictions not specified</span>
                              </div>
                            )}

                            {lawyer.languages && lawyer.languages.length > 0 && (
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                <span>Languages: {lawyer.languages.join(', ')}</span>
                              </div>
                            )}

                            {lawyer.team_size && (
                              <div className="flex items-center">
                                <Award className="h-4 w-4 mr-2" />
                                <span>Team size: {lawyer.team_size} members</span>
                              </div>
                            )}
                          </div>
                          
                          {lawyer.specializations && lawyer.specializations.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {lawyer.specializations.map((spec, index) => (
                                <Badge 
                                  key={index} 
                                  variant="outline" 
                                  className={`text-xs ${
                                    caseCategory && spec.toLowerCase().includes(caseCategory.toLowerCase()) 
                                      ? 'border-primary text-primary' 
                                      : ''
                                  }`}
                                >
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3">
                              <Badge variant="secondary" className="text-xs">
                                No specializations listed
                              </Badge>
                            </div>
                          )}

                          {lawyer.professional_memberships && lawyer.professional_memberships.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Professional Memberships:</p>
                              <div className="flex flex-wrap gap-1">
                                {lawyer.professional_memberships.map((membership, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {membership}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {lawyer.bio && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {lawyer.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignLawyer}
              disabled={!selectedLawyer || assigning}
            >
              {assigning ? "Assigning..." : "Assign Lawyer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};