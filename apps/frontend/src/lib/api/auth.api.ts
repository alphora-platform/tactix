import { apiClient } from './client';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export interface SignUpPayload {
  email: string;
  username: string;
  password: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export async function signUp(payload: SignUpPayload): Promise<AuthUser> {
  const res = await apiClient.post<AuthUser>('/auth/sign-up', payload);
  return res.data;
}

export async function signIn(payload: SignInPayload): Promise<AuthUser> {
  const res = await apiClient.post<AuthUser>('/auth/sign-in', payload);
  return res.data;
}

export async function signOut(): Promise<void> {
  await apiClient.post('/auth/sign-out');
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await apiClient.get<AuthUser>('/auth/me');
  return res.data;
}
