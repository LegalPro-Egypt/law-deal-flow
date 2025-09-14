import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    // This would integrate with Supabase auth
    setOtpSent(true);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    // This would verify OTP with Supabase
    console.log("Verifying OTP:", otp);
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
            <CardTitle className="text-2xl font-bold">Welcome to LegalConnect</CardTitle>
            <CardDescription>
              Secure authentication with OTP verification
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
                  
                  {!otpSent ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary">
                        Send Verification Code
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                      <div>
                        <Label htmlFor="otp">Verification Code</Label>
                        <Input
                          id="otp"
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          required
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Code sent to {email}
                        </p>
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary">
                        Verify & Sign In
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setOtpSent(false)}
                        className="w-full"
                      >
                        Use Different Email
                      </Button>
                    </form>
                  )}
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
                    <Button variant="outline" className="w-full">
                      Request Lawyer Access
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
                  
                  {!otpSent ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                      <div>
                        <Label htmlFor="admin-email">Admin Email</Label>
                        <Input
                          id="admin-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@legalconnect.com"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary">
                        Send Admin Code
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                      <div>
                        <Label htmlFor="admin-otp">Admin Verification Code</Label>
                        <Input
                          id="admin-otp"
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary">
                        Access Admin Portal
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setOtpSent(false)}
                        className="w-full"
                      >
                        Use Different Email
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Demo Accounts</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Client: client@demo.com</p>
                <p>Lawyer: lawyer@demo.com</p>
                <p>Admin: admin@demo.com</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;