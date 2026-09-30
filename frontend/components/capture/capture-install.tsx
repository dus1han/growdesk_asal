"use client";

import { motion } from "framer-motion";
import { Building2, Check, Copy, Download, Laptop, PlayCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CAPTURE_EXTENSION } from "@/lib/capture-extension";
import { cn } from "@/lib/utils";

/**
 * How to get the GrowDesk Capture toolbar onto a PC: download it for one PC, or give IT the
 * policy line that installs it on every managed PC from GrowDesk and keeps it updated.
 */
export function CaptureInstall({ showGuideLink = true }: { showGuideLink?: boolean }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []); // eslint-disable-line react-hooks/set-state-in-effect -- read once after mount
  const policyLine = origin ? `${CAPTURE_EXTENSION.id};${origin}${CAPTURE_EXTENSION.updateManifest}` : "";
  const https = origin.startsWith("https://");

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Get the toolbar"
        description={`GrowDesk Capture ${CAPTURE_EXTENSION.version} for Google Chrome. Every PC that captures leads needs it, plus a connection from your admin.`}
        action={
          showGuideLink ? (
            <Link href="/capture-guide" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <PlayCircle className="size-4" /> How to use
            </Link>
          ) : undefined
        }
      />
      <div className="grid gap-px bg-line md:grid-cols-2">
        {/* One PC */}
        <section className="bg-surface p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
              <Laptop className="size-4" />
            </span>
            On one PC
          </h3>
          <ol className="mt-4 space-y-3 text-sm">
            <Step n={1}>
              <a
                href={CAPTURE_EXTENSION.download}
                download
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-white shadow-[0_6px_16px_-8px_rgb(91_91_246/0.9)] transition hover:bg-brand-strong"
              >
                <Download className="size-4" /> Download GrowDesk Capture
              </a>
            </Step>
            <Step n={2}>Unzip it to a folder that stays, e.g. Documents\GrowDesk Capture. Chrome runs it from there.</Step>
            <Step n={3}>
              In Chrome open <Code>chrome://extensions</Code>, turn on <b>Developer mode</b>, click <b>Load unpacked</b> and choose the{" "}
              <Code>growdesk-capture</Code> folder.
            </Step>
            <Step n={4}>
              The settings open by themselves. Paste the connection details your admin gives you (Administration → Capture Tool → Connections) and press
              Save &amp; connect.
            </Step>
          </ol>
          <p className="mt-4 rounded-xl bg-surface-muted/70 px-3.5 py-2.5 text-xs text-muted">
            Company-managed PCs usually block Load unpacked. Use the IT option instead.
          </p>
        </section>

        {/* Every managed PC */}
        <section className="bg-surface p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
              <Building2 className="size-4" />
            </span>
            On every office PC (for IT)
          </h3>
          <p className="mt-4 text-sm text-foreground/80">
            Add this line to the Chrome policy <b>ExtensionInstallForcelist</b>. Chrome then installs GrowDesk Capture from GrowDesk on every PC and keeps it
            up to date by itself.
          </p>
          <CopyLine value={policyLine} />
          {origin && !https && (
            <p className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Chrome accepts this only over <b>https</b>. It will work once GrowDesk has a domain with HTTPS; until then, use the one-PC option.
              </span>
            </p>
          )}
          <p className="mt-3 text-xs text-muted">
            Replacing the old “CRM Capture” prototype: remove its policy line, reload policies (<Code>chrome://policy</Code>), then add this one.
          </p>
        </section>
      </div>
    </Card>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">{n}</span>
      <div className="min-w-0 pt-0.5 text-foreground/80">{children}</div>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">{children}</code>;
}

function CopyLine({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy. Select the line and copy it instead.");
    }
  };
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface-muted/50 py-1.5 pl-3 pr-1.5">
      <code className="min-w-0 flex-1 select-all break-all font-mono text-[12px]">{value || "…"}</code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy the policy line"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        <motion.span key={copied ? "ok" : "copy"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {copied ? <Check className={cn("size-4 text-emerald-600")} /> : <Copy className="size-4" />}
        </motion.span>
      </button>
    </div>
  );
}
