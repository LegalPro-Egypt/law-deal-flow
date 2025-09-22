import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Scale, Lock, Eye, EyeOff } from 'lucide-react';

interface SitePasswordProtectionProps {
  onSuccess: () => void;
}

const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || 'legaldev2024';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const SitePasswordProtection = ({ onSuccess }: SitePasswordProtectionProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);

  // Load stored attempts and lockout state
  useEffect(() => {
    const storedAttempts = localStorage.getItem('sitePasswordAttempts');
    const storedLockoutEnd = localStorage.getItem('sitePasswordLockoutEnd');
    
    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts, 10));
    }
    
    if (storedLockoutEnd) {
      const lockoutEnd = parseInt(storedLockoutEnd, 10);
      if (Date.now() < lockoutEnd) {
        setIsLockedOut(true);
        setLockoutEndTime(lockoutEnd);
      } else {
        // Lockout has expired
        localStorage.removeItem('sitePasswordLockoutEnd');
        localStorage.removeItem('sitePasswordAttempts');
        setAttempts(0);
      }
    }
  }, []);

  // Update remaining time countdown
  useEffect(() => {
    if (!isLockedOut || !lockoutEndTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, lockoutEndTime - Date.now());
      setRemainingTime(remaining);
      
      if (remaining === 0) {
        setIsLockedOut(false);
        setLockoutEndTime(null);
        setAttempts(0);
        localStorage.removeItem('sitePasswordLockoutEnd');
        localStorage.removeItem('sitePasswordAttempts');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLockedOut, lockoutEndTime]);

  const hashPassword = async (input: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLockedOut || isLoading || !password.trim()) return;

    setIsLoading(true);

    try {
      // Simple password verification (in production, use hashed comparison)
      if (password.trim() === SITE_PASSWORD) {
        // Success - store session and reset attempts
        const sessionExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        localStorage.setItem('sitePasswordSession', sessionExpiry.toString());
        localStorage.removeItem('sitePasswordAttempts');
        localStorage.removeItem('sitePasswordLockoutEnd');
        
        toast({
          title: t('accessGranted'),
          description: t('accessGrantedDescription'),
          variant: 'default'
        });
        
        onSuccess();
      } else {
        // Failed attempt
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem('sitePasswordAttempts', newAttempts.toString());
        
        if (newAttempts >= MAX_ATTEMPTS) {
          // Lock out user
          const lockoutEnd = Date.now() + LOCKOUT_DURATION;
          setIsLockedOut(true);
          setLockoutEndTime(lockoutEnd);
          localStorage.setItem('sitePasswordLockoutEnd', lockoutEnd.toString());
          
          toast({
            title: t('accountLocked'),
            description: t('accountLockedDescription'),
            variant: 'destructive'
          });
        } else {
          toast({
            title: t('incorrectPassword'),
            description: t('incorrectPasswordDescription', { 
              remaining: MAX_ATTEMPTS - newAttempts 
            }),
            variant: 'destructive'
          });
        }
        
        setPassword('');
      }
    } catch (error) {
      console.error('Password verification error:', error);
      toast({
        title: t('verificationError'),
        description: t('verificationErrorDescription'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Logo and Branding */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mx-auto">
            <Scale className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">LegalPro</h1>
            <p className="text-sm text-muted-foreground">{t('legalServicesplatform')}</p>
          </div>
        </div>

        {/* Password Form */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">
              {isLockedOut ? t('accountLocked') : t('secureAccess')}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isLockedOut ? (
              <Alert>
                <AlertDescription className="text-center">
                  {t('accountLockedMessage')} <br />
                  <strong>{formatTime(remainingTime)}</strong>
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    {t('enterPassword')}
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('passwordPlaceholder')}
                      disabled={isLoading}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {attempts > 0 && !isLockedOut && (
                  <Alert>
                    <AlertDescription>
                      {t('attemptsWarning', { 
                        attempts: attempts,
                        remaining: MAX_ATTEMPTS - attempts 
                      })}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !password.trim()}
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>{t('verifying')}</span>
                    </div>
                  ) : (
                    t('accessPlatform')
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>{t('securityNotice')}</p>
          <p>{t('developmentAccess')}</p>
        </div>
      </div>
    </div>
  );
};