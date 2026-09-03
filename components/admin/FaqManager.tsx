"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingField } from "@/components/admin/FloatingField";

type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
  order: number;
};

const CATEGORY_SUGGESTIONS = [
  "خسارت فوت",
  "ارزش بازخرید",
  "تمدید",
  "تغییر اطلاعات",
  "ذی‌نفع",
  "انصراف",
  "بیمه عمر",
  "پوشش بیمه",
  "مشاوره",
];

export function FaqManager() {
  const [items, setItems] = React.useState<FaqItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<FaqItem | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [category, setCategory] = React.useState("");
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [order, setOrder] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/faq", { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const data = (await res.json()) as { items: FaqItem[] };
      setItems(data.items);
    } catch {
      setMessage({ kind: "error", text: "خطا در بارگذاری سوالات" });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setCategory("");
    setQuestion("");
    setAnswer("");
    setOrder(0);
    setEditing(null);
    setShowForm(false);
    setMessage(null);
  }

  function startEdit(item: FaqItem) {
    setEditing(item);
    setCategory(item.category);
    setQuestion(item.question);
    setAnswer(item.answer);
    setOrder(item.order);
    setShowForm(true);
    setMessage(null);
  }

  async function handleSave() {
    if (!category.trim() || !question.trim() || !answer.trim()) {
      setMessage({ kind: "error", text: "دسته‌بندی، سوال و جواب الزامی است." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = { category: category.trim(), question: question.trim(), answer: answer.trim(), order };
      if (editing) {
        const res = await fetch(`/api/admin/faq/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("خطا در بروزرسانی");
        setMessage({ kind: "success", text: "سوال بروزرسانی شد." });
      } else {
        const res = await fetch("/api/admin/faq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("خطا در ایجاد");
        setMessage({ kind: "success", text: "سوال جدید اضافه شد." });
      }
      resetForm();
      load();
    } catch {
      setMessage({ kind: "error", text: "خطا در ذخیره" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این سوال مطمئن هستید؟")) return;
    try {
      const res = await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("خطا در حذف");
      setMessage({ kind: "success", text: "سوال حذف شد." });
      load();
    } catch {
      setMessage({ kind: "error", text: "خطا در حذف" });
    }
  }

  const existingCategories = React.useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return CATEGORY_SUGGESTIONS.filter((c) => cats.has(c));
  }, [items]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">سوالات موجود ({items.length})</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="size-4 ms-1" aria-hidden />
            سوال جدید
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              هنوز سوالی اضافه نشده است.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-md border p-3 hover:bg-accent/50 transition-colors"
              >
                <GripVertical className="size-4 mt-1 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-secondary text-secondary-foreground rounded px-1.5 py-0.5">
                      {item.category}
                    </span>
                    <span className="text-xs text-muted-foreground">ترتیب: {item.order}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{item.question}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.answer}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => startEdit(item)}>
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {editing ? "ویرایش سوال" : "سوال جدید"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="دسته‌بندی *"
                  id="faq-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  list="faq-categories"
                />
                <datalist id="faq-categories">
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {existingCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {existingCategories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          category === c
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5 relative">
                <FloatingField
                  label="ترتیب نمایش"
                  id="faq-order"
                  type="number"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-start"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-0.5 relative">
              <FloatingField
                label="سوال *"
                id="faq-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-0.5 relative">
              <FloatingField
                as="textarea"
                label="جواب *"
                id="faq-answer"
                textareaRows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>

            {message && (
              <p
                role="status"
                className={`text-sm ${message.kind === "success" ? "text-success" : "text-destructive"}`}
              >
                {message.text}
              </p>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="min-w-32">
                {saving ? "در حال ذخیره..." : editing ? "بروزرسانی" : "افزودن"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                انصراف
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default FaqManager;
