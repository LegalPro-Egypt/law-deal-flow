// Global case state management hook
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CaseState {
  caseId: string | null;
  caseNumber: string | null;
  conversationId: string | null;
  setCaseData: (caseId: string, caseNumber: string) => void;
  setConversationId: (conversationId: string) => void;
  clearCase: () => void;
}

export const useCaseState = create<CaseState>()(
  persist(
    (set) => ({
      caseId: null,
      caseNumber: null,
      conversationId: null,
      setCaseData: (caseId: string, caseNumber: string) => 
        set({ caseId, caseNumber }),
      setConversationId: (conversationId: string) => 
        set({ conversationId }),
      clearCase: () => 
        set({ caseId: null, caseNumber: null, conversationId: null }),
    }),
    {
      name: 'case-state',
    }
  )
);