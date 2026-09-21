import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Ensure Promise.withResolvers polyfill for pdfjs-dist compatibility
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Configure PDF.js worker to use the local asset bundled by Vite
if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

// Ensure available on window for legacy checks
if (typeof window !== 'undefined') {
  (window as any).JSZip = JSZip;
  (window as any).pdfjsLib = pdfjsLib;
}

export { JSZip, pdfjsLib };

export async function getPdfjsLib(): Promise<any> {
  return pdfjsLib;
}

