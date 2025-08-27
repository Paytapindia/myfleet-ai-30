import { http } from './http';
import { endpoints } from './endpoints';

export interface PayTapAccount {
  id: string;
  balance: number;
  status: 'active' | 'inactive' | 'blocked';
  accountNumber: string;
  createdAt: string;
}

export interface PayTapTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  vehicleId?: string;
  vehicleNumber?: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  referenceNumber: string;
}

export interface PayTapCard {
  id: string;
  cardNumber: string;
  vehicleId?: string;
  vehicleNumber?: string;
  status: 'active' | 'inactive' | 'blocked' | 'pending';
  balance: number;
  expiryDate: string;
  issuedDate: string;
}

export interface AddMoneyRequest {
  amount: number;
  vehicleId?: string;
  paymentMethod: 'upi' | 'netbanking' | 'card';
}

export interface OrderCardRequest {
  vehicleId: string;
  deliveryAddress?: string;
}

export interface TransferMoneyRequest {
  fromVehicleId: string;
  toVehicleId: string;
  amount: number;
}

export interface CardSettings {
  cardId: string;
  cardNumber: string;
  contactlessEnabled: boolean;
  isBlocked: boolean;
  posLimit: number;
  status: 'active' | 'inactive' | 'blocked';
  vehicleId?: string;
}

export interface BlockCardRequest {
  cardId: string;
  temporary: boolean;
  reason?: string;
}

export interface UpdateCardSettingsRequest {
  cardId: string;
  contactlessEnabled?: boolean;
  posLimit?: number;
}

class PayTapApi {
  async getAccount(): Promise<PayTapAccount> {
    return http.get<PayTapAccount>(endpoints.paytap.account);
  }

  async getBalance(vehicleId?: string): Promise<{ balance: number; vehicleBalances?: Record<string, number> }> {
    return http.get<{ balance: number; vehicleBalances?: Record<string, number> }>(
      endpoints.paytap.balance,
      vehicleId ? { vehicleId } : undefined
    );
  }

  async addMoney(request: AddMoneyRequest): Promise<{ orderId: string; paymentUrl: string }> {
    return http.post<{ orderId: string; paymentUrl: string }>(
      endpoints.paytap.addMoney,
      request
    );
  }

  async getTransactions(options?: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: PayTapTransaction[]; total: number }> {
    return http.get<{ transactions: PayTapTransaction[]; total: number }>(
      endpoints.paytap.transactions,
      options
    );
  }

  async getCards(vehicleId?: string): Promise<PayTapCard[]> {
    return http.get<PayTapCard[]>(
      endpoints.paytap.cards, 
      vehicleId ? { vehicleId } : undefined
    );
  }

  async orderCard(request: OrderCardRequest): Promise<{ cardId: string; estimatedDelivery: string }> {
    return http.post<{ cardId: string; estimatedDelivery: string }>(
      endpoints.paytap.orderCard,
      request
    );
  }

  async assignCard(vehicleId: string, cardId: string): Promise<{ success: boolean }> {
    return http.post<{ success: boolean }>(
      endpoints.paytap.assignCard(vehicleId),
      { cardId }
    );
  }

  async transferMoney(request: TransferMoneyRequest): Promise<{ transactionId: string }> {
    return http.post<{ transactionId: string }>(
      endpoints.paytap.transferMoney,
      request
    );
  }

  async refreshAccount(): Promise<PayTapAccount> {
    return http.post<PayTapAccount>(`${endpoints.paytap.account}/refresh`);
  }

  async getCardSettings(cardId: string): Promise<CardSettings> {
    return http.get<CardSettings>(endpoints.paytap.cardSettings(cardId));
  }

  async updateContactlessPayment(cardId: string, enabled: boolean): Promise<{ success: boolean }> {
    return http.post<{ success: boolean }>(
      endpoints.paytap.updateCardSettings(cardId),
      { contactlessEnabled: enabled }
    );
  }

  async blockCard(request: BlockCardRequest): Promise<{ success: boolean }> {
    return http.post<{ success: boolean }>(
      endpoints.paytap.blockCard,
      request
    );
  }

  async unblockCard(cardId: string): Promise<{ success: boolean }> {
    return http.post<{ success: boolean }>(
      endpoints.paytap.unblockCard(cardId)
    );
  }

  async setPosLimit(cardId: string, limit: number): Promise<{ success: boolean }> {
    return http.post<{ success: boolean }>(
      endpoints.paytap.updateCardSettings(cardId),
      { posLimit: limit }
    );
  }
}

export const paytapApi = new PayTapApi();