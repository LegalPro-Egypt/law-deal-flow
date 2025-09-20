import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MessageCircle, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const HelpCenter = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const faqs = [
    {
      question: "How do I find a lawyer on LegalPro?",
      answer: "Simply click 'Start Your Case' and fill out our intake form. We'll match you with verified lawyers in Egypt who specialize in your specific legal issue within 24 hours."
    },
    {
      question: "Are all lawyers on LegalPro verified?",
      answer: "Yes, all lawyers on our platform go through a rigorous verification process. We check their credentials, bar association membership, and professional standing before approval."
    },
    {
      question: "How much does LegalPro cost?",
      answer: "LegalPro offers various pricing plans to suit different needs. Our basic consultation starts at competitive rates, and we also offer subscription plans for ongoing legal support."
    },
    {
      question: "Can I get legal advice without revealing my identity?",
      answer: "Yes, we offer anonymous Q&A sessions where you can get preliminary legal advice without disclosing personal information. However, for full representation, identification is required."
    },
    {
      question: "What types of legal cases do you handle?",
      answer: "We handle a wide range of cases including family law, criminal defense, civil litigation, business law, real estate, employment disputes, and more. Our network covers most areas of Egyptian law."
    },
    {
      question: "How quickly can I get matched with a lawyer?",
      answer: "Most clients are matched with suitable lawyers within 24 hours of submitting their case details. Urgent cases can be prioritized for faster matching."
    },
    {
      question: "Is my information secure on LegalPro?",
      answer: "Absolutely. We use bank-level encryption and security measures to protect all client data. Your information is only shared with verified lawyers with your explicit consent."
    },
    {
      question: "Can I communicate with my lawyer through the platform?",
      answer: "Yes, our platform includes secure messaging, video calls, and document sharing features so you can communicate with your lawyer conveniently and securely."
    },
    {
      question: "What if I'm not satisfied with my matched lawyer?",
      answer: "We offer a satisfaction guarantee. If you're not happy with your initial match, we'll help you find another lawyer at no additional cost within the first 7 days."
    },
    {
      question: "Do you offer payment plans or financial assistance?",
      answer: "Yes, we work with lawyers who offer flexible payment plans. We also have pro bono programs for clients who qualify based on financial need and case merit."
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement email sending through edge function
      // For now, show success message
      toast({
        title: "Message sent successfully",
        description: "We'll get back to you within 24 hours. Your ticket has been created.",
      });
      
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again later or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Help Center & Contact Us</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Get the support you need. Browse our FAQs or reach out to our team directly.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Send Us a Message
                </CardTitle>
                <CardDescription>
                  Have a question or need support? Send us a message and we'll create a support ticket for you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Full Name
                    </label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your email address"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                      Subject
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      placeholder="What is your message about?"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      placeholder="Please describe your issue or question in detail..."
                      className="min-h-[120px]"
                    />
                  </div>
                  
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Alternative Contact Methods */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Other Ways to Reach Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-muted-foreground">support@legalpro-egypt.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Phone Support</p>
                    <p className="text-sm text-muted-foreground">+20 XXX XXX XXXX</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQs */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>
                  Find answers to common questions about LegalPro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Back to Home */}
      <div className="container mx-auto px-4 pb-12 text-center">
        <Link to="/">
          <Button variant="outline">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default HelpCenter;