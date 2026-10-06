import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "waiting a miracle..." }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <div className="relative w-16 h-16">
      <div 
        className="w-full h-full rounded-full animate-spin border-4 border-transparent"
        style={{
          background: 'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ec4899, #ef4444)',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black 0)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black 0)'
        }}
      ></div>
    </div>
    <p className="text-primary-600 font-bold animate-pulse tracking-widest uppercase text-xs">{message}</p>
  </div>
);