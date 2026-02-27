'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'muted';
  label?: string;
  fullscreen?: boolean;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
  xl: 'w-16 h-16 border-4',
};

const colorMap = {
  primary: 'border-stellar-blue/30 border-t-stellar-blue',
  white: 'border-white/30 border-t-white',
  muted: 'border-gray-700 border-t-gray-400',
};

export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  label,
  fullscreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`rounded-full animate-spin ${sizeMap[size]} ${colorMap[variant]}`}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && (
        <span className={`text-sm ${variant === 'muted' ? 'text-gray-500' : 'text-gray-400'}`}>
          {label}
        </span>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-stellar-card border border-stellar-border rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-stellar-blue/30 border-t-stellar-blue animate-spin" />
          {label && <p className="text-gray-300 text-sm">{label}</p>}
        </div>
      </div>
    );
  }

  return spinner;
}

// ============================================================
// Skeleton Loading Components
// ============================================================

export function SkeletonLine({ width = 'full', height = 4 }: { width?: string; height?: number }) {
  return (
    <div
      className={`bg-gray-800 rounded animate-pulse`}
      style={{ width: width === 'full' ? '100%' : width, height: `${height * 4}px` }}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-stellar-card border border-stellar-border rounded-2xl p-6 space-y-4">
      <SkeletonLine width="40%" height={6} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i === rows - 1 ? '60%' : 'full'} height={4} />
      ))}
    </div>
  );
}

export function SkeletonBalance() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-8 bg-gray-800 rounded-lg w-32" />
      <div className="h-4 bg-gray-800 rounded w-20" />
    </div>
  );
}

// ============================================================
// Progress Bar
// ============================================================

interface ProgressBarProps {
  steps: string[];
  currentStep: number;
  variant?: 'horizontal' | 'vertical';
}

const TX_STEPS = ['Building', 'Signing', 'Submitting', 'Confirming'];

export function TransactionProgress({ status }: { status: string }) {
  const stepIndex = {
    building: 0,
    signing: 1,
    submitting: 2,
    pending: 3,
    success: 4,
    error: -1,
  }[status] ?? -1;

  if (status === 'idle' || status === 'success' || status === 'error') return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {TX_STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < stepIndex
                    ? 'bg-stellar-blue text-white'
                    : i === stepIndex
                    ? 'bg-stellar-blue/30 border-2 border-stellar-blue text-stellar-blue animate-pulse'
                    : 'bg-gray-800 text-gray-600'
                }`}
              >
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs ${
                  i <= stepIndex ? 'text-stellar-blue' : 'text-gray-600'
                }`}
              >
                {step}
              </span>
            </div>
            {i < TX_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${
                  i < stepIndex ? 'bg-stellar-blue' : 'bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Suppress unused import warning
export type { ProgressBarProps };
