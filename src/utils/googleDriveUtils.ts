/**
 * Utility functions for Google Drive URL validation and processing
 */

// Google Drive URL patterns
const GOOGLE_DRIVE_PATTERNS = [
  // Standard sharing link: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  /^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view(\?.*)?$/,
  // Preview link: https://drive.google.com/file/d/FILE_ID/preview
  /^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/preview(\?.*)?$/,
  // Open link: https://drive.google.com/open?id=FILE_ID
  /^https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)(&.*)?$/,
  // Direct link: https://drive.google.com/file/d/FILE_ID
  /^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)$/,
  // Folder link: https://drive.google.com/drive/folders/FOLDER_ID
  /^https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)(\?.*)?$/,
  // Document link: https://docs.google.com/document/d/DOC_ID
  /^https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)(\/.*)?$/,
  // Spreadsheet link: https://docs.google.com/spreadsheets/d/SHEET_ID
  /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(\/.*)?$/,
  // Presentation link: https://docs.google.com/presentation/d/PRES_ID
  /^https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)(\/.*)?$/,
  // Forms link: https://docs.google.com/forms/d/FORM_ID
  /^https:\/\/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)(\/.*)?$/
];

/**
 * Validates if a URL is a valid Google Drive link
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is a valid Google Drive link
 */
export function isValidGoogleDriveUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Trim whitespace and ensure it's a proper URL
  const trimmedUrl = url.trim();
  
  // Check if it matches any of the Google Drive patterns
  return GOOGLE_DRIVE_PATTERNS.some(pattern => pattern.test(trimmedUrl));
}

/**
 * Extracts the file/folder ID from a Google Drive URL
 * @param url - The Google Drive URL
 * @returns The extracted ID or null if not found
 */
export function extractGoogleDriveId(url: string): string | null {
  if (!isValidGoogleDriveUrl(url)) {
    return null;
  }

  const trimmedUrl = url.trim();
  
  for (const pattern of GOOGLE_DRIVE_PATTERNS) {
    const match = trimmedUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Normalizes a Google Drive URL to a standard format
 * @param url - The Google Drive URL to normalize
 * @returns Normalized URL or the original URL if it can't be normalized
 */
export function normalizeGoogleDriveUrl(url: string): string {
  const fileId = extractGoogleDriveId(url);
  if (!fileId) {
    return url;
  }

  // Determine the type of Google Drive resource
  if (url.includes('docs.google.com/document')) {
    return `https://docs.google.com/document/d/${fileId}/view`;
  } else if (url.includes('docs.google.com/spreadsheets')) {
    return `https://docs.google.com/spreadsheets/d/${fileId}/view`;
  } else if (url.includes('docs.google.com/presentation')) {
    return `https://docs.google.com/presentation/d/${fileId}/view`;
  } else if (url.includes('docs.google.com/forms')) {
    return `https://docs.google.com/forms/d/${fileId}/view`;
  } else if (url.includes('/folders/')) {
    return `https://drive.google.com/drive/folders/${fileId}`;
  } else {
    // Default to file view
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
}

/**
 * Gets the display name for a Google Drive resource type
 * @param url - The Google Drive URL
 * @returns Human-readable resource type
 */
export function getGoogleDriveResourceType(url: string): string {
  if (url.includes('docs.google.com/document')) {
    return 'Google Doc';
  } else if (url.includes('docs.google.com/spreadsheets')) {
    return 'Google Sheet';
  } else if (url.includes('docs.google.com/presentation')) {
    return 'Google Slides';
  } else if (url.includes('docs.google.com/forms')) {
    return 'Google Form';
  } else if (url.includes('/folders/')) {
    return 'Google Drive Folder';
  } else {
    return 'Google Drive File';
  }
}

/**
 * Validates an array of Google Drive URLs
 * @param urls - Array of URLs to validate
 * @returns Object with valid URLs and validation errors
 */
export function validateGoogleDriveUrls(urls: string[]): {
  validUrls: string[];
  invalidUrls: string[];
  errors: string[];
} {
  const validUrls: string[] = [];
  const invalidUrls: string[] = [];
  const errors: string[] = [];

  urls.forEach((url, index) => {
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      errors.push(`URL at position ${index + 1} is empty`);
      invalidUrls.push(url);
      return;
    }

    if (isValidGoogleDriveUrl(trimmedUrl)) {
      validUrls.push(normalizeGoogleDriveUrl(trimmedUrl));
    } else {
      errors.push(`URL at position ${index + 1} is not a valid Google Drive link: ${trimmedUrl}`);
      invalidUrls.push(url);
    }
  });

  return { validUrls, invalidUrls, errors };
}

/**
 * Creates a preview URL for a Google Drive file (for embedding)
 * @param url - The Google Drive URL
 * @returns Embeddable preview URL or null if not applicable
 */
export function getGoogleDrivePreviewUrl(url: string): string | null {
  const fileId = extractGoogleDriveId(url);
  if (!fileId) {
    return null;
  }

  // Handle different Google Drive resource types
  if (url.includes('docs.google.com/document')) {
    return `https://docs.google.com/document/d/${fileId}/preview`;
  } else if (url.includes('docs.google.com/spreadsheets')) {
    return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
  } else if (url.includes('docs.google.com/presentation')) {
    return `https://docs.google.com/presentation/d/${fileId}/preview`;
  } else if (url.includes('/folders/')) {
    // Folders can't be previewed in iframe
    return null;
  } else if (url.includes('docs.google.com/forms')) {
    // Forms can't be previewed in iframe
    return null;
  } else {
    // For regular files, use the preview URL
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
}

/**
 * Creates a thumbnail URL for a Google Drive file
 * @param url - The Google Drive URL
 * @returns Thumbnail URL or null if not applicable
 */
export function getGoogleDriveThumbnailUrl(url: string): string | null {
  const fileId = extractGoogleDriveId(url);
  if (!fileId) {
    return null;
  }

  // Only create thumbnail URLs for files, not folders or forms
  if (url.includes('/folders/') || url.includes('docs.google.com/forms')) {
    return null;
  }

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200-h150`;
}

/**
 * Checks if a Google Drive URL is publicly accessible
 * Note: This is a basic check based on URL patterns, not actual access verification
 * @param url - The Google Drive URL
 * @returns boolean indicating if the URL appears to be publicly accessible
 */
export function isPublicGoogleDriveUrl(url: string): boolean {
  // URLs with 'usp=sharing' parameter are typically public
  return url.includes('usp=sharing') || url.includes('usp=share_link');
}

/**
 * Extracts a display title from a Google Drive URL
 * Since Google Drive URLs use file IDs, we can't get the actual filename
 * This function returns a meaningful title based on the resource type and ID
 * @param url - The Google Drive URL
 * @returns A display title for the file
 */
export function getGoogleDriveTitle(url: string): string {
  const resourceType = getGoogleDriveResourceType(url);
  const fileId = extractGoogleDriveId(url);

  // If we can't extract a file ID, return just the resource type
  if (!fileId) {
    return resourceType;
  }

  // For different resource types, create meaningful titles
  if (url.includes('docs.google.com/document')) {
    return `Document (${fileId.substring(0, 8)}...)`;
  } else if (url.includes('docs.google.com/spreadsheets')) {
    return `Spreadsheet (${fileId.substring(0, 8)}...)`;
  } else if (url.includes('docs.google.com/presentation')) {
    return `Presentation (${fileId.substring(0, 8)}...)`;
  } else if (url.includes('docs.google.com/forms')) {
    return `Form (${fileId.substring(0, 8)}...)`;
  } else if (url.includes('/folders/')) {
    return `Folder (${fileId.substring(0, 8)}...)`;
  } else {
    // For regular files, try to determine type from URL or default to "File"
    return `File (${fileId.substring(0, 8)}...)`;
  }
}

/**
 * Gets a short, clean title for display in compact spaces
 * @param url - The Google Drive URL
 * @returns A short title suitable for compact display
 */
export function getGoogleDriveShortTitle(url: string): string {
  // Return just the resource type for compact display
  if (url.includes('docs.google.com/document')) {
    return 'Google Doc';
  } else if (url.includes('docs.google.com/spreadsheets')) {
    return 'Google Sheet';
  } else if (url.includes('docs.google.com/presentation')) {
    return 'Google Slides';
  } else if (url.includes('docs.google.com/forms')) {
    return 'Google Form';
  } else if (url.includes('/folders/')) {
    return 'Google Drive Folder';
  } else {
    return 'Google Drive File';
  }
}

/**
 * Generates a simple filename using naming convention based on file type and index
 * @param url - The Google Drive URL
 * @param index - The index/position of this file in the list (0-based)
 * @returns A simple filename like "Document 1", "Spreadsheet 2", etc.
 */
export function getGoogleDriveSimpleFilename(url: string, index: number): string {
  const fileNumber = index + 1; // Convert to 1-based numbering

  if (url.includes('docs.google.com/document')) {
    return `Document ${fileNumber}`;
  } else if (url.includes('docs.google.com/spreadsheets')) {
    return `Spreadsheet ${fileNumber}`;
  } else if (url.includes('docs.google.com/presentation')) {
    return `Presentation ${fileNumber}`;
  } else if (url.includes('docs.google.com/forms')) {
    return `Form ${fileNumber}`;
  } else if (url.includes('/folders/')) {
    return `Folder ${fileNumber}`;
  } else {
    return `File ${fileNumber}`;
  }
}

/**
 * Generates filenames for an array of Google Drive URLs with proper numbering per type
 * @param urls - Array of Google Drive URLs
 * @returns Array of simple filenames with proper numbering per file type
 */
export function getGoogleDriveFilenames(urls: string[]): string[] {
  // Count occurrences of each file type to number them properly
  const typeCounts: { [key: string]: number } = {};

  return urls.map((url) => {
    let fileType: string;

    if (url.includes('docs.google.com/document')) {
      fileType = 'Document';
    } else if (url.includes('docs.google.com/spreadsheets')) {
      fileType = 'Spreadsheet';
    } else if (url.includes('docs.google.com/presentation')) {
      fileType = 'Presentation';
    } else if (url.includes('docs.google.com/forms')) {
      fileType = 'Form';
    } else if (url.includes('/folders/')) {
      fileType = 'Folder';
    } else {
      fileType = 'File';
    }

    // Increment count for this file type
    typeCounts[fileType] = (typeCounts[fileType] || 0) + 1;

    // Return filename with proper numbering
    return `${fileType} ${typeCounts[fileType]}`;
  });
}
