import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MobileFileInput from "@/components/MobileFileInput";
import { 
  Users, 
  FileText, 
  Camera, 
  Upload,
  CheckCircle,
  Loader2,
  DollarSign,
  Award,
  Phone,
  Video,
  MapPin,
  Globe,
  Building,
  MessageSquare,
  User
} from "lucide-react";

const verificationSchema = z.object({
  teamSize: z.coerce.number().min(1, "Team size must be at least 1"),
  consultationRate: z.coerce.number().min(1, "Consultation rate is required"),
  consultationStructure: z.string().min(1, "Please select consultation structure"),
  visaRenewalRate: z.coerce.number().min(1, "Visa renewal rate is required"),
  workPermitRate: z.coerce.number().min(1, "Work permit rate is required"),
  marriageRegistrationRate: z.coerce.number().min(1, "Marriage registration rate is required"),
  propertyContractRate: z.coerce.number().min(1, "Property contract rate is required"),
  businessRegistrationRate: z.coerce.number().min(1, "Business registration rate is required"),
  divorceFilingRate: z.coerce.number().min(1, "Divorce filing rate is required"),
  notableAchievements: z.string().optional(),
  officePhone: z.string().min(1, "Office phone number is required"),
  privateMobile: z.string().min(1, "Private mobile number is required"), 
  whatsappNumber: z.string().optional(),
  officeAddress: z.string().min(1, "Office address is required"),
  spokenLanguages: z.array(z.string()).min(1, "Please select at least one language"),
  lawFirm: z.string().optional(),
  licenseNumber: z.string().min(1, "License number is required"),
  yearsExperience: z.coerce.number().min(0, "Years of experience must be 0 or greater").optional(),
  barAdmissionsInput: z.string().optional(),
});

type VerificationData = z.infer<typeof verificationSchema>;

interface CompleteVerificationFormProps {
  onComplete: () => void;
  initialData?: Partial<VerificationData>;
}

const consultationMethods = [
  { id: "in-person", label: "In-Person", icon: MapPin },
  { id: "video", label: "Video Call", icon: Video },
  { id: "phone", label: "Phone Call", icon: Phone },
];

const paymentStructures = [
  { id: "hourly", label: "Hourly Rate" },
  { id: "flat-fee", label: "Flat Fee" },
  { id: "contingency", label: "Contingency" },
  { id: "retainer", label: "Retainer" },
];

const professionalMemberships = [
  "Egyptian Bar Association",
  "International Bar Association",
  "Arab Lawyers Union",
  "Cairo Chamber of Commerce Legal Committee",
  "Alexandria Bar Association",
  "Egyptian Society for International Law",
];

const availableLanguages = [
  "Arabic",
  "English", 
  "French",
  "German",
  "Spanish",
  "Italian",
  "Turkish",
  "Russian",
  "Chinese",
  "Japanese",
];

const specializationOptions = [
  "Immigration Law",
  "Family Law", 
  "Business Law",
  "Real Estate Law",
  "Labor Law",
  "Criminal Law",
  "Civil Law",
  "Tax Law",
  "Intellectual Property Law",
  "Administrative Law",
  "Commercial Law",
  "Maritime Law",
];

const legalServices = [
  { key: "visaRenewal", label: "Visa Renewal/Extension", field: "visaRenewalRate" },
  { key: "workPermit", label: "Work Permit Application", field: "workPermitRate" },
  { key: "marriageRegistration", label: "Marriage Registration/Certificate", field: "marriageRegistrationRate" },
  { key: "propertyContract", label: "Property Purchase/Rental Agreement", field: "propertyContractRate" },
  { key: "businessRegistration", label: "Business Registration/License", field: "businessRegistrationRate" },
  { key: "divorceFiling", label: "Divorce Proceedings (Mixed Marriage)", field: "divorceFilingRate" },
];

export function CompleteVerificationForm({ onComplete, initialData }: CompleteVerificationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lawyerCardFront, setLawyerCardFront] = useState<File | null>(null);
  const [lawyerCardBack, setLawyerCardBack] = useState<File | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [selectedConsultationMethods, setSelectedConsultationMethods] = useState<string[]>(["in-person"]);
  const [selectedPaymentStructures, setSelectedPaymentStructures] = useState<string[]>(["hourly"]);
  const [selectedMemberships, setSelectedMemberships] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["Arabic", "English"]);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);

  const form = useForm<VerificationData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      teamSize: initialData?.teamSize || 1,
      consultationRate: initialData?.consultationRate || 500,
      consultationStructure: initialData?.consultationStructure || "hourly",
      officePhone: initialData?.officePhone || "",
      privateMobile: initialData?.privateMobile || "",
      whatsappNumber: initialData?.whatsappNumber || "",
      officeAddress: initialData?.officeAddress || "",
      spokenLanguages: initialData?.spokenLanguages || ["Arabic", "English"],
      lawFirm: initialData?.lawFirm || "",
      licenseNumber: initialData?.licenseNumber || "",
      yearsExperience: initialData?.yearsExperience || undefined,
      barAdmissionsInput: initialData?.barAdmissionsInput || "",
      ...initialData,
    },
  });

  const uploadFile = async (file: File, type: 'front' | 'back') => {
    console.log(`Starting upload for ${type} card:`, { fileName: file.name, fileSize: file.size, fileType: file.type });
    
    if (!user?.id) {
      throw new Error('User ID not available');
    }

    // Validate file
    if (!file.type.includes('image') && !file.type.includes('pdf')) {
      throw new Error('Invalid file type. Please upload an image or PDF file.');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size too large. Please upload a file smaller than 10MB.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/lawyer-cards/${type}.${fileExt}`;
    
    console.log(`Uploading to path: ${fileName}`);
    
    const { error: uploadError } = await supabase.storage
      .from('lawyer-documents')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error(`Upload error for ${type}:`, uploadError);
      throw new Error(`Upload failed for ${type} card: ${uploadError.message}`);
    }

    console.log(`Upload successful for ${type}, generating signed URL...`);

    // Use signed URL for private bucket
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('lawyer-documents')
      .createSignedUrl(fileName, 86400); // 24 hours

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(`Signed URL error for ${type}:`, signedUrlError);
      throw new Error(`Failed to generate signed URL for ${type} card: ${signedUrlError?.message || 'Unknown error'}`);
    }

    console.log(`Signed URL generated successfully for ${type}`);
    return signedUrlData.signedUrl;
  };

  const uploadProfilePicture = async (file: File) => {
    console.log(`Starting upload for profile picture:`, { fileName: file.name, fileSize: file.size, fileType: file.type });
    
    if (!user?.id) {
      throw new Error('User ID not available');
    }

    // Validate file
    if (!file.type.includes('image')) {
      throw new Error('Invalid file type. Please upload an image file.');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit for profile pictures
      throw new Error('File size too large. Please upload an image smaller than 5MB.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/profile/picture.${fileExt}`;
    
    console.log(`Uploading profile picture to path: ${fileName}`);
    
    const { error: uploadError } = await supabase.storage
      .from('lawyer-documents')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error(`Profile picture upload error:`, uploadError);
      throw new Error(`Profile picture upload failed: ${uploadError.message}`);
    }

    console.log(`Profile picture upload successful, generating signed URL...`);

    // Use signed URL for private bucket
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('lawyer-documents')
      .createSignedUrl(fileName, 86400); // 24 hours

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(`Profile picture signed URL error:`, signedUrlError);
      throw new Error(`Failed to generate signed URL for profile picture: ${signedUrlError?.message || 'Unknown error'}`);
    }

    console.log(`Profile picture signed URL generated successfully`);
    return signedUrlData.signedUrl;
  };

  const handleConsultationMethodChange = (methodId: string, checked: boolean) => {
    if (checked) {
      setSelectedConsultationMethods(prev => [...prev, methodId]);
    } else {
      setSelectedConsultationMethods(prev => prev.filter(id => id !== methodId));
    }
  };

  const handlePaymentStructureChange = (structureId: string, checked: boolean) => {
    if (checked) {
      setSelectedPaymentStructures(prev => [...prev, structureId]);
    } else {
      setSelectedPaymentStructures(prev => prev.filter(id => id !== structureId));
    }
  };

  const handleMembershipChange = (membership: string, checked: boolean) => {
    if (checked) {
      setSelectedMemberships(prev => [...prev, membership]);
    } else {
      setSelectedMemberships(prev => prev.filter(m => m !== membership));
    }
  };

  const handleLanguageChange = (language: string, checked: boolean) => {
    if (checked) {
      setSelectedLanguages(prev => [...prev, language]);
    } else {
      setSelectedLanguages(prev => prev.filter(l => l !== language));
    }
  };

  const handleSpecializationChange = (specialization: string, checked: boolean) => {
    if (checked) {
      setSelectedSpecializations(prev => [...prev, specialization]);
    } else {
      setSelectedSpecializations(prev => prev.filter(s => s !== specialization));
    }
  };

  const onSubmit = async (data: VerificationData) => {
    console.log('Starting verification submission...', { 
      userID: user?.id,
      hasFrontCard: !!lawyerCardFront,
      hasBackCard: !!lawyerCardBack,
      frontCardName: lawyerCardFront?.name,
      backCardName: lawyerCardBack?.name,
      consultationMethods: selectedConsultationMethods
    });

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to complete verification.",
        variant: "destructive",
      });
      return;
    }

    if (!lawyerCardFront || !lawyerCardBack || !profilePicture) {
      const missing = [];
      if (!lawyerCardFront) missing.push('front side of lawyer card');
      if (!lawyerCardBack) missing.push('back side of lawyer card');
      if (!profilePicture) missing.push('profile picture');
      
      toast({
        title: "Missing Files",
        description: `Please upload: ${missing.join(', ')}.`,
        variant: "destructive",
      });
      return;
    }

    if (selectedConsultationMethods.length === 0) {
      toast({
        title: "Consultation Methods Required",
        description: "Please select at least one consultation method.",
        variant: "destructive",
      });
      return;
    }

    if (selectedLanguages.length === 0) {
      toast({
        title: "Languages Required",
        description: "Please select at least one language you speak.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Uploading files...');
      
      // Show upload progress
      setUploadingFront(true);
      setUploadingBack(true);
      setUploadingProfile(true);

      // Upload lawyer card front and back and profile picture with detailed error handling
      let lawyerCardFrontUrl, lawyerCardBackUrl, profilePictureUrl;
      
      try {
        lawyerCardFrontUrl = await uploadFile(lawyerCardFront, 'front');
        setUploadingFront(false);
        console.log('Front card uploaded successfully');
      } catch (error) {
        setUploadingFront(false);
        console.error('Front card upload failed:', error);
        throw new Error(`Front card upload failed: ${error.message}`);
      }

      try {
        lawyerCardBackUrl = await uploadFile(lawyerCardBack, 'back');
        setUploadingBack(false);
        console.log('Back card uploaded successfully');
      } catch (error) {
        setUploadingBack(false);
        console.error('Back card upload failed:', error);
        throw new Error(`Back card upload failed: ${error.message}`);
      }

      try {
        profilePictureUrl = await uploadProfilePicture(profilePicture);
        setUploadingProfile(false);
        console.log('Profile picture uploaded successfully');
      } catch (error) {
        setUploadingProfile(false);
        console.error('Profile picture upload failed:', error);
        throw new Error(`Profile picture upload failed: ${error.message}`);
      }

      console.log('Both files uploaded, updating profile...');

      // Prepare team breakdown
      const teamBreakdown = {
        total: data.teamSize,
      };

      // Prepare pricing structure
      const pricingStructure = {
        consultation: {
          rate: data.consultationRate,
          structure: data.consultationStructure,
        },
        services: legalServices.reduce((acc, service) => {
          const rate = data[service.field as keyof VerificationData] as number;
          if (rate && rate > 0) {
            acc[service.key] = {
              rate,
              label: service.label,
            };
          }
          return acc;
        }, {} as Record<string, any>),
      };

      // Prepare bar admissions array
      const barAdmissions = (data.barAdmissionsInput || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      // Update profile with complete verification data
      const { error } = await supabase
        .from("profiles")
        .update({
          team_size: data.teamSize,
          team_breakdown: teamBreakdown,
          lawyer_card_front_url: lawyerCardFrontUrl,
          lawyer_card_back_url: lawyerCardBackUrl,
          profile_picture_url: profilePictureUrl,
          pricing_structure: pricingStructure,
          consultation_methods: selectedConsultationMethods,
          payment_structures: selectedPaymentStructures,
          professional_memberships: selectedMemberships,
          notable_achievements: data.notableAchievements || null,
          office_phone: data.officePhone,
          private_phone: data.privateMobile,
          office_address: data.officeAddress,
          languages: selectedLanguages,
          law_firm: data.lawFirm || null,
          license_number: data.licenseNumber,
          years_experience: data.yearsExperience ?? null,
          specializations: selectedSpecializations,
          bar_admissions: barAdmissions.length ? barAdmissions : null,
          verification_status: "pending_complete",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Database update error:", error);
        throw new Error(`Profile update failed: ${error.message}${error.details ? ` (${error.details})` : ''}${error.hint ? ` Hint: ${error.hint}` : ''}`);
      }

      console.log('Profile updated successfully');
      
      toast({
        title: "Success!",
        description: "Complete verification submitted successfully. Your profile is now under admin review.",
      });

      onComplete();
    } catch (error) {
      console.error("Error submitting verification:", error);
      
      // Reset upload states on error
      setUploadingFront(false);
      setUploadingBack(false);
      setUploadingProfile(false);
      
      // Show detailed error message
      const errorMessage = error.message || "Failed to submit verification. Please try again.";
      
      toast({
        title: "Submission Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6" />
          Complete Your Lawyer Verification
        </CardTitle>
        <CardDescription>
          Complete these additional details to get fully verified and start receiving client cases.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Team Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Team Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamSize">Total Team Size</Label>
                <Input
                  id="teamSize"
                  type="number"
                  min="1"
                  {...form.register("teamSize")}
                />
                {form.formState.errors.teamSize && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.teamSize.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lawyer Card Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Official Lawyer License/Card</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-4">
                  Lawyer Card/License *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-600 mb-2">
                      Front Side *
                    </Label>
                    <MobileFileInput
                      onFileSelect={(files) => {
                        const file = files?.[0];
                        console.log('Front card selected:', file?.name, file?.size);
                        setLawyerCardFront(file || null);
                      }}
                      accept=".pdf,.jpg,.jpeg,.png"
                      buttonText="Upload Front"
                      hasFiles={!!lawyerCardFront}
                      disabled={uploadingFront}
                      className="w-full"
                    />
                    {uploadingFront && (
                      <p className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading front card...
                      </p>
                    )}
                    {lawyerCardFront && !uploadingFront && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {lawyerCardFront.name} ({(lawyerCardFront.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-600 mb-2">
                      Back Side *
                    </Label>
                    <MobileFileInput
                      onFileSelect={(files) => {
                        const file = files?.[0];
                        console.log('Back card selected:', file?.name, file?.size);
                        setLawyerCardBack(file || null);
                      }}
                      accept=".pdf,.jpg,.jpeg,.png"
                      buttonText="Upload Back"
                      hasFiles={!!lawyerCardBack}
                      disabled={uploadingBack}
                      className="w-full"
                    />
                    {uploadingBack && (
                      <p className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading back card...
                      </p>
                    )}
                    {lawyerCardBack && !uploadingBack && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {lawyerCardBack.name} ({(lawyerCardBack.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Upload clear photos or scans of both sides of your lawyer card/license (PDF, JPG, PNG)
                </p>
              </div>
            </div>
          </div>

          {/* Profile Picture Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Profile Picture</h3>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-4">
                Professional Photo *
              </Label>
              <MobileFileInput
                onFileSelect={(files) => {
                  const file = files?.[0];
                  console.log('Profile picture selected:', file?.name, file?.size);
                  setProfilePicture(file || null);
                }}
                accept=".jpg,.jpeg,.png"
                buttonText="Upload Profile Picture"
                hasFiles={!!profilePicture}
                disabled={uploadingProfile}
                className="w-full max-w-md"
              />
              {uploadingProfile && (
                <p className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading profile picture...
                </p>
              )}
              {profilePicture && !uploadingProfile && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {profilePicture.name} ({(profilePicture.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Upload a professional headshot photo (JPG, PNG). Max 5MB.
              </p>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Contact Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="officePhone">Office Phone Number *</Label>
                <Input
                  id="officePhone"
                  type="tel"
                  placeholder="+20 2 1234 5678"
                  {...form.register("officePhone")}
                />
                {form.formState.errors.officePhone && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.officePhone.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="privateMobile">Private Mobile Number *</Label>
                <Input
                  id="privateMobile"
                  type="tel"
                  placeholder="+20 10 1234 5678"
                  {...form.register("privateMobile")}
                />
                {form.formState.errors.privateMobile && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.privateMobile.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="whatsappNumber">WhatsApp Number (Optional)</Label>
                <Input
                  id="whatsappNumber"
                  type="tel"
                  placeholder="+20 10 1234 5678"
                  {...form.register("whatsappNumber")}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="officeAddress">Office Address *</Label>
                <Textarea
                  id="officeAddress"
                  placeholder="Complete office address including street, district, city, and governorate"
                  rows={3}
                  {...form.register("officeAddress")}
                />
                {form.formState.errors.officeAddress && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.officeAddress.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Legal Practice Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Legal Practice Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lawFirm">Law Firm/Practice Name</Label>
                <Input
                  id="lawFirm"
                  placeholder="Enter your law firm or practice name"
                  {...form.register("lawFirm")}
                />
              </div>
              
              <div>
                <Label htmlFor="licenseNumber">License Number *</Label>
                <Input
                  id="licenseNumber"
                  placeholder="Enter your bar license number"
                  {...form.register("licenseNumber")}
                />
                {form.formState.errors.licenseNumber && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.licenseNumber.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  min="0"
                  placeholder="Number of years practicing law"
                  {...form.register("yearsExperience")}
                />
                {form.formState.errors.yearsExperience && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.yearsExperience.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="barAdmissionsInput">Bar Admissions</Label>
                <Input
                  id="barAdmissionsInput"
                  placeholder="e.g. Egyptian Bar Association, Cairo Bar"
                  {...form.register("barAdmissionsInput")}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter multiple admissions separated by commas
                </p>
              </div>
            </div>
            
            <div>
              <Label className="text-base font-medium">Legal Specializations</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                {specializationOptions.map((specialization) => (
                  <div key={specialization} className="flex items-center space-x-2">
                    <Checkbox
                      id={specialization}
                      checked={selectedSpecializations.includes(specialization)}
                      onCheckedChange={(checked) => 
                        handleSpecializationChange(specialization, checked as boolean)
                      }
                    />
                    <Label htmlFor={specialization} className="text-sm">
                      {specialization}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Languages Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Languages Spoken</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableLanguages.map((language) => (
                <div key={language} className="flex items-center space-x-2">
                  <Checkbox
                    id={language}
                    checked={selectedLanguages.includes(language)}
                    onCheckedChange={(checked) => 
                      handleLanguageChange(language, checked as boolean)
                    }
                  />
                  <Label htmlFor={language}>{language}</Label>
                </div>
              ))}
            </div>
            {selectedLanguages.length === 0 && (
              <p className="text-sm text-destructive">
                Please select at least one language you speak.
              </p>
            )}
          </div>

          {/* Pricing Structure Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Service Pricing</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="consultationRate">Consultation Rate (EGP)</Label>
                <Input
                  id="consultationRate"
                  type="number"
                  min="1"
                  {...form.register("consultationRate")}
                />
                {form.formState.errors.consultationRate && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.consultationRate.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="consultationStructure">Consultation Structure</Label>
                <Select
                  value={form.watch("consultationStructure")}
                  onValueChange={(value) => form.setValue("consultationStructure", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select structure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Per Hour</SelectItem>
                    <SelectItem value="flat">Flat Fee</SelectItem>
                    <SelectItem value="session">Per Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Legal Service Rates (Required - Average flat fees in EGP)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {legalServices.map((service) => (
                  <div key={service.key}>
                    <Label htmlFor={service.field}>{service.label}</Label>
                    <Input
                      id={service.field}
                      type="number"
                      min="1"
                      placeholder="Average flat fee in EGP"
                      {...form.register(service.field as keyof VerificationData)}
                    />
                    {form.formState.errors[service.field as keyof VerificationData] && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors[service.field as keyof VerificationData]?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Consultation Methods */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Available Consultation Methods</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {consultationMethods.map((method) => (
                <div key={method.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={method.id}
                    checked={selectedConsultationMethods.includes(method.id)}
                    onCheckedChange={(checked) => 
                      handleConsultationMethodChange(method.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={method.id} className="flex items-center gap-2">
                    <method.icon className="h-4 w-4" />
                    {method.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Structures */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Accepted Payment Structures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentStructures.map((structure) => (
                <div key={structure.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={structure.id}
                    checked={selectedPaymentStructures.includes(structure.id)}
                    onCheckedChange={(checked) => 
                      handlePaymentStructureChange(structure.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={structure.id}>{structure.label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Professional Memberships */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Professional Memberships (Optional)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {professionalMemberships.map((membership) => (
                <div key={membership} className="flex items-center space-x-2">
                  <Checkbox
                    id={membership}
                    checked={selectedMemberships.includes(membership)}
                    onCheckedChange={(checked) => 
                      handleMembershipChange(membership, checked as boolean)
                    }
                  />
                  <Label htmlFor={membership}>{membership}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Notable Achievements */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Notable Achievements (Optional)</h3>
            </div>
            
            <Textarea
              id="notableAchievements"
              placeholder="Describe any notable cases, awards, publications, or professional achievements..."
              rows={4}
              {...form.register("notableAchievements")}
            />
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Submit for Review
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}