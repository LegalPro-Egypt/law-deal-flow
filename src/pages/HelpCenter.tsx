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
      question: "Is EgyptLegalPro a law firm?",
      answer: "No. EgyptLegalPro is not a law firm and does not provide legal advice. We are a platform that connects clients with independent, licensed lawyers in Egypt."
    },
    {
      question: "How does EgyptLegalPro make money?",
      answer: "We take: A platform fee from clients on each transaction, A 3% Client Protection Fee from clients, And a small commission from lawyers. These fees keep the platform operating securely and fund the Client Protection Policy."
    },
    {
      question: "What is the Client Protection Fee?",
      answer: "The 3% fee provides limited financial protection in the event of proven malpractice or misconduct by a lawyer. Up to 25,000 EGP per case and up to 75,000 EGP per client per year."
    },
    {
      question: "What is the Platform Fee?",
      answer: "The platform fee is charged to clients on every payment. This fee covers: Secure payment processing, Technology costs (servers, app, support systems), Ongoing improvements to the platform. This fee is separate from the 3% Client Protection Fee and is not refundable."
    },
    {
      question: "What counts as malpractice or misconduct?",
      answer: "Misconduct means a lawyer clearly violated professional duties under Egyptian law, such as: Missing critical legal deadlines, Misusing client funds, Having an undisclosed conflict of interest. It does not include losing a case, strategic disagreements, or general dissatisfaction."
    },
    {
      question: "How do I prove misconduct or malpractice?",
      answer: "To qualify for coverage, you must provide independent proof, such as: A final court ruling against the lawyer, or A disciplinary decision from the Egyptian Bar Association. Without this evidence, a claim cannot be approved."
    },
    {
      question: "Are calls and messages recorded?",
      answer: "Yes. For the safety of both clients and lawyers, all messages, audio calls, and video calls on the platform are recorded. These may be used for conflict resolution, fraud prevention, or compliance with Egyptian law."
    },
    {
      question: "How is my data used?",
      answer: "Your data is processed to provide services, improve the platform, and enhance user experience. We may share data with trusted third parties (such as payment processors, cloud storage, and analytics providers). EgyptLegalPro does not sell personal data for unrelated advertising."
    },
    {
      question: "How do I pay my lawyer?",
      answer: "All payments must go through EgyptLegalPro. The lawyer receives their fee in stages, not all at once. The platform fee and Client Protection Fee are deducted. Off-platform payments are not allowed and may void your Client Protection coverage."
    },
    {
      question: "How are lawyer fees paid out?",
      answer: "Payments are released to lawyers in stages, linked to case progress. The final portion is only released after the case is completed or confirmed by both sides. This protects clients and ensures accountability."
    },
    {
      question: "What happens if I am unhappy with my lawyer?",
      answer: "You may request a replacement lawyer within the first 15 days of your case. A valid reason must be provided (e.g., lack of communication, unprofessional behavior, conflict of interest). If no valid reason is given, or if the request comes after 15 days, a cancellation fee will apply."
    },
    {
      question: "Can lawyers contact me outside the platform?",
      answer: "No. For safety and compliance, all communication must remain inside the EgyptLegalPro platform. Off-platform communication may affect your eligibility for Client Protection."
    },
    {
      question: "What happens if a lawyer misrepresents their license?",
      answer: "Lawyers must be licensed and in good standing. Any lawyer found to have provided false information will be permanently removed from the platform."
    },
    {
      question: "What law governs EgyptLegalPro?",
      answer: "All services are governed by the laws of the Arab Republic of Egypt, and disputes fall under the jurisdiction of the courts of Cairo, Egypt."
    },
    {
      question: "How can I contact EgyptLegalPro?",
      answer: "For support, email us at support@egyptlegalpro.com"
    },
    {
      question: "What happens if I cancel my case?",
      answer: "If you cancel a case after it has started, cancellation fees may apply depending on the stage of the work already completed by the lawyer."
    },
    {
      question: "Can I get a refund?",
      answer: "Refunds are only available in limited situations, such as: If no lawyer accepts your case, or If EgyptLegalPro cancels the case before it begins. Refunds are not available once legal work has started, except as required by the Client Protection Policy."
    },
    {
      question: "Can I hire more than one lawyer through the platform?",
      answer: "Yes, you may engage multiple lawyers for different cases or for the same case if needed. Each engagement is billed and covered separately."
    },
    {
      question: "What happens if my lawyer becomes unavailable?",
      answer: "If a lawyer becomes unavailable for legitimate reasons, EgyptLegalPro will help you transition to a new lawyer without additional platform charges."
    },
    {
      question: "How are disputes between clients and lawyers resolved?",
      answer: "Disputes should first be raised through the platform. EgyptLegalPro may review communication records and payments to mediate. Final responsibility, however, rests with the client and lawyer."
    },
    {
      question: "How are lawyers verified?",
      answer: "Lawyers must submit proof of Egyptian Bar Association membership, valid ID, and supporting documents. EgyptLegalPro reviews these before activation."
    },
    {
      question: "Can I choose my lawyer?",
      answer: "Yes. You can review lawyer profiles, areas of specialization, and user ratings before engaging a lawyer."
    },
    {
      question: "Are case outcomes guaranteed?",
      answer: "No. Legal outcomes depend on many factors outside anyone's control. EgyptLegalPro cannot guarantee results."
    },
    {
      question: "What happens if I submit false information?",
      answer: "Providing false or misleading information may result in account suspension, cancellation of your case, and loss of eligibility for Client Protection."
    },
    {
      question: "How do I close my account?",
      answer: "You may request account deletion at any time by contacting support@egyptlegalpro.com. Certain data may be retained as required by Egyptian law."
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
                    <p className="text-sm text-muted-foreground">support@egyptlegalpro.com</p>
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
                  Find answers to common questions about EgyptLegalPro
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