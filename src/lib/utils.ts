import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function saveUserPreferences(preferences: any) {
  try {
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

export function loadUserPreferences() {
  try {
    const data = localStorage.getItem('user_preferences');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return {};
  }
}
