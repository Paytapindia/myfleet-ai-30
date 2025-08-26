import { http } from "../api/http";
import { endpoints } from "../api/endpoints";
import type { Driver } from "@/types/driver";

export interface DriverPayload extends Omit<Driver, "id"> {}

export const DriversApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    http.get<{ items: Driver[]; total: number }>(endpoints.drivers.list, params),

  create: (payload: DriverPayload) => http.post<Driver>(endpoints.drivers.list, payload),

  getById: (id: string) => http.get<Driver>(endpoints.drivers.byId(id)),

  update: (id: string, payload: Partial<DriverPayload>) => http.put<Driver>(endpoints.drivers.byId(id), payload),

  remove: (id: string) => http.delete<void>(endpoints.drivers.byId(id)),
};
