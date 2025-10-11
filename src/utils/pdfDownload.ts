import jsPDF from 'jspdf';

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const downloadPDF = (pdf: jsPDF, filename: string): void => {
  try {
    // Unified blob-based download for better iframe/mobile support
    const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();

    // Create blob and object URL
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Create hidden anchor element
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.target = '_blank'; // helps in environments blocking direct downloads
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);

    try {
      // Try multiple click strategies for broader browser support
      link.click();
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    } catch (clickError) {
      console.warn('Direct download click failed, opening new tab as fallback', clickError);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }

    // In sandboxed iframe or on some mobile browsers, also open a tab as fallback after a short delay
    if (isMobileDevice() || inIframe) {
      setTimeout(() => {
        try {
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
        } catch (openError) {
          console.error('Fallback open failed:', openError);
        }
      }, 150);
    }

    // Cleanup
    document.body.removeChild(link);
    setTimeout(() => {
      try { URL.revokeObjectURL(blobUrl); } catch {}
    }, 1500);
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