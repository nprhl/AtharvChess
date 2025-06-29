import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for changes to this localStorage key from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue] as const;
}

// Hook for managing multiple localStorage keys with a common prefix
export function useLocalStorageState<T extends Record<string, any>>(
  prefix: string,
  initialState: T
) {
  const [state, setState] = useState<T>(() => {
    const savedState = { ...initialState };
    
    Object.keys(initialState).forEach(key => {
      try {
        const item = window.localStorage.getItem(`${prefix}-${key}`);
        if (item !== null) {
          savedState[key as keyof T] = JSON.parse(item);
        }
      } catch (error) {
        console.error(`Error reading localStorage key "${prefix}-${key}":`, error);
      }
    });
    
    return savedState;
  });

  const updateState = useCallback((updates: Partial<T>) => {
    setState(prevState => {
      const newState = { ...prevState, ...updates };
      
      // Save each updated key to localStorage
      Object.entries(updates).forEach(([key, value]) => {
        try {
          window.localStorage.setItem(`${prefix}-${key}`, JSON.stringify(value));
        } catch (error) {
          console.error(`Error setting localStorage key "${prefix}-${key}":`, error);
        }
      });
      
      return newState;
    });
  }, [prefix]);

  const clearState = useCallback(() => {
    Object.keys(state).forEach(key => {
      try {
        window.localStorage.removeItem(`${prefix}-${key}`);
      } catch (error) {
        console.error(`Error removing localStorage key "${prefix}-${key}":`, error);
      }
    });
    setState(initialState);
  }, [prefix, state, initialState]);

  return {
    state,
    updateState,
    clearState
  };
}

// Hook for localStorage with expiration
export function useLocalStorageWithExpiry<T>(
  key: string,
  initialValue: T,
  expiryMinutes: number = 60
) {
  const [value, setValue] = useLocalStorage(key, {
    value: initialValue,
    expiry: Date.now() + expiryMinutes * 60 * 1000
  });

  // Check if value has expired
  const isExpired = Date.now() > value.expiry;

  const setValueWithExpiry = useCallback((newValue: T | ((val: T) => T)) => {
    const valueToStore = newValue instanceof Function ? newValue(value.value) : newValue;
    setValue({
      value: valueToStore,
      expiry: Date.now() + expiryMinutes * 60 * 1000
    });
  }, [setValue, value.value, expiryMinutes]);

  return [
    isExpired ? initialValue : value.value,
    setValueWithExpiry,
    isExpired
  ] as const;
}
