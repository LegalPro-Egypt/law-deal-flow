import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Scale, ArrowLeft, Mail, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { EmailAuthForm } from "@/components/EmailAuthForm";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lawyerRequestSent, setLawyerRequestSent] = useState(false);
  const [adminCodeSent, setAdminCodeSent] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  
  // Lawyer request form state
  const [lawyerForm, setLawyerForm] = useState({
    email: '',
    fullName: '',
    lawFirm: '',
    specializations: '',
    message: ''
  });
  const [lawyerFormLoading, setLawyerFormLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get user profile to determine role and redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        const role = profile?.role || 'client';
        navigate(`/${role}`, { replace: true });
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Use setTimeout to defer async operations and prevent deadlocks
          setTimeout(async () => {
            try {
              // Get or create user profile
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')  
                .eq('user_id', session.user.id)
                .single();

              if (!profile) {
                // Create profile for new user
                const isAdmin = session.user.email === 'dankevforster@gmail.com';
                const userRole = isAdmin ? 'admin' : 'client';
                
                await supabase.from('profiles').insert({
                  user_id: session.user.id,
                  email: session.user.email || '',
                  first_name: session.user.user_metadata?.first_name || '',
                  last_name: session.user.user_metadata?.last_name || '',
                  role: userRole
                });

                navigate(`/${userRole}`, { replace: true });
              } else {
                navigate(`/${profile.role}`, { replace: true });
              }
            } catch (error) {
              console.error('Auth redirect error:', error);
            }
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (email !== 'dankevforster@gmail.com') {
      toast({
        title: "Access Denied",
        description: "Admin access is restricted to authorized personnel only.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAdminCodeSent(true);
      toast({
        title: "Code Sent",
        description: "A 6-digit verification code has been sent to your email.",
      });
    }
    
    setIsLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminCode || adminCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    setCodeLoading(true);
    
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: adminCode,
      type: 'email',
    });

    if (error) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Authentication successful! Redirecting to admin dashboard...",
      });
    }
    
    setCodeLoading(false);
  };

  const handleLawyerFormChange = (field: string, value: string) => {
    setLawyerForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLawyerRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lawyerForm.email || !lawyerForm.fullName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (email and full name).",
        variant: "destructive",
      });
      return;
    }

    setLawyerFormLoading(true);
    
    try {
      const { error } = await supabase
        .from('lawyer_requests')
        .insert({
          email: lawyerForm.email,
          full_name: lawyerForm.fullName,
          law_firm: lawyerForm.lawFirm || null,
          specializations: lawyerForm.specializations ? [lawyerForm.specializations] : null,
          message: lawyerForm.message || null,
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Request Already Exists",
            description: "A request with this email already exists. Please check your status or contact admin.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        setLawyerRequestSent(true);
        toast({
          title: "Request Submitted Successfully",
          description: "Your lawyer access request has been sent to the admin for review. You'll be contacted via email.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    }
    
    setLawyerFormLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link to="/" className="inline-flex items-center text-white mb-8 hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card className="bg-gradient-card shadow-elevated">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Scale className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to LegalPro</CardTitle>
            <CardDescription>
              Secure authentication for legal professionals and clients
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="client" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="client">Client</TabsTrigger>
                <TabsTrigger value="lawyer">Lawyer</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>

              <TabsContent value="client">
                <div className="space-y-6 mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Client Portal</h3>
                    <p className="text-sm text-muted-foreground">Access your cases and communicate with lawyers</p>
                  </div>
                  
                  {/* Google OAuth Button */}
                  <div className="space-y-4">
                    <GoogleAuthButton
                      variant="default"
                      size="default"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Continue with Google
                    </GoogleAuthButton>
                    
                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with email
                        </span>
                      </div>
                    </div>
                    
                    {/* Email Authentication Form */}
                    <EmailAuthForm />
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Your legal information is protected with enterprise-grade security
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lawyer">
                <div className="space-y-4 mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Lawyer Portal</h3>
                    <p className="text-sm text-muted-foreground">Request access to manage cases and create proposals</p>
                  </div>
                  
                  {lawyerRequestSent ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                      <p className="text-sm text-green-800 mb-2">✅ Request Submitted Successfully</p>
                      <p className="text-xs text-green-600">
                        Your lawyer access request has been sent to the admin for review. 
                        You'll be contacted via email once reviewed.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleLawyerRequest} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="lawyer-email">Email Address *</Label>
                          <Input
                            id="lawyer-email"
                            type="email"
                            value={lawyerForm.email}
                            onChange={(e) => handleLawyerFormChange('email', e.target.value)}
                            placeholder="your.email@lawfirm.com"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="lawyer-name">Full Name *</Label>
                          <Input
                            id="lawyer-name"
                            type="text"
                            value={lawyerForm.fullName}
                            onChange={(e) => handleLawyerFormChange('fullName', e.target.value)}
                            placeholder="John Doe"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="lawyer-firm">Law Firm/Organization</Label>
                          <Input
                            id="lawyer-firm"
                            type="text"
                            value={lawyerForm.lawFirm}
                            onChange={(e) => handleLawyerFormChange('lawFirm', e.target.value)}
                            placeholder="ABC Law Firm"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="lawyer-specializations">Specializations</Label>
                          <Input
                            id="lawyer-specializations"
                            type="text"
                            value={lawyerForm.specializations}
                            onChange={(e) => handleLawyerFormChange('specializations', e.target.value)}
                            placeholder="Corporate Law, Criminal Defense, etc."
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="lawyer-message">Message/Credentials</Label>
                          <Textarea
                            id="lawyer-message"
                            value={lawyerForm.message}
                            onChange={(e) => handleLawyerFormChange('message', e.target.value)}
                            placeholder="Brief description of your experience and why you'd like to join..."
                            rows={3}
                          />
                        </div>
                      </div>
                      
                      <Button 
                        type="submit"
                        className="w-full"
                        disabled={lawyerFormLoading}
                      >
                        {lawyerFormLoading ? "Submitting Request..." : "Submit Lawyer Access Request"}
                      </Button>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        * Required fields. Your request will be reviewed by our admin team.
                      </p>
                    </form>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="admin">
                <div className="space-y-4 mt-6">
                  <div className="text-center mb-6">
                    <Lock className="h-8 w-8 mx-auto text-primary mb-2" />
                    <h3 className="text-lg font-semibold">Admin Portal</h3>
                    <p className="text-sm text-muted-foreground">
                      {adminCodeSent ? "Enter the verification code sent to your email" : "Enter your admin credentials to access the dashboard"}
                    </p>
                  </div>
                  
                  {!adminCodeSent ? (
                    <form onSubmit={handleAdminSignIn} className="space-y-4">
                      <div>
                        <Label htmlFor="admin-email">Email Address</Label>
                        <Input
                          id="admin-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your admin email"
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-primary"
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending..." : "Send Verification Code"}
                      </Button>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        A 6-digit verification code will be sent to your email
                      </p>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                      <div>
                        <Label htmlFor="admin-code">Verification Code</Label>
                        <Input
                          id="admin-code"
                          type="text"
                          value={adminCode}
                          onChange={(e) => setAdminCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="text-center text-2xl tracking-widest font-mono"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Code sent to: {email}
                        </p>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-primary"
                        disabled={codeLoading}
                      >
                        {codeLoading ? "Verifying..." : "Verify Code"}
                      </Button>
                      
                      <Button 
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setAdminCodeSent(false);
                          setAdminCode("");
                          setEmail("");
                        }}
                      >
                        Back to Email Entry
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Secure Authentication</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>🔒 End-to-end encrypted communication</p>
                <p>🛡️ OAuth 2.0 security standards</p>
                <p>⚡ Instant access to legal services</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;