import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

interface LanguageToggleButtonProps {
  currentLanguage: 'en' | 'ar';
  onLanguageChange: (lang: 'en' | 'ar') => void;
  contentEn: string | null | undefined;
  contentAr: string | null | undefined;
}

export function LanguageToggleButton({
  currentLanguage,
  onLanguageChange,
  contentEn,
  contentAr
}: LanguageToggleButtonProps) {
  const hasEnglish = !!contentEn;
  const hasArabic = !!contentAr;

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
      <Button
        variant={currentLanguage === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onLanguageChange('en')}
        disabled={!hasEnglish}
        className="h-8"
      >
        <Languages className="w-4 h-4 mr-1" />
        EN
      </Button>
      <Button
        variant={currentLanguage === 'ar' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onLanguageChange('ar')}
        disabled={!hasArabic}
        className="h-8"
      >
        <Languages className="w-4 h-4 mr-1" />
        AR
      </Button>
    </div>
  );
}