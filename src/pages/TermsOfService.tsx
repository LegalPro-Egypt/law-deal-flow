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
          <h1 className="text-4xl font-bold mb-4">Terms of Service – EgyptLegalPro</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Please read these terms carefully before using EgyptLegalPro services.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-gray max-w-none mb-8">
          <p className="text-lg">
            Welcome to <strong>EgyptLegalPro</strong>. These Terms of Service ("Terms") govern your use of our platform, services, and website. By registering for an account or using EgyptLegalPro, you agree to these Terms in full. If you do not agree, you must not use our platform.
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
              <p>For inquiries, contact us at: <strong>support@egyptlegalpro.com</strong></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                2. Platform Role & Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>EgyptLegalPro is <strong>not a law firm</strong> and does not provide legal advice or representation.</li>
                <li>EgyptLegalPro acts solely as a <strong>facilitator</strong>, connecting clients with independent licensed lawyers.</li>
                <li>All lawyers on the platform are independent professionals solely responsible for their conduct and services.</li>
                <li>Case outcomes are never guaranteed by EgyptLegalPro.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. User Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be at least <strong>18 years old</strong> and legally able to enter into binding agreements in Egypt.</li>
                <li>By registering, you confirm the information you provide is accurate and complete.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Account Registration & Verification</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>Users must provide truthful information during registration.</li>
                <li>EgyptLegalPro reserves the right to request verification documents and to suspend or terminate accounts where false or incomplete information is provided.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Payments & Fees</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>All payments for legal services must be made <strong>through EgyptLegalPro's platform</strong>.</li>
                <li>EgyptLegalPro charges a <strong>3% Client Protection Fee</strong> on client payments.</li>
                <li>EgyptLegalPro may also deduct commissions agreed with lawyers.</li>
                <li>Off-platform payments are strictly prohibited and may result in account suspension.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Client Protection Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>The 3% Client Protection Fee provides limited financial coverage in proven cases of lawyer malpractice or misconduct.</p>
              
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Coverage limits:</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>25,000 EGP per case</strong></li>
                  <li><strong>75,000 EGP per client per calendar year</strong></li>
                </ul>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold mb-2">To qualify for compensation, clients must provide independent, verifiable proof, including:</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>A final court ruling establishing lawyer negligence or misconduct, or</li>
                  <li>An official disciplinary decision by the Egyptian Bar Association.</li>
                </ul>
              </div>

              <p className="mt-4">
                Dissatisfaction with a lawyer, differences in legal strategy, or unfavorable case outcomes <strong>do not qualify</strong>.
              </p>
              <p className="font-semibold">
                EgyptLegalPro's liability is strictly limited to the amounts stated above.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Lawyer Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>Lawyers must be duly licensed and in good standing with the Egyptian Bar Association.</li>
                <li>Lawyers are solely responsible for compliance with professional ethics and regulations.</li>
                <li>Misrepresentation of credentials will result in permanent removal from the platform.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Client Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>Clients must provide accurate case information and cooperate with their lawyer.</li>
                <li>Clients may not use the platform to harass, threaten, or bypass EgyptLegalPro's payment system.</li>
                <li>Fraudulent or exaggerated misconduct claims may result in permanent suspension.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Communication Recording & Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p className="font-semibold">
                For the safety of both clients and lawyers, <strong>all communications on the platform (messages, audio calls, video calls) may be recorded and stored</strong>.
              </p>
              
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Recordings may be used for:</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Conflict and dispute resolution,</li>
                  <li>Fraud prevention,</li>
                  <li>Compliance with Egyptian law.</li>
                </ul>
              </div>

              <p className="mt-4">
                By using the platform, you consent to such recording and storage.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Data Use & Third-Party Sharing</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>EgyptLegalPro may process communication and case data to improve the platform, enhance user experience, and develop new features.</li>
                <li>Where possible, data will be anonymized or aggregated.</li>
                <li>EgyptLegalPro may share data with trusted third-party providers (cloud hosting, payment processors, analytics, AI tools, etc.) bound by confidentiality obligations.</li>
                <li>EgyptLegalPro will never sell personal data for unrelated advertising.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Confidentiality</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>Lawyers are bound by attorney–client confidentiality obligations under Egyptian law.</li>
                <li>EgyptLegalPro provides secure communication tools but does not guarantee confidentiality outside the platform.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Prohibited Activities</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Users may not:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Attempt to bypass platform payments,</li>
                <li>Provide false information or documents,</li>
                <li>Harass, threaten, or abuse lawyers or clients,</li>
                <li>Upload illegal, offensive, or infringing content.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13. Termination of Accounts</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>EgyptLegalPro may suspend or terminate accounts at any time for violations of these Terms.</li>
                <li>Fraudulent or abusive behavior will lead to permanent bans.</li>
                <li>Outstanding obligations (including payments) remain enforceable after termination.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                14. Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>EgyptLegalPro is not responsible for the quality or outcome of legal services provided by lawyers.</li>
                <li>EgyptLegalPro's maximum liability to any client is capped by the <strong>Client Protection Policy limits</strong>.</li>
                <li>Under no circumstances will EgyptLegalPro be liable for indirect, incidental, or consequential damages.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>15. Dispute Resolution & Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>Disputes relating to the platform should first be raised through EgyptLegalPro's support system.</li>
                <li>These Terms are governed by the laws of the <strong>Arab Republic of Egypt</strong>.</li>
                <li>Exclusive jurisdiction lies with the courts of <strong>Cairo, Egypt</strong>.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>16. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>All content, branding, and technology of EgyptLegalPro remain the property of <strong>LegalPro</strong>.</li>
                <li>Users may not copy, reproduce, or exploit platform content without written permission.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>17. Modifications</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <ul className="list-disc pl-6 space-y-2">
                <li>EgyptLegalPro may update these Terms at any time.</li>
                <li>Continued use of the platform constitutes acceptance of the revised Terms.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>18. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>For questions regarding these Terms, contact us at:</p>
              <div className="mt-4 space-y-2">
                <p><strong>Email:</strong> support@egyptlegalpro.com</p>
                <p><strong>Address:</strong> LegalPro, Cairo, Egypt</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-center font-semibold text-lg">
                By using EgyptLegalPro, you acknowledge that you have read, understood, and agree to these Terms of Service.
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

export default TermsOfService;