import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Scale, ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { EmailAuthForm } from "@/components/EmailAuthForm";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lawyerRequestSent, setLawyerRequestSent] = useState(false);
  
  // Password reset state
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
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

  // Check if user is already authenticated and handle reset mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect');
    const resetParam = urlParams.get('reset');
    const forceStay = urlParams.get('force') === 'true';
    
    console.log('Auth useEffect - force:', forceStay, 'reset:', resetParam);
    
    // Check if we're in reset mode
    if (resetParam === 'admin') {
      setResetMode(true);
      return; // Don't redirect, allow reset form to show
    }
    
    // Set up auth state listener for password recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setResetMode(true);
      }
    });
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth checkAuth - session exists:', !!session, 'forceStay:', forceStay, 'resetMode:', resetMode);
      
      if (session && !resetMode && !forceStay) {
        // Get user profile to determine role and redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        const role = profile?.role || 'client';
        
        console.log('Auth redirecting to:', redirectTo === 'intake' ? '/intake' : `/${role}`);
        
        // Redirect to intended page or default dashboard
        if (redirectTo === 'intake') {
          navigate('/intake', { replace: true });
        } else {
          navigate(`/${role}`, { replace: true });
        }
      } else if (forceStay) {
        console.log('Auth staying on page due to force=true');
      }
    };
    
    checkAuth();
    
    return () => subscription.unsubscribe();
  }, [navigate, resetMode]);

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

    if (!password) {
      toast({
        title: "Password Required",
        description: "Please enter your password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Authentication successful! Redirecting to admin dashboard...",
      });
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (email !== 'dankevforster@gmail.com') {
      toast({
        title: "Access Denied",
        description: "Password reset is only available for the admin account.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=admin`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password Reset Sent",
        description: "Check your email for the password reset link.",
      });
    }
    
    setResetLoading(false);
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in both password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully. Redirecting to admin dashboard...",
      });
      setResetMode(false);
      navigate('/admin', { replace: true });
    }
    
    setResetLoading(false);
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
                    <EmailAuthForm 
                      onSuccess={() => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const redirectTo = urlParams.get('redirect');
                        if (redirectTo === 'intake') {
                          navigate('/intake', { replace: true });
                        } else {
                          navigate('/client', { replace: true });
                        }
                      }}
                    />
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
                    <h3 className="text-lg font-semibold">
                      {resetMode ? "Set New Password" : "Admin Portal"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {resetMode 
                        ? "Create a new password for your admin account" 
                        : "Enter your admin credentials to access the dashboard"
                      }
                    </p>
                  </div>
                  
                  {resetMode ? (
                    <form onSubmit={handleSetNewPassword} className="space-y-4">
                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-primary"
                        disabled={resetLoading}
                      >
                        {resetLoading ? "Updating Password..." : "Set New Password"}
                      </Button>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Password must be at least 6 characters long
                      </p>
                    </form>
                  ) : (
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
                      <div>
                        <Label htmlFor="admin-password">Password</Label>
                        <Input
                          id="admin-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-primary"
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing In..." : "Sign In"}
                      </Button>
                      
                      {email === 'dankevforster@gmail.com' && (
                        <div className="text-center">
                          <Button
                            type="button"
                            variant="link"
                            className="text-sm text-primary p-0"
                            onClick={handleForgotPassword}
                            disabled={resetLoading}
                          >
                            {resetLoading ? "Sending..." : "Forgot/Set password?"}
                          </Button>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Secure admin authentication for authorized personnel only
                      </p>
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