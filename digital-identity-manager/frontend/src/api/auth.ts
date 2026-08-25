import * as c from './client'
import type { AuthResponse, BootstrapStatus, HealthResponse, User } from './types'

export const getHealth = () => c.get<HealthResponse>('/health')
export const getBootstrapStatus = () => c.get<BootstrapStatus>('/auth/bootstrap-status')
export const bootstrap = (data: { email: string; password: string; display_name?: string }) =>
  c.post<AuthResponse>('/auth/bootstrap', data)
export const login = (data: { email: string; password: string }) => c.post<AuthResponse>('/auth/login', data)
export const getMe = () => c.get<User>('/auth/me')
export const changePassword = (data: { current_password: string; new_password: string }) =>
  c.post<{ status: string }>('/auth/password', data)
