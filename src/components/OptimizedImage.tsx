import { useState, useEffect, useRef } from 'react';
import { getOptimizedImageUrl, generateSrcSet } from '../utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  fallback?: string;
}

/**
 * Optimized Image Component
 * - Automatic WebP conversion for supported browsers
 * - Responsive srcset generation
 * - Lazy loading with IntersectionObserver
 * - Fallback handling
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  sizes = '(max-width: 640px) 48px, 96px',
  loading = 'lazy',
  onLoad,
  onError,
  fallback = '/icons/icon-192x192.png'
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setImgSrc(fallback);
    onError?.();
  };

  // Generate optimized URLs
  const optimizedSrc = getOptimizedImageUrl(imgSrc, {
    maxWidth: width || 200,
    maxHeight: height || 200,
    quality: 85,
    format: 'webp'
  });

  const srcSet = generateSrcSet(imgSrc);

  return (
    <img
      ref={imgRef}
      src={optimizedSrc}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      decoding="async"
      data-error={hasError}
    />
  );
}

/**
 * Avatar Image Component - Optimized for profile pictures
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 48,
  className = ''
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={`rounded-full ${className}`}
      loading="lazy"
      fallback="/icons/icon-192x192.png"
    />
  );
}
