/**
 * Tests for Google Drive utilities
 */

import {
  isValidGoogleDriveUrl,
  extractGoogleDriveId,
  normalizeGoogleDriveUrl,
  getGoogleDriveResourceType,
  validateGoogleDriveUrls,
  getGoogleDrivePreviewUrl,
  isPublicGoogleDriveUrl
} from '../googleDriveUtils';

describe('Google Drive Utils', () => {
  describe('isValidGoogleDriveUrl', () => {
    test('should validate standard Google Drive file URLs', () => {
      const validUrls = [
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing',
        'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
        'https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
        'https://docs.google.com/forms/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
      ];

      validUrls.forEach(url => {
        expect(isValidGoogleDriveUrl(url)).toBe(true);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'https://example.com/file.pdf',
        'https://dropbox.com/file/123',
        'not-a-url',
        '',
        'https://drive.google.com/invalid',
        'https://docs.google.com/invalid'
      ];

      invalidUrls.forEach(url => {
        expect(isValidGoogleDriveUrl(url)).toBe(false);
      });
    });
  });

  describe('extractGoogleDriveId', () => {
    test('should extract file ID from various URL formats', () => {
      const testCases = [
        {
          url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing',
          expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
        },
        {
          url: 'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
        },
        {
          url: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
          expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
        }
      ];

      testCases.forEach(({ url, expectedId }) => {
        expect(extractGoogleDriveId(url)).toBe(expectedId);
      });
    });

    test('should return null for invalid URLs', () => {
      expect(extractGoogleDriveId('https://example.com')).toBeNull();
      expect(extractGoogleDriveId('')).toBeNull();
    });
  });

  describe('normalizeGoogleDriveUrl', () => {
    test('should normalize URLs to standard format', () => {
      const testCases = [
        {
          input: 'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          expected: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view'
        },
        {
          input: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
          expected: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizeGoogleDriveUrl(input)).toBe(expected);
      });
    });
  });

  describe('getGoogleDriveResourceType', () => {
    test('should identify resource types correctly', () => {
      const testCases = [
        {
          url: 'https://docs.google.com/document/d/123/edit',
          expected: 'Google Doc'
        },
        {
          url: 'https://docs.google.com/spreadsheets/d/123/edit',
          expected: 'Google Sheet'
        },
        {
          url: 'https://docs.google.com/presentation/d/123/edit',
          expected: 'Google Slides'
        },
        {
          url: 'https://docs.google.com/forms/d/123/edit',
          expected: 'Google Form'
        },
        {
          url: 'https://drive.google.com/drive/folders/123',
          expected: 'Google Drive Folder'
        },
        {
          url: 'https://drive.google.com/file/d/123/view',
          expected: 'Google Drive File'
        }
      ];

      testCases.forEach(({ url, expected }) => {
        expect(getGoogleDriveResourceType(url)).toBe(expected);
      });
    });
  });

  describe('validateGoogleDriveUrls', () => {
    test('should validate array of URLs', () => {
      const urls = [
        'https://drive.google.com/file/d/123/view',
        'https://invalid-url.com',
        'https://docs.google.com/document/d/456/edit',
        ''
      ];

      const result = validateGoogleDriveUrls(urls);

      expect(result.validUrls).toHaveLength(2);
      expect(result.invalidUrls).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('getGoogleDrivePreviewUrl', () => {
    test('should generate preview URLs for files', () => {
      const fileUrl = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view';
      const previewUrl = getGoogleDrivePreviewUrl(fileUrl);
      
      expect(previewUrl).toBe('https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&sz=w200-h150');
    });

    test('should return null for folders and forms', () => {
      const folderUrl = 'https://drive.google.com/drive/folders/123';
      const formUrl = 'https://docs.google.com/forms/d/123/edit';
      
      expect(getGoogleDrivePreviewUrl(folderUrl)).toBeNull();
      expect(getGoogleDrivePreviewUrl(formUrl)).toBeNull();
    });
  });

  describe('isPublicGoogleDriveUrl', () => {
    test('should identify public URLs', () => {
      const publicUrl = 'https://drive.google.com/file/d/123/view?usp=sharing';
      const privateUrl = 'https://drive.google.com/file/d/123/view';
      
      expect(isPublicGoogleDriveUrl(publicUrl)).toBe(true);
      expect(isPublicGoogleDriveUrl(privateUrl)).toBe(false);
    });
  });
});
