import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SealMark } from "@/components/shared/SealMark";
import { formatNumberFa, toPersianDigits } from "@/lib/format";
import type { ResolvedSiteContent } from "@/lib/site-content";

export default function ProfileHero({ content }: { content: ResolvedSiteContent }) {
  const { name, title, bio, photo, yearsExperience, insuredCount, satisfactionScore } = content;

  return (
    <section aria-labelledby="profile-heading" className="flex flex-col gap-6">
      <Card className="relative overflow-hidden">
        <SealMark className="pointer-events-none absolute -top-10 -start-10 size-44 opacity-[0.05]" />
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="size-32 overflow-hidden rounded-full bg-muted ring-1 ring-primary/25 ring-offset-2 ring-offset-card">
            <Image
              src={photo}
              alt={`عکس ${name}`}
              width={128}
              height={128}
              priority
              sizes="128px"
              className="size-32 object-cover sepia-[.08] saturate-[1.05]"
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <h1 id="profile-heading" className="text-2xl font-bold">
              {name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {title}
              <span className="mx-2 inline-block text-muted-foreground/60">·</span>
              <span>{toPersianDigits(yearsExperience)} سال سابقه</span>
            </p>
            <p className="max-w-prose text-base leading-8 text-muted-foreground">{bio}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-stretch justify-between p-0">
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-4 text-center">
            <span className="text-lg font-bold">+{formatNumberFa(insuredCount)}</span>
            <span className="text-xs text-muted-foreground">بیمه‌شده</span>
          </div>
          <Separator orientation="vertical" className="h-auto" />
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-4 text-center">
            <span className="text-lg font-bold">{formatNumberFa(yearsExperience)}</span>
            <span className="text-xs text-muted-foreground">سال سابقه</span>
          </div>
          <Separator orientation="vertical" className="h-auto" />
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-4 text-center">
            <span className="text-lg font-bold text-success">
              {formatNumberFa(satisfactionScore, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs text-muted-foreground">رضایت (از ۵)</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
