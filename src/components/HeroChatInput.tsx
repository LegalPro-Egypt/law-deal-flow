import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HeroChatInputProps {
  onOpenChat: () => void;
}

const HeroChatInput = ({ onOpenChat }: HeroChatInputProps) => {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <button
        onClick={onOpenChat}
        className="group w-full flex items-center gap-3 px-6 py-4 bg-background/40 backdrop-blur-md border border-primary/20 rounded-full hover:border-primary/40 hover:bg-background/60 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/10"
      >
        <MessageSquare className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
        <span className="text-base text-muted-foreground group-hover:text-foreground transition-colors flex-1 text-left">
          {t('landing.hero.chatInput.placeholder')}
        </span>
        <span className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          {t('landing.hero.chatInput.ctaText')}
        </span>
      </button>
    </div>
  );
};

export default HeroChatInput;
