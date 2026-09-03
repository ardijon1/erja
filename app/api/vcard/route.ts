import { NextResponse } from "next/server";
import { buildVCard } from "@/lib/vcard";
import { getSiteContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const content = await getSiteContent();
    const vcf = buildVCard({
      name: content.name,
      title: content.title,
      phone: content.phone,
      website: content.website,
      address: content.address ?? undefined,
      bio: content.bio,
    });

    const asciiFallback = "contact.vcf";
    const filename = `${content.name}.vcf`;
    const encodedFilename = encodeURIComponent(filename);

    const body = Buffer.from(vcf, "utf-8");

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build vCard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
