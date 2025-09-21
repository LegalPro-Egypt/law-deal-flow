import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Scale, 
  Search, 
  Home, 
  Users, 
  Briefcase, 
  Building, 
  Car, 
  FileText,
  Globe,
  BookOpen,
  ArrowRight
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
}

const LegalDatabase = () => {
  const [articles, setArticles] = useState<LegalArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const categories = [
    {
      id: "immigration",
      name: "Immigration & Residence",
      description: "Visa applications, residence permits, work permits, citizenship procedures for foreigners in Egypt",
      icon: <Globe className="h-8 w-8" />,
      color: "bg-blue-50 border-blue-200 text-blue-800",
      keywords: ["visa", "residence permit", "work permit", "immigration"]
    },
    {
      id: "real_estate",
      name: "Real Estate for Foreigners", 
      description: "Property purchase laws, ownership restrictions, rental agreements, inheritance rules for non-Egyptians",
      icon: <Home className="h-8 w-8" />,
      color: "bg-green-50 border-green-200 text-green-800",
      keywords: ["property", "real estate", "ownership", "rental"]
    },
    {
      id: "employment",
      name: "Employment Law",
      description: "Work contracts, labor rights, social insurance, termination procedures for foreign employees", 
      icon: <Briefcase className="h-8 w-8" />,
      color: "bg-purple-50 border-purple-200 text-purple-800",
      keywords: ["employment", "work contract", "labor", "social insurance"]
    },
    {
      id: "business",
      name: "Business Formation",
      description: "Company setup, foreign investment laws, licensing procedures, tax obligations for businesses",
      icon: <Building className="h-8 w-8" />,
      color: "bg-orange-50 border-orange-200 text-orange-800", 
      keywords: ["business", "company", "investment", "licensing"]
    },
    {
      id: "family",
      name: "Family Law for Expats",
      description: "Mixed marriages, divorce procedures, child custody across borders, inheritance for foreign nationals",
      icon: <Users className="h-8 w-8" />,
      color: "bg-pink-50 border-pink-200 text-pink-800",
      keywords: ["marriage", "divorce", "family", "custody"]
    },
    {
      id: "legal_procedures",
      name: "Legal Procedures",
      description: "Court systems, legal representation, document authentication, embassy services, notarization",
      icon: <FileText className="h-8 w-8" />,
      color: "bg-indigo-50 border-indigo-200 text-indigo-800",
      keywords: ["court", "legal procedures", "authentication", "embassy"]
    }
  ];

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, searchQuery]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('legal_knowledge')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (selectedCategory) {
        const cat = categories.find(c => c.id === selectedCategory);
        const matchers = [
          selectedCategory,
          ...(cat ? [cat.name, ...(cat.keywords || [])] : []),
        ];
        const orFilters = [
          `category.eq.${selectedCategory}`,
          ...matchers.map((m) => `category.ilike.%${m}%`),
          ...matchers.map((m) => `subcategory.ilike.%${m}%`),
          ...matchers.map((m) => `keywords.cs.{${m}}`),
        ].join(',');
        query = query.or(orFilters);
      }

      if (searchQuery) {
        const q = searchQuery.trim();
        query = query.or(
          [
            `title.ilike.%${q}%`,
            `content.ilike.%${q}%`,
            `category.ilike.%${q}%`,
            `subcategory.ilike.%${q}%`,
            `keywords.cs.{${q}}`,
          ].join(',')
        );
      }

      const { data, error } = await query.limit(20);
      
      if (error) {
        console.error('Error fetching articles:', error);
        return;
      }

      setArticles(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const featuredArticles = articles.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2 ltr">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalPro</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/intake">
                <Button className="bg-gradient-primary shadow-hero">Get Legal Help</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Egyptian Legal Guide
              <span className="block text-accent mt-2">for Foreigners</span>
            </h1>
            <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
              Comprehensive legal information and guidance for expatriates, immigrants, 
              and foreign investors navigating Egyptian law.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search legal topics, procedures, or laws..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-3 text-lg bg-white/10 border-white/20 text-white placeholder:text-gray-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Legal Topics by Category</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore legal information tailored for foreign nationals living, working, or investing in Egypt
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {categories.map((category) => (
              <Card 
                key={category.id}
                className={`p-6 card-hover cursor-pointer transition-all ${
                  selectedCategory === category.id ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${category.color}`}>
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
                    <p className="text-muted-foreground mb-4">{category.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.keywords.slice(0, 3).map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {selectedCategory && (
            <div className="mb-8">
              <Button 
                variant="outline" 
                onClick={() => setSelectedCategory(null)}
                className="mb-4"
              >
                Clear Filter
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Featured Articles or Search Results */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {searchQuery || selectedCategory ? 'Search Results' : 'Featured Articles'}
            </h2>
            <p className="text-xl text-muted-foreground">
              {searchQuery || selectedCategory 
                ? `${articles.length} articles found`
                : 'Essential legal information for foreigners in Egypt'
              }
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading articles...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No guides found</h3>
              <p className="text-muted-foreground">
                {selectedCategory
                  ? "Guides for this category are coming soon. Try another category or clear the filter."
                  : "Try adjusting your search or browse categories above"}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <Card key={article.id} className="p-6 card-hover bg-gradient-card">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant="secondary" className="text-xs">
                      {article.category.replace('_', ' ')}
                    </Badge>
                    {article.language !== 'en' && (
                      <Badge variant="outline" className="text-xs">
                        {article.language.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 line-clamp-2">
                    {article.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {article.content.substring(0, 150)}...
                  </p>

                  {article.law_reference && (
                    <div className="mb-4">
                      <Badge variant="outline" className="text-xs font-mono">
                        {article.law_reference}
                        {article.article_number && ` - Art. ${article.article_number}`}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {article.tags?.slice(0, 2).map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <Link to={`/legal-database/article/${article.id}`}>
                      <Button variant="ghost" size="sm" className="group">
                        Read More 
                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-primary text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Need Personalized Legal Help?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-200">
            Get matched with Egyptian lawyers who specialize in helping foreign nationals
          </p>
          <Link to="/intake">
            <Button size="lg" className="bg-accent hover:bg-accent-hover text-lg px-8 py-3">
              Start Your Legal Case
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LegalDatabase;