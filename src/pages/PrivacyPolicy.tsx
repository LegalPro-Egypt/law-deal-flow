import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Privacy Policy – EgyptLegalPro</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Your privacy is important to us. Learn how EgyptLegalPro collects, uses, and protects your information.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-muted-foreground">
            Last updated: September 24, 2025
          </p>
        </div>

        <div className="prose prose-gray max-w-none mb-8">
          <p className="text-lg">
            At <strong>EgyptLegalPro</strong>, we value your privacy. This Privacy Policy explains how we collect, use, store, and share your personal data when you use our platform. By using EgyptLegalPro, you agree to the practices described below.
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                1. Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                EgyptLegalPro is operated by <strong>LegalPro</strong>, registered in <strong>Cairo, Egypt</strong>.
              </p>
              <p>For privacy-related inquiries, contact us at: <strong>support@egyptlegalpro.com</strong></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                2. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We may collect the following types of information:</p>
              <ol className="list-decimal pl-6 space-y-2 mt-4">
                <li><strong>Account Information</strong> – name, email, phone number, address, ID documents.</li>
                <li><strong>Case Information</strong> – information you provide when submitting a legal inquiry or case.</li>
                <li><strong>Payment Information</strong> – processed through secure third-party providers (we do not store full payment details).</li>
                <li><strong>Communication Data</strong> – all messages, audio calls, and video calls conducted via our platform.</li>
                <li><strong>Technical Data</strong> – IP address, browser type, device information, cookies, and usage patterns.</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Recording of Communications</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p className="font-semibold">
                For the safety of clients and lawyers, <strong>all communications (text, audio, and video) on EgyptLegalPro may be recorded and stored securely</strong>.
              </p>
              
              <div className="mt-4">
                <p>Recordings are used strictly for:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Conflict and dispute resolution,</li>
                  <li>Fraud prevention and security,</li>
                  <li>Compliance with Egyptian legal obligations.</li>
                </ul>
              </div>

              <p className="mt-4 font-semibold">
                By using our platform, you <strong>consent to such recording and storage</strong>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                4. How We Use Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We use your data to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Provide and improve our services,</li>
                <li>Verify user identities and prevent fraud,</li>
                <li>Facilitate communication between clients and lawyers,</li>
                <li>Process payments securely,</li>
                <li>Enhance platform performance and user experience,</li>
                <li>Develop new features and AI-powered tools.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Data Sharing with Third Parties</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>EgyptLegalPro may share your data with trusted third-party service providers, including:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Cloud hosting and storage services,</li>
                <li>Payment processors,</li>
                <li>Analytics and AI service providers,</li>
                <li>Customer support and communication tools.</li>
              </ul>
              
              <p className="mt-4">
                These providers are bound by confidentiality and data protection obligations. EgyptLegalPro does <strong>not sell personal data</strong> for unrelated advertising purposes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>Communication data and account records are retained as long as necessary to provide services, comply with legal obligations, or resolve disputes.</li>
                <li>You may request deletion of your account; however, certain records may be retained as required by Egyptian law.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Security Measures</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>We use encryption, secure servers, and access controls to protect personal data.</li>
                <li>While we take all reasonable steps, no online service can guarantee absolute security.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. User Rights</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Subject to Egyptian law, you may:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Request access to your personal data,</li>
                <li>Request correction of inaccurate data,</li>
                <li>Request deletion of your account (subject to retention requirements).</li>
              </ul>
              <p className="mt-4">
                Requests should be sent to <strong>support@egyptlegalpro.com</strong>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Our platform is not intended for persons under 18. We do not knowingly collect data from minors.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Legal Compliance</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>EgyptLegalPro may disclose user data if required to do so by law, regulation, court order, or government authority in Egypt.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>If data is processed or stored outside Egypt, we ensure that appropriate protections are applied by third-party providers.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Policy Updates</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this page with a new "last updated" date. Continued use of the platform after updates constitutes acceptance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>For privacy questions or concerns, contact us at:</p>
              <div className="mt-4 space-y-2">
                <p><strong>Email:</strong> support@egyptlegalpro.com</p>
                <p><strong>Address:</strong> LegalPro, Cairo, Egypt</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-center font-semibold text-lg">
                By using EgyptLegalPro, you acknowledge that you have read, understood, and agree to this Privacy Policy.
              </p>
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

export default PrivacyPolicy;