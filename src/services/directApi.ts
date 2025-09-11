import { APP_CONFIG, AUTH_TOKEN } from "@/api/appConfig";
import { supabase } from '@/integrations/supabase/client';

export interface ApiResponse<T = any> {
  success: boolean;
  status?: string;
  data?: T;
  error?: string;
  cached?: boolean;
  verifiedAt?: string;
  details?: string;
  code?: number;
  message?: string;
  response?: any;
}

export interface VehicleDetails {
  number?: string;
  make?: string;
  model?: string;
  year?: number;
  fuelType?: string;
  ownerName?: string;
  chassisNumber?: string;
  engineNumber?: string;
  registrationDate?: string;
  registrationAuthority?: string;
  permanentAddress?: string;
  financer?: string;
  isFinanced?: boolean;
}

export interface FastagDetails {
  balance?: number;
  linked?: boolean;
  status?: string;
  tagId?: string;
  bankName?: string;
  lastTransactionDate?: string;
  vehicleNumber?: string;
}

export interface ChallanDetails {
  challans?: Array<{
    challan_no?: string;
    amount?: string;
    date?: string;
    area?: string;
    state?: string;
    offence?: string;
    challan_status?: string;
  }>;
}

class DirectApiClient {
  private baseUrl: string;
  private timeout: number;
  private proxyToken?: string;

  constructor() {
    this.baseUrl = APP_CONFIG.apiBaseUrl;
    this.timeout = APP_CONFIG.timeoutMs;
    this.proxyToken = import.meta.env.VITE_API_PROXY_TOKEN;
  }

  private async makeRequest<T>(
    service: 'rc' | 'fastag' | 'challans' | 'health' | 'vehicle',
    payload: Record<string, any>,
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const maxRetries = 1;
    
    try {
      console.log(`📡 Making request via edge function for ${service}:`, payload);
      
      const requestPayload = {
        service,
        ...payload
      };

      const { data, error } = await supabase.functions.invoke('gateway-proxy', {
        body: requestPayload
      });

      if (error) {
        console.error(`❌ Edge function error:`, error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error(`❌ API Error:`, data?.error);
        throw new Error(data?.error || 'API request failed');
      }

      console.log(`✅ API Success:`, data);
      return data;

    } catch (error: any) {
      console.error(`❌ Request failed:`, error);

      // Retry logic for network errors
      if (retryCount < maxRetries && (
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout')
      )) {
        console.log(`🔄 Retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.makeRequest<T>(service, payload, retryCount + 1);
      }

      return {
        success: false,
        error: error.message || 'Network error',
        details: `Failed after ${retryCount + 1} attempts`
      };
    }
  }

  // RC Verification
  async verifyRC(vehicleNumber: string, forceRefresh = false): Promise<ApiResponse<VehicleDetails>> {
    return this.makeRequest<VehicleDetails>('rc', {
      vehicleNumber,
      forceRefresh
    });
  }

  // FASTag Verification  
  async verifyFastag(vehicleNumber: string, forceRefresh = false): Promise<ApiResponse<FastagDetails>> {
    return this.makeRequest<FastagDetails>('fastag', {
      vehicleNumber,
      forceRefresh
    });
  }

  // Challans Verification
  async verifyChallan(
    vehicleNumber: string, 
    chassis: string, 
    engineNumber: string, 
    forceRefresh = false
  ): Promise<ApiResponse<ChallanDetails>> {
    return this.makeRequest<ChallanDetails>('challans', {
      vehicleNumber,
      chassis,
      engineNumber,
      forceRefresh
    });
  }

  // Vehicle CRUD Operations
  async createVehicle(vehicleData: {
    number: string;
    userId: string;
    model?: string;
  }): Promise<ApiResponse<{ vehicleId: string }>> {
    return this.makeRequest<{ vehicleId: string }>('vehicle', {
      action: 'create',
      vehicleData: {
        number: vehicleData.number,
        user_id: vehicleData.userId,
        model: vehicleData.model || 'Not specified',
      }
    });
  }

  async updateVehicle(
    vehicleId: string, 
    updates: Record<string, any>
  ): Promise<ApiResponse<void>> {
    return this.makeRequest<void>('vehicle', {
      action: 'update',
      vehicleId,
      updates
    });
  }

  async deleteVehicle(vehicleId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>('vehicle', {
      action: 'delete',
      vehicleId
    });
  }

  async assignDriver(vehicleId: string, driverId: string, userId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>('vehicle', {
      action: 'assign-driver',
      vehicleId,
      driverId,
      userId
    });
  }

  async unassignDriver(vehicleId: string, driverId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>('vehicle', {
      action: 'unassign-driver',
      vehicleId,
      driverId
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.makeRequest<{ status: string }>('health', {});
  }
}

export const directApi = new DirectApiClient();