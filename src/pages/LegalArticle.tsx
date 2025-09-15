import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Scale, 
  ArrowLeft, 
  Calendar, 
  BookOpen, 
  ExternalLink,
  FileText,
  Users,
  Clock,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LegalArticle {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  content: string;
  language: string;
  tags: string[];
  law_reference: string;
  article_number: string;
  keywords: string[];
  created_at: string;
  updated_at: string;
}

const LegalArticle = () => {
  const { id } = useParams();
  const [article, setArticle] = useState<LegalArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<LegalArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      // Fetch main article
      const { data: articleData, error: articleError } = await supabase
        .from('legal_knowledge')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (articleError) {
        console.error('Error fetching article:', articleError);
        return;
      }

      setArticle(articleData);

      // Fetch related articles
      if (articleData) {
        const { data: relatedData } = await supabase
          .from('legal_knowledge')
          .select('*')
          .eq('category', articleData.category)
          .eq('is_active', true)
          .neq('id', id)
          .limit(3);

        setRelatedArticles(relatedData || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Article Not Found</h2>
          <p className="text-muted-foreground mb-6">The legal article you're looking for doesn't exist.</p>
          <Link to="/legal-database">
            <Button>Back to Legal Database</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalPro</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/legal-database">
                <Button variant="ghost">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Database
                </Button>
              </Link>
              <Link to="/intake">
                <Button className="bg-gradient-primary shadow-hero">Get Legal Help</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-8">
            <Link to="/legal-database" className="hover:text-primary">Legal Database</Link>
            <span>/</span>
            <span className="capitalize">{article.category.replace('_', ' ')}</span>
            <span>/</span>
            <span className="text-foreground">{article.title}</span>
          </nav>

          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="text-sm">
                  {article.category.replace('_', ' ')}
                </Badge>
                {article.subcategory && (
                  <Badge variant="outline" className="text-sm">
                    {article.subcategory}
                  </Badge>
                )}
                {article.language !== 'en' && (
                  <Badge variant="outline" className="text-sm">
                    {article.language.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-4">{article.title}</h1>

            {/* Article Meta */}
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground mb-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Published {formatDate(article.created_at)}</span>
              </div>
              {article.updated_at !== article.created_at && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Updated {formatDate(article.updated_at)}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>{Math.ceil(article.content.length / 1000)} min read</span>
              </div>
            </div>

            {/* Legal Reference */}
            {article.law_reference && (
              <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-1">Legal Reference</h3>
                    <p className="text-blue-700 font-mono text-sm">
                      {article.law_reference}
                      {article.article_number && ` - Article ${article.article_number}`}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {article.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator className="mb-8" />

          {/* Article Content */}
          <div className="prose prose-lg max-w-none mb-12">
            <div className="whitespace-pre-line text-foreground leading-relaxed">
              {article.content}
            </div>
          </div>

          <Separator className="mb-8" />

          {/* CTA Section */}
          <Card className="p-6 bg-gradient-card text-center mb-12">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Need Personalized Legal Assistance?</h3>
            <p className="text-muted-foreground mb-4">
              Get connected with Egyptian lawyers who specialize in helping foreign nationals navigate these legal procedures.
            </p>
            <Link to="/intake">
              <Button size="lg" className="bg-primary hover:bg-primary-hover">
                Start Your Legal Case
              </Button>
            </Link>
          </Card>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedArticles.map((relatedArticle) => (
                  <Card key={relatedArticle.id} className="p-4 card-hover">
                    <div className="mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {relatedArticle.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-2 line-clamp-2">
                      {relatedArticle.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                      {relatedArticle.content.substring(0, 100)}...
                    </p>
                    <Link to={`/legal-database/article/${relatedArticle.id}`}>
                      <Button variant="ghost" size="sm" className="group">
                        Read More 
                        <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalArticle;