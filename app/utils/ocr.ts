import * as Tesseract from 'tesseract.js';

interface OCRResult {
  text: string;
  confidence: number;
}

export async function extractTextFromImage(imageBlob: Blob): Promise<OCRResult> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('OCR is only available in browser environment');
    return {
      text: '',
      confidence: 0
    };
  }

  try {
    // Use the simpler recognize API from Tesseract.js v6
    const { data: { text, confidence } } = await Tesseract.recognize(imageBlob, 'eng');
    return {
      text: text.trim(),
      confidence: confidence
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      text: '',
      confidence: 0
    };
  }
}

export async function extractTextFromPDF(pdfBlob: Blob): Promise<OCRResult> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('PDF OCR is only available in browser environment');
    return {
      text: '',
      confidence: 0
    };
  }

  console.log('🔍 Starting PDF OCR processing...', {
    blobSize: pdfBlob.size,
    blobType: pdfBlob.type
  });

  try {
    // Dynamic import of PDF.js to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set up PDF.js worker - use CDN with correct .mjs extension
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs`;
    
    // Convert blob to array buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.log('📄 PDF loaded successfully:', {
      numPages: pdf.numPages,
      maxPagesToProcess: Math.min(pdf.numPages, 10)
    });
    
    let combinedText = '';
    let totalConfidence = 0;
    let processedPages = 0;
    
    // Process up to 10 pages to avoid excessive processing time
    const maxPages = Math.min(pdf.numPages, 10);
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        
        // Set up canvas for rendering
        const scale = 2.0; // Higher scale for better OCR accuracy
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (!context) {
          console.warn(`Could not get canvas context for page ${pageNum}`);
          continue;
        }
        
        // Render page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;
        
        // Convert canvas to blob
        const canvasBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob!);
          }, 'image/png');
        });
        
        // Run OCR on the canvas image
        const pageOCR = await extractTextFromImage(canvasBlob);
        
        console.log(`📝 Page ${pageNum} OCR result:`, {
          textLength: pageOCR.text.length,
          confidence: pageOCR.confidence,
          preview: pageOCR.text.substring(0, 100)
        });
        
        if (pageOCR.text.trim()) {
          combinedText += `\\n--- Page ${pageNum} ---\\n${pageOCR.text}\\n`;
          totalConfidence += pageOCR.confidence;
          processedPages++;
        }
        
        // Clean up canvas
        canvas.remove();
        
      } catch (pageError) {
        console.warn(`Error processing PDF page ${pageNum}:`, pageError);
        continue;
      }
    }
    
    const averageConfidence = processedPages > 0 ? totalConfidence / processedPages : 0;
    
    console.log('✅ PDF OCR processing completed:', {
      processedPages,
      totalTextLength: combinedText.length,
      averageConfidence: averageConfidence.toFixed(2)
    });
    
    return {
      text: combinedText.trim(),
      confidence: averageConfidence
    };
    
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return {
      text: '',
      confidence: 0
    };
  }
}

export function shouldProcessFileForOCR(mimeType: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/bmp',
    'image/tiff',
    'image/webp',
    'application/pdf'
  ];
  
  return supportedTypes.includes(mimeType.toLowerCase());
}

export async function processFileForOCR(blob: Blob, mimeType: string): Promise<OCRResult> {
  if (!shouldProcessFileForOCR(mimeType)) {
    return {
      text: '',
      confidence: 0
    };
  }

  if (mimeType.startsWith('image/')) {
    return await extractTextFromImage(blob);
  }
  
  if (mimeType === 'application/pdf') {
    return await extractTextFromPDF(blob);
  }

  return {
    text: '',
    confidence: 0
  };
}
