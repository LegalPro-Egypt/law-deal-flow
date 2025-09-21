import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scale, Shield, MessageSquare, Users, Clock, Check, Brain, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { HomepageChatbot } from "@/components/HomepageChatbot";
import { ProBonoSection } from "@/components/ProBonoSection";
import { PromotionalPopup } from "@/components/PromotionalPopup";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";

const Landing = () => {
  const { isAuthenticated, role, loading } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPromoPopup, setShowPromoPopup] = useState(false);

  useEffect(() => {
    // Check if user explicitly wants to view homepage (bypass auto-redirect)
    const forceHomepage = searchParams.get('force') === 'true';
    
    if (!loading && isAuthenticated && !forceHomepage) {
      // Navigate to role-based dashboard if role is available, otherwise default to client
      const targetRole = role || 'client';
      navigate(`/${targetRole}`, { replace: true });
    }
  }, [isAuthenticated, role, loading, navigate, searchParams]);

  // Show promotional popup for non-authenticated users
  useEffect(() => {
    const hasSeenPromo = localStorage.getItem("homepage-promo-dismissed");
    
    if (!isAuthenticated && !hasSeenPromo && !loading) {
      const timer = setTimeout(() => {
        setShowPromoPopup(true);
      }, 2500); // Show after 2.5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading]);

  const handleClosePromo = () => {
    setShowPromoPopup(false);
    localStorage.setItem("homepage-promo-dismissed", "true");
  };

  const handleSignUpFromPromo = () => {
    setShowPromoPopup(false);
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isRTL() ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between h-16 ${isRTL() ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center space-x-2 ${isRTL() ? 'space-x-reverse' : ''}`}>
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalPro</span>
            </div>
            <div className={`flex items-center gap-1 sm:gap-4 ${isRTL() ? 'flex-row-reverse' : ''}`}>
              <LanguageToggle />
              <Link to="/legal-database">
                <Button variant="ghost">{t('landing.header.guides')}</Button>
              </Link>
              <Link to="/auth?force=true">
                <Button variant="ghost" className="hidden sm:inline-flex">{t('landing.header.signIn')}</Button>
              </Link>
              <Link to="/auth?force=true">
                <Button className="bg-gradient-primary shadow-hero text-sm px-3 sm:px-4">
                  <span className="sm:hidden">{t('landing.header.signIn')}</span>
                  <span className="hidden sm:inline">{t('landing.header.getStarted')}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-4xl sm:text-6xl font-bold mb-6">
              {t('landing.hero.title')}{" "}
              <span className="text-accent sm:block sm:mt-2">{t('landing.hero.titleAccent')}</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?force=true&redirect=intake">
                <Button size="lg" className="bg-accent hover:bg-accent-hover text-xl px-12 py-4">
                  {t('landing.hero.startCase')}
                </Button>
              </Link>
            </div>
            
            {/* Premium Trust Signals */}
            <div className="trust-signals-container">
              <div className="trust-signal-card">
                <div className="trust-signal-icon verified">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="trust-signal-content">
                  <h3>{t('landing.hero.trustSignals.verifiedLawyers.title')}</h3>
                  <p>{t('landing.hero.trustSignals.verifiedLawyers.subtitle')}</p>
                </div>
              </div>
              
              <div className="trust-signal-card">
                <div className="trust-signal-icon ai-powered">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="trust-signal-content">
                  <h3>{t('landing.hero.trustSignals.aiIntake.title')}</h3>
                  <p>{t('landing.hero.trustSignals.aiIntake.subtitle')}</p>
                </div>
              </div>
              
              <div className="trust-signal-card">
                <div className="trust-signal-icon secure">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <div className="trust-signal-content">
                  <h3>{t('landing.hero.trustSignals.securePayments.title')}</h3>
                  <p>{t('landing.hero.trustSignals.securePayments.subtitle')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Anonymous Q&A Chatbot Section */}
      <HomepageChatbot />

      {/* Pro Bono Impact Section */}
      <ProBonoSection />

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('landing.features.title')}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageSquare className="h-8 w-8" />,
                title: t('landing.features.lexaIntake.title'),
                description: t('landing.features.lexaIntake.description')
              },
              {
                icon: <Shield className="h-8 w-8" />,
                title: t('landing.features.paymentProtection.title'),
                description: t('landing.features.paymentProtection.description')
              },
              {
                icon: <Users className="h-8 w-8" />,
                title: t('landing.features.vettedLawyers.title'),
                description: t('landing.features.vettedLawyers.description')
              },
              {
                icon: <Clock className="h-8 w-8" />,
                title: t('landing.features.fastMatching.title'),
                description: t('landing.features.fastMatching.description')
              },
              {
                icon: <MessageSquare className="h-8 w-8" />,
                title: t('landing.features.secureMessaging.title'),
                description: t('landing.features.secureMessaging.description')
              },
              {
                icon: <Check className="h-8 w-8" />,
                title: t('landing.features.caseTracking.title'),
                description: t('landing.features.caseTracking.description')
              }
            ].map((feature, index) => (
              <Card key={index} className={`p-6 card-hover bg-gradient-card animate-slide-up text-center ${isRTL() ? 'md:text-right' : 'md:text-left'}`}>
                <div className={`text-primary mb-4 flex justify-center ${isRTL() ? 'md:justify-end' : 'md:justify-start'}`}>{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('landing.howItWorks.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('landing.howItWorks.subtitle')}</p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Step 1 - Mobile: Text → Image, Desktop: Image → Text */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-8 items-center mb-12">
              <div className="order-1">
                <div className="text-accent font-bold mb-2">Step 1</div>
                <h3 className="text-2xl font-bold mb-4">{t('landing.howItWorks.step1.title')}</h3>
                <p className="text-muted-foreground text-lg">
                  {t('landing.howItWorks.step1.description')}
                </p>
              </div>
              <div className={`order-2 ${isRTL() ? 'md:order-1' : 'md:order-1'}`}>
                <div className="bg-muted/50 rounded-lg p-8 h-64 flex items-center justify-center">
                  <MessageSquare className="h-24 w-24 text-primary" />
                </div>
              </div>
            </div>

            {/* Step 2 - Mobile: Text → Image, Desktop: Text → Image */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-8 items-center mb-12">
              <div className="order-1">
                <div className="text-accent font-bold mb-2">Step 2</div>
                <h3 className="text-2xl font-bold mb-4">{t('landing.howItWorks.step2.title')}</h3>
                <p className="text-muted-foreground text-lg">
                  {t('landing.howItWorks.step2.description')}
                </p>
              </div>
              <div className="order-2">
                <div className="bg-muted/50 rounded-lg p-8 h-64 flex items-center justify-center">
                  <Users className="h-24 w-24 text-primary" />
                </div>
              </div>
            </div>

            {/* Step 3 - Mobile: Text → Image, Desktop: Image → Text */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-8 items-center">
              <div className="order-1">
                <div className="text-accent font-bold mb-2">Step 3</div>
                <h3 className="text-2xl font-bold mb-4">{t('landing.howItWorks.step3.title')}</h3>
                <p className="text-muted-foreground text-lg">
                  {t('landing.howItWorks.step3.description')}
                </p>
              </div>
              <div className={`order-2 ${isRTL() ? 'md:order-1' : 'md:order-1'}`}>
                <div className="bg-muted/50 rounded-lg p-8 h-64 flex items-center justify-center">
                  <Shield className="h-24 w-24 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('landing.cta.title')}</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-200">
            {t('landing.cta.subtitle')}
          </p>
          <Link to="/auth?redirect=intake">
            <Button size="lg" className="bg-accent hover:bg-accent-hover text-lg px-8 py-3">
              {t('landing.cta.button')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* LegalPro section centered on top */}
            <div className="text-center mb-8">
              <div className={`flex items-center justify-center space-x-2 mb-4 ${isRTL() ? 'space-x-reverse' : ''}`}>
                <Scale className="h-6 w-6 text-primary" />
                <span className="font-bold">LegalPro</span>
              </div>
              <p className="text-muted-foreground">
                {t('landing.footer.description')}
              </p>
            </div>
            
            {/* Other 3 sections in a row */}
            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-6 max-w-sm">
                <div>
                  <h3 className="font-semibold mb-4 text-sm">{t('landing.footer.services.title')}</h3>
                  <ul className="space-y-2 text-muted-foreground text-xs">
                    <li>{t('landing.footer.services.familyLaw')}</li>
                    <li>{t('landing.footer.services.immigration')}</li>
                    <li>{t('landing.footer.services.realEstate')}</li>
                    <li>{t('landing.footer.services.corporateLaw')}</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 text-sm">{t('landing.footer.support.title')}</h3>
                  <ul className="space-y-2 text-muted-foreground text-xs">
                    <li>
                      <Link to="/help" className="hover:text-primary transition-colors">
                        {t('landing.footer.support.helpCenter')}
                      </Link>
                    </li>
                    <li>
                      <Link to="/help" className="hover:text-primary transition-colors">
                        {t('landing.footer.support.contactUs')}
                      </Link>
                    </li>
                    <li>
                      <Link to="/privacy-policy" className="hover:text-primary transition-colors">
                        {t('landing.footer.support.privacyPolicy')}
                      </Link>
                    </li>
                    <li>
                      <Link to="/terms-of-service" className="hover:text-primary transition-colors">
                        {t('landing.footer.support.termsOfService')}
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 text-sm">{t('landing.footer.languages.title')}</h3>
                  <ul className="space-y-2 text-muted-foreground text-xs">
                    <li>{t('landing.footer.languages.english')}</li>
                    <li>{t('landing.footer.languages.arabic')}</li>
                    <li>{t('landing.footer.languages.german')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden md:grid md:grid-cols-4 gap-8">
            <div>
              <div className={`flex items-center space-x-2 mb-4 ${isRTL() ? 'space-x-reverse' : ''}`}>
                <Scale className="h-6 w-6 text-primary" />
                <span className="font-bold">LegalPro</span>
              </div>
              <p className="text-muted-foreground">
                {t('landing.footer.description')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('landing.footer.services.title')}</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>{t('landing.footer.services.familyLaw')}</li>
                <li>{t('landing.footer.services.immigration')}</li>
                <li>{t('landing.footer.services.realEstate')}</li>
                <li>{t('landing.footer.services.corporateLaw')}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('landing.footer.support.title')}</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link to="/help" className="hover:text-primary transition-colors">
                    {t('landing.footer.support.helpCenter')}
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="hover:text-primary transition-colors">
                    {t('landing.footer.support.contactUs')}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-primary transition-colors">
                    {t('landing.footer.support.privacyPolicy')}
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className="hover:text-primary transition-colors">
                    {t('landing.footer.support.termsOfService')}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('landing.footer.languages.title')}</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>{t('landing.footer.languages.english')}</li>
                <li>{t('landing.footer.languages.arabic')}</li>
                <li>{t('landing.footer.languages.german')}</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-muted-foreground">
            <p>{t('landing.footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Promotional Popup */}
      <PromotionalPopup
        isOpen={showPromoPopup}
        onClose={handleClosePromo}
        onSignUp={handleSignUpFromPromo}
      />
    </div>
  );
};

export default Landing;