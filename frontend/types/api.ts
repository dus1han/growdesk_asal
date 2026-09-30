/** The envelope every API response uses (backend DTOs/ApiResponse.cs). */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  errors?: ApiFieldError[] | null;
}

export interface ApiFieldError {
  field: string | null;
  message: string;
}

export interface CurrentUser {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface Session {
  user: CurrentUser;
  expiresAt: string;
}

export interface Branding {
  crmName: string;
  tagline: string;
  logoUrl: string | null;
}
