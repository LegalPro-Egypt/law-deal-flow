import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  redirectTo = '/auth' 
}: ProtectedRouteProps) => {
  const { isAuthenticated, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate(redirectTo);
        return;
      }

      if (requiredRole && role && role !== requiredRole) {
        // Only redirect if we have a known role that doesn't match
        navigate(`/${role}`);
        return;
      }
    }
  }, [isAuthenticated, role, loading, requiredRole, navigate, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading if authenticated but role hasn't loaded yet
  if (isAuthenticated && requiredRole && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or if role is required but doesn't match
  if (!isAuthenticated || (requiredRole && role && role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
};