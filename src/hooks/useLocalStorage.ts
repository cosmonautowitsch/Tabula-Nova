
"use client";

import { useState, useEffect, Dispatch, SetStateAction } from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Get from local storage then
  // parse stored json or return initialValue
  const readValue = (): T => {
    // Prevent build errors from localStorage not being defined
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        // Parse the stored JSON. If it's an object, merge it with initialValue
        // to ensure all keys from initialValue are present.
        const parsedItem = JSON.parse(item);
        if (typeof parsedItem === 'object' && parsedItem !== null && typeof initialValue === 'object' && initialValue !== null) {
          return { ...initialValue, ...parsedItem } as T;
        }
        return parsedItem as T;
      }
      return initialValue; // No item found, return initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue: SetValue<T> = (value) => {
    // Prevent build errors from localStorage not being defined
    if (typeof window === 'undefined') {
      console.warn(
        `Tried setting localStorage key "${key}" even though environment is not a client`
      );
    }

    try {
      // Allow value to be a function so we have same API as useState
      const newValue = value instanceof Function ? value(storedValue) : value;
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(newValue));
      // Save state
      setStoredValue(newValue);
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Listen to storage event to sync tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          const parsedNewValue = JSON.parse(event.newValue);
           if (typeof parsedNewValue === 'object' && parsedNewValue !== null && typeof initialValue === 'object' && initialValue !== null) {
            setStoredValue({ ...initialValue, ...parsedNewValue } as T);
          } else {
            setStoredValue(parsedNewValue as T);
          }
        } catch (error) {
          console.warn(`Error parsing localStorage key "${key}" on storage event:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);


  return [storedValue, setValue];
}

export default useLocalStorage;
