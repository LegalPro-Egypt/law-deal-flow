import React from 'react';
import { Clock, MessageSquare, FileText, Calendar, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileTab = 'welcome' | 'milestones' | 'connect' | 'proposals' | 'calendar' | 'documents';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'milestones' as MobileTab, icon: Clock, label: 'Milestones' },
    { id: 'connect' as MobileTab, icon: MessageSquare, label: 'Connect' },
    { id: 'proposals' as MobileTab, icon: FileText, label: 'Proposals' },
    { id: 'calendar' as MobileTab, icon: Calendar, label: 'Calendar' },
    { id: 'documents' as MobileTab, icon: FolderOpen, label: 'Documents' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
      <nav className="flex justify-around items-center h-16 px-2 safe-area-padding-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 transition-colors min-w-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
              <span className="text-[10px] font-medium truncate w-full text-center">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
