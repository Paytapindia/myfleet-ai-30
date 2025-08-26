import { http } from "../api/http";
import { endpoints } from "../api/endpoints";
import type { Trip, TripStatus } from "@/types/trip";

export interface CreateTripPayload extends Omit<Trip, "id"> {}

export const TripsApi = {
  list: (params?: { status?: TripStatus; vehicleId?: string; page?: number; pageSize?: number }) =>
    http.get<{ items: Trip[]; total: number }>(endpoints.trips.list, params),

  create: (payload: CreateTripPayload) => http.post<Trip>(endpoints.trips.list, payload),

  getById: (id: string) => http.get<Trip>(endpoints.trips.byId(id)),

  update: (id: string, payload: Partial<CreateTripPayload>) => http.put<Trip>(endpoints.trips.byId(id), payload),

  updateStatus: (id: string, status: TripStatus) => http.post<Trip>(endpoints.trips.status(id), { status }),

  remove: (id: string) => http.delete<void>(endpoints.trips.byId(id)),
};
