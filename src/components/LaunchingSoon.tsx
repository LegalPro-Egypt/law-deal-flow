import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Rocket, Scale, Heart, Globe, Users } from 'lucide-react';

interface LaunchingSoonProps {
  onPasswordAccess: () => void;
}

export const LaunchingSoon = ({ onPasswordAccess }: LaunchingSoonProps) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

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
            language: isRTL ? 'ar' : 'en'
          }
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: t('emailAlreadyRegistered'),
            description: t('emailAlreadyRegisteredDescription'),
            variant: 'default'
          });
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast({
          title: t('emailSignupSuccess'),
          description: t('emailSignupSuccessDescription'),
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Email signup error:', error);
      toast({
        title: t('emailSignupError'),
        description: t('emailSignupErrorDescription'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Scale className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">LegalPro</h1>
                <p className="text-xs text-muted-foreground">{t('legalServicesplatform')}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onPasswordAccess}
              className="hidden sm:flex"
            >
              {t('accessPlatform')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          
          {/* Hero Section */}
          <div className="space-y-6">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Rocket className="w-4 h-4 mr-2" />
              {t('comingSoon')}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              {t('revolutionizingLegalServices')}
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('launchingDescription')}
            </p>
          </div>

          {/* Email Signup */}
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6">
              {!isSubscribed ? (
                <form onSubmit={handleEmailSignup} className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {t('getNotified')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('getNotifiedDescription')}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Input
                      type="email"
                      placeholder={t('enterYourEmail')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      disabled={isLoading || !email}
                      className="shrink-0"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t('thankYou')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('emailRegisteredSuccess')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t('expertLawyers')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('expertLawyersDescription')}
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t('multilingualSupport')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('multilingualSupportDescription')}
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t('proBonoServices')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('proBonoServicesDescription')}
              </p>
            </div>
          </div>

          {/* Pro Bono Mission */}
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-8">
              <div className="max-w-2xl mx-auto text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <Heart className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">
                    {t('givingBackToCommunity')}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t('proBonoMissionDescription')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Access Button */}
          <div className="sm:hidden">
            <Button 
              onClick={onPasswordAccess}
              className="w-full"
              size="lg"
            >
              {t('accessPlatform')}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              © 2024 LegalPro. {t('allRightsReserved')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('launchingFooterText')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};