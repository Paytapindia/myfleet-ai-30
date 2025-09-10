import { APP_CONFIG, AUTH_TOKEN } from "@/api/appConfig";

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
    endpoint: string,
    payload: Record<string, any>,
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const maxRetries = 1;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      // Add proxy token if configured
      if (this.proxyToken) {
        headers['x-proxy-token'] = this.proxyToken;
      }

      // Add auth token if available
      if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let responseData: any = null;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const textData = await response.text();
        // Try to parse as JSON if it looks like JSON
        if (textData.trim().startsWith('{')) {
          try {
            responseData = JSON.parse(textData);
          } catch {
            responseData = { error: textData };
          }
        } else {
          responseData = { error: textData };
        }
      }

      if (!response.ok) {
        throw new Error(responseData?.message || responseData?.error || `HTTP ${response.status}`);
      }

      return responseData;
    } catch (error: any) {
      console.error(`Direct API call failed (attempt ${retryCount + 1}):`, error);
      
      // Retry on network/timeout errors
      if (
        (error.name === 'AbortError' || 
         error.message?.includes('timeout') || 
         error.message?.includes('network') || 
         error.message?.includes('fetch')) && 
        retryCount < maxRetries
      ) {
        console.log(`Retrying API call... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.makeRequest<T>(endpoint, payload, retryCount + 1);
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
    const payload = {
      service: 'rc',
      vehicleId: vehicleNumber,
      ...(forceRefresh && { forceRefresh })
    };

    return this.makeRequest<VehicleDetails>('', payload);
  }

  // FASTag Verification  
  async verifyFastag(vehicleNumber: string, forceRefresh = false): Promise<ApiResponse<FastagDetails>> {
    const payload = {
      service: 'fastag',
      vehicleId: vehicleNumber,
      ...(forceRefresh && { forceRefresh })
    };

    return this.makeRequest<FastagDetails>('', payload);
  }

  // Challans Verification
  async verifyChallan(
    vehicleNumber: string, 
    chassis: string, 
    engineNumber: string, 
    forceRefresh = false
  ): Promise<ApiResponse<ChallanDetails>> {
    const payload = {
      service: 'challans',
      vehicleId: vehicleNumber,
      chassis: chassis,
      engine_no: engineNumber,
      ...(forceRefresh && { forceRefresh })
    };

    return this.makeRequest<ChallanDetails>('', payload);
  }

  // Vehicle CRUD Operations
  async createVehicle(vehicleData: {
    number: string;
    userId: string;
    model?: string;
  }): Promise<ApiResponse<{ vehicleId: string }>> {
    const payload = {
      action: 'create',
      vehicleData: {
        number: vehicleData.number,
        user_id: vehicleData.userId,
        model: vehicleData.model || 'Not specified',
      }
    };

    return this.makeRequest<{ vehicleId: string }>('', payload);
  }

  async updateVehicle(
    vehicleId: string, 
    updates: Record<string, any>
  ): Promise<ApiResponse<void>> {
    const payload = {
      action: 'update',
      vehicleId,
      updates
    };

    return this.makeRequest<void>('', payload);
  }

  async deleteVehicle(vehicleId: string): Promise<ApiResponse<void>> {
    const payload = {
      action: 'delete',
      vehicleId
    };

    return this.makeRequest<void>('', payload);
  }

  async assignDriver(vehicleId: string, driverId: string, userId: string): Promise<ApiResponse<void>> {
    const payload = {
      action: 'assign-driver',
      vehicleId,
      driverId,
      userId
    };

    return this.makeRequest<void>('', payload);
  }

  async unassignDriver(vehicleId: string, driverId: string): Promise<ApiResponse<void>> {
    const payload = {
      action: 'unassign-driver',
      vehicleId,
      driverId
    };

    return this.makeRequest<void>('', payload);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    const payload = { action: 'health' };
    return this.makeRequest<{ status: string }>('', payload);
  }
}

export const directApi = new DirectApiClient();