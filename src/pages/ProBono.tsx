import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Scale, Heart, AlertTriangle, FileText, Users, DollarSign, Clock, Shield, CheckCircle } from "lucide-react";

const proBonoSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  monthlyIncome: z.string().min(1, "Monthly income is required"),
  familySize: z.string().min(1, "Family size is required"),
  hasAssets: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  caseTitle: z.string().min(5, "Case title must be at least 5 characters"),
  caseDescription: z.string().min(50, "Case description must be at least 50 characters"),
  caseCategory: z.string().min(1, "Please select a case category"),
  urgency: z.enum(["low", "medium", "high", "urgent"], { required_error: "Please select urgency level" }),
  previousLegalHelp: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  whyNeedHelp: z.string().min(20, "Please explain why you need pro bono help"),
});

type ProBonoFormData = z.infer<typeof proBonoSchema>;

const ProBono = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const form = useForm<ProBonoFormData>({
    resolver: zodResolver(proBonoSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      monthlyIncome: "",
      familySize: "",
      hasAssets: undefined,
      caseTitle: "",
      caseDescription: "",
      caseCategory: "",
      urgency: undefined,
      previousLegalHelp: undefined,
      whyNeedHelp: "",
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  const onSubmit = async (data: ProBonoFormData) => {
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const applicationData = {
        user_id: user?.id || null,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        financial_info: {
          monthlyIncome: data.monthlyIncome,
          familySize: data.familySize,
          hasAssets: data.hasAssets,
        },
        case_details: {
          title: data.caseTitle,
          description: data.caseDescription,
          category: data.caseCategory,
          urgency: data.urgency,
          previousLegalHelp: data.previousLegalHelp,
          whyNeedHelp: data.whyNeedHelp,
        },
        status: 'pending',
      };

      const { error } = await supabase
        .from('pro_bono_applications')
        .insert(applicationData);

      if (error) throw error;

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-probono-confirmation', {
          body: {
            email: data.email,
            fullName: data.fullName,
            caseTitle: data.caseTitle,
          }
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the application if email fails
      }

      toast({
        title: t('proBono.application.success'),
        description: t('proBono.application.successDesc'),
      });

      // Reset form
      form.reset();
      
      // Redirect after success
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting pro bono application:', error);
      toast({
        title: t('common.error'),
        description: t('proBono.application.error'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            >
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalPro</span>
            </div>
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              {t('proBono.badge')}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-success to-primary rounded-full flex items-center justify-center shadow-hero">
                <Heart className="h-10 w-10 text-white" fill="currentColor" />
                <Scale className="h-6 w-6 text-white absolute -bottom-1 -right-1 bg-primary rounded-full p-1" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-success/20 animate-pulse"></div>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">
            {t('proBono.page.title')}
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            {t('proBono.page.subtitle')}
          </p>
        </div>

        {/* What is Pro Bono Section */}
        <Card className="mb-8 bg-gradient-card shadow-elevated border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              {t('proBono.page.whatIs.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              {t('proBono.page.whatIs.description')}
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-success/5 border border-success/20">
                <Users className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <h4 className="font-semibold text-success mb-1">{t('proBono.page.benefits.access.title')}</h4>
                  <p className="text-sm text-muted-foreground">{t('proBono.page.benefits.access.desc')}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-primary mb-1">{t('proBono.page.benefits.free.title')}</h4>
                  <p className="text-sm text-muted-foreground">{t('proBono.page.benefits.free.desc')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acceptance Criteria */}
        <Card className="mb-8 bg-gradient-card shadow-elevated border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success" />
              {t('proBono.page.criteria.title')}
            </CardTitle>
            <CardDescription>
              {t('proBono.page.criteria.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-success">{t('proBono.page.criteria.financial.title')}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success mt-2"></div>
                    {t('proBono.page.criteria.financial.income')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success mt-2"></div>
                    {t('proBono.page.criteria.financial.assets')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success mt-2"></div>
                    {t('proBono.page.criteria.financial.support')}
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-primary">{t('proBono.page.criteria.case.title')}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                    {t('proBono.page.criteria.case.merit')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                    {t('proBono.page.criteria.case.scope')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                    {t('proBono.page.criteria.case.urgency')}
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <h4 className="font-semibold text-warning mb-1">{t('proBono.page.disclaimer.title')}</h4>
                  <p className="text-sm text-muted-foreground">{t('proBono.page.disclaimer.text')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Form */}
        <Card className="bg-gradient-card shadow-elevated border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              {t('proBono.page.form.title')}
            </CardTitle>
            <CardDescription>
              {t('proBono.page.form.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">{t('proBono.page.form.personal.title')}</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.personal.fullName')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('proBono.page.form.personal.fullNamePlaceholder')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.personal.email')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder={t('proBono.page.form.personal.emailPlaceholder')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.personal.phone')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('proBono.page.form.personal.phonePlaceholder')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Financial Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-success">{t('proBono.page.form.financial.title')}</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="monthlyIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.financial.monthlyIncome')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('proBono.page.form.financial.monthlyIncomePlaceholder')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="familySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.financial.familySize')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" placeholder="4" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="hasAssets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.financial.hasAssets')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('proBono.page.form.financial.hasAssetsPlaceholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="yes">{t('common.yes')}</SelectItem>
                              <SelectItem value="no">{t('common.no')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Case Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-accent">{t('proBono.page.form.case.title')}</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="caseTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.case.caseTitle')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('proBono.page.form.case.caseTitlePlaceholder')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="caseCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('proBono.page.form.case.category')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('proBono.page.form.case.categoryPlaceholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="family">{t('proBono.page.form.case.categories.family')}</SelectItem>
                                <SelectItem value="criminal">{t('proBono.page.form.case.categories.criminal')}</SelectItem>
                                <SelectItem value="civil">{t('proBono.page.form.case.categories.civil')}</SelectItem>
                                <SelectItem value="labor">{t('proBono.page.form.case.categories.labor')}</SelectItem>
                                <SelectItem value="housing">{t('proBono.page.form.case.categories.housing')}</SelectItem>
                                <SelectItem value="immigration">{t('proBono.page.form.case.categories.immigration')}</SelectItem>
                                <SelectItem value="other">{t('proBono.page.form.case.categories.other')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="urgency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('proBono.page.form.case.urgency')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('proBono.page.form.case.urgencyPlaceholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">{t('dashboard.cases.urgency.low')}</SelectItem>
                                <SelectItem value="medium">{t('dashboard.cases.urgency.medium')}</SelectItem>
                                <SelectItem value="high">{t('dashboard.cases.urgency.high')}</SelectItem>
                                <SelectItem value="urgent">{t('dashboard.cases.urgency.urgent')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="caseDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.case.description')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder={t('proBono.page.form.case.descriptionPlaceholder')}
                              className="min-h-32"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="previousLegalHelp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.case.previousHelp')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('proBono.page.form.case.previousHelpPlaceholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="yes">{t('common.yes')}</SelectItem>
                              <SelectItem value="no">{t('common.no')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="whyNeedHelp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('proBono.page.form.case.whyNeedHelp')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder={t('proBono.page.form.case.whyNeedHelpPlaceholder')}
                              className="min-h-24"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-primary hover:bg-primary/90"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        {t('proBono.page.form.submitting')}
                      </>
                    ) : (
                      t('proBono.page.form.submit')
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProBono;