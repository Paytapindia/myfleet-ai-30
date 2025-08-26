import { http } from "../api/http";
import { endpoints } from "../api/endpoints";
import type { Transaction } from "@/types/transaction";

export interface TransactionPayload extends Omit<Transaction, "id"> {}

export const TransactionsApi = {
  list: (params?: { vehicleId?: string; type?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) =>
    http.get<{ items: Transaction[]; total: number }>(endpoints.transactions.list, params),

  create: (payload: TransactionPayload) => http.post<Transaction>(endpoints.transactions.list, payload),

  getById: (id: string) => http.get<Transaction>(endpoints.transactions.byId(id)),

  update: (id: string, payload: Partial<TransactionPayload>) => http.put<Transaction>(endpoints.transactions.byId(id), payload),

  remove: (id: string) => http.delete<void>(endpoints.transactions.byId(id)),

  analytics: (params?: { period?: "today" | "weekly" | "monthly" | "yearly" }) =>
    http.get<{ revenue: number; expenses: number; net: number }>(endpoints.transactions.analytics, params),
};
