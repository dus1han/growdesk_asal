import {
  AlignLeft,
  AtSign,
  CalendarDays,
  Hash,
  ListChecks,
  ListCollapse,
  Phone,
  ToggleLeft,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { CustomFieldType } from "@/types/admin";

export const FIELD_TYPE_META: Record<CustomFieldType, { label: string; icon: LucideIcon; hint: string }> = {
  Text: { label: "Text", icon: Type, hint: "A short line of text" },
  Textarea: { label: "Long text", icon: AlignLeft, hint: "Several lines of notes" },
  Number: { label: "Number", icon: Hash, hint: "A whole or decimal number" },
  Phone: { label: "Phone", icon: Phone, hint: "A phone number" },
  Email: { label: "Email", icon: AtSign, hint: "An email address" },
  Date: { label: "Date", icon: CalendarDays, hint: "A calendar date" },
  Dropdown: { label: "Dropdown", icon: ListCollapse, hint: "Pick one option" },
  MultiSelect: { label: "Multi-select", icon: ListChecks, hint: "Pick any number of options" },
  Boolean: { label: "Yes / No", icon: ToggleLeft, hint: "A single checkbox" },
};

/** Built-in capture field types come back lower-case from the API. */
export function fieldTypeMeta(type: string) {
  const match = (Object.keys(FIELD_TYPE_META) as CustomFieldType[]).find((t) => t.toLowerCase() === type.toLowerCase());
  return match ? FIELD_TYPE_META[match] : FIELD_TYPE_META.Text;
}
