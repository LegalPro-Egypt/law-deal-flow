import React from 'react';
import { AgendaPicker } from './calendar/AgendaPicker';

interface CaseCalendarProps {
  caseId: string;
  isLawyer: boolean;
  clientId?: string;
  lawyerId?: string;
}

export const CaseCalendar: React.FC<CaseCalendarProps> = ({ 
  caseId, 
  isLawyer, 
  clientId,
  lawyerId 
}) => {
  return (
    <AgendaPicker
      caseId={caseId}
      isLawyer={isLawyer}
      clientId={clientId}
      lawyerId={lawyerId}
    />
  );
};