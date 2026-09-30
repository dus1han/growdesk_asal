import type { Metadata } from "next";
import { CaptureInstall } from "@/components/capture/capture-install";
import { GuidePlayer } from "@/components/capture/guide/guide-player";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "GrowDesk Capture" };

/**
 * For every user: get the capture toolbar and watch how to use it. The toolbar's ? button
 * opens this page; so does "GrowDesk Capture" in the account menu.
 */
export default function CaptureGuidePage() {
  return (
    <>
      <PageHeader title="GrowDesk Capture" description="Capture leads from WhatsApp Web and Instagram into GrowDesk in a few clicks." />
      <h2 className="mb-3 font-display text-lg font-bold tracking-tight">How to use it</h2>
      <GuidePlayer />
      <div className="mt-10">
        <CaptureInstall showGuideLink={false} />
      </div>
    </>
  );
}
