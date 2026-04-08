'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-md px-6 py-8 flex flex-col gap-8 mx-auto animate-pulse">
      {/* Skeleton Greeting */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 bg-gray-200 rounded-lg" />
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      </div>

      {/* Skeleton Calendar Card */}
      <div className="h-[220px] w-full bg-white rounded-[2rem] border border-black/5 shadow-sm" />

      {/* Skeleton Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 w-full bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]" />
        ))}
      </div>

      {/* Skeleton Status */}
      <div className="mt-4 flex flex-col gap-4 px-2">
        <div className="flex justify-between items-center">
          <div className="h-4 w-32 bg-gray-200 rounded-md" />
          <div className="h-4 w-24 bg-gray-200 rounded-md" />
        </div>
      </div>
    </div>
  );
}
