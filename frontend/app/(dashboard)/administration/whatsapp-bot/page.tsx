"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CaptureConnections } from "@/components/admin/capture-connections";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Switch } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, useBookingHours, useSaveBookingHours } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { BookingHours, OpeningDay } from "@/types/admin";

const LENGTHS = [15, 20, 30, 45, 60, 75, 90, 120];

export default function WhatsAppBotPage() {
  return (
    <>
      <PageHeader
        title="WhatsApp BOT"
        description="Let your WhatsApp chatbot save interested customers and book consultations. GrowDesk checks every booking against your opening hours and calendar, and shows new bookings on everyone's screen as they arrive."
      />
      <OpeningHoursCard />
      <CaptureConnections kind="Bot" />
    </>
  );
}

// ---- Opening hours -------------------------------------------------------------------------------

function OpeningHoursCard() {
  const { data: saved, isPending, isError, refetch } = useBookingHours();
  const save = useSaveBookingHours();
  const [draft, setDraft] = useState<BookingHours | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hours = draft ?? saved;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  // A fresh error message for each edit.
  useEffect(() => setError(null), [draft]); // eslint-disable-line react-hooks/set-state-in-effect -- clear on edit

  const patchDay = (day: string, change: Partial<OpeningDay>) =>
    hours && setDraft({ ...hours, days: hours.days.map((d) => (d.day === day ? { ...d, ...change } : d)) });

  const onSave = () =>
    hours &&
    save.mutate(hours, {
      onSuccess: () => {
        setDraft(null);
        toast.success("Opening hours saved");
      },
      onError: (e) => (e instanceof ApiError && e.status === 400 ? setError(e.message) : toastError(e)),
    });

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Opening hours"
        description="The bot only offers and books times inside these hours. Staff can still book any time in GrowDesk."
      />
      {isPending ? (
        <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : isError || !hours ? (
        <EmptyState
          icon={CircleAlert}
          title="Couldn't load the opening hours"
          description="Please try again."
          action={<Button variant="secondary" onClick={() => void refetch()}>Try again</Button>}
          className="py-10"
        />
      ) : (
        <div className="p-5">
          <label className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">Each bot booking lasts</span>
            <Select
              value={hours.botBookingMinutes}
              onChange={(e) => setDraft({ ...hours, botBookingMinutes: Number(e.target.value) })}
              className="w-32"
              aria-label="Bot booking length"
            >
              {LENGTHS.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </Select>
            <span className="text-xs text-muted">The end time is worked out from the start time.</span>
          </label>

          <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
            {hours.days.map((d) => (
              <li key={d.day} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
                <span className="w-24 text-sm font-medium capitalize">{d.day}</span>
                <Switch
                  size="sm"
                  checked={d.isOpen}
                  label={`Open on ${d.day}`}
                  onCheckedChange={(open) =>
                    patchDay(d.day, open ? { isOpen: true, from: d.from ?? "09:00", to: d.to ?? "18:00" } : { isOpen: false })
                  }
                />
                {d.isOpen ? (
                  <span className="flex items-center gap-2 text-sm">
                    <Input
                      type="time"
                      step={900}
                      value={d.from ?? ""}
                      onChange={(e) => patchDay(d.day, { from: e.target.value })}
                      className="h-9 w-32"
                      aria-label={`${d.day} opens at`}
                    />
                    <span className="text-muted">to</span>
                    <Input
                      type="time"
                      step={900}
                      value={d.to ?? ""}
                      onChange={(e) => patchDay(d.day, { to: e.target.value })}
                      className="h-9 w-32"
                      aria-label={`${d.day} closes at`}
                    />
                  </span>
                ) : (
                  <span className="text-sm text-muted">Closed</span>
                )}
              </li>
            ))}
          </ul>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="mt-3 text-sm text-danger"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {dirty && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="ghost" onClick={() => setDraft(null)}>
                    <RotateCcw className="size-4" /> Undo
                  </Button>
                  <Button onClick={onSave} disabled={save.isPending}>
                    Save opening hours
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
