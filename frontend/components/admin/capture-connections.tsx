"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, KeyRound, Plug, Plus, ShieldAlert, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, Field, Input } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, useCaptureClientMutations, useCaptureClients } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { CAPTURE_EXTENSION } from "@/lib/capture-extension";
import { copyText } from "@/lib/clipboard";
import { isNewerVersion } from "@/lib/version";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CaptureClient, CaptureClientCreated, ConnectionKind } from "@/types/admin";

/** Wording for each kind of connection. */
const COPY: Record<
  ConnectionKind,
  {
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    addDescription: string;
    readyDescription: (name: string) => string;
    placeholder: string;
    hint: string;
    revoked: string;
  }
> = {
  Toolbar: {
    description: "Each PC running the toolbar signs in with its own connection. Revoke one to cut that PC off straight away.",
    emptyTitle: "No connections yet",
    emptyDescription: "Add one for each PC that runs the GrowDesk Capture toolbar, then enter its details in the toolbar's settings.",
    addDescription: "One connection per PC that runs the toolbar.",
    readyDescription: (name) => `Enter these in the GrowDesk Capture settings on ${name}.`,
    placeholder: "Reception PC",
    hint: "Which PC or person this is for, so you know what to revoke later.",
    revoked: "can no longer send leads",
  },
  Bot: {
    description: "The WhatsApp BOT signs in with its own connection. Revoke it to stop the bot straight away.",
    emptyTitle: "No bot connection yet",
    emptyDescription: "Add a connection and give its details to the bot's developer, with the API guide.",
    addDescription: "Usually one connection for your WhatsApp BOT.",
    readyDescription: (name) => `Give these to the developer of ${name}. The bot uses them to sign in.`,
    placeholder: "WhatsApp BOT",
    hint: "Which bot this is for, so you know what to revoke later.",
    revoked: "can no longer create customers or bookings",
  },
};

/**
 * The connections the GrowDesk Capture toolbar (one per PC) or the WhatsApp BOT signs in with,
 * each with its own client ID and secret, so one can be cut off without touching the others.
 */
export function CaptureConnections({ kind = "Toolbar" }: { kind?: ConnectionKind }) {
  const { data: all, isPending } = useCaptureClients();
  const [adding, setAdding] = useState(false);
  const copy = COPY[kind];
  const data = all?.filter((c) => c.kind === kind);
  const active = data?.filter((c) => c.isActive) ?? [];
  const revoked = data?.filter((c) => !c.isActive) ?? [];

  return (
    <Card className="mt-6 overflow-hidden">
      <CardHeader
        title="Connections"
        description={copy.description}
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add connection
          </Button>
        }
      />
      {isPending ? (
        <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Plug}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          className="py-10"
        />
      ) : (
        <ul className="divide-y divide-line">
          {[...active, ...revoked].map((c) => (
            <ConnectionRow key={c.id} client={c} />
          ))}
        </ul>
      )}
      <AddConnectionDrawer kind={kind} open={adding} onClose={() => setAdding(false)} />
    </Card>
  );
}

function ConnectionRow({ client }: { client: CaptureClient }) {
  const { revoke } = useCaptureClientMutations();
  const [confirming, setConfirming] = useState(false);

  // The confirm step times out, so a stray click can't revoke later.
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5", !client.isActive && "opacity-60")}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", client.isActive ? "bg-brand-soft text-brand" : "bg-surface-muted text-muted")}>
        <KeyRound className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold">{client.name}</span>
          {client.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Revoked</Badge>}
          {client.isActive && client.extensionVersion && isNewerVersion(CAPTURE_EXTENSION.version, client.extensionVersion) && (
            <Badge tone="warning">Update available</Badge>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          <span className="font-mono">{client.clientId}</span>
          {" · "}
          {client.isActive ? (
            <span title={client.lastUsedAt ? formatDateTime(client.lastUsedAt) : undefined}>
              {client.lastUsedAt ? `Last used ${formatRelative(client.lastUsedAt)}` : "Not used yet"}
              {client.extensionVersion && ` · v${client.extensionVersion}`}
            </span>
          ) : (
            <span>Revoked {formatRelative(client.revokedAt)}</span>
          )}
        </p>
      </div>
      {client.isActive && (
        <Button
          size="sm"
          variant={confirming ? "danger" : "ghost"}
          disabled={revoke.isPending}
          onClick={() => {
            if (!confirming) return setConfirming(true);
            revoke.mutate(client.id, {
              onSuccess: () => toast.success(`${client.name} ${COPY[client.kind].revoked}`),
              onError: toastError,
            });
          }}
          className={cn(!confirming && "text-danger hover:bg-red-50")}
        >
          {confirming ? "Click again to revoke" : "Revoke"}
        </Button>
      )}
    </li>
  );
}

const schema = z.object({ name: z.string().trim().min(1, "Give the connection a name, e.g. Reception PC.").max(100) });

function AddConnectionDrawer({ kind, open, onClose }: { kind: ConnectionKind; open: boolean; onClose: () => void }) {
  const [created, setCreated] = useState<CaptureClientCreated | null>(null);
  const close = () => {
    setCreated(null);
    onClose();
  };
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && close()}
      title={created ? "Connection ready" : "Add connection"}
      description={created ? COPY[kind].readyDescription(created.client.name) : COPY[kind].addDescription}
      footer={
        created ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form="capture-connection-form">
              Create connection
            </Button>
          </>
        )
      }
    >
      {open && (created ? <CreatedDetails created={created} /> : <AddConnectionForm kind={kind} onCreated={setCreated} />)}
    </Drawer>
  );
}

function AddConnectionForm({ kind, onCreated }: { kind: ConnectionKind; onCreated: (c: CaptureClientCreated) => void }) {
  const { create } = useCaptureClientMutations();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: kind === "Bot" ? "WhatsApp BOT" : "" } });

  const onSubmit = handleSubmit(async ({ name }) => {
    try {
      onCreated(await create.mutateAsync({ name: name.trim(), kind }));
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.some((f) => f.field === "name")) {
        setError("name", { message: error.message });
        return;
      }
      toastError(error);
    }
  });

  return (
    <form id="capture-connection-form" onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field label="Name" required hint={COPY[kind].hint} error={errors.name?.message}>
        {(p) => <Input {...p} autoFocus placeholder={COPY[kind].placeholder} {...register("name")} />}
      </Field>
    </form>
  );
}

function CreatedDetails({ created }: { created: CaptureClientCreated }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []); // eslint-disable-line react-hooks/set-state-in-effect -- read once after mount
  const insecure = origin.startsWith("http://");
  const bot = created.client.kind === "Bot";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-semibold">Copy the secret now.</span> It is shown only once. If it&apos;s lost, revoke this
          connection and add a new one.
        </p>
      </div>
      {bot ? <CopyField label="API address" value={`${origin}/api/bot`} mono /> : <CopyField label="Server" value={origin} />}
      <CopyField label="Client ID" value={created.client.clientId} mono />
      <CopyField label="Client secret" value={created.clientSecret} mono secret />
      {bot && insecure && (
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-muted/60 p-4 text-xs text-muted">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            GrowDesk is served over plain HTTP, so the bot&apos;s secret and customer details travel unencrypted. Move GrowDesk
            to a domain with HTTPS before the bot goes live.
          </p>
        </div>
      )}
    </motion.div>
  );
}

function CopyField({ label, value, mono, secret }: { label: string; value: string; mono?: boolean; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (await copyText(value, e.currentTarget)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error("Couldn't copy. Select the text and copy it instead.");
    }
  };
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-muted">{label}</p>
      <div className={cn("flex items-center gap-2 rounded-xl border bg-surface px-3 py-2.5", secret ? "border-brand/40 ring-2 ring-brand/10" : "border-line")}>
        <span className={cn("min-w-0 flex-1 select-all break-all text-sm", mono && "font-mono text-[13px]")}>{value}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span key="ok" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                <Check className="size-4 text-emerald-600" />
              </motion.span>
            ) : (
              <motion.span key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                <Copy className="size-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
