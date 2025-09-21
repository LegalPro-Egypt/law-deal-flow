import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export const ProBonoSection = () => {
  const { t, isRTL } = useLanguage();

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 sm:p-12 bg-gradient-card shadow-elevated border-0 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-success/10 to-primary/10 rounded-full blur-2xl translate-y-12 -translate-x-12"></div>
            
            {/* Vision Badge */}
            <div className={`flex justify-center ${isRTL() ? 'lg:justify-end' : 'lg:justify-start'} mb-6`}>
              <Badge 
                variant="secondary" 
                className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm font-medium"
              >
                {t('proBono.badge')}
              </Badge>
            </div>

            <div className={`grid lg:grid-cols-2 gap-8 items-center ${isRTL() ? 'lg:grid-cols-[1fr,auto]' : ''}`}>
              {/* Content */}
              <div className={`text-center ${isRTL() ? 'lg:order-2 lg:text-right' : 'lg:order-1 lg:text-left'}`}>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
                  {t('proBono.title')}
                </h2>
                
                <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                  {t('proBono.subtitle')}
                </p>
                
                <p className="text-base text-muted-foreground/80 mb-8 leading-relaxed">
                  {t('proBono.description')}
                </p>

                <div className={`flex justify-center ${isRTL() ? 'lg:justify-end' : 'lg:justify-start'}`}>
                  <Link to="/auth?redirect=pro-bono" className="inline-block">
                    <Button 
                      size="lg" 
                      className="bg-gradient-primary hover:bg-primary/90 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      {t('proBono.button')}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Icon Section */}
              <div className={`${isRTL() ? 'lg:order-1' : 'lg:order-2'} flex justify-center`}>
                <div className="relative">
                  {/* Main Icon Container */}
                  <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-hero relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary/90 to-accent/90 rounded-full flex items-center justify-center">
                      <div className="relative">
                        <Heart className="h-12 w-12 text-white" fill="currentColor" />
                        <Scale className="h-6 w-6 text-white absolute -bottom-1 -right-1 bg-primary rounded-full p-1" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Animated Rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse"></div>
                  <div className="absolute -inset-4 rounded-full border border-accent/10 animate-ping"></div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};