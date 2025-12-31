import { useState, useCallback } from 'react';

// Define the types of operations
export type OperationType = 'create' | 'update' | 'delete';

export interface Operation {
  type: OperationType;
  endpoint: string;
  payload: any;
}

interface UseOperationsParams {
  entityType: 'task' | 'routine' | 'course' | 'teacher';
  userId: string;
}

interface UseOperationsResult {
  performOperation: (operation: Operation) => Promise<any>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook for handling operations
 */
export function useOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Perform the operation immediately
  const performOperation = useCallback(async (operation: Operation) => {
    setLoading(true);
    setError(null);

    try {
      // Set the appropriate HTTP method based on operation type
      const method = operation.type === 'create' ? 'POST' : 
                    operation.type === 'update' ? 'PUT' : 'DELETE';
      
      const init: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // Add body for create and update operations
      if (operation.type !== 'delete') {
        init.body = JSON.stringify(operation.payload);
      }
      
      // Perform the fetch operation
      const response = await fetch(operation.endpoint, init);
      
      if (!response.ok) {
        throw new Error(`Operation failed: ${response.status} ${response.statusText}`);
      }
      
      // Return the data if the response has any
      if (method !== 'DELETE') {
        return await response.json();
      }
      
      return true;
    } catch (err) {
      console.error('Operation error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    performOperation,
    loading,
    error
  };
} 