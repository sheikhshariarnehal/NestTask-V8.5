/**
 * Image Optimization Utilities
 * Provides helpers for optimizing image loading and display
 */

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}

/**
 * Generate optimized image URL for Supabase storage
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): string {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 80,
    format = 'webp'
  } = options;

  // If not a Supabase storage URL, return as-is
  if (!originalUrl || !originalUrl.includes('supabase.co/storage')) {
    return originalUrl;
  }

  // For profile photos and other small images, add transformation parameters
  const url = new URL(originalUrl);
  
  // Add Supabase image transformation parameters
  url.searchParams.set('width', maxWidth.toString());
  url.searchParams.set('height', maxHeight.toString());
  url.searchParams.set('quality', quality.toString());
  url.searchParams.set('format', format);
  
  return url.toString();
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  originalUrl: string,
  sizes: number[] = [48, 96, 192, 384]
): string {
  if (!originalUrl || !originalUrl.includes('supabase.co/storage')) {
    return '';
  }

  return sizes
    .map(size => {
      const url = getOptimizedImageUrl(originalUrl, { 
        maxWidth: size, 
        maxHeight: size 
      });
      return `${url} ${size}w`;
    })
    .join(', ');
}

/**
 * Preload critical images
 */
export function preloadImage(url: string, priority: 'high' | 'low' = 'low'): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.fetchPriority = priority;
  document.head.appendChild(link);
}

/**
 * Lazy load image with IntersectionObserver
 */
export function lazyLoadImage(
  imgElement: HTMLImageElement,
  src: string,
  options: IntersectionObserverInit = {}
): () => void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    imgElement.src = src;
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        imgElement.src = src;
        observer.unobserve(imgElement);
      }
    });
  }, {
    rootMargin: '50px',
    ...options
  });

  observer.observe(imgElement);

  return () => observer.disconnect();
}

/**
 * Get cache-control headers for images
 */
export function getImageCacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
  };
}

/**
 * Optimize image file size by resizing and compressing
 */
export async function optimizeImageFile(
  file: File,
  maxSize: number = 800
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize if needed
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/webp',
          0.85
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}
