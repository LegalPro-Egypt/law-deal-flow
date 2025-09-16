import jsPDF from 'jspdf';

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const downloadPDF = (pdf: jsPDF, filename: string): void => {
  try {
    if (isMobileDevice()) {
      // For mobile devices: create blob URL and open in new window
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Try to download first, fallback to opening in new window
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      try {
        link.click();
      } catch (error) {
        // If direct download fails, open in new window
        window.open(blobUrl, '_blank');
      }
      
      document.body.removeChild(link);
      
      // Clean up blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } else {
      // For desktop: use standard save method
      pdf.save(filename);
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    // Fallback: try opening in new window
    try {
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (fallbackError) {
      console.error('Fallback PDF download failed:', fallbackError);
      throw new Error('PDF download failed');
    }
  }
};

export const getUserFriendlyDownloadMessage = (): string => {
  if (isMobileDevice()) {
    return "PDF generated! If download doesn't start automatically, check your browser's download folder or the PDF may have opened in a new tab.";
  }
  return "Your case summary has been generated and downloaded.";
};