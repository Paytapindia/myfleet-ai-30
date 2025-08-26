import { http } from './http';
import { endpoints } from './endpoints';

export interface Challan {
  id: string;
  challanNumber: string;
  vehicleNumber: string;
  vehicleId: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  location: string;
  violation: string;
  status: 'pending' | 'paid' | 'disputed';
  penaltyAmount?: number;
  courtFee?: number;
  totalAmount: number;
  rtoCode?: string;
  paymentReference?: string;
  paidAt?: string;
}

export interface ChallanSummary {
  totalPending: number;
  totalAmount: number;
  overdueCount: number;
  paidThisMonth: number;
  totalPaid: number;
  totalDisputed: number;
}

export interface PaymentRequest {
  challanIds: string[];
  paymentMethod?: 'wallet' | 'card' | 'netbanking' | 'upi';
  returnUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  transactionId?: string;
  message: string;
}

export const challansApi = {
  // Get all challans for user
  getAllChallans: async (): Promise<Challan[]> => {
    const response = await http.get<Challan[]>(endpoints.challans.all);
    return response;
  },

  // Get challans for specific vehicle
  getVehicleChallans: async (vehicleId: string): Promise<Challan[]> => {
    const response = await http.get<Challan[]>(endpoints.challans.list(vehicleId));
    return response;
  },

  // Get challan details
  getChallanDetails: async (challanId: string): Promise<Challan> => {
    const response = await http.get<Challan>(endpoints.challans.details(challanId));
    return response;
  },

  // Get challans summary
  getChallansSummary: async (): Promise<ChallanSummary> => {
    const response = await http.get<ChallanSummary>(`${endpoints.challans.all}/summary`);
    return response;
  },

  // Pay single challan
  payChallan: async (challanId: string, paymentMethod?: string): Promise<PaymentResponse> => {
    const response = await http.post<PaymentResponse>(
      endpoints.challans.pay(challanId),
      { paymentMethod }
    );
    return response;
  },

  // Bulk pay multiple challans
  bulkPayChallans: async (paymentRequest: PaymentRequest): Promise<PaymentResponse> => {
    const response = await http.post<PaymentResponse>(
      endpoints.challans.bulkPay,
      paymentRequest
    );
    return response;
  },

  // Refresh challans from RTO
  refreshChallans: async (vehicleId?: string): Promise<{ message: string; updated: number }> => {
    const url = vehicleId 
      ? `${endpoints.challans.list(vehicleId)}/refresh`
      : `${endpoints.challans.all}/refresh`;
    
    const response = await http.post<{ message: string; updated: number }>(url);
    return response;
  },

  // Dispute a challan
  disputeChallan: async (challanId: string, reason: string, documents?: File[]): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('reason', reason);
    
    if (documents) {
      documents.forEach((doc, index) => {
        formData.append(`document_${index}`, doc);
      });
    }

    const response = await fetch(
      `${endpoints.challans.details(challanId)}/dispute`,
      {
        method: 'POST',
        body: formData,
      }
    );
    return response.json();
  },

  // Get payment status
  getPaymentStatus: async (paymentId: string): Promise<{ status: string; challanIds: string[] }> => {
    const response = await http.get<{ status: string; challanIds: string[] }>(
      `/payments/${paymentId}/status`
    );
    return response;
  }
};