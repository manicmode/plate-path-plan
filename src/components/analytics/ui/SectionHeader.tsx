
import React from 'react';

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}

export const SectionHeader = ({ icon: Icon, title, subtitle }: SectionHeaderProps) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg">
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
    </div>
  </div>
);
