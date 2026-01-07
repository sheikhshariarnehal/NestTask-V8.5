import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadProfilePhoto, deleteProfilePhoto } from '../../services/profile.service';

interface ProfilePhotoUploadProps {
  userId: string;
  currentPhotoUrl?: string | null;
  onPhotoUpdate: (photoUrl: string | null) => void;
  userName: string;
}

export function ProfilePhotoUpload({ 
  userId, 
  currentPhotoUrl, 
  onPhotoUpdate,
  userName 
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const photoUrl = await uploadProfilePhoto(userId, file);
      setPreview(photoUrl);
      onPhotoUpdate(photoUrl);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Failed to upload photo');
      setPreview(currentPhotoUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await deleteProfilePhoto(userId);
      setPreview(null);
      onPhotoUpdate(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.message || 'Failed to delete photo');
    } finally {
      setIsUploading(false);
    }
  };

  const userInitial = userName?.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-5">
      {/* Photo Display */}
      <div className="relative group">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-blue-100 dark:ring-blue-900/30 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
          {preview ? (
            <img 
              src={preview} 
              alt={userName}
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-4xl sm:text-5xl font-bold select-none">
              {userInitial}
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Delete Button */}
        {preview && !isUploading && (
          <button
            onClick={handleDelete}
            className="absolute top-0 right-0 p-2 sm:p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110 touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            title="Remove photo"
            aria-label="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Upload Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 sm:px-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors font-medium touch-manipulation shadow-sm text-sm sm:text-base"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          {preview ? 'Change Photo' : 'Upload Photo'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 text-center max-w-xs animate-fade-in px-4">
          {error}
        </div>
      )}

      {/* Info Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs px-4">
        Recommended: Square image, max 5MB
        <br />
        Formats: JPEG, PNG, GIF, WebP
      </p>
    </div>
  );
}
