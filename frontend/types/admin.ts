/** Mirrors backend DTOs/AdminDtos.cs. */

export interface LookupItem {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  systemKey: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface SaveLookupItem {
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
}

export interface AdminUser {
  id: number;
  fullName: string;
  username: string;
  email: string | null;
  roleId: number | null;
  roleName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUser {
  fullName: string;
  username: string;
  email: string | null;
  roleId: number;
  password: string;
}

export type UpdateUser = Omit<CreateUser, "password">;

export const CUSTOM_FIELD_TYPES = [
  "Text",
  "Textarea",
  "Number",
  "Phone",
  "Email",
  "Date",
  "Dropdown",
  "MultiSelect",
  "Boolean",
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface CustomFieldOption {
  id: number;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CustomField {
  id: number;
  key: string;
  label: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  options: CustomFieldOption[];
}

export interface SaveCustomField {
  label: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  options: { id: number | null; label: string }[] | null;
}

export interface CaptureField {
  key: string;
  label: string;
  type: string;
  isCustom: boolean;
  locked: boolean;
  isEnabled: boolean;
  isRequired: boolean;
  displayOrder: number;
}
