import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to precisely merge deep Tailwind CSS classes without style conflicts.
 * Uses clsx for conditional classes and tailwind-merge for overriding duplicate properties.
 *
 * @param inputs - Array of class values, objects, or conditional arrays
 * @returns A single sanitized space-separated string of ultimate CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
