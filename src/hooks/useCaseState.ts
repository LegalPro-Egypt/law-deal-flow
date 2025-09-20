// Global case state management hook
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CaseState {
  caseId: string | null;
  caseNumber: string | null;
  conversationId: string | null;
  idempotencyKey: string | null;
  setCaseData: (caseId: string, caseNumber: string, idempotencyKey?: string) => void;
  setConversationId: (conversationId: string) => void;
  setIdempotencyKey: (key: string) => void;
  clearCase: () => void;
}

export const useCaseState = create<CaseState>()(
  persist(
    (set) => ({
      caseId: null,
      caseNumber: null,
      conversationId: null,
      idempotencyKey: null,
      setCaseData: (caseId: string, caseNumber: string, idempotencyKey?: string) => 
        set({ caseId, caseNumber, idempotencyKey: idempotencyKey || null }),
      setConversationId: (conversationId: string) => 
        set({ conversationId }),
      setIdempotencyKey: (key: string) => 
        set({ idempotencyKey: key }),
      clearCase: () => 
        set({ caseId: null, caseNumber: null, conversationId: null, idempotencyKey: null }),
    }),
    {
      name: 'case-state',
    }
  )
);