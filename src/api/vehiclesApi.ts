import { http } from "../api/http";
import { endpoints } from "../api/endpoints";
import type { Vehicle } from "@/types/vehicle";

export interface VehiclePayload extends Omit<Vehicle, "id"> {}

export const VehiclesApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    http.get<{ items: Vehicle[]; total: number }>(endpoints.vehicles.list, params),

  create: (payload: VehiclePayload) => http.post<Vehicle>(endpoints.vehicles.list, payload),

  getById: (id: string) => http.get<Vehicle>(endpoints.vehicles.byId(id)),

  update: (id: string, payload: Partial<VehiclePayload>) => http.put<Vehicle>(endpoints.vehicles.byId(id), payload),

  remove: (id: string) => http.delete<void>(endpoints.vehicles.byId(id)),

  assignDriver: (vehicleId: string, driverId: string) =>
    http.post<void>(endpoints.vehicles.assignDriver(vehicleId), { driverId }),

  unassignDriver: (vehicleId: string, driverId: string) =>
    http.post<void>(endpoints.vehicles.unassignDriver(vehicleId), { driverId }),
};
