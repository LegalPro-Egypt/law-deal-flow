import jsPDF from 'jspdf';
import { downloadPDF } from './pdfDownload';

interface ContractPdfData {
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  lawyerName: string;
  content: string;
  language: 'en' | 'ar';
  paymentStructure?: {
    consultationFee?: number;
    remainingFee?: number;
    totalFee?: number;
  };
  createdAt: string;
}

export const generateContractPdf = (data: ContractPdfData): jsPDF => {
  const doc = new jsPDF();
  const isRTL = data.language === 'ar';
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  
  let yPosition = margin;

  // Helper function to add text with proper pagination
  const paginateText = (text: string, size: number, isBold: boolean = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const lineHeight = size * 0.55;
    const lines = doc.splitTextToSize(text, maxWidth);
    
    for (const line of lines) {
      // Check if current line fits on page
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      if (isRTL) {
        doc.text(line, pageWidth - margin, yPosition, { align: 'right' });
      } else {
        doc.text(line, margin, yPosition);
      }
      
      yPosition += lineHeight;
    }
    
    yPosition += 5;
  };

  // Header
  paginateText(isRTL ? 'عقد قانوني' : 'LEGAL CONTRACT', 20, true);
  yPosition += 5;

  // Case Information
  paginateText(isRTL ? `رقم القضية: ${data.caseNumber}` : `Case Number: ${data.caseNumber}`, 12, true);
  paginateText(isRTL ? `عنوان القضية: ${data.caseTitle}` : `Case Title: ${data.caseTitle}`, 12, true);
  paginateText(isRTL ? `العميل: ${data.clientName}` : `Client: ${data.clientName}`, 12, true);
  paginateText(isRTL ? `المحامي: ${data.lawyerName}` : `Lawyer: ${data.lawyerName}`, 12, true);
  paginateText(isRTL ? `التاريخ: ${data.createdAt}` : `Date: ${data.createdAt}`, 12, true);
  yPosition += 10;

  // Payment Structure (if available)
  if (data.paymentStructure) {
    paginateText(isRTL ? 'هيكل الدفع:' : 'Payment Structure:', 14, true);
    if (data.paymentStructure.consultationFee) {
      paginateText(
        isRTL 
          ? `رسوم الاستشارة: ${data.paymentStructure.consultationFee} جنيه` 
          : `Consultation Fee: EGP ${data.paymentStructure.consultationFee}`,
        11
      );
    }
    if (data.paymentStructure.remainingFee) {
      paginateText(
        isRTL 
          ? `الرسوم المتبقية: ${data.paymentStructure.remainingFee} جنيه` 
          : `Remaining Fee: EGP ${data.paymentStructure.remainingFee}`,
        11
      );
    }
    if (data.paymentStructure.totalFee) {
      paginateText(
        isRTL 
          ? `إجمالي الرسوم: ${data.paymentStructure.totalFee} جنيه` 
          : `Total Fee: EGP ${data.paymentStructure.totalFee}`,
        11,
        true
      );
    }
    yPosition += 10;
  }

  // Draw separator line
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Contract Content
  paginateText(isRTL ? 'شروط وأحكام العقد:' : 'Contract Terms and Conditions:', 14, true);
  paginateText(data.content, 11);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    isRTL 
      ? `تم إنشاؤه في ${new Date().toLocaleDateString('ar-EG')}`
      : `Generated on ${new Date().toLocaleDateString('en-US')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  return doc;
};

export const downloadContractPdf = (data: ContractPdfData, filename?: string) => {
  const doc = generateContractPdf(data);
  const fileName = filename || `contract-${data.caseNumber}-${Date.now()}.pdf`;
  downloadPDF(doc, fileName);
};