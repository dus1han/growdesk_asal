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
  username: string;
  email: string | null;
  roles: string[];
  permissions: string[];
  /** Set after an admin creates the account or resets its password (see /change-password). */
  mustChangePassword: boolean;
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
