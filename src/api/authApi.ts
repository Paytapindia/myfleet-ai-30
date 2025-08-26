import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

export interface SendOtpRequest { phone: string; }
export interface VerifyOtpRequest { phone: string; otp: string; }
export interface AuthResponse { token: string; user: any; }

export const AuthApi = {
  sendOtp: (payload: SendOtpRequest) => http.post<void>(endpoints.auth.sendOtp, payload),
  verifyOtp: (payload: VerifyOtpRequest) => http.post<AuthResponse>(endpoints.auth.verifyOtp, payload),
  me: () => http.get<any>(endpoints.auth.me),
  logout: () => http.post<void>(endpoints.auth.logout),
};
