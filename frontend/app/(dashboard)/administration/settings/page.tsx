"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { LogoMark } from "@/components/ui/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, useSaveSystemSettings, useSystemSettings } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { SystemSettings } from "@/types/admin";

/** Listed first; the rest follow alphabetically. */
const COMMON_CURRENCIES = ["AED", "SAR", "QAR", "KWD", "BHD", "OMR", "USD", "EUR", "GBP", "INR", "LKR", "AUD"];

const schema = z.object({
  crmName: z.string().trim().min(1, "Please enter the CRM name.").max(60),
  tagline: z.string().trim().max(160),
  logoUrl: z.union([z.literal(""), z.string().trim().url("Enter a full image URL starting with https://")]),
  currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency."),
  timeZone: z.string().min(1, "Choose a time zone."),
});
type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const { data, isPending, isError, refetch } = useSystemSettings();

  return (
    <>
      <PageHeader title="System Settings" description="Branding shown on the login screen and sidebar, plus regional defaults." />
      {isPending ? (
        <Card className="space-y-4 p-6" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </Card>
      ) : isError ? (
        <Card>
          <EmptyState
            icon={CircleAlert}
            title="Couldn't load settings"
            description="Check your connection and try again."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                <RotateCcw className="size-4" /> Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <SettingsForm settings={data} />
      )}
    </>
  );
}

function SettingsForm({ settings }: { settings: SystemSettings }) {
  const save = useSaveSystemSettings();
  const timeZones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const currencies = useMemo(() => {
    const names = new Intl.DisplayNames(undefined, { type: "currency" });
    const all = Intl.supportedValuesOf("currency");
    const ordered = [...COMMON_CURRENCIES.filter((c) => all.includes(c)), ...all.filter((c) => !COMMON_CURRENCIES.includes(c))];
    return ordered.map((code) => ({ code, name: names.of(code) ?? code }));
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...settings, logoUrl: settings.logoUrl ?? "" },
  });
  const [crmName, tagline, logoUrl] = useWatch({ control, name: ["crmName", "tagline", "logoUrl"] });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await save.mutateAsync({ ...values, logoUrl: values.logoUrl || null });
      reset({ ...updated, logoUrl: updated.logoUrl ?? "" });
      toast.success("Settings saved");
    } catch (error) {
      if (error instanceof ApiError) {
        for (const fe of error.fieldErrors) {
          if (fe.field && fe.field in values) setError(fe.field as keyof FormValues, { message: fe.message });
        }
      }
      toastError(error);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader title="Branding" description="Your clinic's name and logo on the login screen and in the sidebar." />
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-5">
            <Field label="CRM name" error={errors.crmName?.message}>
              {(p) => <Input {...p} {...register("crmName")} />}
            </Field>
            <Field label="Tagline" optional hint="One short line under the name on the login screen." error={errors.tagline?.message}>
              {(p) => <Input {...p} {...register("tagline")} />}
            </Field>
            <Field label="Logo URL" optional hint="A square image works best. Leave empty to use the GrowDesk mark." error={errors.logoUrl?.message}>
              {(p) => <Input {...p} type="url" placeholder="https://…" {...register("logoUrl")} />}
            </Field>
          </div>

          {/* Live preview of the login branding */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#07071a] bg-[radial-gradient(circle_at_30%_20%,rgb(91_91_246/0.45),transparent_60%)] p-6 text-center text-white">
            {logoUrl && /^https?:\/\//.test(logoUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview of an admin-supplied URL
              <img src={logoUrl} alt="" className="size-12 rounded-xl object-cover" />
            ) : (
              <LogoMark className="size-12" />
            )}
            <p className="mt-3 font-display text-lg font-bold">{crmName || "GrowDesk"}</p>
            {tagline && <p className="mt-1 text-xs text-white/60">{tagline}</p>}
            <p className="mt-4 text-[10px] uppercase tracking-[0.1em] text-white/40">Login preview</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Regional" description="Used for consultation charges and for showing dates and times." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Currency" hint="Shown on consultation charges and payments." error={errors.currency?.message}>
            {(p) => (
              <Select {...p} {...register("currency")}>
                {currencies.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {code} · {name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Time zone" hint="The clinic's local time." error={errors.timeZone?.message}>
            {(p) => (
              <Select {...p} {...register("timeZone")}>
                {timeZones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={!isDirty || isSubmitting} onClick={() => reset()}>
          Discard
        </Button>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
