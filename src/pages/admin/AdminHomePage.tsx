import { useState } from "react";
import { useAdminData } from "@/hooks/useAdminData";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Scale, 
  Users, 
  FileText, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Import modal components
import { CaseListModal } from "@/components/admin/CaseListModal";
import { IntakeListModal } from "@/components/admin/IntakeListModal";
import { LawyerListModal } from "@/components/admin/LawyerListModal";
import { ClientListModal } from "@/components/admin/ClientListModal";
import { ReviewsListModal } from "@/components/admin/ReviewsListModal";

export default function AdminHomePage() {
  const { toast } = useToast();
  const { 
    stats, 
    pendingIntakes, 
    loading, 
    fetchAllCasesDetailed,
    fetchActiveCasesDetailed,
    fetchAllLawyersDetailed,
    fetchAllClientsDetailed,
    fetchPendingReviewsDetailed 
  } = useAdminData();
  
  // Modal states
  const [showAllCasesModal, setShowAllCasesModal] = useState(false);
  const [showActiveCasesModal, setShowActiveCasesModal] = useState(false);
  const [showIntakesModal, setShowIntakesModal] = useState(false);
  const [showLawyersModal, setShowLawyersModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  
  // Modal data states
  const [modalData, setModalData] = useState<{
    allCases: any[];
    activeCases: any[];
    intakes: any[];
    lawyers: any[];
    clients: any[];
    reviews: any[];
  }>({
    allCases: [],
    activeCases: [],
    intakes: [],
    lawyers: [],
    clients: [],
    reviews: []
  });
  
  const [modalLoading, setModalLoading] = useState({
    allCases: false,
    activeCases: false,
    intakes: false,
    lawyers: false,
    clients: false,
    reviews: false
  });

  // Modal handlers
  const handleCardClick = async (type: string) => {
    setModalLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      let data;
      switch (type) {
        case 'allCases':
          data = await fetchAllCasesDetailed();
          setModalData(prev => ({ ...prev, allCases: data }));
          setShowAllCasesModal(true);
          break;
        case 'activeCases':
          data = await fetchActiveCasesDetailed();
          setModalData(prev => ({ ...prev, activeCases: data }));
          setShowActiveCasesModal(true);
          break;
        case 'intakes':
          setModalData(prev => ({ ...prev, intakes: pendingIntakes }));
          setShowIntakesModal(true);
          break;
        case 'lawyers':
          data = await fetchAllLawyersDetailed();
          setModalData(prev => ({ ...prev, lawyers: data }));
          setShowLawyersModal(true);  
          break;
        case 'clients':
          data = await fetchAllClientsDetailed();
          setModalData(prev => ({ ...prev, clients: data }));
          setShowClientsModal(true);
          break;
        case 'reviews':
          data = await fetchPendingReviewsDetailed();
          setModalData(prev => ({ ...prev, reviews: data }));
          setShowReviewsModal(true);
          break;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setModalLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Monitor your legal platform's key metrics and performance
        </p>
      </div>

      {/* Stats Overview - 6 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
        <Card className="bg-gradient-card shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('allCases')}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Cases</p>
                <p className="text-xl md:text-3xl font-bold">{stats.totalCases}</p>
              </div>
              <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('activeCases')}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Active Cases</p>
                <p className="text-xl md:text-3xl font-bold">{stats.activeCases}</p>
              </div>
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('intakes')}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Pending Intakes</p>
                <p className="text-xl md:text-3xl font-bold">{stats.pendingIntakes}</p>
              </div>
              <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('lawyers')}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Lawyers</p>
                <p className="text-xl md:text-3xl font-bold">{stats.totalLawyers}</p>
              </div>
              <Users className="h-6 w-6 md:h-8 md:w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('clients')}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-xl md:text-3xl font-bold">{stats.totalClients}</p>
              </div>
              <User className="h-6 w-6 md:h-8 md:w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-primary cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('reviews')}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Pending Reviews</p>
                <p className="text-xl md:text-3xl font-bold text-primary">{stats.pendingReviews + stats.pendingVerifications}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingReviews} cases • {stats.pendingVerifications} verifications
                </p>
              </div>
              <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CaseListModal
        open={showAllCasesModal}
        onOpenChange={(open) => setShowAllCasesModal(open)}
        cases={modalData.allCases}
        isLoading={modalLoading.allCases}
        title="All Cases"
        onRefresh={async () => {
          const data = await fetchAllCasesDetailed();
          setModalData(prev => ({ ...prev, allCases: data }));
        }}
        onViewCase={(caseId) => console.log("View case:", caseId)}
      />

      <CaseListModal
        open={showActiveCasesModal}
        onOpenChange={(open) => setShowActiveCasesModal(open)}
        cases={modalData.activeCases}
        isLoading={modalLoading.activeCases}
        title="Active Cases"
        onRefresh={async () => {
          const data = await fetchActiveCasesDetailed();
          setModalData(prev => ({ ...prev, activeCases: data }));
        }}
        onViewCase={(caseId) => console.log("View case:", caseId)}
      />

      <IntakeListModal
        open={showIntakesModal}
        onOpenChange={(open) => setShowIntakesModal(open)}
        intakes={modalData.intakes}
        isLoading={modalLoading.intakes}
        onRefresh={async () => {
          setModalData(prev => ({ ...prev, intakes: pendingIntakes }));
        }}
        onViewIntake={(intakeId) => console.log("View intake:", intakeId)}
        onCreateCase={(intakeId) => console.log("Create case:", intakeId)}
      />

      <LawyerListModal
        open={showLawyersModal}
        onOpenChange={(open) => setShowLawyersModal(open)}
        lawyers={modalData.lawyers}
        isLoading={modalLoading.lawyers}
        onRefresh={async () => {
          const data = await fetchAllLawyersDetailed();
          setModalData(prev => ({ ...prev, lawyers: data }));
        }}
        onViewLawyer={(lawyerId) => console.log("View lawyer:", lawyerId)}
      />

      <ClientListModal
        open={showClientsModal}
        onOpenChange={(open) => setShowClientsModal(open)}
        clients={modalData.clients}
        isLoading={modalLoading.clients}
        onRefresh={async () => {
          const data = await fetchAllClientsDetailed();
          setModalData(prev => ({ ...prev, clients: data }));
        }}
        onViewClient={(clientId) => console.log("View client:", clientId)}
      />

      <ReviewsListModal
        open={showReviewsModal}
        onOpenChange={(open) => setShowReviewsModal(open)}
        reviews={modalData.reviews}
        isLoading={modalLoading.reviews}
        onRefresh={async () => {
          const data = await fetchPendingReviewsDetailed();
          setModalData(prev => ({ ...prev, reviews: data }));
        }}
        onViewItem={(itemId) => console.log("View review item:", itemId)}
      />
    </div>
  );
}