"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { path: "/wizard/step1-shareholder", label: "株主判定", shortLabel: "1", number: 1 },
  { path: "/wizard/step2-special", label: "特定会社", shortLabel: "2", number: 2 },
  { path: "/wizard/step3-size", label: "会社規模", shortLabel: "3", number: 3 },
  { path: "/wizard/step4-valuation", label: "評価計算", shortLabel: "4", number: 4 },
  { path: "/wizard/step5-result", label: "結果確認", shortLabel: "5", number: 5 },
];

export function StepNavigation() {
  const pathname = usePathname();
  const currentStep = STEPS.findIndex((s) => s.path === pathname);

  if (currentStep === -1) return null;

  return (
    <nav className="max-w-4xl mx-auto px-4 py-4" aria-label="評価ステップ">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li key={step.path} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                {isCompleted ? (
                  <Link
                    href={step.path}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-600 text-white text-sm font-bold shadow-md hover:bg-primary-700 transition-colors"
                    aria-label={`${step.label}（完了）`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </Link>
                ) : (
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all ${
                      isCurrent
                        ? "bg-primary-600 text-white shadow-lg ring-4 ring-primary-200"
                        : "bg-gray-200 text-gray-500"
                    }`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {step.number}
                  </span>
                )}
                <span
                  className={`mt-1.5 text-xs font-medium whitespace-nowrap hidden sm:block ${
                    isCurrent ? "text-primary-700" : isCompleted ? "text-primary-600" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                    isCompleted ? "bg-primary-500" : "bg-gray-200"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
