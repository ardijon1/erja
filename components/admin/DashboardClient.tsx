"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileCheck2, Pencil, Trash2, X, ArrowRight } from "lucide-react";

import { Star, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { CopyLinkButton, ShareLinkButton } from "@/components/shared/ShareButtons";
import { formatCurrencyIRT, formatNumberFa, normalizeNumericInput, toEnglishDigits, toPersianDigits } from "@/lib/format";
import {
  LEAD_STATUS_META,
  LEAD_STATUSES,
  isStale,
  normalizeStatus,
  type LeadStatus,
} from "@/lib/lead-status";
import { SiteContentForm } from "@/components/admin/SiteContentForm";
import { MessagingSettingsForm } from "@/components/admin/MessagingSettingsForm";
import { cn } from "@/lib/utils";
import { buildReferrerReportText, isInactiveReferrer } from "@/lib/referral-report";

interface LeaderboardEntry {
  id: string;
  code: string;
  displayName: string;
  clicks: number;
  leads: number;
  createdAt: string;
}

interface ReferralShare {
  total: number;
  referred: number;
  percent: number;
}

interface RatingSummary {
  count: number;
  average: number | null;
  displayScore: number;
  isReal: boolean;
}

interface LeadEntry {
  id: string;
  name: string;
  phone: string;
  monthlyIncome: number | null;
  dependents: number | null;
  debt: number | null;
  estimatedCover: number | null;
  message: string | null;
  referrerId: string | null;
  referrerCode: string | null;
  referrerDisplayName: string | null;
  status: string;
  policyNumber: string | null;
  createdAt: string;
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      referrers: LeaderboardEntry[];
      leads: LeadEntry[];
      referralBaseUrl: string;
      rating?: RatingSummary;
      ratingTokens?: Record<string, string | null>;
      convertedMap?: Record<string, number>;
      referralShare?: ReferralShare;
      lastLeadAt?: Record<string, string>;
    };

type Tab = "overview" | "content" | "settings";

const PAGE_SIZE = 15;

function formatDateFa(iso: string): string {
  try {
    const d = new Date(iso);
    const s = d.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return s || toPersianDigits(iso.slice(0, 10));
  } catch {
    return toPersianDigits(iso.slice(0, 10));
  }
}

function statusClasses(status: LeadStatus): string {
  switch (status) {
    case "converted":
      return "border-success bg-success text-success-foreground";
    case "follow_up":
      return "border-primary/30 bg-primary/10 text-primary-strong";
    case "lost":
      return "border-border bg-muted/60 text-muted-foreground line-through decoration-muted-foreground/40";
    default:
      return "border-border bg-muted text-foreground";
  }
}

function parseOptionalNumber(value: string): number | null | "invalid" {
  const ascii = toEnglishDigits(value).replace(/[,،٬\s]/g, "").trim();
  if (!ascii) return null;
  const n = Number(ascii);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return "invalid";
  return Math.trunc(n);
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get("tab") as Tab) || "overview";
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [state, setState] = React.useState<FetchState>({ status: "loading" });
  const [logoutLoading, setLogoutLoading] = React.useState(false);
  const [editing, setEditing] = React.useState<{ lead: LeadEntry; initialStatus: string } | null>(null);
  const [deletingLead, setDeletingLead] = React.useState<LeadEntry | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);

  const [statusFilter, setStatusFilter] = React.useState<"all" | LeadStatus>("all");
  const [query, setQuery] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  const [newReferrerName, setNewReferrerName] = React.useState("");
  const [newReferrerBusy, setNewReferrerBusy] = React.useState(false);
  const [newReferrerError, setNewReferrerError] = React.useState<string | null>(null);
  const [justCreated, setJustCreated] = React.useState<{ code: string; url: string } | null>(null);
  const [deletingReferrer, setDeletingReferrer] = React.useState<LeaderboardEntry | null>(null);
  const [ratingLinkFor, setRatingLinkFor] = React.useState<{
    name: string;
    rateUrl: string;
    refUrl: string;
  } | null>(null);

  React.useEffect(() => {
    const urlTab = (searchParams?.get("tab") as Tab) || "overview";
    if (urlTab !== tab) setTab(urlTab);
  }, [searchParams, tab]);

  const fetchData = React.useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/admin/leaderboard", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        router.refresh();
        return;
      }
      const data = (await res.json()) as {
        referrers?: LeaderboardEntry[];
        leads?: LeadEntry[];
        referralBaseUrl?: string;
        rating?: RatingSummary;
        ratingTokens?: Record<string, string | null>;
        convertedMap?: Record<string, number>;
        referralShare?: ReferralShare;
        lastLeadAt?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "خطا در بارگذاری داده‌ها");
      }
      setState({
        status: "success",
        referrers: Array.isArray(data.referrers) ? data.referrers : [],
        leads: Array.isArray(data.leads) ? data.leads : [],
        referralBaseUrl: typeof data.referralBaseUrl === "string" ? data.referralBaseUrl : "/r",
        rating: data.rating,
        ratingTokens: data.ratingTokens,
        convertedMap: data.convertedMap,
        referralShare: data.referralShare,
        lastLeadAt: data.lastLeadAt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در بارگذاری";
      setState({ status: "error", message: msg });
    }
  }, [router]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onLogout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  async function onCreateRatingRequest(r: LeaderboardEntry) {
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/rating-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrerId: r.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        throw new Error(typeof data.error === "string" ? data.error : "خطا در ساخت لینک امتیاز");
      }
      const base = state.status === "success" ? state.referralBaseUrl.replace(/\/r$/, "") : "";
      setRatingLinkFor({
        name: r.displayName,
        rateUrl: `${base}/rate/${data.token}`,
        refUrl: `${state.status === "success" ? state.referralBaseUrl : "/r"}/${r.code}`,
      });
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "خطا در ساخت لینک امتیاز");
    } finally {
      setActionBusy(false);
    }
  }

  async function onCreateReferrer(e: React.FormEvent) {
    e.preventDefault();
    const name = newReferrerName.trim();
    if (!name) {
      setNewReferrerError("نام معرف را وارد کنید");
      return;
    }
    setNewReferrerBusy(true);
    setNewReferrerError(null);
    try {
      const res = await fetch("/api/admin/referrers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        referrer?: { code: string };
        error?: string;
      };
      if (!res.ok || !data.referrer) {
        throw new Error(typeof data.error === "string" ? data.error : "خطا در ساخت معرف");
      }
      const base = state.status === "success" ? state.referralBaseUrl : "/r";
      setJustCreated({ code: data.referrer.code, url: `${base}/${data.referrer.code}` });
      setNewReferrerName("");
      await fetchData();
    } catch (err) {
      setNewReferrerError(err instanceof Error ? err.message : "خطا در ساخت معرف");
    } finally {
      setNewReferrerBusy(false);
    }
  }

  async function onDeleteReferrerConfirmed() {
    if (!deletingReferrer) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/referrers?id=${encodeURIComponent(deletingReferrer.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "خطا در حذف معرف");
      }
      setDeletingReferrer(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "خطا در حذف معرف");
    } finally {
      setActionBusy(false);
    }
  }

  async function onSaveEdit(payload: Record<string, unknown>) {
    if (!editing) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/leads/${editing.lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "خطا در ذخیره تغییرات");
      }
      setEditing(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "خطا در ذخیره تغییرات");
    } finally {
      setActionBusy(false);
    }
  }

  async function onDeleteConfirmed() {
    if (!deletingLead) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/leads/${deletingLead.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "خطا در حذف سرنخ");
      }
      setDeletingLead(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "خطا در حذف سرنخ");
    } finally {
      setActionBusy(false);
    }
  }

  async function onQuickStatus(lead: LeadEntry, nextStatus: LeadStatus) {
    if (nextStatus === normalizeStatus(lead.status)) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "خطا در تغییر وضعیت");
      }
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "خطا در تغییر وضعیت");
    } finally {
      setActionBusy(false);
    }
  }

  const leads = React.useMemo(
    () => (state.status === "success" ? state.leads : []),
    [state],
  );

  // فاز ۳ — مرتب‌سازی معرف‌ها بر اساس بیمه‌نامه صادرشده (کیفیت، نه کلیک خام)
  const sortedReferrers = React.useMemo(() => {
    const referrers = state.status === "success" ? state.referrers : [];
    const map = state.status === "success" ? (state.convertedMap ?? {}) : {};
    return [...referrers].sort((a, b) => {
      const convDiff = (map[b.id] ?? 0) - (map[a.id] ?? 0);
      if (convDiff !== 0) return convDiff;
      if (b.leads !== a.leads) return b.leads - a.leads;
      return b.clicks - a.clicks;
    });
  }, [state]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const s of LEAD_STATUSES) c[s] = 0;
    for (const l of leads) c[normalizeStatus(l.status)] += 1;
    return c;
  }, [leads]);

  const filteredLeads = React.useMemo(() => {
    const q = toEnglishDigits(query.trim()).toLowerCase();
    let list = leads.filter((l) => {
      if (statusFilter !== "all" && normalizeStatus(l.status) !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.policyNumber ?? "").toLowerCase().includes(q) ||
        (l.referrerDisplayName ?? "").toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [leads, statusFilter, query]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, query]);

  const visibleLeads = filteredLeads.slice(0, visibleCount);
  const remaining = filteredLeads.length - visibleLeads.length;

  if (state.status === "loading") {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">داشبورد</h1>
          <Button variant="outline" size="sm" onClick={onLogout} disabled={logoutLoading}>
            خروج
          </Button>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive leading-7">{state.message}</p>
            <Button variant="outline" className="mt-4" onClick={fetchData}>
              تلاش دوباره
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { referrers } = state;

  const conversionRateOf = (id: string, leads: number): string => {
    const converted = state.status === "success" ? (state.convertedMap?.[id] ?? 0) : 0;
    if (leads === 0) return "—";
    return `${toPersianDigits(Math.round((converted / leads) * 100))}٪`;
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="px-2">
            <Link href="/" aria-label="بازگشت به صفحه اصلی" title="بازگشت به صفحه اصلی">
              <ArrowRight className="size-4" aria-hidden />
              <span className="hidden sm:inline">صفحه اصلی</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold">داشبورد</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            بروزرسانی
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout} disabled={logoutLoading}>
            {logoutLoading ? "در حال خروج..." : "خروج"}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2" role="tablist" aria-label="بخش‌های داشبورد">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          onClick={() => router.replace("/admin/dashboard")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "overview"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          مرور
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "content"}
          onClick={() => router.replace("/admin/dashboard?tab=content")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "content"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          محتوای صفحه اصلی
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settings"}
          onClick={() => router.replace("/admin/settings")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "settings"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          تنظیمات اتصال
        </button>
      </div>

      {tab === "overview" ? (
        <>
          <Card>
            <CardHeader className="gap-3">
              <CardTitle className="text-sm">معرف‌ها</CardTitle>
              {justCreated === null ? (
                <form onSubmit={onCreateReferrer} className="flex gap-2" aria-label="ساخت معرف جدید">
                  <Input
                    value={newReferrerName}
                    onChange={(e) => setNewReferrerName(e.target.value)}
                    placeholder="نام معرف (مثلاً نام بیمه‌شده)"
                    aria-label="نام معرف"
                    className="h-9"
                    maxLength={80}
                    disabled={newReferrerBusy}
                  />
                  <Button type="submit" size="sm" disabled={newReferrerBusy || !newReferrerName.trim()} className="h-9 shrink-0">
                    {newReferrerBusy ? "..." : "ساخت لینک"}
                  </Button>
                </form>
              ) : null}
              {newReferrerError ? <p className="text-xs text-destructive" role="alert">{newReferrerError}</p> : null}
              {state.status === "success" && state.referralShare && state.referralShare.total > 0 ? (
                <p className="text-xs text-muted-foreground">
                  سهم ارجاع از کل سرنخ‌ها:{" "}
                  <span className="font-medium text-foreground">
                    {toPersianDigits(state.referralShare.percent)}٪
                  </span>{" "}
                  ({formatNumberFa(state.referralShare.referred)} از {formatNumberFa(state.referralShare.total)})
                </p>
              ) : null}
              {state.status === "success" && state.rating ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Star
                    className={state.rating.isReal ? "size-3.5 fill-warning text-warning" : "size-3.5"}
                    aria-hidden
                  />
                  رضایت: {toPersianDigits(state.rating.displayScore)}
                  {state.rating.isReal
                    ? ` (واقعی از ${formatNumberFa(state.rating.count)} امتیاز)`
                    : " (دستی — با ۳ امتیاز واقعی جایگزین می‌شود)"}
                </p>
              ) : null}
              {ratingLinkFor ? (
                <div className="rounded-lg border bg-success/5 p-3">
                  <p className="text-xs font-medium">پیام برای «{ratingLinkFor.name}» — کپی یا اشتراک بفرستید:</p>
                  <p className="mt-2 rounded-md border bg-background px-2 py-1.5 text-xs leading-6">
                    {ratingLinkFor.rateUrl.includes("/rate/")
                      ? `سلام ${ratingLinkFor.name}! از اعتماد و همراهی‌تان سپاسگزارم. لطفاً اگر رضایت داشتید، تجربه‌تان را در این لینک کوتاه ثبت کنید: ${ratingLinkFor.rateUrl} — و اگر مایل بودید، این لینک معرفی را بین عزیزانتان به اشتراک بگذارید: ${ratingLinkFor.refUrl}`
                      : ratingLinkFor.rateUrl}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CopyLinkButton url={ratingLinkFor.rateUrl.includes("/rate/") ? `سلام ${ratingLinkFor.name}! از اعتماد و همراهی‌تان سپاسگزارم. لطفاً اگر رضایت داشتید، تجربه‌تان را در این لینک کوتاه ثبت کنید: ${ratingLinkFor.rateUrl} — و اگر مایل بودید، این لینک معرفی را بین عزیزانتان به اشتراک بگذارید: ${ratingLinkFor.refUrl}` : ratingLinkFor.rateUrl} label="کپی پیام" />
                    <ShareLinkButton
                      url={ratingLinkFor.rateUrl.includes("/rate/") ? ratingLinkFor.rateUrl : ratingLinkFor.refUrl}
                      title="مشاوره بیمه عمر"
                      text={ratingLinkFor.rateUrl}
                    />
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setRatingLinkFor(null)}>
                      بستن
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="p-0">
              {justCreated ? (
                <div className="border-b bg-success/5 px-4 py-4">
                  <p className="text-sm font-medium">
                    لینک اختصاصی «{referrers.find((r) => r.code === justCreated.code)?.displayName ?? "معرف"}» ساخته شد:
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code dir="ltr" className="rounded-md border bg-background px-2 py-1 text-xs font-mono">
                      {justCreated.url}
                    </code>
                    <CopyLinkButton url={justCreated.url} />
                    <ShareLinkButton
                      url={justCreated.url}
                      title="مشاوره بیمه عمر"
                      text="مشاوره بیمه عمر از طریق لینک زیر:"
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    این لینک را برای معرف بفرستید — هر کسی از آن وارد شود، سرنخش با همین معرف ثبت می‌شود (۳۰ روزه).
                  </p>
                  <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => setJustCreated(null)}>
                    بستن
                  </Button>
                </div>
              ) : null}
              {referrers.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="هنوز معرف ثبت نشده"
                    description="نام معرف را بالا وارد کنید و «ساخت لینک» بزنید تا لینک اختصاصی ارجاع ساخته شود."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نام</TableHead>
                        <TableHead>کد</TableHead>
                        <TableHead>کلیک</TableHead>
                        <TableHead>سرنخ</TableHead>
                        <TableHead>بیمه‌نامه</TableHead>
                        <TableHead>نرخ تبدیل</TableHead>
                        <TableHead>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedReferrers.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.displayName}</TableCell>
                          <TableCell dir="ltr" className="text-start font-mono text-xs">
                            {r.code}
                          </TableCell>
                          <TableCell className="tnum">{formatNumberFa(r.clicks)}</TableCell>
                          <TableCell className="tnum">{formatNumberFa(r.leads)}</TableCell>
                          <TableCell className="tnum font-medium text-success">
                            {formatNumberFa(state.convertedMap?.[r.id] ?? 0)}
                          </TableCell>
                          <TableCell className="tnum">{conversionRateOf(r.id, r.leads)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <CopyLinkButton
                                url={`${state.status === "success" ? state.referralBaseUrl : "/r"}/${r.code}`}
                              />
                              <ShareLinkButton
                                url={`${state.status === "success" ? state.referralBaseUrl : "/r"}/${r.code}`}
                                title="مشاوره بیمه عمر"
                                text="مشاوره بیمه عمر از طریق لینک زیر:"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-2 text-warning"
                                aria-label={`درخواست امتیاز از ${r.displayName}`}
                                title="درخواست امتیاز (لینک تک‌مصرف)"
                                disabled={actionBusy}
                                onClick={() => void onCreateRatingRequest(r)}
                              >
                                <Star className="size-4" aria-hidden />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-2"
                                aria-label={`گزارش به ${r.displayName}`}
                                title="ارسال گزارش معرف"
                                onClick={() => {
                                  const report = buildReferrerReportText({
                                    displayName: r.displayName,
                                    clicks: r.clicks,
                                    leads: r.leads,
                                    converted: state.status === "success" ? (state.convertedMap?.[r.id] ?? 0) : 0,
                                  });
                                  setRatingLinkFor({
                                    name: r.displayName,
                                    rateUrl: report,
                                    refUrl: `${state.status === "success" ? state.referralBaseUrl : "/r"}/${r.code}`,
                                  });
                                }}
                              >
                                <Bell className="size-4" aria-hidden />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-2 text-destructive"
                                aria-label={`حذف معرف ${r.displayName}`}
                                title="حذف معرف"
                                onClick={() => setDeletingReferrer(r)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3">
              <CardTitle className="text-sm">سرنخ‌ها</CardTitle>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="فیلتر وضعیت و جستجو">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  aria-pressed={statusFilter === "all"}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    statusFilter === "all"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  همه ({formatNumberFa(counts.all)})
                </button>
                {LEAD_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    aria-pressed={statusFilter === s}
                    title={LEAD_STATUS_META[s].description}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      statusFilter === s
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {LEAD_STATUS_META[s].label} ({formatNumberFa(counts[s])})
                  </button>
                ))}
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو…"
                  aria-label="جستجوی سرنخ"
                  className="ms-auto h-9 w-full sm:w-52"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLeads.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title={query || statusFilter !== "all" ? "موردی مطابق فیلتر یافت نشد" : "هنوز سرنخی ثبت نشده"}
                    description={
                      query || statusFilter !== "all"
                        ? "فیلتر یا عبارت جستجو را تغییر دهید."
                        : "سرنخ‌ها پس از ثبت فرم مشاوره در این جدول نمایش داده می‌شوند."
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>نام</TableHead>
                          <TableHead>تلفن</TableHead>
                          <TableHead>منبع</TableHead>
                          <TableHead>برآورد</TableHead>
                          <TableHead>وضعیت</TableHead>
                          <TableHead>تاریخ</TableHead>
                          <TableHead>عملیات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleLeads.map((l) => {
                          const st = normalizeStatus(l.status);
                          const stale = isStale(l.createdAt, st);
                          return (
                            <TableRow key={l.id}>
                              <TableCell className="font-medium whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5">
                                  {stale ? (
                                    <span
                                      className="inline-block size-2 shrink-0 rounded-full bg-warning"
                                      title="زمان پیگیری فرا رسیده"
                                      aria-label="زمان پیگیری فرا رسیده"
                                    />
                                  ) : null}
                                  {l.name}
                                </span>
                              </TableCell>
                              <TableCell dir="ltr" className="whitespace-nowrap text-start tnum">
                                {toPersianDigits(l.phone)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {l.referrerDisplayName ? (
                                  <span>
                                    {l.referrerDisplayName}{" "}
                                    <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                                      ({l.referrerCode})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="tnum whitespace-nowrap">
                                {typeof l.estimatedCover === "number" ? (
                                  formatCurrencyIRT(l.estimatedCover)
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <select
                                  value={st}
                                  onChange={(e) => void onQuickStatus(l, e.target.value as LeadStatus)}
                                  disabled={actionBusy}
                                  aria-label={`تغییر وضعیت ${l.name}`}
                                  className={cn(
                                    "cursor-pointer rounded-full border px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    statusClasses(st),
                                  )}
                                >
                                  {LEAD_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {LEAD_STATUS_META[s].label}
                                    </option>
                                  ))}
                                </select>
                                {l.policyNumber ? (
                                  <span dir="ltr" className="mt-1 block text-xs text-muted-foreground">
                                    #{l.policyNumber}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                {formatDateFa(l.createdAt)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2"
                                    aria-label={`ویرایش سرنخ ${l.name}`}
                                    title="ویرایش"
                                    onClick={() => setEditing({ lead: l, initialStatus: st })}
                                  >
                                    <Pencil className="size-4" aria-hidden />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 text-success"
                                    aria-label={`تبدیل به بیمه‌نامه: ${l.name}`}
                                    title="تبدیل به بیمه‌نامه"
                                    disabled={st === "converted"}
                                    onClick={() => setEditing({ lead: l, initialStatus: "converted" })}
                                  >
                                    <FileCheck2 className="size-4" aria-hidden />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 text-destructive"
                                    aria-label={`حذف سرنخ ${l.name}`}
                                    title="حذف"
                                    onClick={() => setDeletingLead(l)}
                                  >
                                    <Trash2 className="size-4" aria-hidden />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {remaining > 0 ? (
                    <div className="border-t p-3 text-center">
                      <Button variant="outline" size="sm" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                        نمایش {formatNumberFa(Math.min(remaining, PAGE_SIZE))} بیشتر
                        <span className="text-muted-foreground"> ({formatNumberFa(remaining)} باقی‌مانده)</span>
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          {(() => {
            if (state.status !== "success") return null;
            const lastMap = state.lastLeadAt ?? {};
            const convMap = state.convertedMap ?? {};
            const inactive = referrers.filter((r) =>
              isInactiveReferrer(r.createdAt, lastMap[r.id] ?? null),
            );
            if (inactive.length === 0) return null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">یادآوری — معرف‌های بدون سرنخ اخیر</CardTitle>
                  <p className="text-xs leading-5 text-muted-foreground">
                    این معرف‌ها در ۳۰ روز اخیر سرنخ جدیدی نیاورده‌اند — یک پیام خوب فرصت دوباره‌سازی است.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 p-4 pt-0">
                  {inactive.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{r.displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {lastMap[r.id]
                            ? `آخرین سرنخ: ${formatDateFa(lastMap[r.id])}`
                            : `بدون سرنخ از ${formatDateFa(r.createdAt)} (ساخت)`}
                          {convMap[r.id] ? ` — ${formatNumberFa(convMap[r.id])} بیمه‌نامه صادرشده` : ""}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          const report = buildReferrerReportText({
                            displayName: r.displayName,
                            clicks: r.clicks,
                            leads: r.leads,
                            converted: convMap[r.id] ?? 0,
                          });
                          setRatingLinkFor({
                            name: r.displayName,
                            rateUrl: report,
                            refUrl: `${state.referralBaseUrl}/${r.code}`,
                          });
                        }}
                      >
                        پیام پیگیری
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })()}
        </>
      ) : tab === "content" ? (
        <SiteContentForm />
      ) : (
        <MessagingSettingsForm />
      )}

      {editing ? (
        <EditLeadDialog
          lead={editing.lead}
          initialStatus={editing.initialStatus}
          busy={actionBusy}
          error={actionError}
          onClose={() => {
            setEditing(null);
            setActionError(null);
          }}
          onSave={onSaveEdit}
        />
      ) : null}

      {deletingLead ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="تایید حذف سرنخ"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionBusy) setDeletingLead(null);
          }}
        >
          <Card className="w-full max-w-sm">
            <CardContent className="flex flex-col gap-4 p-6">
              <p className="text-sm leading-7">
                سرنخ «{deletingLead.name}» برای همیشه حذف شود؟ این عمل قابل بازگشت نیست.
              </p>
              {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void onDeleteConfirmed()}
                  disabled={actionBusy}
                >
                  {actionBusy ? "در حال حذف..." : "حذف کن"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setDeletingLead(null)} disabled={actionBusy}>
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {deletingReferrer ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="تایید حذف معرف"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionBusy) setDeletingReferrer(null);
          }}
        >
          <Card className="w-full max-w-sm">
            <CardContent className="flex flex-col gap-4 p-6">
              <p className="text-sm leading-7">
                معرف «{deletingReferrer.displayName}» حذف شود؟ لینک او غیرفعال می‌شود؛ سرنخ‌های قبلی‌اش می‌مانند ولی
                دیگر به او نسبت داده نمی‌شوند.
              </p>
              {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void onDeleteReferrerConfirmed()}
                  disabled={actionBusy}
                >
                  {actionBusy ? "در حال حذف..." : "حذف کن"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setDeletingReferrer(null)} disabled={actionBusy}>
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default DashboardClient;

function EditLeadDialog({
  lead,
  initialStatus,
  busy,
  error,
  onClose,
  onSave,
}: {
  lead: LeadEntry;
  initialStatus: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [name, setName] = React.useState(lead.name);
  const [phone, setPhone] = React.useState(lead.phone);
  const [status, setStatus] = React.useState(initialStatus);
  const [policyNumber, setPolicyNumber] = React.useState(lead.policyNumber ?? "");
  const [income, setIncome] = React.useState(
    lead.monthlyIncome !== null ? formatNumberFa(lead.monthlyIncome) : "",
  );
  const [dependents, setDependents] = React.useState(
    lead.dependents !== null ? toPersianDigits(lead.dependents) : "",
  );
  const [debt, setDebt] = React.useState(lead.debt !== null ? formatNumberFa(lead.debt) : "");
  const [estimatedCover, setEstimatedCover] = React.useState(
    lead.estimatedCover !== null ? formatNumberFa(lead.estimatedCover) : "",
  );
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const isConverted = status === "converted";

  function buildPayload(): Record<string, unknown> | null {
    const invalid: string[] = [];
    if (!name.trim()) invalid.push("نام");
    if (phone.trim().length < 7) invalid.push("شماره تماس");

    const incomeVal = parseOptionalNumber(income);
    if (incomeVal === "invalid") invalid.push("درآمد ماهانه");
    const depVal = parseOptionalNumber(dependents);
    if (depVal === "invalid" || (depVal !== null && depVal > 20)) invalid.push("تعداد وابستگان");
    const debtVal = parseOptionalNumber(debt);
    if (debtVal === "invalid") invalid.push("بدهی");
    const coverVal = parseOptionalNumber(estimatedCover);
    if (coverVal === "invalid") invalid.push("برآورد پوشش");

    if (invalid.length > 0) return null;

    return {
      name: name.trim(),
      phone: phone.trim(),
      status,
      policyNumber: isConverted && policyNumber.trim() ? policyNumber.trim() : null,
      monthlyIncome: incomeVal,
      dependents: depVal,
      debt: debtVal,
      estimatedCover: coverVal,
    };
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ویرایش سرنخ"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <Card className="my-auto w-full max-w-lg">
        <CardContent className="relative flex flex-col gap-4 p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="absolute end-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            disabled={busy}
          >
            <X className="size-4" aria-hidden />
          </button>

          <p className="text-sm font-bold">ویرایش سرنخ</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-lead-name" className="text-xs font-medium">نام و نام خانوادگی *</label>
              <Input id="edit-lead-name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-lead-phone" className="text-xs font-medium">شماره تماس *</label>
              <Input id="edit-lead-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={busy} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-lead-status" className="text-xs font-medium">وضعیت</label>
              <select
                id="edit-lead-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={busy}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            {isConverted ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-lead-policy" className="text-xs font-medium">شماره بیمه‌نامه (اختیاری)</label>
                <Input
                  id="edit-lead-policy"
                  dir="ltr"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="مثلاً ۱۲۳۴۵۶۷"
                  disabled={busy}
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-lead-income" className="text-xs font-medium">درآمد ماهانه (تومان)</label>
              <Input
                id="edit-lead-income"
                inputMode="numeric"
                value={income}
                onChange={(e) => setIncome(normalizeNumericInput(e.target.value))}
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-lead-dep" className="text-xs font-medium">افراد وابسته</label>
              <Input
                id="edit-lead-dep"
                inputMode="numeric"
                value={dependents}
                onChange={(e) => setDependents(normalizeNumericInput(e.target.value))}
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-lead-debt" className="text-xs font-medium">بدهی (تومان)</label>
              <Input
                id="edit-lead-debt"
                inputMode="numeric"
                value={debt}
                onChange={(e) => setDebt(normalizeNumericInput(e.target.value))}
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-lead-cover" className="text-xs font-medium">برآورد پوشش (تومان)</label>
              <Input
                id="edit-lead-cover"
                inputMode="numeric"
                value={estimatedCover}
                onChange={(e) => setEstimatedCover(normalizeNumericInput(e.target.value))}
                disabled={busy}
              />
            </div>
          </div>

          {validationError || error ? (
            <p className="text-xs text-destructive" role="alert">
              {validationError ?? error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              disabled={busy}
              onClick={() => {
                const payload = buildPayload();
                if (!payload) {
                  setValidationError("برخی فیلدها نامعتبر است — لطفاً بررسی کنید");
                  return;
                }
                setValidationError(null);
                onSave(payload);
              }}
            >
              {busy ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              انصراف
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
