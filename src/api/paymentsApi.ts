import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

export interface CreateOrderRequest {
  plan: "semiannual" | "annual";
  customer: { id: string; phone?: string; email?: string; name?: string };
  returnUrl: string;
}

export interface CreateOrderResponse {
  payment_session_id: string;
  order_id: string;
}

export interface VerifyOrderRequest { orderId: string }
export interface VerifyOrderResponse { isPaid: boolean; plan: string | null; raw?: any }

export const PaymentsApi = {
  createCashfreeOrder: (payload: CreateOrderRequest) => http.post<CreateOrderResponse>(endpoints.payments.createOrder, payload),
  verifyCashfreeOrder: (payload: VerifyOrderRequest) => http.post<VerifyOrderResponse>(endpoints.payments.verifyOrder, payload),
};
