import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Scale, Users, Target, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export const ProBonoSection = () => {
  const { t, isRTL } = useLanguage();

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/3 to-accent/3 opacity-50"></div>
      <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-tl from-accent/10 to-transparent rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Mission Badge */}
          <div className="text-center mb-12">
            <Badge 
              variant="secondary" 
              className="bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-primary/30 px-6 py-2 text-sm font-semibold mb-6 inline-flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {t('proBono.badge')}
            </Badge>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content Side */}
            <div className={`space-y-8 text-center lg:text-left ${isRTL() ? 'lg:order-2 lg:text-right' : 'lg:order-1'}`}>
              {/* Main Message */}
              <div className="space-y-6">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                    {t('proBono.title')}
                  </span>
                </h2>
                
                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  {t('proBono.subtitle')}
                </p>
                
                <div className="relative">
                  <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-primary to-accent rounded-full"></div>
                  <blockquote className="text-lg text-muted-foreground/90 italic pl-6 border-l-0">
                    "{t('proBono.description')}"
                  </blockquote>
                </div>
              </div>

              {/* Impact Goals */}
              <div className="grid grid-cols-2 gap-6 py-8">
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-primary mb-2">1,000+</div>
                  <div className="text-sm text-muted-foreground">{t('proBono.stats.goal')}</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-accent mb-2">2025</div>
                  <div className="text-sm text-muted-foreground">{t('proBono.stats.year')}</div>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-4">
                <Link to="/auth?redirect=pro-bono" className="inline-block">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-10 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      {t('proBono.button')}
                    </span>
                    <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Visual Side */}
            <div className={`${isRTL() ? 'lg:order-1' : 'lg:order-2'} flex justify-center`}>
              <div className="relative">
                {/* Main Visual Container */}
                <div className="relative z-10">
                  {/* Central Icon Circle */}
                  <div className="w-48 h-48 bg-gradient-to-br from-primary via-primary to-accent rounded-full flex items-center justify-center shadow-2xl relative group">
                    <div className="w-40 h-40 bg-gradient-to-br from-white/20 to-white/5 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <div className="relative">
                        <Heart className="h-16 w-16 text-white drop-shadow-lg" fill="currentColor" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <Scale className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Floating Elements */}
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center animate-bounce">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    
                    <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center animate-bounce delay-300">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  
                  {/* Animated Rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse"></div>
                  <div className="absolute -inset-4 rounded-full border border-accent/20 animate-ping"></div>
                  <div className="absolute -inset-8 rounded-full border border-primary/10 animate-pulse delay-1000"></div>
                </div>

                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl scale-150"></div>
              </div>
            </div>
          </div>

          {/* Bottom Stats/Features Row */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 text-center bg-gradient-to-br from-white/50 to-white/20 backdrop-blur-sm border-white/20 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('proBono.features.socialImpact.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('proBono.features.socialImpact.description')}</p>
            </Card>

            <Card className="p-6 text-center bg-gradient-to-br from-white/50 to-white/20 backdrop-blur-sm border-white/20 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent/80 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('proBono.features.equalJustice.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('proBono.features.equalJustice.description')}</p>
            </Card>

            <Card className="p-6 text-center bg-gradient-to-br from-white/50 to-white/20 backdrop-blur-sm border-white/20 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-success to-success/80 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('proBono.features.communityImpact.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('proBono.features.communityImpact.description')}</p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};