import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from 'dompurify';

const PrivacyPolicy = () => {
  const [content, setContent] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrivacyContent = async () => {
      try {
        const { data, error } = await supabase
          .from('form_policies')
          .select('content, updated_at')
          .eq('type', 'client_policies')
          .eq('title', 'Privacy Policy')
          .eq('status', 'published')
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          setContent(data.content);
          setLastUpdated(new Date(data.updated_at).toLocaleDateString());
        }
      } catch (err) {
        console.error('Error fetching privacy content:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrivacyContent();
  }, []);

  // Fallback static content if database content is not available
  const staticContent = `
    <div class="prose prose-gray max-w-none">
      <p class="text-lg">
        At <strong>EgyptLegalPro</strong>, we value your privacy. This Privacy Policy explains how we collect, use, store, and share your personal data when you use our platform. By using EgyptLegalPro, you agree to the practices described below.
      </p>
      
      <h2>1. Company Information</h2>
      <p>
        EgyptLegalPro is operated by <strong>LegalPro</strong>, registered in <strong>Cairo, Egypt</strong>.
      </p>
      <p>For privacy-related inquiries, contact us at: <strong>support@egyptlegalpro.com</strong></p>
      
      <h2>2. Information We Collect</h2>
      <p>We may collect the following types of information:</p>
      <ol>
        <li><strong>Account Information</strong> – name, email, phone number, address, ID documents.</li>
        <li><strong>Case Information</strong> – information you provide when submitting a legal inquiry or case.</li>
        <li><strong>Payment Information</strong> – processed through secure third-party providers.</li>
        <li><strong>Communication Data</strong> – all messages, audio calls, and video calls conducted via our platform.</li>
        <li><strong>Technical Data</strong> – IP address, browser type, device information, cookies, and usage patterns.</li>
      </ol>
      
      <p><em>For complete privacy policy, please contact our support team.</em></p>
    </div>
  `;

  const displayContent = content || staticContent;
  const sanitizedContent = DOMPurify.sanitize(displayContent);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Privacy Policy – LegalPro</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Your privacy is important to us. Learn how LegalPro collects, uses, and protects your information.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-muted-foreground">
            Last updated: {lastUpdated || new Date().toLocaleDateString()}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading privacy policy...</p>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div 
                className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            </CardContent>
          </Card>
        )}

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