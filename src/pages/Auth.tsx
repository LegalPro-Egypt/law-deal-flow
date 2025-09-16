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
  const [flow, setFlow] = useState<'none' | 'invite' | 'recovery' | 'adminReset'>('none');
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
    // Read parameters from both search and hash
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Merge all parameters, with hash taking precedence
    const allParams = new URLSearchParams();
    for (const [key, value] of searchParams) {
      allParams.set(key, value);
    }
    for (const [key, value] of hashParams) {
      allParams.set(key, value);
    }
    
    // Normalize URL by moving hash parameters to search
    if (window.location.hash && hashParams.size > 0) {
      const newUrl = new URL(window.location.href);
      newUrl.hash = '';
      for (const [key, value] of hashParams) {
        newUrl.searchParams.set(key, value);
      }
      window.history.replaceState({}, '', newUrl.toString());
    }
    
    const redirectTo = allParams.get('redirect');
    const resetParam = allParams.get('reset');
    const forceStay = allParams.get('force') === 'true';
    
    // Check for Supabase invitation tokens
    const accessToken = allParams.get('access_token');
    const refreshToken = allParams.get('refresh_token');
    const tokenType = allParams.get('token_type');
    const type = allParams.get('type');
    
    console.log('Auth useEffect - force:', forceStay, 'reset:', resetParam, 'type:', type, 'hasTokens:', !!(accessToken && refreshToken));
    
    // Handle Supabase password recovery flow - set resetMode immediately
    if (type === 'recovery') {
      console.log('Password recovery detected - showing reset form');
      setResetMode(true);
      setFlow('recovery');
      return;
    }
    
    // Handle Supabase invitation flow - set resetMode immediately
    if (type === 'invite') {
      console.log('Invitation detected - showing password setup form');
      setResetMode(true);
      setFlow('invite');
      return;
    }
    
    // Handle other token flows (but don't set resetMode for these)
    if (accessToken && refreshToken) {
      console.log('Processing other token flows...');
      // Don't redirect yet, let Supabase handle the token exchange
      return;
    }
    
    // Check if we're in admin reset mode
    if (resetParam === 'admin') {
      setResetMode(true);
      setFlow('adminReset');
      return; // Don't redirect, allow reset form to show
    }
    
    // Set up auth state listener for password recovery and sign in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, !!session, 'resetMode:', resetMode);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event - setting reset mode');
        setResetMode(true);
        return;
      }
      
      // Handle successful sign in - but only redirect if NOT in reset mode and NOT forced to stay
      if (event === 'SIGNED_IN' && session && !resetMode && !forceStay) {
        console.log('SIGNED_IN event - redirecting to dashboard');
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            const role = profile?.role || 'client';
            
            // Remove all auth-related parameters from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('force');
            url.searchParams.delete('access_token');
            url.searchParams.delete('refresh_token');
            url.searchParams.delete('token_type');
            url.searchParams.delete('type');
            window.history.replaceState({}, '', url.toString());
            
            // Navigate to appropriate dashboard
            navigate(`/${role}`, { replace: true });
          } catch (error) {
            console.error('Error fetching profile after sign in:', error);
            navigate('/client', { replace: true }); // Fallback to client dashboard
          }
        }, 0);
      }
      
      // Handle token exchange for invitations (but not password recovery)
      if (event === 'TOKEN_REFRESHED' && session && !resetMode && !forceStay) {
        console.log('Token refreshed, checking for new user setup...');
        // This happens after invitation acceptance
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            const role = profile?.role || 'lawyer'; // Default to lawyer for invitations
            
            // Remove auth parameters and redirect
            const url = new URL(window.location.href);
            url.searchParams.delete('access_token');
            url.searchParams.delete('refresh_token');
            url.searchParams.delete('token_type');
            url.searchParams.delete('type');
            window.history.replaceState({}, '', url.toString());
            
            navigate(`/${role}`, { replace: true });
            
            toast({
              title: "Welcome!",
              description: "Your account has been activated. Please complete your profile setup.",
            });
          } catch (error) {
            console.error('Error setting up new user:', error);
            // If no profile exists, show a message to contact admin
            toast({
              title: "Account Setup Needed",
              description: "Your invitation was accepted but profile setup is incomplete. Please contact admin.",
              variant: "destructive",
            });
          }
        }, 1000);
      }
    });
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth checkAuth - session exists:', !!session, 'forceStay:', forceStay, 'resetMode:', resetMode);
      
      // If user is logged in and not in reset mode and not forced to stay, redirect
      if (session && !resetMode && !forceStay) {
        // Get user profile to determine role and redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        const role = profile?.role || 'client';
        
        console.log('Auth redirecting to:', redirectTo === 'intake' ? '/intake' : `/${role}`);
        
        // Remove force parameter from URL since we're redirecting
        if (forceStay) {
          const url = new URL(window.location.href);
          url.searchParams.delete('force');
          window.history.replaceState({}, '', url.toString());
        }
        
        // Redirect to intended page or default dashboard
        if (redirectTo === 'intake') {
          navigate('/intake', { replace: true });
        } else {
          navigate(`/${role}`, { replace: true });
        }
      } else if (forceStay) {
        console.log('Auth staying on page due to force=true (no session or in reset mode)');
      }
    };
    
    // Only check auth if we're not in a password recovery or invite flow
    if (type !== 'recovery' && type !== 'invite' && resetParam !== 'admin') {
      checkAuth();
    }
    
    return () => subscription.unsubscribe();
  }, [navigate, resetMode, flow, toast]);

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
      
      // Remove force parameter and navigate immediately
      const url = new URL(window.location.href);
      url.searchParams.delete('force');
      window.history.replaceState({}, '', url.toString());
      
      navigate('/admin', { replace: true });
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
        title: flow === 'invite' ? "Account Activated" : "Password Updated",
        description: flow === 'invite' 
          ? "Your account has been activated successfully. Redirecting to your dashboard..." 
          : "Your password has been updated successfully. Redirecting to your dashboard...",
      });
      
      // Clear reset mode and redirect to appropriate dashboard
      setResetMode(false);
      setFlow('none');
      
      // Get user profile to determine redirect
      setTimeout(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            const role = profile?.role || 'client';
            
            // Clean up URL parameters
            const url = new URL(window.location.href);
            url.searchParams.delete('access_token');
            url.searchParams.delete('refresh_token');
            url.searchParams.delete('token_type');
            url.searchParams.delete('type');
            url.searchParams.delete('reset');
            window.history.replaceState({}, '', url.toString());
            
            navigate(`/${role}`, { replace: true });
          }
        } catch (error) {
          console.error('Error redirecting after password reset:', error);
          navigate('/client', { replace: true });
        }
      }, 1000);
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
            {resetMode ? (
              // Dedicated Password Setup UI
              <div className="space-y-4 mt-6">
                <div className="text-center mb-6">
                  <Lock className="h-8 w-8 mx-auto text-primary mb-2" />
                  <h3 className="text-lg font-semibold">
                    {flow === 'invite' ? 'Create Your Password' : 'Set New Password'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {flow === 'invite' 
                      ? "Create your password to activate your account and access your lawyer dashboard" 
                      : "Enter a new password for your account"
                    }
                  </p>
                </div>
                
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
                    {resetLoading ? "Setting Password..." : 
                     flow === 'invite' ? "Activate Account" : "Update Password"}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Password must be at least 6 characters long
                  </p>
                </form>
              </div>
            ) : (
              // Normal Authentication Tabs
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
                        By continuing, you agree to our terms of service and privacy policy
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="lawyer">
                  <div className="space-y-4 mt-6">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold">Request Lawyer Access</h3>
                      <p className="text-sm text-muted-foreground">Submit your credentials for admin review</p>
                    </div>
                    
                    {lawyerRequestSent ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Mail className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Request Submitted!</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Your lawyer access request has been sent to our admin team for review.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          You'll receive an email confirmation once your request is processed.
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
                              placeholder="your.email@example.com"
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
                        Enter your admin credentials to access the dashboard
                      </p>
                    </div>
                    
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
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {!resetMode && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Secure Authentication</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>🔒 End-to-end encrypted communication</p>
                  <p>🛡️ OAuth 2.0 security standards</p>
                  <p>⚡ Instant access to legal services</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;