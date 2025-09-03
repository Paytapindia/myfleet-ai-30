export interface FinancialData {
  revenue: number;
  expenses: number;
  date: string;
}

export interface Vehicle {
  id: string;
  number: string;
  model: string;
  payTapBalance: number;
  fastTagLinked: boolean;
  driver: { id: string; name: string } | null;
  lastService: string;
  gpsLinked: boolean;
  challans: number;
  documents: {
    pollution: { status: 'uploaded' | 'missing' | 'expired', expiryDate?: string };
    registration: { status: 'uploaded' | 'missing' | 'expired', expiryDate?: string };
    insurance: { status: 'active' | 'expired' | 'missing', expiryDate?: string };
    license: { status: 'uploaded' | 'missing' | 'expired', expiryDate?: string };
  };
  financialData: FinancialData[];
  userId: string;
  // RC verification data
  ownerName?: string;
  chassisNumber?: string;
  engineNumber?: string;
  fuelType?: string;
  registrationDate?: string;
  registrationAuthority?: string;
  permanentAddress?: string;
  financer?: string;
  isFinanced?: boolean;
  rcVerifiedAt?: string;
  rcVerificationStatus?: string;
  make?: string;
  year?: number;
}

export type PnLPeriod = 'today' | 'weekly' | 'monthly' | 'yearly';

export interface AddVehicleFormData {
  number: string;
}