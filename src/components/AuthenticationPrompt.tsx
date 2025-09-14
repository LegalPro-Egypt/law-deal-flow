import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { Shield, CheckCircle, Users, Clock } from 'lucide-react';

interface AuthenticationPromptProps {
  onAuthenticated?: (user: any) => void;
  onContinueAsGuest?: () => void;
  trigger?: 'case_submission' | 'lawyer_matching' | 'manual';
  className?: string;
}

export const AuthenticationPrompt = ({ 
  onAuthenticated, 
  onContinueAsGuest,
  trigger = 'manual',
  className = ''
}: AuthenticationPromptProps) => {
  const [showPrompt, setShowPrompt] = useState(true);

  if (!showPrompt) return null;

  const getPromptContent = () => {
    switch (trigger) {
      case 'case_submission':
        return {
          title: "Ready to Submit Your Case?",
          description: "To submit your case and get matched with a qualified lawyer, please sign in with Google. This ensures secure communication and protects your legal information.",
          benefits: [
            "Get matched with vetted lawyers",
            "Secure, encrypted communication",
            "Track your case progress",
            "Payment protection & escrow"
          ]
        };
      case 'lawyer_matching':
        return {
          title: "Connect with Lawyers",
          description: "Sign in to access our network of qualified legal professionals. We'll match you with lawyers who specialize in your case type.",
          benefits: [
            "Expert lawyer matching",
            "Verified professional profiles", 
            "Direct secure messaging",
            "Transparent pricing & proposals"
          ]
        };
      default:
        return {
          title: "Continue Your Legal Journey",
          description: "Sign in with Google to unlock all features and get the best legal assistance for your case.",
          benefits: [
            "Save your conversation history",
            "Get matched with specialists",
            "Secure document sharing",
            "Real-time case updates"
          ]
        };
    }
  };

  const content = getPromptContent();

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ${className}`}>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{content.title}</CardTitle>
          <CardDescription className="text-base">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            {content.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="space-y-3">
            <GoogleAuthButton 
              onSuccess={onAuthenticated}
            >
              <Users className="mr-2 h-4 w-4" />
              Continue with Google
            </GoogleAuthButton>
            
            <Button 
              variant="outline" 
              onClick={() => {
                onContinueAsGuest?.();
                setShowPrompt(false);
              }}
              className="w-full"
            >
              <Clock className="mr-2 h-4 w-4" />
              Continue as Guest
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Your conversation is preserved. Signing in helps us provide better service, 
            match you with qualified lawyers, and ensure secure communication for your legal matters.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthenticationPrompt;