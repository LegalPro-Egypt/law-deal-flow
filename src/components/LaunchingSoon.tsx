import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Shield, Sparkles, Heart, CheckCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { LaunchingSoonChatSection } from '@/components/LaunchingSoonChatSection';
import { AnimatedDots } from '@/components/AnimatedDots';
import { useToast } from '@/hooks/use-toast';

interface LaunchingSoonProps {
  onPasswordAccess: () => void;
}

export const LaunchingSoon = ({ onPasswordAccess }: LaunchingSoonProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // Fallback text in case translations aren't loaded
  const fallbackText = {
    comingSoon: "Coming Soon",
    revolutionizingLegalServices: "Revolutionizing Legal Services",
    launchingDescription: "We're building Egypt's first AI-powered legal platform to modernize how clients and lawyers connect.",
    getNotified: "Get Notified",
    getNotifiedDescription: "Sign up to be the first to know when we launch.",
    enterYourEmail: "Enter your email",
    expertLawyers: "Expert Lawyers",
    expertLawyersDescription: "Connect with top-rated, vetted legal professionals.",
    multilingualSupport: "Multilingual Support", 
    multilingualSupportDescription: "Seamless service in Arabic, English, and more.",
    proBonoServices: "Pro Bono Services",
    proBonoServicesDescription: "Part of our revenue funds free legal aid for those in need.",
    aiLegalAssistant: "AI Legal Assistant",
    aiLegalAssistantDescription: "Get instant legal guidance powered by advanced AI trained on Egyptian law.",
    clientProtectionGuarantee: "Client Protection Guarantee",
    clientProtectionGuaranteeDescription: "LegalPro protects clients by covering part or all of their case fees in the rare event of proven misconduct or malpractice.",
    clientProtectionGuaranteeDisclaimer: "*Eligibility requires evidence and a case-by-case review.*",
    givingBackToCommunity: "Giving Back to the Community",
    proBonoMissionDescription: "We reinvest to make legal services accessible for everyone.",
    accessPlatform: "Access Platform",
    thankYou: "Thank You!",
    emailRegisteredSuccess: "You'll be among the first to know when we launch!",
    launchingFooterText: "Built with passion for justice and innovation.",
    emailAlreadyRegistered: "Already Registered",
    emailAlreadyRegisteredDescription: "This email is already on our waitlist!",
    emailSignupSuccess: "Welcome to the Waitlist!",
    emailSignupSuccessDescription: "You'll receive updates about our launch.",
    emailSignupError: "Registration Error",
    emailSignupErrorDescription: "Please try again later."
  };

  // Helper function to get text with fallback
  const getText = (key: keyof typeof fallbackText) => {
    const translated = t(key);
    // If translation key is returned as-is, use fallback
    return translated === key ? fallbackText[key] : translated;
  };
  
  const { elementRef: featuresRef, isVisible: featuresVisible } = useIntersectionObserver({ threshold: 0.2 });
  const { elementRef: proBonoRef, isVisible: proBonoVisible } = useIntersectionObserver({ threshold: 0.3 });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('email_signups')
        .insert({
          email: email.trim().toLowerCase(),
          source: 'launching_soon',
          ip_address: '',
          user_agent: navigator.userAgent,
          metadata: {
            timestamp: new Date().toISOString(),
            language: 'en'
          }
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: getText('emailAlreadyRegistered'),
            description: getText('emailAlreadyRegisteredDescription'),
            variant: 'default'
          });
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast({
          title: getText('emailSignupSuccess'),
          description: getText('emailSignupSuccessDescription'),
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Email signup error:', error);
      toast({
        title: getText('emailSignupError'),
        description: getText('emailSignupErrorDescription'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen neomorphism-background">
      {/* Animated Background Orbs */}
      <div className="floating-orb floating-orb-1"></div>
      <div className="floating-orb floating-orb-2"></div>
      <div className="floating-orb floating-orb-3"></div>
      
      {/* Header */}
      <header className="px-4 py-6 relative z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold font-futura text-neomorphism-primary">
            LegalPro
          </div>
          <Button 
            onClick={onPasswordAccess}
            className="hidden md:flex neomorphism-button text-white font-medium px-6 py-3"
          >
            {getText('accessPlatform')}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`transition-all duration-1000 ${isLoaded ? 'animate-hero-fade-in' : 'opacity-0'}`}>
            <h1 className="text-5xl md:text-7xl font-bold font-futura text-gray-900 mb-6 leading-tight">
              {getText('comingSoon')}<AnimatedDots />
            </h1>
            <p className="text-xl md:text-2xl font-modern text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
              {getText('revolutionizingLegalServices')}
            </p>
            <p className="text-lg font-modern text-gray-600 mb-12 max-w-2xl mx-auto">
              {getText('launchingDescription')}
            </p>
          </div>

          {/* Email Signup Card */}
          <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'animate-hero-fade-in' : 'opacity-0'}`}>
            <Card className="max-w-md mx-auto neomorphism-card">
              <CardContent className="p-8">
                {!isSubscribed ? (
                  <form onSubmit={handleEmailSignup}>
                    <h3 className="text-2xl font-semibold font-futura text-gray-900 mb-4">
                      {getText('getNotified')}
                    </h3>
                    <p className="text-gray-600 font-modern mb-6 leading-relaxed">
                      {getText('getNotifiedDescription')}
                    </p>
                    <div className="space-y-4">
                      <Input
                        type="email"
                        placeholder={getText('enterYourEmail')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full neomorphism-input text-gray-700 placeholder:text-gray-500 font-modern"
                        required
                      />
                      <Button
                        type="submit"
                        disabled={isLoading || !email}
                        className="w-full neomorphism-button text-white font-medium font-modern py-3"
                      >
                        {isLoading ? 'Joining...' : 'Join the Waitlist'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-neomorphism-primary mx-auto mb-4 animate-glow-pulse" />
                    <h3 className="text-2xl font-semibold font-futura text-gray-900 mb-4">
                      {getText('thankYou')}
                    </h3>
                    <p className="text-gray-600 font-modern leading-relaxed">
                      {getText('emailRegisteredSuccess')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Features Preview */}
          <div className="mt-24 max-w-6xl mx-auto" ref={featuresRef}>
            <div className={`grid md:grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-1000 ${featuresVisible ? 'animate-card-slide-up' : 'opacity-0 translate-y-10'}`}>
              <Card className="neomorphism-feature">
                <CardContent className="p-8 text-center">
                  <Brain className="w-12 h-12 text-neomorphism-primary mx-auto mb-6 icon-glow" />
                  <h3 className="text-xl font-semibold font-futura text-gray-900 mb-4">
                    {getText('expertLawyers')}
                  </h3>
                  <p className="text-gray-600 font-modern leading-relaxed">
                    {getText('expertLawyersDescription')}
                  </p>
                </CardContent>
              </Card>

              <Card className="neomorphism-feature" style={{ animationDelay: '0.2s' }}>
                <CardContent className="p-8 text-center">
                  <Shield className="w-12 h-12 text-neomorphism-primary mx-auto mb-6 icon-glow" />
                  <h3 className="text-xl font-semibold font-futura text-gray-900 mb-4">
                    {getText('multilingualSupport')}
                  </h3>
                  <p className="text-gray-600 font-modern leading-relaxed">
                    {getText('multilingualSupportDescription')}
                  </p>
                </CardContent>
              </Card>

              <Card className="neomorphism-feature" style={{ animationDelay: '0.4s' }}>
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-12 h-12 text-neomorphism-accent mx-auto mb-6 icon-glow" />
                  <h3 className="text-xl font-semibold font-futura text-gray-900 mb-4">
                    {getText('aiLegalAssistant')}
                  </h3>
                  <p className="text-gray-600 font-modern leading-relaxed">
                    {getText('aiLegalAssistantDescription')}
                  </p>
                </CardContent>
              </Card>

              <Card className="neomorphism-feature" style={{ animationDelay: '0.6s' }}>
                <CardContent className="p-8 text-center">
                  <ShieldCheck className="w-12 h-12 text-neomorphism-primary mx-auto mb-6 icon-glow" />
                  <h3 className="text-xl font-semibold font-futura text-gray-900 mb-4">
                    {getText('clientProtectionGuarantee')}
                  </h3>
                  <p className="text-gray-600 font-modern leading-relaxed mb-3">
                    {getText('clientProtectionGuaranteeDescription')}
                  </p>
                  <small className="text-xs text-gray-500 font-modern leading-relaxed">
                    {getText('clientProtectionGuaranteeDisclaimer')}
                  </small>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Chat Section */}
          <LaunchingSoonChatSection />

          {/* Pro Bono Section */}
          <div className="mt-24 max-w-4xl mx-auto" ref={proBonoRef}>
            <Card className={`neomorphism-card bg-gradient-to-r from-neomorphism-light to-neomorphism-base transition-all duration-1000 ${proBonoVisible ? 'animate-card-slide-up' : 'opacity-0 translate-y-10'}`}>
              <CardContent className="p-12 text-center">
                <Heart className="w-16 h-16 text-red-500 mx-auto mb-8 icon-glow animate-gentle-pulse" />
                <h2 className="text-3xl font-bold font-futura text-gray-900 mb-6">
                  {getText('givingBackToCommunity')}
                </h2>
                <p className="text-lg font-modern text-gray-700 leading-relaxed max-w-2xl mx-auto">
                  {getText('proBonoMissionDescription')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Access Button */}
          <div className="mt-16 md:hidden text-center">
            <Button 
              onClick={onPasswordAccess}
              size="lg"
              className="neomorphism-button text-white font-medium px-8 py-4"
            >
              {getText('accessPlatform')}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="neomorphism-card p-6">
            <p className="text-gray-600 font-modern">
              &copy; 2024 LegalPro. Revolutionizing legal services in Egypt.
            </p>
            <p className="text-sm text-gray-500 font-modern mt-2">
              {getText('launchingFooterText')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};