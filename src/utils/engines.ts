import JSZip from 'jszip';

// Ensure JSZip is available on window for legacy checks
if (typeof window !== 'undefined') {
  (window as any).JSZip = JSZip;
}

export { JSZip };

let pdfjsPromise: Promise<any> | null = null;

export async function getPdfjsLib(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // 1. Try importing from local node_modules
      try {
        const lib = await import('pdfjs-dist');
        const pdf = (lib as any).default || lib;
        if (pdf && pdf.getDocument) {
          if (pdf.GlobalWorkerOptions && !pdf.GlobalWorkerOptions.workerSrc) {
            pdf.GlobalWorkerOptions.workerSrc =
              'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
          }
          (window as any).pdfjsLib = pdf;
          return pdf;
        }
      } catch (err) {
        console.warn('Failed to load local pdfjs-dist, falling back to CDN script', err);
      }

      // 2. Fallback to CDN script loading
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
        script.onload = () => {
          if ((window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
          }
          resolve();
        };
        script.onerror = () => reject(new Error('PDF 引擎未加载'));
        document.head.appendChild(script);
      });

      return (window as any).pdfjsLib;
    })();
  }

  return pdfjsPromise;
}
