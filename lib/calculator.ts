/**
 * ESTIMATE ONLY — NOT REGULATED FINANCIAL ADVICE
 * Source/assumptions: simple income-replacement heuristic inspired by public
 * "10x annual income + dependents allowance + outstanding debt" rules of thumb
 * (e.g., LIMRA/CFP general guidance). NOT tailored, NOT actuarial, NOT approved
 * by بیمه مرکزی. Every `estimatedCover` shown to users must be labeled
 * «برآورد اولیه — مشاوره تخصصی جایگزین نیست» alongside the number.
 * Constants below are deliberately conservative and rounded; change only with
 * agent product-owner approval and add a migration note.
 */

export interface CalculatorInput {
  monthlyIncome: number; // تومان/ماه، integer >=0. From form; parse Persian digits before calling.
  dependents: number; // int >=0
  debt: number; // تومان، مجموع بدهی، integer >=0 (0 if omitted)
}

export interface CalculatorResult {
  estimatedCover: number; // تومان، integer, rounded
  breakdown: {
    incomeComponent: number;
    dependentsComponent: number;
    debtComponent: number;
  };
  meta: { formulaVersion: "v2-2026-08-irt" };
}

/**
 * MIGRATION NOTE (v1 → v2, 2026-08): واحد پولی از ریال (IRR) به تومان (IRT)
 * استاندارد شد — کل پایپ‌لاین (ورودی، ثابت‌ها، ذخیره‌سازی، نمایش) تومان است.
 * ثابت‌ها در همین تبدیل تقسیم بر ۱۰ شدند (۲۰۰٫۰۰۰٫۰۰۰ ریال → ۲۰٫۰۰۰٫۰۰۰ تومان).
 * ردیف‌های قدیمی leads که قبل از این تغییر ذخیره شده‌اند بر حسب ریال‌اند و ۱۰
 * برابر نمایش داده می‌شوند؛ در استقرار واقعی پیش از عرضه، دیتابیس را پاک کنید.
 */

export const CALCULATOR_CONSTANTS = {
  YEARS: 10,
  DEPENDENT_ALLOWANCE: 20_000_000,
  MIN_COVER: 10_000_000,
  MAX_COVER: 1_000_000_000,
} as const;

export function calculateCoverage(input: CalculatorInput): CalculatorResult {
  if (
    typeof input.monthlyIncome !== "number" ||
    typeof input.dependents !== "number" ||
    typeof input.debt !== "number"
  ) {
    throw new RangeError("Calculator: all inputs must be numbers");
  }

  if (
    !Number.isFinite(input.monthlyIncome) ||
    !Number.isFinite(input.dependents) ||
    !Number.isFinite(input.debt)
  ) {
    throw new RangeError("Calculator: inputs must be finite numbers");
  }

  if (input.monthlyIncome < 0 || input.dependents < 0 || input.debt < 0) {
    throw new RangeError("Calculator: inputs must be >= 0");
  }

  if (!Number.isInteger(input.dependents)) {
    throw new RangeError("Calculator: dependents must be an integer");
  }

  if (input.dependents > 20) {
    throw new RangeError("Calculator: dependents must be <= 20");
  }

  const incomeComponent = input.monthlyIncome * 12 * CALCULATOR_CONSTANTS.YEARS;
  const dependentsComponent = input.dependents * CALCULATOR_CONSTANTS.DEPENDENT_ALLOWANCE;
  const debtComponent = input.debt;

  let raw = incomeComponent + dependentsComponent + debtComponent;
  raw = Math.round(raw);

  const estimatedCover = Math.max(
    CALCULATOR_CONSTANTS.MIN_COVER,
    Math.min(CALCULATOR_CONSTANTS.MAX_COVER, raw),
  );

  return {
    estimatedCover,
    breakdown: {
      incomeComponent,
      dependentsComponent,
      debtComponent,
    },
    meta: { formulaVersion: "v2-2026-08-irt" },
  };
}
