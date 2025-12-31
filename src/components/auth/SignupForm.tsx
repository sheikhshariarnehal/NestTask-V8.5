import { useState, useEffect, useMemo, useCallback } from 'react';
import { Mail, Lock, User, Phone, Car as IdCard, Loader2, BookOpen, Users, Layers } from 'lucide-react';
import { AuthError } from './AuthError';
import { AuthInput } from './AuthInput';
import { AuthSubmitButton } from './AuthSubmitButton';
import { validateEmail, validatePassword, validatePhone, validateStudentId } from '../../utils/authErrors';
import { getDepartments, getBatchesByDepartment, getSectionsByBatch } from '../../services/department.service';
import type { SignupCredentials, Department, Batch, Section } from '../../types/auth';

interface SignupFormProps {
  onSubmit: (credentials: SignupCredentials) => Promise<void>;
  onSwitchToLogin: () => void;
  error?: string;
}

// Optimized Select dropdown component with memoization
interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  icon: React.ComponentType<any>;
  error?: string;
  disabled?: boolean;
}

const SelectInput = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  icon: Icon, 
  error, 
  disabled 
}: SelectProps) => {
  // Memoize options to prevent unnecessary re-renders
  const optionElements = useMemo(() => 
    options.map((option) => (
      <option key={option.id} value={option.id}>
        {option.name}
      </option>
    )),
    [options]
  );

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`block w-full pl-10 pr-8 py-2.5 rounded-lg border transition-all duration-200 ${
            error
              ? 'border-red-300 dark:border-red-500/50 bg-red-50/30 dark:bg-red-900/10 focus:ring-2 focus:ring-red-100 focus:border-red-500'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-blue-50 focus:border-blue-500 dark:focus:ring-blue-900/20'
          } text-gray-900 dark:text-gray-100 text-sm
          disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 
          disabled:cursor-not-allowed cursor-pointer appearance-none`}
        >
          <option value="" disabled>{placeholder}</option>
          {optionElements}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export function SignupForm({ onSubmit, onSwitchToLogin, error }: SignupFormProps) {
  const [credentials, setCredentials] = useState<SignupCredentials>({
    name: '',
    email: '',
    password: '',
    phone: '',
    studentId: '',
    departmentId: '',
    batchId: '',
    sectionId: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    phone: false,
    studentId: false,
    departmentId: false,
    batchId: false,
    sectionId: false
  });
  
  // State for departments, batches, and sections
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  // Fetch departments on component mount (optimized)
  useEffect(() => {
    let isMounted = true;
    
    async function fetchDepartments() {
      setIsLoadingDepartments(true);
      try {
        const depts = await getDepartments();
        if (isMounted) {
          setDepartments(depts);
        }
      } catch (error) {
        console.error('Error loading departments:', error);
        if (isMounted) {
          setLocalError('Failed to load departments. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingDepartments(false);
        }
      }
    }
    
    fetchDepartments();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Fetch batches when department changes (optimized)
  useEffect(() => {
    if (!credentials.departmentId) {
      setBatches([]);
      return;
    }
    
    let isMounted = true;
    
    async function fetchBatches() {
      setIsLoadingBatches(true);
      try {
        const batchList = await getBatchesByDepartment(credentials.departmentId || '');
        if (isMounted) {
          setBatches(batchList);
        }
      } catch (error) {
        console.error('Error loading batches:', error);
        if (isMounted) {
          setLocalError('Failed to load batches. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingBatches(false);
        }
      }
    }
    
    fetchBatches();
    
    // Reset dependent fields
    setCredentials(prev => ({ ...prev, batchId: '', sectionId: '' }));
    setSections([]);
    
    return () => {
      isMounted = false;
    };
  }, [credentials.departmentId]);
  
  // Fetch sections when batch changes (optimized)
  useEffect(() => {
    if (!credentials.batchId) {
      setSections([]);
      return;
    }
    
    let isMounted = true;
    
    async function fetchSections() {
      setIsLoadingSections(true);
      try {
        const sectionList = await getSectionsByBatch(credentials.batchId || '');
        if (isMounted) {
          setSections(sectionList);
        }
      } catch (error) {
        console.error('Error loading sections:', error);
        if (isMounted) {
          setLocalError('Failed to load sections. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingSections(false);
        }
      }
    }
    
    fetchSections();
    
    // Reset dependent field
    setCredentials(prev => ({ ...prev, sectionId: '' }));
    
    return () => {
      isMounted = false;
    };
  }, [credentials.batchId]);

  const validateForm = useCallback(() => {
    if (!credentials.name.trim()) {
      setLocalError('Name is required');
      return false;
    }
    if (!validateEmail(credentials.email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (!validatePassword(credentials.password)) {
      setLocalError('Password must be at least 6 characters long');
      return false;
    }
    if (!validatePhone(credentials.phone)) {
      setLocalError('Please enter a valid phone number');
      return false;
    }
    if (!validateStudentId(credentials.studentId)) {
      setLocalError('Please enter a valid student ID');
      return false;
    }
    if (!credentials.departmentId) {
      setLocalError('Please select your department');
      return false;
    }
    if (!credentials.batchId) {
      setLocalError('Please select your batch');
      return false;
    }
    if (!credentials.sectionId) {
      setLocalError('Please select your section');
      return false;
    }
    return true;
  }, [credentials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSubmit(credentials);
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = useCallback((field: keyof SignupCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    setLocalError(null);
  }, []);

  // Memoize field errors to prevent unnecessary re-renders
  const fieldErrors = useMemo(() => ({
    name: touched.name && !credentials.name.trim() ? 'Name is required' : '',
    email: touched.email && !validateEmail(credentials.email) ? 'Please enter a valid email' : '',
    phone: touched.phone && !validatePhone(credentials.phone) ? 'Please enter a valid phone number' : '',
    studentId: touched.studentId && !validateStudentId(credentials.studentId) ? 'Please enter a valid student ID' : '',
    password: touched.password && !validatePassword(credentials.password) ? 'Password must be at least 6 characters' : '',
    departmentId: touched.departmentId && !credentials.departmentId ? 'Please select your department' : '',
    batchId: touched.batchId && !credentials.batchId && credentials.departmentId ? 'Please select your batch' : '',
    sectionId: touched.sectionId && !credentials.sectionId && credentials.batchId ? 'Please select your section' : '',
  }), [touched, credentials]);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Create Account
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Join our community and start managing your tasks
        </p>
      </div>
      
      {(error || localError) && <AuthError message={error || localError || ''} />}

      <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            type="text"
            value={credentials.name}
            onChange={(value) => handleInputChange('name', value)}
            label="Full Name"
            placeholder="Enter your full name"
            icon={User}
            error={fieldErrors.name}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AuthInput
              type="email"
              value={credentials.email}
              onChange={(value) => handleInputChange('email', value)}
              label="Email"
              placeholder="Enter your email"
              icon={Mail}
              error={fieldErrors.email}
              inputMode="email"
            />

            <AuthInput
              type="text"
              value={credentials.phone}
              onChange={(value) => handleInputChange('phone', value)}
              label="Phone Number"
              placeholder="Enter your phone"
              icon={Phone}
              error={fieldErrors.phone}
              inputMode="tel"
            />
          </div>

          <AuthInput
            type="text"
            value={credentials.studentId}
            onChange={(value) => handleInputChange('studentId', value)}
            label="Student ID"
            placeholder="Enter your student ID"
            icon={IdCard}
            error={fieldErrors.studentId}
          />

          <SelectInput
            label="Department"
            value={credentials.departmentId ?? ''}
            onChange={(value) => handleInputChange('departmentId', value)}
            options={departments}
            placeholder={isLoadingDepartments ? "Loading departments..." : "Select your department"}
            icon={BookOpen}
            disabled={isLoadingDepartments}
            error={fieldErrors.departmentId}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput
              label="Batch"
              value={credentials.batchId ?? ''}
              onChange={(value) => handleInputChange('batchId', value)}
              options={batches}
              placeholder={
                !credentials.departmentId 
                  ? "Select department first" 
                  : isLoadingBatches 
                    ? "Loading batches..." 
                    : "Select your batch"
              }
              icon={Layers}
              disabled={!credentials.departmentId || isLoadingBatches}
              error={fieldErrors.batchId}
            />
            
            <SelectInput
              label="Section"
              value={credentials.sectionId ?? ''}
              onChange={(value) => handleInputChange('sectionId', value)}
              options={sections}
              placeholder={
                !credentials.batchId 
                  ? "Select batch first" 
                  : isLoadingSections 
                    ? "Loading sections..." 
                    : "Select your section"
              }
              icon={Users}
              disabled={!credentials.batchId || isLoadingSections}
              error={fieldErrors.sectionId}
            />
          </div>

          <AuthInput
            type="password"
            value={credentials.password}
            onChange={(value) => handleInputChange('password', value)}
            label="Password"
            placeholder="Choose a password (min. 6 characters)"
            icon={Lock}
            error={fieldErrors.password}
          />

        <div className="pt-2">
          <AuthSubmitButton 
            label={isLoading ? 'Creating account...' : 'Create account'} 
            isLoading={isLoading}
            icon={isLoading ? Loader2 : undefined}
          />
        </div>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}