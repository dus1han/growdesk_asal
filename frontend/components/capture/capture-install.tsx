import { Download, PlayCircle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CAPTURE_EXTENSION } from "@/lib/capture-extension";

/** How to get the GrowDesk Capture toolbar onto a PC: download it and load it into Chrome. */
export function CaptureInstall({ showGuideLink = false }: { showGuideLink?: boolean }) {
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
      <ol className="space-y-3 p-5 text-sm">
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
          The settings open by themselves. Paste the connection details your admin gives you (Administration → Capture Tool → Connections) and press Save
          &amp; connect.
        </Step>
      </ol>
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
