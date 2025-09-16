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
import { 
  User, 
  Building2, 
  Users, 
  FileText, 
  Camera, 
  Upload,
  CheckCircle,
  Loader2,
  Scale,
  Globe,
  Calendar
} from "lucide-react";

const lawyerProfileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  officePhone: z.string().min(10, "Please enter a valid office phone number"),
  privatePhone: z.string().min(10, "Please enter a valid private phone number"),
  officeAddress: z.string().min(10, "Office address is required"),
  birthDate: z.string().min(1, "Birth date is required"),
  lawFirm: z.string().min(2, "Law firm name is required"),
  teamSize: z.coerce.number().min(1, "Team size must be at least 1"),
  bio: z.string().min(50, "Bio must be at least 50 characters"),
  yearsExperience: z.coerce.number().min(1, "Years of experience must be at least 1"),
  licenseNumber: z.string().min(5, "License number is required"),
});

type LawyerProfileData = z.infer<typeof lawyerProfileSchema>;

const specializations = [
  "Family Law",
  "Criminal Law", 
  "Corporate Law",
  "Real Estate Law",
  "Immigration Law",
  "Employment Law",
  "Personal Injury",
  "Tax Law",
  "Intellectual Property",
  "Environmental Law",
  "Constitutional Law",
  "International Law"
];

const languages = [
  "English",
  "Arabic", 
  "German",
  "French",
  "Spanish",
  "Italian",
  "Russian",
  "Chinese",
  "Japanese"
];

const barAdmissions = [
  "Cairo Bar Association",
  "Alexandria Bar Association", 
  "Giza Bar Association",
  "Other Egyptian Bar"
];

interface LawyerProfileFormProps {
  onComplete: () => void;
  initialData?: Partial<LawyerProfileData>;
}

export function LawyerProfileForm({ onComplete, initialData }: LawyerProfileFormProps) {
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [selectedBarAdmissions, setSelectedBarAdmissions] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English"]);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [credentialsFiles, setCredentialsFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<LawyerProfileData>({
    resolver: zodResolver(lawyerProfileSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      officePhone: initialData?.officePhone || "",
      privatePhone: initialData?.privatePhone || "",
      officeAddress: initialData?.officeAddress || "",
      birthDate: initialData?.birthDate || "",
      lawFirm: initialData?.lawFirm || "",
      teamSize: initialData?.teamSize || 1,
      bio: initialData?.bio || "",
      yearsExperience: initialData?.yearsExperience || 1,
      licenseNumber: initialData?.licenseNumber || "",
    },
  });

  const handleSpecializationChange = (specialization: string, checked: boolean) => {
    if (checked) {
      setSelectedSpecializations(prev => [...prev, specialization]);
    } else {
      setSelectedSpecializations(prev => prev.filter(s => s !== specialization));
    }
  };

  const handleBarAdmissionChange = (barAdmission: string, checked: boolean) => {
    if (checked) {
      setSelectedBarAdmissions(prev => [...prev, barAdmission]);
    } else {
      setSelectedBarAdmissions(prev => prev.filter(b => b !== barAdmission));
    }
  };

  const handleLanguageChange = (language: string, checked: boolean) => {
    if (checked) {
      setSelectedLanguages(prev => [...prev, language]);
    } else {
      setSelectedLanguages(prev => prev.filter(l => l !== language));
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setProfilePicture(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
    }
  };

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCredentialsFiles(files);
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('lawyer-documents')
        .upload(path, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('lawyer-documents')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const onSubmit = async (data: LawyerProfileData) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to complete your profile.",
        variant: "destructive",
      });
      return;
    }

    if (selectedSpecializations.length === 0) {
      toast({
        title: "Specializations Required",
        description: "Please select at least one specialization.",
        variant: "destructive",
      });
      return;
    }

    if (selectedBarAdmissions.length === 0) {
      toast({
        title: "Bar Admissions Required", 
        description: "Please select at least one bar admission.",
        variant: "destructive",
      });
      return;
    }

    if (selectedLanguages.length === 0) {
      toast({
        title: "Languages Required",
        description: "Please select at least one spoken language.",
        variant: "destructive",
      });
      return;
    }

    // Validate birth date (must be 21+ years old)
    const birthDate = new Date(data.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (age < 21 || (age === 21 && monthDiff < 0) || (age === 21 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      toast({
        title: "Age Requirement",
        description: "You must be at least 21 years old to practice law.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let profilePictureUrl = "";
      let credentialsUrls: string[] = [];

      // Upload profile picture
      if (profilePicture) {
        const picturePath = `${user.id}/profile-picture-${Date.now()}.${profilePicture.name.split('.').pop()}`;
        const url = await uploadFile(profilePicture, picturePath);
        if (url) profilePictureUrl = url;
      }

      // Upload credentials files
      if (credentialsFiles.length > 0) {
        for (let i = 0; i < credentialsFiles.length; i++) {
          const file = credentialsFiles[i];
          const filePath = `${user.id}/credentials-${i}-${Date.now()}.${file.name.split('.').pop()}`;
          const url = await uploadFile(file, filePath);
          if (url) credentialsUrls.push(url);
        }
      }

      // Update or create profile
      const profileData = {
        user_id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        email: user.email!,
        office_phone: data.officePhone,
        private_phone: data.privatePhone,
        office_address: data.officeAddress,
        birth_date: data.birthDate,
        role: 'lawyer',
        law_firm: data.lawFirm,
        team_size: data.teamSize,
        specializations: selectedSpecializations,
        bio: data.bio,
        years_experience: data.yearsExperience,
        license_number: data.licenseNumber,
        bar_admissions: selectedBarAdmissions,
        languages: selectedLanguages,
        profile_picture_url: profilePictureUrl,
        credentials_documents: credentialsUrls,
        is_active: false, // Requires admin approval
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) throw error;

      toast({
        title: "Profile Submitted!",
        description: "Your lawyer profile has been submitted for review. You'll be notified once it's approved.",
      });

      onComplete();
    } catch (error: any) {
      console.error('Error submitting profile:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your profile. Please try again.",
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
          <Scale className="h-6 w-6 text-primary" />
          Complete Your Lawyer Profile
        </CardTitle>
        <CardDescription>
          Please provide your professional information to join our legal platform. Your profile will be reviewed by our admin team.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  {...form.register("firstName")}
                  disabled={isSubmitting}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  {...form.register("lastName")}
                  disabled={isSubmitting}
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="officePhone">Office Phone</Label>
                <Input
                  {...form.register("officePhone")}
                  placeholder="+20 123 456 7890"
                  disabled={isSubmitting}
                />
                {form.formState.errors.officePhone && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.officePhone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="privatePhone">Private Phone</Label>
                <Input
                  {...form.register("privatePhone")}
                  placeholder="+20 123 456 7890"
                  disabled={isSubmitting}
                />
                {form.formState.errors.privatePhone && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.privatePhone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="officeAddress">Office Address</Label>
                <Textarea
                  {...form.register("officeAddress")}
                  placeholder="123 Legal Street, Cairo, Egypt"
                  className="min-h-[80px]"
                  disabled={isSubmitting}
                />
                {form.formState.errors.officeAddress && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.officeAddress.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  {...form.register("birthDate")}
                  type="date"
                  disabled={isSubmitting}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 21)).toISOString().split('T')[0]}
                />
                {form.formState.errors.birthDate && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.birthDate.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 21 years old to practice law
                </p>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Professional Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lawFirm">Law Firm</Label>
                <Input
                  {...form.register("lawFirm")}
                  placeholder="Smith & Associates Law Firm"
                  disabled={isSubmitting}
                />
                {form.formState.errors.lawFirm && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.lawFirm.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="teamSize">Team Size</Label>
                <Input
                  {...form.register("teamSize")}
                  type="number"
                  min="1"
                  disabled={isSubmitting}
                />
                {form.formState.errors.teamSize && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.teamSize.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  {...form.register("yearsExperience")}
                  type="number"
                  min="1"
                  disabled={isSubmitting}
                />
                {form.formState.errors.yearsExperience && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.yearsExperience.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  {...form.register("licenseNumber")}
                  placeholder="LAW-12345"
                  disabled={isSubmitting}
                />
                {form.formState.errors.licenseNumber && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.licenseNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                {...form.register("bio")}
                placeholder="Tell us about your legal experience, achievements, and areas of expertise..."
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
              {form.formState.errors.bio && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.bio.message}
                </p>
              )}
            </div>
          </div>

          {/* Specializations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Areas of Specialization</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {specializations.map((specialization) => (
                <div key={specialization} className="flex items-center space-x-2">
                  <Checkbox
                    id={specialization}
                    checked={selectedSpecializations.includes(specialization)}
                    onCheckedChange={(checked) => 
                      handleSpecializationChange(specialization, checked as boolean)
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor={specialization} className="text-sm">
                    {specialization}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Admissions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bar Admissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {barAdmissions.map((barAdmission) => (
                <div key={barAdmission} className="flex items-center space-x-2">
                  <Checkbox
                    id={barAdmission}
                    checked={selectedBarAdmissions.includes(barAdmission)}
                    onCheckedChange={(checked) => 
                      handleBarAdmissionChange(barAdmission, checked as boolean)
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor={barAdmission} className="text-sm">
                    {barAdmission}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Spoken Languages */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Spoken Languages
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {languages.map((language) => (
                <div key={language} className="flex items-center space-x-2">
                  <Checkbox
                    id={language}
                    checked={selectedLanguages.includes(language)}
                    onCheckedChange={(checked) => 
                      handleLanguageChange(language, checked as boolean)
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor={language} className="text-sm">
                    {language}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* File Uploads */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Documents & Photo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="profilePicture" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Profile Picture
                </Label>
                <Input
                  id="profilePicture"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  disabled={isSubmitting}
                />
                {profilePicture && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {profilePicture.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="credentials" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Credentials & Certificates
                </Label>
                <Input
                  id="credentials"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleCredentialsChange}
                  disabled={isSubmitting}
                />
                {credentialsFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {credentialsFiles.length} file(s) selected
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[160px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
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