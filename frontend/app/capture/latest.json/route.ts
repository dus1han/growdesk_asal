import { CAPTURE_EXTENSION } from "@/lib/capture-extension";

/**
 * The newest GrowDesk Capture version GrowDesk offers. The toolbar checks this and shows an
 * Update button when it is behind. Public, like the download itself.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0] ?? url.protocol.replace(":", "");
  const origin = `${proto}://${host}`;
  return Response.json(
    { version: CAPTURE_EXTENSION.version, download: `${origin}${CAPTURE_EXTENSION.download}`, guide: `${origin}/capture-guide` },
    { headers: { "Cache-Control": "no-cache" } },
  );
}
