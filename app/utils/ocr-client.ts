// Client-side wrapper for OCR functionality to prevent SSR issues

interface OCRResult {
  text: string;
  confidence: number;
}

// Lazy load OCR functions only on client side
export async function processFileForOCRClient(blob: Blob, mimeType: string): Promise<OCRResult> {
  if (typeof window === 'undefined') {
    return { text: '', confidence: 0 };
  }

  try {
    // Dynamic import to avoid SSR issues
    const { processFileForOCR } = await import('./ocr');
    return await processFileForOCR(blob, mimeType);
  } catch (error) {
    console.error('Error loading OCR module:', error);
    return { text: '', confidence: 0 };
  }
}

export function shouldProcessFileForOCRClient(mimeType: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

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
