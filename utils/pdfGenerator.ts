
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates a multi-page A4 PDF from a DOM element.
 * Forces the element to a standard document width during capture to ensure 
 * layout consistency regardless of the user's viewport size.
 */
export const generatePdfFromElement = async (
  elementId: string, 
  fileName: string = 'report.pdf',
  onProgress?: (progress: number) => void
) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  onProgress?.(10);

  // Store original styles to restore after capture
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;
  const originalBoxShadow = element.style.boxShadow;
  const originalBorderRadius = element.style.borderRadius;

  // Force a standard "Document Width" (approx 1024px for good high-res density)
  // This prevents the PDF layout from changing based on the user's monitor resolution.
  const targetWidth = 1024;
  element.style.width = `${targetWidth}px`;
  element.style.maxWidth = 'none';
  element.style.boxShadow = 'none';
  element.style.borderRadius = '0';

  try {
    // Capture the element using html2canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale for retina-quality text and charts
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: targetWidth,
      windowWidth: targetWidth,
      // Ensure we capture the full scrollable height
      height: element.scrollHeight,
      onclone: (clonedDoc) => {
        // Optional: Perform additional styling on the cloned document if needed
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
            clonedElement.style.padding = '40px'; // Standard document padding
        }
      }
    });

    onProgress?.(60);

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    
    // Create A4 PDF (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    // Calculate scaling: how much height the image takes when fitted to the full PDF width
    const imgPdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    let heightLeft = imgPdfHeight;
    let position = 0;

    // Page 1
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgPdfHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // Add subsequent pages if the content overflows A4 height
    while (heightLeft > 0) {
      position = heightLeft - imgPdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgPdfHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    onProgress?.(90);
    pdf.save(fileName);
    onProgress?.(100);
  } catch (error) {
    console.error('Critical PDF Generation Error:', error);
    throw error;
  } finally {
    // Restore original element styles
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
    element.style.boxShadow = originalBoxShadow;
    element.style.borderRadius = originalBorderRadius;
  }
};
