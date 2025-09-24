import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scale, Shield, MessageSquare, Users, Clock, Check, Brain, Lock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { HomepageChatbot } from "@/components/HomepageChatbot";
import { ProBonoSection } from "@/components/ProBonoSection";
import { PromotionalPopup } from "@/components/PromotionalPopup";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

const Landing = () => {
  const { isAuthenticated, role, loading } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPromoPopup, setShowPromoPopup] = useState(false);

  // Intersection observers for scroll animations
  const { elementRef: heroRef, isVisible: heroVisible } = useIntersectionObserver({ threshold: 0.2 });
  const { elementRef: featuresRef, isVisible: featuresVisible } = useIntersectionObserver({ threshold: 0.1 });
  const { elementRef: howItWorksRef, isVisible: howItWorksVisible } = useIntersectionObserver({ threshold: 0.1 });
  const { elementRef: ctaRef, isVisible: ctaVisible } = useIntersectionObserver({ threshold: 0.3 });

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
            <div className="flex items-center space-x-2 ltr">
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
      <section 
        ref={heroRef}
        className="bg-hero-enhanced text-white py-20 sm:py-32 relative overflow-hidden"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`max-w-4xl mx-auto text-center ${
            heroVisible ? 'animate-hero-fade-in' : 'opacity-0'
          }`}>
            <h1 className="heading-hero text-white mb-6">
              {t('landing.hero.title')}{" "}
              <span className="text-accent sm:block sm:mt-2">{t('landing.hero.titleAccent')}</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?force=true&redirect=intake">
                <Button size="lg" className="btn-enhanced btn-enhanced-accent btn-shimmer bg-accent hover:bg-accent-hover text-xl px-12 py-4 font-semibold">
                  {t('landing.hero.startCase')}
                </Button>
              </Link>
            </div>
            
            {/* Enhanced Premium Trust Signals */}
            <div className={`trust-signals-container ${
              heroVisible ? 'animate-slide-up stagger-2' : 'opacity-0 translate-y-10'
            }`}>
              <div className="trust-signal-card hover:scale-105 transition-transform duration-300">
                <div className="trust-signal-icon verified">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="trust-signal-content">
                  <h3>{t('landing.hero.trustSignals.verifiedLawyers.title')}</h3>
                  <p>{t('landing.hero.trustSignals.verifiedLawyers.subtitle')}</p>
                </div>
              </div>
              
              <div className="trust-signal-card hover:scale-105 transition-transform duration-300">
                <div className="trust-signal-icon ai-powered">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="trust-signal-content">
                  <h3>{t('landing.hero.trustSignals.aiIntake.title')}</h3>
                  <p>{t('landing.hero.trustSignals.aiIntake.subtitle')}</p>
                </div>
              </div>
              
              <div className="trust-signal-card hover:scale-105 transition-transform duration-300">
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
        
        {/* Modern background elements */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-gentle-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-gentle-pulse" style={{ animationDelay: '2s' }}></div>
      </section>

      {/* Anonymous Q&A Chatbot Section */}
      <HomepageChatbot />

      {/* Pro Bono Impact Section */}
      <ProBonoSection />

      {/* Features Section */}
      <section 
        ref={featuresRef}
        className="py-20 bg-muted/30 relative overflow-hidden"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 ${
            featuresVisible ? 'animate-fade-in' : 'opacity-0'
          }`}>
            <h2 className="heading-section mb-4">{t('landing.features.title')}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
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
              },
              {
                icon: <ShieldCheck className="h-8 w-8" />,
                title: "Client Protection Guarantee",
                description: "LegalPro protects clients by covering part or all of their case fees in the rare event of proven misconduct or malpractice."
              }
            ].map((feature, index) => (
              <Card 
                key={index} 
                className={`card-enhanced p-6 text-center group ${isRTL() ? 'md:text-right' : 'md:text-left'} ${
                  featuresVisible ? `animate-slide-up stagger-${index + 1}` : 'opacity-0 translate-y-10'
                }`}
              >
                <div className={`text-primary mb-4 flex justify-center group-hover:scale-110 transition-transform duration-300 ${isRTL() ? 'md:justify-end' : 'md:justify-start'}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Subtle background accent */}
        <div className="absolute top-1/2 left-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-gentle-pulse"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl animate-gentle-pulse" style={{ animationDelay: '3s' }}></div>
      </section>

      {/* How It Works */}
      <section 
        ref={howItWorksRef}
        className="py-20 relative overflow-hidden"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 ${
            howItWorksVisible ? 'animate-fade-in' : 'opacity-0'
          }`}>
            <h2 className="heading-section mb-4">{t('landing.howItWorks.title')}</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">{t('landing.howItWorks.subtitle')}</p>
          </div>

          <div>
            {/* Step 1 - Mobile: Text → Image, Desktop: Text → Image */}
            <div className={`flex flex-col md:grid md:grid-cols-2 gap-8 items-center mb-12 ${
              howItWorksVisible ? 'animate-slide-up stagger-1' : 'opacity-0 translate-y-10'
            }`}>
              <div className="order-1 text-center md:text-left">
                <div className="text-accent font-bold mb-2 text-lg">Step 1</div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">{t('landing.howItWorks.step1.title')}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {t('landing.howItWorks.step1.description')}
                </p>
              </div>
              <div className="order-2">
                <div className="card-enhanced p-6 h-36 sm:h-40 md:h-56 w-full flex items-center justify-center group">
                  <MessageSquare className="h-24 w-24 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
            </div>

            {/* Step 2 - Mobile: Text → Image, Desktop: Image → Text */}
            <div className={`flex flex-col md:grid md:grid-cols-2 gap-8 items-center mb-12 ${
              howItWorksVisible ? 'animate-slide-up stagger-2' : 'opacity-0 translate-y-10'
            }`}>
              <div className="order-1 md:order-2 text-center md:text-left">
                <div className="text-accent font-bold mb-2 text-lg">Step 2</div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">{t('landing.howItWorks.step2.title')}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {t('landing.howItWorks.step2.description')}
                </p>
              </div>
              <div className="order-2 md:order-1">
                <div className="card-enhanced p-6 h-36 sm:h-40 md:h-56 w-full flex items-center justify-center group">
                  <Users className="h-24 w-24 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
            </div>

            {/* Step 3 - Mobile: Text → Image, Desktop: Text → Image */}
            <div className={`flex flex-col md:grid md:grid-cols-2 gap-8 items-center ${
              howItWorksVisible ? 'animate-slide-up stagger-3' : 'opacity-0 translate-y-10'
            }`}>
              <div className="order-1 text-center md:text-left">
                <div className="text-accent font-bold mb-2 text-lg">Step 3</div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">{t('landing.howItWorks.step3.title')}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {t('landing.howItWorks.step3.description')}
                </p>
              </div>
              <div className="order-2">
                <div className="card-enhanced p-6 h-36 sm:h-40 md:h-56 w-full flex items-center justify-center group">
                  <Shield className="h-24 w-24 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background accent */}
        <div className="absolute top-1/4 right-0 w-36 h-36 bg-primary/5 rounded-full blur-3xl animate-gentle-pulse"></div>
      </section>

      {/* CTA Section */}
      <section 
        ref={ctaRef}
        className="bg-footer-enhanced text-white py-20 relative overflow-hidden"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className={ctaVisible ? 'animate-fade-in' : 'opacity-0'}>
            <h2 className="heading-section text-white mb-4">{t('landing.cta.title')}</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-100 leading-relaxed">
              {t('landing.cta.subtitle')}
            </p>
            <Link to="/auth?redirect=intake">
              <Button size="lg" className="btn-enhanced btn-enhanced-accent btn-shimmer bg-accent hover:bg-accent-hover text-lg px-8 py-3 font-semibold">
                {t('landing.cta.button')}
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Background elements */}
        <div className="absolute top-1/2 left-1/4 w-28 h-28 bg-accent/10 rounded-full blur-3xl animate-gentle-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-gentle-pulse" style={{ animationDelay: '1.5s' }}></div>
      </section>

      {/* Footer */}
      <footer className="bg-footer-enhanced border-t py-12 relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
            <div className="w-full">
              <div className="grid grid-cols-3 gap-4 mx-auto max-w-xs">
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