import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class name fragments, resolving conflicts in a predictable order.
 * @param {...ClassValue} inputs class name strings/arrays/objects to combine.
 * @returns {string} a single space-delimited class list with duplicates merged.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
