import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  User, 
  Briefcase, 
  GraduationCap,
  FileImage,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  DollarSign,
  Users,
  Award,
  Video,
  Globe,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { VerificationStatusBadge } from '@/components/VerificationStatusBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LawyerProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  law_firm: string | null;
  specializations: string[] | null;
  jurisdictions: string[] | null;
  years_experience: number | null;
  license_number: string | null;
  verification_status: string | null;
  lawyer_card_front_url: string | null;
  lawyer_card_back_url: string | null;
  bio: string | null;
  team_size: number | null;
  team_breakdown: any;
  consultation_methods: string[] | null;
  payment_structures: string[] | null;
  pricing_structure: any;
  professional_memberships: string[] | null;
  notable_achievements: string | null;
  created_at: string;
  updated_at: string;
}

interface LawyerVerificationManagerProps {
  onVerificationUpdate: () => void;
}

export function LawyerVerificationManager({ onVerificationUpdate }: LawyerVerificationManagerProps) {
  const { toast } = useToast();
  const [pendingLawyers, setPendingLawyers] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cardUrls, setCardUrls] = useState<Record<string, { front?: string; back?: string }>>({});

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'lawyer')
        .eq('verification_status', 'pending_complete')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setPendingLawyers(profiles || []);

      // Fetch signed URLs for lawyer cards
      const urlPromises = profiles?.map(async (lawyer) => {
        const urls: { front?: string; back?: string } = {};

        if (lawyer.lawyer_card_front_url) {
          try {
            const { data: frontUrl } = await supabase.storage
              .from('lawyer-documents')
              .createSignedUrl(lawyer.lawyer_card_front_url, 60 * 60 * 24); // 24 hours
            if (frontUrl?.signedUrl) urls.front = frontUrl.signedUrl;
          } catch (error) {
            console.error('Error fetching front card URL:', error);
          }
        }

        if (lawyer.lawyer_card_back_url) {
          try {
            const { data: backUrl } = await supabase.storage
              .from('lawyer-documents')
              .createSignedUrl(lawyer.lawyer_card_back_url, 60 * 60 * 24); // 24 hours
            if (backUrl?.signedUrl) urls.back = backUrl.signedUrl;
          } catch (error) {
            console.error('Error fetching back card URL:', error);
          }
        }

        return { id: lawyer.id, urls };
      }) || [];

      const urlResults = await Promise.all(urlPromises);
      const urlMap = urlResults.reduce((acc, { id, urls }) => {
        acc[id] = urls;
        return acc;
      }, {} as Record<string, { front?: string; back?: string }>);

      setCardUrls(urlMap);
    } catch (error: any) {
      console.error('Error fetching pending verifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending verifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (lawyerId: string) => {
    try {
      setProcessingId(lawyerId);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'verified',
          is_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', lawyerId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Lawyer verification approved successfully',
      });

      await fetchPendingVerifications();
      onVerificationUpdate();
    } catch (error: any) {
      console.error('Error approving verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve verification: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (lawyerId: string) => {
    try {
      setProcessingId(lawyerId);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending_basic',
          updated_at: new Date().toISOString()
        })
        .eq('id', lawyerId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Lawyer verification rejected. They will need to resubmit.',
      });

      await fetchPendingVerifications();
      onVerificationUpdate();
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject verification: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Lawyer Verifications</h2>
        </div>
        <div className="text-center py-8">
          <p>Loading pending verifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Lawyer Verifications</h2>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {pendingLawyers.length} Pending
        </Badge>
      </div>

      {pendingLawyers.length === 0 ? (
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pending verifications</h3>
            <p className="text-muted-foreground">
              New lawyer verification submissions will appear here for review
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingLawyers.map((lawyer) => (
            <Card key={lawyer.id} className="bg-gradient-card shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {lawyer.first_name} {lawyer.last_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {lawyer.email}
                      </span>
                      {lawyer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {lawyer.phone}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <VerificationStatusBadge status={lawyer.verification_status} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted: {formatDate(lawyer.updated_at)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Professional Details */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <Briefcase className="h-4 w-4" />
                        Professional Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        {lawyer.law_firm && (
                          <p><strong>Law Firm:</strong> {lawyer.law_firm}</p>
                        )}
                        {lawyer.license_number && (
                          <p><strong>License Number:</strong> {lawyer.license_number}</p>
                        )}
                        {lawyer.years_experience && (
                          <p><strong>Experience:</strong> {lawyer.years_experience} years</p>
                        )}
                        {lawyer.jurisdictions && lawyer.jurisdictions.length > 0 && (
                          <p><strong>Jurisdictions:</strong> {lawyer.jurisdictions.join(', ')}</p>
                        )}
                      </div>
                    </div>

                    {lawyer.specializations && lawyer.specializations.length > 0 && (
                      <div>
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <GraduationCap className="h-4 w-4" />
                          Specializations
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {lawyer.specializations.map((spec, index) => (
                            <Badge key={index} variant="outline">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {lawyer.bio && (
                      <div>
                        <h4 className="font-medium mb-2">Bio</h4>
                        <p className="text-sm text-muted-foreground">{lawyer.bio}</p>
                      </div>
                    )}
                  </div>

                  {/* Lawyer Cards */}
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <FileImage className="h-4 w-4" />
                      Lawyer Card Documents
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {cardUrls[lawyer.id]?.front && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Front</p>
                          <img 
                            src={cardUrls[lawyer.id].front}
                            alt="Lawyer Card Front"
                            className="w-full h-32 object-cover rounded border"
                          />
                        </div>
                      )}
                      {cardUrls[lawyer.id]?.back && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Back</p>
                          <img 
                            src={cardUrls[lawyer.id].back}
                            alt="Lawyer Card Back"
                            className="w-full h-32 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed Questionnaire Responses */}
                <Separator />
                
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        View Detailed Questionnaire Responses
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-6 mt-4">
                    {/* Team Structure */}
                    {(lawyer.team_size || lawyer.team_breakdown) && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4" />
                            Team Structure
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {lawyer.team_size && (
                            <p className="text-sm"><strong>Total Team Size:</strong> {lawyer.team_size} members</p>
                          )}
                          {lawyer.team_breakdown && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {lawyer.team_breakdown.partnersCount && (
                                <p><strong>Partners:</strong> {lawyer.team_breakdown.partnersCount}</p>
                              )}
                              {lawyer.team_breakdown.associatesCount && (
                                <p><strong>Associates:</strong> {lawyer.team_breakdown.associatesCount}</p>
                              )}
                              {lawyer.team_breakdown.paralegalsCount && (
                                <p><strong>Paralegals:</strong> {lawyer.team_breakdown.paralegalsCount}</p>
                              )}
                              {lawyer.team_breakdown.supportStaffCount && (
                                <p><strong>Support Staff:</strong> {lawyer.team_breakdown.supportStaffCount}</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Pricing & Consultation */}
                    {(lawyer.pricing_structure || lawyer.consultation_methods) && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <DollarSign className="h-4 w-4" />
                            Pricing & Consultation
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {lawyer.pricing_structure && (
                            <div>
                              {lawyer.pricing_structure.consultationRate && (
                                <div className="mb-2">
                                  <p className="text-sm"><strong>Consultation Rate:</strong> {lawyer.pricing_structure.consultationRate} EGP {lawyer.pricing_structure.consultationStructure && `(${lawyer.pricing_structure.consultationStructure})`}</p>
                                </div>
                              )}
                              
                              {/* Legal Service Rates */}
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium">Legal Service Rates:</h5>
                                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                  {lawyer.pricing_structure.familyLawRate && (
                                    <p>Family Law: {lawyer.pricing_structure.familyLawRate} EGP</p>
                                  )}
                                  {lawyer.pricing_structure.criminalLawRate && (
                                    <p>Criminal Law: {lawyer.pricing_structure.criminalLawRate} EGP</p>
                                  )}
                                  {lawyer.pricing_structure.corporateLawRate && (
                                    <p>Corporate Law: {lawyer.pricing_structure.corporateLawRate} EGP</p>
                                  )}
                                  {lawyer.pricing_structure.realEstateLawRate && (
                                    <p>Real Estate Law: {lawyer.pricing_structure.realEstateLawRate} EGP</p>
                                  )}
                                  {lawyer.pricing_structure.immigrationLawRate && (
                                    <p>Immigration Law: {lawyer.pricing_structure.immigrationLawRate} EGP</p>
                                  )}
                                  {lawyer.pricing_structure.employmentLawRate && (
                                    <p>Employment Law: {lawyer.pricing_structure.employmentLawRate} EGP</p>
                                  )}
                                  {lawyer.pricing_structure.personalInjuryRate && (
                                    <p>Personal Injury: {lawyer.pricing_structure.personalInjuryRate} EGP</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {lawyer.consultation_methods && lawyer.consultation_methods.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Available Consultation Methods:</h5>
                              <div className="flex flex-wrap gap-2">
                                {lawyer.consultation_methods.map((method, index) => (
                                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                                    {method === 'video' && <Video className="h-3 w-3" />}
                                    {method === 'phone' && <Phone className="h-3 w-3" />}
                                    {method === 'in-person' && <MapPin className="h-3 w-3" />}
                                    {method.replace('-', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {lawyer.payment_structures && lawyer.payment_structures.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Accepted Payment Structures:</h5>
                              <div className="flex flex-wrap gap-2">
                                {lawyer.payment_structures.map((structure, index) => (
                                  <Badge key={index} variant="outline">
                                    {structure.replace('-', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Professional Memberships */}
                    {lawyer.professional_memberships && lawyer.professional_memberships.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Award className="h-4 w-4" />
                            Professional Memberships
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {lawyer.professional_memberships.map((membership, index) => (
                              <Badge key={index} variant="secondary">
                                {membership}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Notable Achievements */}
                    {lawyer.notable_achievements && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Award className="h-4 w-4" />
                            Notable Achievements
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {lawyer.notable_achievements}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleApprove(lawyer.id)}
                    disabled={processingId === lawyer.id}
                    className="bg-success hover:bg-success/90 flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {processingId === lawyer.id ? 'Approving...' : 'Approve Verification'}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={processingId === lawyer.id}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Verification
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Verification</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject this lawyer's verification? They will need to resubmit their documents.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="my-4">
                        <label className="text-sm font-medium">Rejection Reason (Optional)</label>
                        <Textarea
                          placeholder="Provide a reason for rejection to help the lawyer understand what needs to be corrected..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleReject(lawyer.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Reject Verification
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}