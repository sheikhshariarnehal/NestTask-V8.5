import { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import {
  Tag,
  Calendar,
  AlignLeft,
  ListTodo,
  AlertCircle,
  CheckCircle,
  Upload,
  X,
  Paperclip,
  Link,
  ExternalLink,
  Plus
} from 'lucide-react';
import type { NewTask } from '../../../types/task';
import {
  isValidGoogleDriveUrl,
  normalizeGoogleDriveUrl,
  getGoogleDriveResourceType,
  validateGoogleDriveUrls
} from '../../../utils/googleDriveUtils';

interface TaskFormProps {
  onSubmit: (task: NewTask) => void;
  sectionId?: string;
  isSectionAdmin?: boolean;
  isSubmitting?: boolean;
}

// Extended error type to include files and googleDriveLinks properties
type TaskFormErrors = Partial<Record<keyof NewTask | 'files' | 'googleDriveLinks', string>>;

// Form state interface
interface FormState {
  taskDetails: NewTask;
  errors: TaskFormErrors;
  files: File[];
  fileUrls: string[];
  googleDriveLinks: string[];
  currentGoogleDriveLink: string;
  isSubmitting: boolean;
  success: boolean;
  uploadProgress: number;
}

// Form action types
type FormAction =
  | { type: 'SET_TASK_FIELD', field: keyof NewTask, value: string }
  | { type: 'SET_ERRORS', errors: TaskFormErrors }
  | { type: 'CLEAR_ERROR', field: keyof NewTask | 'files' | 'googleDriveLinks' }
  | { type: 'ADD_FILES', newFiles: File[], newUrls: string[] }
  | { type: 'REMOVE_FILE', index: number }
  | { type: 'SET_CURRENT_GOOGLE_DRIVE_LINK', link: string }
  | { type: 'ADD_GOOGLE_DRIVE_LINK', link: string }
  | { type: 'REMOVE_GOOGLE_DRIVE_LINK', index: number }
  | { type: 'SET_SUBMITTING', isSubmitting: boolean }
  | { type: 'SET_SUCCESS', success: boolean }
  | { type: 'SET_UPLOAD_PROGRESS', progress: number }
  | { type: 'RESET_FORM', sectionId?: string };

// Initial state creator function
const createInitialState = (sectionId?: string): FormState => ({
  taskDetails: {
    name: '',
    category: 'task',
    dueDate: '',
    description: '',
    status: 'in-progress',
    sectionId: sectionId || undefined,
    googleDriveLinks: []
  },
  errors: {},
  files: [],
  fileUrls: [],
  googleDriveLinks: [],
  currentGoogleDriveLink: '',
  isSubmitting: false,
  success: false,
  uploadProgress: 0
});

// Form reducer
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_TASK_FIELD':
      return {
        ...state,
        taskDetails: {
          ...state.taskDetails,
          [action.field]: action.value
        }
      };
    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.errors
      };
    case 'CLEAR_ERROR':
      const { [action.field]: _, ...remainingErrors } = state.errors;
      return {
        ...state,
        errors: remainingErrors
      };
    case 'ADD_FILES':
      return {
        ...state,
        files: [...state.files, ...action.newFiles],
        fileUrls: [...state.fileUrls, ...action.newUrls]
      };
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter((_, i) => i !== action.index),
        fileUrls: state.fileUrls.filter((_, i) => i !== action.index)
      };
    case 'SET_CURRENT_GOOGLE_DRIVE_LINK':
      return {
        ...state,
        currentGoogleDriveLink: action.link
      };
    case 'ADD_GOOGLE_DRIVE_LINK':
      return {
        ...state,
        googleDriveLinks: [...state.googleDriveLinks, action.link],
        currentGoogleDriveLink: '',
        taskDetails: {
          ...state.taskDetails,
          googleDriveLinks: [...(state.taskDetails.googleDriveLinks || []), action.link]
        }
      };
    case 'REMOVE_GOOGLE_DRIVE_LINK':
      const newGoogleDriveLinks = state.googleDriveLinks.filter((_, i) => i !== action.index);
      return {
        ...state,
        googleDriveLinks: newGoogleDriveLinks,
        taskDetails: {
          ...state.taskDetails,
          googleDriveLinks: newGoogleDriveLinks
        }
      };
    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.isSubmitting
      };
    case 'SET_SUCCESS':
      return {
        ...state,
        success: action.success
      };
    case 'SET_UPLOAD_PROGRESS':
      return {
        ...state,
        uploadProgress: action.progress
      };
    case 'RESET_FORM':
      return createInitialState(action.sectionId);
    default:
      return state;
  }
}

// Input Field Component
const FormField = ({ 
  id, 
  label, 
  required = false, 
  error,
  children,
}: { 
  id: string; 
  label: string; 
  required?: boolean; 
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <p id={`${id}-error`} className="mt-1 text-xs text-red-500 flex items-center gap-1" role="alert">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);

// Success Message Component
const SuccessMessage = () => (
  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4 flex items-start gap-2 shadow-sm" role="alert">
    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
    <span className="text-green-700 dark:text-green-300">Task created successfully!</span>
  </div>
);

// Progress Bar Component
const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="mb-4" aria-live="polite">
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div 
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      ></div>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
      Uploading files... {progress}%
    </p>
  </div>
);

// File Item Component
const FileItem = ({ file, onRemove }: { file: File; onRemove: () => void }) => (
  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
    <div className="flex items-center gap-2 truncate max-w-[85%]">
      <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
    </div>
    <button
      type="button"
      onClick={onRemove}
      className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 touch-manipulation"
      aria-label={`Remove ${file.name}`}
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

// Google Drive Link Item Component
const GoogleDriveLinkItem = ({ url, onRemove }: { url: string; onRemove: () => void }) => (
  <div className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <div className="flex items-center gap-2 truncate max-w-[85%]">
      <Link className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-blue-700 dark:text-blue-300 truncate">{getGoogleDriveResourceType(url)}</span>
        <span className="text-xs text-blue-600 dark:text-blue-400 truncate">{url}</span>
      </div>
    </div>
    <div className="flex items-center gap-1 ml-2">
      <button
        type="button"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800 touch-manipulation"
        aria-label="Open Google Drive link"
      >
        <ExternalLink className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 touch-manipulation"
        aria-label="Remove Google Drive link"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export function TaskForm({ onSubmit, sectionId, isSectionAdmin = false, isSubmitting = false }: TaskFormProps) {
  // Use reducer for form state management
  const [state, dispatch] = useReducer(formReducer, createInitialState(sectionId));
  
  // Destructure state for easier access
  const {
    taskDetails,
    errors,
    files,
    fileUrls,
    googleDriveLinks,
    currentGoogleDriveLink,
    isSubmitting: formIsSubmitting,
    success,
    uploadProgress
  } = state;
  
  // Refs for managing timeouts and component lifecycle
  const submissionTimeoutRef = useRef<NodeJS.Timeout>();
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController>();
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      // Reset submitting state on unmount to prevent stuck state
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Cleanup file URLs
      fileUrls.forEach(url => {
        if (url && !url.startsWith('placeholder-')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [fileUrls, dispatch]);
  
  // Check if device is mobile - memoized
  const isMobile = useCallback(() => {
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  }, []);

  // Fix date input display for better mobile compatibility
  useEffect(() => {
    if (isMobile() && dateInputRef.current) {
      // Add specific behavior for iOS date inputs
      const dateInput = dateInputRef.current;
      dateInput.addEventListener('focus', () => {
        dateInput.classList.add('mobile-date-focused');
      });
      dateInput.addEventListener('blur', () => {
        dateInput.classList.remove('mobile-date-focused');
      });
    }
  }, [isMobile]);

  // Validation function - memoized for performance
  const validate = useCallback((): boolean => {
    const newErrors: TaskFormErrors = {};
    let isValid = true;
    
    if (!taskDetails.name.trim()) {
      newErrors.name = 'Task name is required';
      isValid = false;
    }
    
    if (!taskDetails.dueDate) {
      newErrors.dueDate = 'Due date is required';
      isValid = false;
    } else {
      const selectedDate = new Date(taskDetails.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
        isValid = false;
      }
    }
    
    if (!taskDetails.description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }
    
    dispatch({ type: 'SET_ERRORS', errors: newErrors });
    return isValid;
  }, [taskDetails]);
  
  // Handle input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    dispatch({ 
      type: 'SET_TASK_FIELD', 
      field: name as keyof NewTask, 
      value 
    });
    
    // Clear error when user types
    if (errors[name as keyof NewTask]) {
      dispatch({ type: 'CLEAR_ERROR', field: name as keyof NewTask });
    }
  }, [errors]);
  
  // Handle file upload with progress tracking - memoized
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const newFiles = Array.from(e.target.files);
    
    // Validate file sizes before processing
    const maxFileSize = 50 * 1024 * 1024; // 50MB limit
    const oversizedFiles = newFiles.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      dispatch({ 
        type: 'SET_ERRORS', 
        errors: { 
          ...errors, 
          files: `Some files exceed the 50MB size limit: ${oversizedFiles.map(f => f.name).join(', ')}` 
        } 
      });
      return;
    }
    
    const isDeviceMobile = isMobile();
    
    if (isDeviceMobile) {
      // On mobile, create placeholder URLs for display only
      const displayUrls = newFiles.map(file => `placeholder-${file.name}-${Date.now()}`);
      dispatch({ type: 'ADD_FILES', newFiles, newUrls: displayUrls });
    } else {
      // Desktop flow - use object URLs
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      dispatch({ type: 'ADD_FILES', newFiles, newUrls });
    }
    
    // Clear any previous errors
    if (errors.files) {
      dispatch({ type: 'CLEAR_ERROR', field: 'files' });
    }
  }, [errors, isMobile]);
  
  // Remove file - memoized
  const removeFile = useCallback((index: number) => {
    // Only revoke URL if it's a real object URL (not a placeholder)
    if (fileUrls[index] && !fileUrls[index].startsWith('placeholder-')) {
      URL.revokeObjectURL(fileUrls[index]);
    }
    dispatch({ type: 'REMOVE_FILE', index });
  }, [fileUrls]);

  // Handle Google Drive link input change
  const handleGoogleDriveLinkChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch({ type: 'SET_CURRENT_GOOGLE_DRIVE_LINK', link: value });

    // Clear error when user types
    if (errors.googleDriveLinks) {
      dispatch({ type: 'CLEAR_ERROR', field: 'googleDriveLinks' });
    }
  }, [errors.googleDriveLinks]);

  // Add Google Drive link
  const addGoogleDriveLink = useCallback(() => {
    const trimmedLink = currentGoogleDriveLink.trim();

    if (!trimmedLink) {
      dispatch({
        type: 'SET_ERRORS',
        errors: {
          ...errors,
          googleDriveLinks: 'Please enter a Google Drive link'
        }
      });
      return;
    }

    if (!isValidGoogleDriveUrl(trimmedLink)) {
      dispatch({
        type: 'SET_ERRORS',
        errors: {
          ...errors,
          googleDriveLinks: 'Please enter a valid Google Drive URL'
        }
      });
      return;
    }

    // Check for duplicates
    const normalizedLink = normalizeGoogleDriveUrl(trimmedLink);
    if (googleDriveLinks.includes(normalizedLink)) {
      dispatch({
        type: 'SET_ERRORS',
        errors: {
          ...errors,
          googleDriveLinks: 'This Google Drive link has already been added'
        }
      });
      return;
    }

    dispatch({ type: 'ADD_GOOGLE_DRIVE_LINK', link: normalizedLink });
  }, [currentGoogleDriveLink, googleDriveLinks, errors]);

  // Remove Google Drive link
  const removeGoogleDriveLink = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_GOOGLE_DRIVE_LINK', index });
  }, []);

  // Handle Enter key press in Google Drive link input
  const handleGoogleDriveLinkKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addGoogleDriveLink();
    }
  }, [addGoogleDriveLink]);
  
  // Get minimum date for date input
  const getMinDate = useCallback(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);
  
  // Handle form submission - memoized
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (formIsSubmitting) {
      console.log('[TaskForm] Already submitting, ignoring duplicate submission');
      return;
    }
    
    console.log('[TaskForm] Starting task submission');
    
    // Clear any existing timeout
    if (submissionTimeoutRef.current) {
      clearTimeout(submissionTimeoutRef.current);
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Validate form
    if (!validate()) return;
    
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    dispatch({ type: 'SET_UPLOAD_PROGRESS', progress: 0 });
    
    // Set submission timeout (45 seconds)
    submissionTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        console.error('[Error] Task submission timed out after 45 seconds');
        dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
        dispatch({ 
          type: 'SET_ERRORS', 
          errors: { 
            name: 'Submission timed out. Please try again with smaller files or check your connection.' 
          } 
        });
        abortControllerRef.current?.abort();
      }
    }, 45000);
    
    try {
      // Clone task details to avoid modifying state during preparation
      const taskDescription = taskDetails.description;
      let enhancedDescription = taskDescription;
      
      // Check if device is mobile
      const isDeviceMobile = isMobile();
      
      // Add file references
      if (files.length > 0) {
        enhancedDescription += '\n\n**Attachments:**\n';
        
        // For mobile devices, create direct attachment references
        if (isDeviceMobile) {
          // Filter valid files
          const validFiles = files.filter(file => 
            file.size > 0 && file.name && typeof file.name === 'string'
          );
          
          validFiles.forEach(file => {
            // Mobile - use attachment: protocol
            enhancedDescription += `- [${file.name}](attachment:${file.name})\n`;
          });
          
          // Add a special flag for mobile uploads
          enhancedDescription += '\n<!-- mobile-uploads -->\n';
        } else {
          // For desktop, create blob URLs
          files.forEach(file => {
            const fileUrl = URL.createObjectURL(file);
            enhancedDescription += `- [${file.name}](${fileUrl})\n`;
          });
        }
      }
      
      // Add notice for section tasks if this is a section admin
      if (isSectionAdmin && sectionId) {
        enhancedDescription += `\n\n*This task is assigned to section ID: ${sectionId}*`;
      }
      
      // Create final task object
      const finalTask: NewTask = {
        ...taskDetails,
        description: enhancedDescription,
        sectionId: sectionId,
      };
      
      // Handle mobile file uploads
      if (isDeviceMobile && files.length > 0) {
        // Validate files before sending
        const validFiles = files.filter(file => file.name && file.size > 0);
        
        // On mobile, attach the files with a custom property
        (finalTask as any)._mobileFiles = validFiles;
        
        // Add additional flag for section admin mobile uploads
        if (isSectionAdmin && sectionId) {
          console.log('[Debug] Setting section admin mobile flags:', { isSectionAdmin, sectionId });
          (finalTask as any)._isSectionAdminMobile = true;
          (finalTask as any)._sectionId = sectionId;
          
          // Also set the sectionId in the standard location to ensure it's used
          finalTask.sectionId = sectionId;
        }
        
        // Add timestamp to prevent caching issues on mobile
        (finalTask as any)._mobileTimestamp = Date.now();
      }
      
      // Submit the task
      await onSubmit(finalTask);
      
      console.log('[TaskForm] Task submitted successfully');
      
      // Clear timeout on successful submission
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
      
      // Reset form if component is still mounted
      if (isMounted.current) {
        // Reset submitting state BEFORE resetting form
        dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
        dispatch({ type: 'RESET_FORM', sectionId });
        dispatch({ type: 'SET_SUCCESS', success: true });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          if (isMounted.current) {
            dispatch({ type: 'SET_SUCCESS', success: false });
          }
        }, 3000);
      }
    } catch (error) {
      console.error('[Error] Task creation failed:', error);
      
      // Clear timeout on error
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
      
      // Show error to user if component is still mounted
      if (isMounted.current) {
        dispatch({ 
          type: 'SET_ERRORS', 
          errors: { 
            name: `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}` 
          } 
        });
        dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
        dispatch({ type: 'SET_UPLOAD_PROGRESS', progress: 0 });
      }
    }
  }, [validate, taskDetails, files, isMobile, isSectionAdmin, sectionId, onSubmit]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-750">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white flex items-center">
          <ListTodo className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          Create New Task
          {isSectionAdmin && sectionId && (
            <span className="ml-2 text-xs sm:text-sm text-green-600 dark:text-green-400 font-normal px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
              Section Task
            </span>
          )}
        </h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {success && <SuccessMessage />}

        {formIsSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
          <ProgressBar progress={uploadProgress} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div className="col-span-1 sm:col-span-2">
            <FormField id="name" label="Task Name" required error={errors.name}>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ListTodo className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={taskDetails.name}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border ${
                    errors.name ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base touch-manipulation`}
                  placeholder="Enter task name"
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  autoComplete="off"
                />
              </div>
            </FormField>
          </div>

          <div>
            <FormField id="category" label="Category" error={errors.category}>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Tag className="w-5 h-5" />
                </div>
                <select
                  id="category"
                  name="category"
                  value={taskDetails.category}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none text-sm sm:text-base touch-manipulation"
                >
                  <option value="task">Task</option>
                  <option value="assignment">Assignment</option>
                  <option value="project">Project</option>
                  <option value="quiz">Quiz</option>
                  <option value="midterm">Midterm</option>
                  <option value="final-exam">Final Exam</option>
                  <option value="lab-report">Lab Report</option>
                  <option value="lab-performance">Lab Performance</option>
                  <option value="lab-final">Lab Final</option>
                  <option value="presentation">Presentation</option>
                  <option value="blc">BLC</option>
                  <option value="documents">Documents</option>
                  <option value="groups">Groups</option>
                  <option value="others">Others</option>
                </select>
              </div>
            </FormField>
          </div>

          <div>
            <FormField id="dueDate" label="Due Date" required error={errors.dueDate}>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Calendar className="w-5 h-5" />
                </div>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  ref={dateInputRef}
                  value={taskDetails.dueDate}
                  onChange={handleChange}
                  min={getMinDate()}
                  className={`w-full pl-10 pr-4 py-3 border ${
                    errors.dueDate ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base touch-manipulation mobile-date-input`}
                  aria-required="true"
                  aria-invalid={!!errors.dueDate}
                  aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
                />
              </div>
            </FormField>
          </div>

          <div className="col-span-1 sm:col-span-2">
            <FormField id="description" label="Description" required error={errors.description}>
              <div className="relative">
                <div className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                  <AlignLeft className="w-5 h-5" />
                </div>
                <textarea
                  id="description"
                  name="description"
                  value={taskDetails.description}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full pl-10 pr-4 py-2 border ${
                    errors.description ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base touch-manipulation`}
                  placeholder="Enter task description"
                  aria-required="true"
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? "description-error" : undefined}
                ></textarea>
              </div>
            </FormField>
          </div>

          <div className="col-span-1 sm:col-span-2">
            <FormField id="files" label="Attachments" error={errors.files}>
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="file-upload" 
                  className="w-full flex flex-col items-center justify-center px-4 py-5 bg-white dark:bg-gray-800 text-gray-500 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 touch-manipulation"
                  aria-label="Upload files - tap to select files"
                >
                  <Upload className="w-7 h-7 text-blue-500 dark:text-blue-400 mb-2" />
                  <p className="text-sm text-center">
                    {isMobile() ? 
                      'Tap to select files' : 
                      'Drag & drop files here, or click to select files'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum file size: 50MB
                  </p>
                  <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload} 
                    multiple 
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    aria-label="File upload"
                  />
                </label>
              </div>

              {fileUrls.length > 0 && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                  {files.map((file, index) => (
                    <FileItem 
                      key={`${file.name}-${index}`}
                      file={file} 
                      onRemove={() => removeFile(index)} 
                    />
                  ))}
                </div>
              )}
            </FormField>
          </div>

          {/* Google Drive Links Section - Only for Section Admins */}
          {isSectionAdmin && (
            <div className="col-span-1 sm:col-span-2">
              <FormField id="googleDriveLinks" label="Google Drive Links" error={errors.googleDriveLinks}>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Link className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        id="googleDriveLink"
                        value={currentGoogleDriveLink}
                        onChange={handleGoogleDriveLinkChange}
                        onKeyPress={handleGoogleDriveLinkKeyPress}
                        placeholder="Paste Google Drive link here..."
                        className={`w-full pl-10 pr-4 py-3 border ${
                          errors.googleDriveLinks ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base touch-manipulation`}
                        aria-describedby={errors.googleDriveLinks ? "googleDriveLinks-error" : undefined}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addGoogleDriveLink}
                      disabled={!currentGoogleDriveLink.trim()}
                      className={`px-4 py-3 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 touch-manipulation ${
                        currentGoogleDriveLink.trim()
                          ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                      aria-label="Add Google Drive link"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>Supported: Google Drive files, folders, Docs, Sheets, Slides, and Forms</p>
                    <p>Only section administrators can attach Google Drive links</p>
                  </div>

                  {googleDriveLinks.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {googleDriveLinks.map((link, index) => (
                        <GoogleDriveLinkItem
                          key={`${link}-${index}`}
                          url={link}
                          onRemove={() => removeGoogleDriveLink(index)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </FormField>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={formIsSubmitting || isSubmitting}
            className={`px-4 py-2 rounded-md text-white font-medium shadow-sm 
              ${(formIsSubmitting || isSubmitting) 
                ? 'bg-blue-400 dark:bg-blue-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
              }
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 w-full sm:w-auto`}
          >
            {(formIsSubmitting || isSubmitting) ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}