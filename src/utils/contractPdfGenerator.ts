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

  // Helper function to add text
  const addText = (text: string, size: number, isBold: boolean = false) => {
    doc.setFontSize(size);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(text, maxWidth);
    
    // Check if we need a new page
    if (yPosition + (lines.length * size * 0.5) > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    
    if (isRTL) {
      lines.reverse().forEach((line: string) => {
        doc.text(line, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += size * 0.5;
      });
    } else {
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * size * 0.5;
    }
    
    yPosition += 5;
  };

  // Header
  addText(isRTL ? 'عقد قانوني' : 'LEGAL CONTRACT', 20, true);
  yPosition += 5;

  // Case Information
  addText(isRTL ? `رقم القضية: ${data.caseNumber}` : `Case Number: ${data.caseNumber}`, 12, true);
  addText(isRTL ? `عنوان القضية: ${data.caseTitle}` : `Case Title: ${data.caseTitle}`, 12, true);
  addText(isRTL ? `العميل: ${data.clientName}` : `Client: ${data.clientName}`, 12, true);
  addText(isRTL ? `المحامي: ${data.lawyerName}` : `Lawyer: ${data.lawyerName}`, 12, true);
  addText(isRTL ? `التاريخ: ${data.createdAt}` : `Date: ${data.createdAt}`, 12, true);
  yPosition += 10;

  // Payment Structure (if available)
  if (data.paymentStructure) {
    addText(isRTL ? 'هيكل الدفع:' : 'Payment Structure:', 14, true);
    if (data.paymentStructure.consultationFee) {
      addText(
        isRTL 
          ? `رسوم الاستشارة: ${data.paymentStructure.consultationFee} جنيه` 
          : `Consultation Fee: EGP ${data.paymentStructure.consultationFee}`,
        11
      );
    }
    if (data.paymentStructure.remainingFee) {
      addText(
        isRTL 
          ? `الرسوم المتبقية: ${data.paymentStructure.remainingFee} جنيه` 
          : `Remaining Fee: EGP ${data.paymentStructure.remainingFee}`,
        11
      );
    }
    if (data.paymentStructure.totalFee) {
      addText(
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
  addText(isRTL ? 'شروط وأحكام العقد:' : 'Contract Terms and Conditions:', 14, true);
  addText(data.content, 11);
  yPosition += 10;

  // Signature Section
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  addText(isRTL ? 'التوقيعات' : 'SIGNATURES', 14, true);
  yPosition += 5;

  const signatureY = yPosition;
  const signatureWidth = 60;
  const signatureSpacing = (pageWidth - 2 * margin - 2 * signatureWidth) / 3;

  // Client Signature
  const clientX = margin + signatureSpacing;
  doc.line(clientX, signatureY + 20, clientX + signatureWidth, signatureY + 20);
  doc.setFontSize(10);
  doc.text(
    isRTL ? 'توقيع العميل' : 'Client Signature',
    clientX + signatureWidth / 2,
    signatureY + 25,
    { align: 'center' }
  );

  // Lawyer Signature
  const lawyerX = clientX + signatureWidth + signatureSpacing;
  doc.line(lawyerX, signatureY + 20, lawyerX + signatureWidth, signatureY + 20);
  doc.text(
    isRTL ? 'توقيع المحامي' : 'Lawyer Signature',
    lawyerX + signatureWidth / 2,
    signatureY + 25,
    { align: 'center' }
  );

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