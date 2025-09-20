import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Scale, AlertTriangle, Users } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <Scale className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Please read these terms carefully before using LegalPro services.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Agreement to Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                By accessing and using LegalPro ("the Platform," "our service"), you accept and agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our platform.
              </p>
              <p>
                These terms constitute a legally binding agreement between you and LegalPro Egypt regarding your use of our legal services platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Description of Service
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>LegalPro is a legal services platform that:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Connects clients with verified lawyers in Egypt</li>
                <li>Facilitates legal consultations and case management</li>
                <li>Provides secure communication tools</li>
                <li>Offers document sharing and case tracking</li>
                <li>Processes payments for legal services</li>
              </ul>
              <p className="font-semibold mt-4">
                LegalPro is a platform service only. We do not provide legal advice directly and are not a law firm.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Accounts and Registration</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>You must provide accurate and complete information during registration</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must be at least 18 years old to use our services</li>
                <li>One person may not maintain multiple accounts</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lawyer Verification and Services</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Lawyer Verification</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>All lawyers undergo credential verification</li>
                  <li>We verify bar association membership and professional standing</li>
                  <li>Verification does not guarantee specific outcomes or service quality</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Legal Services</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Legal services are provided directly by independent lawyers</li>
                  <li>LegalPro does not supervise or control lawyer-client relationships</li>
                  <li>Payment terms are established between you and your lawyer</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Responsibilities and Conduct</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Provide truthful and accurate information</li>
                <li>Use the platform for lawful purposes only</li>
                <li>Respect intellectual property rights</li>
                <li>Maintain confidentiality of sensitive information</li>
                <li>Pay all fees and charges promptly</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
              <p className="mt-4 font-semibold">You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Use the platform for illegal activities</li>
                <li>Harass, abuse, or threaten other users</li>
                <li>Share false or misleading information</li>
                <li>Attempt to gain unauthorized access to the platform</li>
                <li>Upload viruses or malicious software</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments and Fees</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>Platform fees are clearly disclosed before payment</li>
                <li>Legal fees are set by individual lawyers</li>
                <li>All payments are processed securely through our payment system</li>
                <li>Refunds are subject to our refund policy and lawyer agreement</li>
                <li>You are responsible for all applicable taxes</li>
                <li>Failed payments may result in service suspension</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Disclaimers and Limitations
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none space-y-4">
              <div>
                <h4 className="font-semibold mb-2">No Legal Advice</h4>
                <p>
                  LegalPro does not provide legal advice. All legal advice comes from independent lawyers. 
                  We make no representations about the quality or outcome of legal services.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Platform Availability</h4>
                <p>
                  We strive for 99.9% uptime but cannot guarantee uninterrupted service. 
                  We are not liable for service interruptions or technical issues.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Third-Party Services</h4>
                <p>
                  Our platform may integrate with third-party services. We are not responsible for 
                  third-party service availability or performance.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>LegalPro owns all platform content, design, and technology</li>
                <li>You retain ownership of content you submit to the platform</li>
                <li>You grant us license to use your content to provide our services</li>
                <li>You may not copy, modify, or distribute our platform content</li>
                <li>Lawyer profiles and content belong to respective lawyers</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy and Data Protection</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. 
                By using our platform, you consent to our data practices as described in our Privacy Policy.
              </p>
              <div className="mt-4">
                <Link to="/privacy-policy" className="text-primary hover:underline">
                  Read our Privacy Policy
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>You may terminate your account at any time</li>
                <li>We may suspend or terminate accounts for terms violations</li>
                <li>Termination does not affect existing lawyer-client relationships</li>
                <li>Outstanding payments remain due after termination</li>
                <li>Some provisions of these terms survive termination</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p className="font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, LEGALPRO SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Indirect, incidental, or consequential damages</li>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Actions or omissions of lawyers using our platform</li>
                <li>Outcomes of legal cases or disputes</li>
                <li>Third-party content or services</li>
              </ul>
              <p className="mt-4">
                Our total liability shall not exceed the amount you paid to us in the 12 months prior to the claim.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Governing Law and Disputes</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>These terms are governed by Egyptian law</li>
                <li>Disputes shall be resolved in Egyptian courts</li>
                <li>We encourage resolution through mediation first</li>
                <li>You waive the right to class action lawsuits</li>
                <li>Some disputes may be subject to arbitration</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                We may modify these terms at any time. Material changes will be communicated through email or platform notifications. 
                Continued use of our platform after changes constitutes acceptance of new terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>For questions about these Terms of Service, contact us:</p>
              <div className="mt-4 space-y-2">
                <p><strong>Email:</strong> legal@legalpro-egypt.com</p>
                <p><strong>Address:</strong> LegalPro Egypt, Cairo, Egypt</p>
                <p><strong>Phone:</strong> +20 XXX XXX XXXX</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link to="/">
            <Button variant="outline">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;