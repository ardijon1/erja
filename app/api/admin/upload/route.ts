import { NextRequest, NextResponse } from "next/server";

import { getAuthToken, verifySession } from "@/lib/auth";
import { env } from "@/lib/env";
import { cleanupIfNeeded, getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — دوربین موبایل معمولاً ۲-۵MB

/**
 * آپلود عکس نماینده از گالری/دوربین.
 * ورودی multipart/form-data با فیلد file — خروجی مسیر عمومی برای SiteContent.photo.
 * تصویر سمت سرور به ۵۱۲×۵۱۲ JPEG تبدیل می‌شود (بدون بار سنگین روی گوشی کاربر).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = await getAuthToken();
  if (!token || !(await verifySession(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  cleanupIfNeeded();
  const ip = getClientIp(request);
  if (!rateLimit(`upload:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد است، کمی بعد تلاش کنید" }, { status: 429 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "فایل ارسال نشده است" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "فرم نامعتبر است" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایلی انتخاب نشده است" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "حجم فایل بیش از ۸ مگابایت است" }, { status: 413 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "فایل خالی است" }, { status: 400 });
  }
  const mimeOk = /^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type);
  const extOk = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!mimeOk && !extOk) {
    return NextResponse.json({ error: "فقط عکس (JPG/PNG/WebP/HEIC) پذیرفته می‌شود" }, { status: 415 });
  }

  let sharp: typeof import("sharp").default;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    return NextResponse.json({ error: "خطا در پردازش تصویر" }, { status: 500 });
  }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await sharp(inputBuffer, { failOn: "none" })
      .rotate() // اعمال EXIF orientation
      .resize(512, 512, { fit: "cover", position: "attention" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    // نگهداری نهایتاً ۳ نسخه (نسخه فعلی + ۲ بکاپ اخیر)
    const uploadDir = "public/uploads";
    const fs = await import("node:fs/promises");
    await fs.mkdir(uploadDir, { recursive: true });
    const existing = (await fs.readdir(uploadDir)).filter((f) => /^profile-\d+\.jpg$/.test(f)).sort();
    while (existing.length >= 3) {
      const oldest = existing.shift();
      if (oldest) await fs.rm(`${uploadDir}/${oldest}`, { force: true }).catch(() => {});
    }

    const filename = `profile-${Date.now()}.jpg`;
    await fs.writeFile(`${uploadDir}/${filename}`, outputBuffer);

    return NextResponse.json({ path: `/uploads/${filename}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فایل عکس معتبر نیست" }, { status: 400 });
  }
}

// اطمینان از استفاده env (قاعده §2.2) — NODE_ENV برای مسیر تولید
void env.NODE_ENV;
