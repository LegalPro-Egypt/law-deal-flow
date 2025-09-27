import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from 'dompurify';

const TermsOfService = () => {
  const [content, setContent] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTermsContent = async () => {
      try {
        const { data, error } = await supabase
          .from('form_policies')
          .select('content, updated_at')
          .eq('type', 'client_policies')
          .eq('title', 'Terms of Service')
          .eq('status', 'published')
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          setContent(data.content);
          setLastUpdated(new Date(data.updated_at).toLocaleDateString());
        }
      } catch (err) {
        console.error('Error fetching terms content:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTermsContent();
  }, []);

  // Fallback static content if database content is not available
  const staticContent = `
    <div class="prose prose-gray max-w-none">
      <p class="text-lg">
        Welcome to <strong>EgyptLegalPro</strong>. These Terms of Service ("Terms") govern your use of our platform, services, and website. By registering for an account or using EgyptLegalPro, you agree to these Terms in full. If you do not agree, you must not use our platform.
      </p>
      
      <h2>1. Company Information</h2>
      <p>
        EgyptLegalPro is operated by <strong>LegalPro</strong>, registered in <strong>Cairo, Egypt</strong>.
      </p>
      <p>For inquiries, contact us at: <strong>support@egyptlegalpro.com</strong></p>
      
      <h2>2. Platform Role & Disclaimer</h2>
      <ul>
        <li>EgyptLegalPro is <strong>not a law firm</strong> and does not provide legal advice or representation.</li>
        <li>EgyptLegalPro acts solely as a <strong>facilitator</strong>, connecting clients with independent licensed lawyers.</li>
        <li>All lawyers on the platform are independent professionals solely responsible for their conduct and services.</li>
        <li>Case outcomes are never guaranteed by EgyptLegalPro.</li>
      </ul>
      
      <p><em>For complete terms, please contact our support team.</em></p>
    </div>
  `;

  const displayContent = content || staticContent;
  const sanitizedContent = DOMPurify.sanitize(displayContent);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <Scale className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Terms of Service – LegalPro</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Please read these terms carefully before using LegalPro services.
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
            <p className="text-muted-foreground">Loading terms...</p>
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

export default TermsOfService;