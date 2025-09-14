import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, ArrowLeft, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lawyerRequestSent, setLawyerRequestSent] = useState(false);
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
        navigate(`/${role}`);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
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

            navigate(`/${userRole}`);
          } else {
            navigate(`/${profile.role}`);
          }
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
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check Your Email",
        description: "We've sent you a secure login link.",
      });
    }
    
    setIsLoading(false);
  };

  const handleLawyerRequest = async () => {
    setLawyerRequestSent(true);
    toast({
      title: "Request Submitted",
      description: "Your lawyer access request has been sent to the admin for review.",
    });
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
                <div className="space-y-4 mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Client Portal</h3>
                    <p className="text-sm text-muted-foreground">Access your cases and communicate with lawyers</p>
                  </div>
                  
                  <GoogleAuthButton
                    variant="default"
                    size="default"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Sign in with Google
                  </GoogleAuthButton>
                  
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Secure authentication powered by Google. 
                      Your legal information is protected and encrypted.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lawyer">
                <div className="space-y-4 mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Lawyer Portal</h3>
                    <p className="text-sm text-muted-foreground">Manage cases and create proposals</p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Lawyer accounts are created by invitation only. 
                      Please contact admin for access.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleLawyerRequest}
                      disabled={lawyerRequestSent}
                    >
                      {lawyerRequestSent ? "Request Sent" : "Request Lawyer Access"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="admin">
                <div className="space-y-4 mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Admin Portal</h3>
                    <p className="text-sm text-muted-foreground">Manage cases, lawyers, and platform settings</p>
                  </div>
                  
                  <form onSubmit={handleAdminSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dankevforster@gmail.com"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Admin access is restricted to authorized personnel only
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send Secure Login Link"}
                    </Button>
                  </form>
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