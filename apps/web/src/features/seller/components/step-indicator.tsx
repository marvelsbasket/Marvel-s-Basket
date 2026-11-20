import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  maxStepReached?: number;
}

const STEPS = [
  { step: 1, title: 'Profile', description: 'Personal details' },
  { step: 2, title: 'Store', description: 'Address & radius' },
  { step: 3, title: 'Business', description: 'PAN & compliance' },
  { step: 4, title: 'Bank', description: 'Settlement details' },
  { step: 5, title: 'KYC Docs', description: 'Document upload' },
];

export function StepIndicator({
  currentStep,
  onStepClick,
  maxStepReached = 5,
}: StepIndicatorProps) {
  return (
    <div className="w-full bg-white border border-border rounded-2xl p-4 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between">
        {STEPS.map((s, idx) => {
          const isCompleted = currentStep > s.step;
          const isCurrent = currentStep === s.step;
          const isClickable = onStepClick && s.step <= maxStepReached;

          return (
            <React.Fragment key={s.step}>
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(s.step)}
                className={cn(
                  'flex flex-col items-center group transition-colors focus:outline-none',
                  !isClickable && 'cursor-default',
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border-2 transition-all',
                    isCompleted && 'bg-brand border-brand text-white shadow-xs',
                    isCurrent && 'bg-brand-forest text-white border-brand ring-4 ring-emerald-50',
                    !isCompleted && !isCurrent && 'bg-surface-subtle border-border text-ink-muted',
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5 text-white" /> : s.step}
                </div>
                <div className="mt-2 text-center hidden sm:block">
                  <div
                    className={cn(
                      'text-xs font-bold leading-tight',
                      isCurrent && 'text-brand-dark',
                      isCompleted && 'text-ink',
                      !isCurrent && !isCompleted && 'text-ink-muted',
                    )}
                  >
                    {s.title}
                  </div>
                  <div className="text-[10px] text-ink-muted">{s.description}</div>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors',
                    currentStep > s.step ? 'bg-brand' : 'bg-border',
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
