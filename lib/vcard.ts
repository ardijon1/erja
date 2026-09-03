/**
 * vCard 3.0 builder (RFC 2426).
 * Pure — takes data as arguments, never imports from content/.
 * All string values are escaped per spec; long lines are folded at
 * 75 octets with continuation (byte-aware for UTF-8 / Farsi safety).
 */

export interface VCardInput {
  name: string;
  title?: string;
  org?: string;
  phone: string;
  email?: string;
  website?: string;
  address?: string;
  bio?: string;
}

/** Escape a single vCard TEXT / structured component value. */
function escapeValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Fold a single vCard content line to 75 octets per RFC 2426 §2.6.
 * Continuation lines start with a single SPACE.
 * Splitting is byte-aware so multi-byte UTF-8 chars (Farsi) are never cut.
 */
export function foldLine(line: string): string {
  const MAX = 75;
  const CONT_MAX = 74; // one byte taken by the leading SPACE
  const bytes = Buffer.from(line, "utf-8");
  if (bytes.length <= MAX) return line;

  const chunks: string[] = [];
  let offset = 0;
  let chunkCap = MAX;

  while (offset < bytes.length) {
    // Don't split inside a UTF-8 continuation byte (10xxxxxx).
    let end = Math.min(offset + chunkCap, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;

    // If we backed up past offset due to a long multi-byte char, just
    // emit the remaining bytes — the lone char will exceed MAX by 1-2
    // bytes rather than being corrupted.
    if (end === offset) end = Math.min(offset + chunkCap, bytes.length);

    chunks.push(bytes.subarray(offset, end).toString("utf-8"));
    offset = end;
    chunkCap = CONT_MAX;
  }

  return chunks.join("\r\n ");
}

function buildLines(input: VCardInput): string[] {
  const lines: string[] = [];
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  // Optional but helpful for interop
  lines.push("PRODID:-//Ardalan Agent Site//vCard 3.0//FA");

  lines.push(foldLine(`FN:${escapeValue(input.name)}`));

  // N: family;given;additional;prefix;suffix  — semicolons are value
  // delimiters and must NOT be escaped. Commas/semicolons inside the
  // name components are escaped.
  const parts = input.name.trim().split(/\s+/);
  const family = parts[parts.length - 1] ?? "";
  const given = parts.slice(0, -1).join(" ");
  lines.push(foldLine(`N:${escapeValue(family)};${escapeValue(given)};;;`));

  if (input.title) lines.push(foldLine(`TITLE:${escapeValue(input.title)}`));
  if (input.org) lines.push(foldLine(`ORG:${escapeValue(input.org)}`));
  if (input.bio) lines.push(foldLine(`NOTE:${escapeValue(input.bio)}`));

  // TYPE param values are case-insensitive; parsers accept CELL/VOICE/etc.
  lines.push(foldLine(`TEL;TYPE=CELL:${escapeValue(input.phone)}`));
  if (input.email) lines.push(foldLine(`EMAIL;TYPE=INTERNET:${escapeValue(input.email)}`));
  if (input.website) lines.push(foldLine(`URL:${escapeValue(input.website)}`));
  if (input.address)
    lines.push(foldLine(`ADR;TYPE=WORK:;;${escapeValue(input.address)};;;;`));

  lines.push("END:VCARD");
  return lines;
}

export function buildVCard(input: VCardInput): string {
  if (!input.name?.trim()) throw new Error("VCard: name is required");
  if (!input.phone?.trim()) throw new Error("VCard: phone is required");
  return buildLines(input).join("\r\n");
}
