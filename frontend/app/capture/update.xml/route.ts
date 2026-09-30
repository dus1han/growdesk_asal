import { CAPTURE_EXTENSION } from "@/lib/capture-extension";

/**
 * Chrome's update manifest for the GrowDesk Capture extension. With the policy line
 * `<id>;https://<growdesk>/capture/update.xml`, Chrome installs the extension from GrowDesk and
 * keeps it up to date. The package address is built from the address Chrome used to get here.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0] ?? url.protocol.replace(":", "");
  const codebase = `${proto}://${host}${CAPTURE_EXTENSION.crx}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="${CAPTURE_EXTENSION.id}">
    <updatecheck codebase="${codebase}" version="${CAPTURE_EXTENSION.version}" />
  </app>
</gupdate>
`;
  return new Response(xml, { headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-cache" } });
}
