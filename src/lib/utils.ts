import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getInsuranceStatus(expiryDate: string | null | undefined): 'active' | 'expired' | 'missing' {
  if (!expiryDate) {
    return 'missing'
  }
  
  const expiry = new Date(expiryDate)
  const today = new Date()
  
  // Set time to start of day for accurate comparison
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  
  if (isNaN(expiry.getTime())) {
    return 'missing'
  }
  
  return expiry >= today ? 'active' : 'expired'
}
