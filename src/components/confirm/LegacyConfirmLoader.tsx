import React from 'react';

export default function LegacyConfirmLoader() {
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60">
      <div className="w-[360px] rounded-2xl bg-[#0f1a22] p-4 shadow-2xl">
        {/* title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
          <div className="h-6 w-6 rounded-full bg-white/10 animate-pulse" />
        </div>

        {/* image + name skeleton */}
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="h-12 w-12 rounded-xl bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
          </div>
        </div>

        {/* portion slider stub */}
        <div className="mt-4">
          <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
        </div>

        {/* macro pills */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/5 p-4">
              <div className="h-6 w-10 rounded bg-white/10 animate-pulse mx-auto mb-2" />
              <div className="h-3 w-12 rounded bg-white/10 animate-pulse mx-auto" />
            </div>
          ))}
        </div>

        {/* donut spinner */}
        <div className="mt-6 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span className="ml-3 text-sm text-white/70">Loading nutrition data…</span>
        </div>
      </div>
    </div>
  );
}