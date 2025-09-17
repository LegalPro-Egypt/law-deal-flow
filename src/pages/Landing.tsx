import { useEffect, useLayoutEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scale, Shield, MessageSquare, Users, Clock, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PublicLegalChat } from "@/components/PublicLegalChat";
import { RotatingWords } from "@/components/RotatingWords";

const Landing = () => {
  const { isAuthenticated, role, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useLayoutEffect(() => {
    // Scroll to top before initial paint
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    // Check if user explicitly wants to view homepage (bypass auto-redirect)
    const forceHomepage = searchParams.get('force') === 'true';
    
    if (!loading && isAuthenticated && !forceHomepage) {
      // Navigate to role-based dashboard if role is available, otherwise default to client
      const targetRole = role || 'client';
      navigate(`/${targetRole}`, { replace: true });
    }
  }, [isAuthenticated, role, loading, navigate, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalPro</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/auth?force=true">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth?force=true">
                <Button className="bg-gradient-primary shadow-hero">Get Started</Button>
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
              Connect with Vetted Lawyers{" "}
              <RotatingWords 
                words={["Quickly", "Securely", "Confidently", "Seamlessly"]}
                className="text-accent"
              />
            </h1>
            <p className="text-xl sm:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto">
              AI-powered intake, secure messaging, and transparent pricing. 
              Get legal help the modern way with full payment protection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?force=true&redirect=intake">
                <Button size="lg" className="bg-accent hover:bg-accent-hover text-lg px-8 py-3">
                  Start Your Case
                </Button>
              </Link>
              <Link to="/legal-database">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-3">
                  Browse Legal Guides
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Public Legal Q&A Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Free Legal Q&A</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Get instant answers about Egyptian law from our AI legal assistant. 
              No signup required — ask your legal questions right now.
            </p>
          </div>
          
          <PublicLegalChat className="animate-slide-up" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose LegalPro?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamlined legal services with built-in protection and transparency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageSquare className="h-8 w-8" />,
                title: "Lexa AI Intake",
                description: "Lexa, our AI assistant, collects your case details and matches you with the right specialist"
              },
              {
                icon: <Shield className="h-8 w-8" />,
                title: "Payment Protection", 
                description: "Secure escrow system with 50% holdback until case delivery and satisfaction"
              },
              {
                icon: <Users className="h-8 w-8" />,
                title: "Vetted Lawyers",
                description: "All lawyers are verified professionals with specialization ratings and reviews"
              },
              {
                icon: <Clock className="h-8 w-8" />,
                title: "Fast Matching",
                description: "Get matched with available lawyers within hours, not days or weeks"
              },
              {
                icon: <MessageSquare className="h-8 w-8" />,
                title: "Secure Messaging",
                description: "End-to-end encrypted communication with file sharing and voice notes"
              },
              {
                icon: <Check className="h-8 w-8" />,
                title: "Case Tracking",
                description: "Real-time updates on your case progress with milestone notifications"
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 card-hover bg-gradient-card animate-slide-up">
                <div className="text-primary mb-4">{feature.icon}</div>
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Simple, transparent process from intake to resolution</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
              <div className="order-2 md:order-1">
                <div className="bg-muted/50 rounded-lg p-8 h-64 flex items-center justify-center">
                  <MessageSquare className="h-24 w-24 text-primary" />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="text-accent font-bold mb-2">Step 1</div>
                <h3 className="text-2xl font-bold mb-4">Lexa AI Intake</h3>
                <p className="text-muted-foreground text-lg">
                  Chat with Lexa, our AI legal assistant, to describe your needs. Upload documents, 
                  answer guided questions, and get your case categorized automatically.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
              <div>
                <div className="text-accent font-bold mb-2">Step 2</div>
                <h3 className="text-2xl font-bold mb-4">Expert Matching</h3>
                <p className="text-muted-foreground text-lg">
                  Our admin team reviews your case and matches you with a specialist lawyer 
                  based on expertise, language, and availability.
                </p>
              </div>
              <div>
                <div className="bg-muted/50 rounded-lg p-8 h-64 flex items-center justify-center">
                  <Users className="h-24 w-24 text-primary" />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <div className="bg-muted/50 rounded-lg p-8 h-64 flex items-center justify-center">
                  <Shield className="h-24 w-24 text-primary" />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="text-accent font-bold mb-2">Step 3</div>
                <h3 className="text-2xl font-bold mb-4">Secure Work & Payment</h3>
                <p className="text-muted-foreground text-lg">
                  Review proposal, pay consultation fee, then communicate securely. 
                  Full payment is held in escrow until case completion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-200">
            Join thousands of clients who have found legal help through our platform
          </p>
          <Link to="/auth?redirect=intake">
            <Button size="lg" className="bg-accent hover:bg-accent-hover text-lg px-8 py-3">
              Start Your Legal Journey
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-2 mb-4">
                <Scale className="h-6 w-6 text-primary" />
                <span className="font-bold">LegalPro</span>
              </div>
              <p className="text-muted-foreground max-w-md mx-auto sm:mx-0">
                Professional legal services with Lexa AI-powered matching and secure payment protection.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 sm:gap-8">
              <div className="text-center sm:text-left">
                <h3 className="font-semibold mb-3">Services</h3>
                <ul className="space-y-1 text-muted-foreground text-sm">
                  <li>Family Law</li>
                  <li>Immigration</li>
                  <li>Real Estate</li>
                  <li>Corporate Law</li>
                </ul>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold mb-3">Support</h3>
                <ul className="space-y-1 text-muted-foreground text-sm">
                  <li>Help Center</li>
                  <li>Contact Us</li>
                  <li>Privacy Policy</li>
                  <li>Terms of Service</li>
                </ul>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold mb-3">Languages</h3>
                <ul className="space-y-1 text-muted-foreground text-sm">
                  <li>English</li>
                  <li>العربية</li>
                  <li>Deutsch</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-muted-foreground">
            <p>&copy; 2024 LegalPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;