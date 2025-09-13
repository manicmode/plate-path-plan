import React from 'react';

interface InitialsTileProps {
  text: string;
  size?: number;
  className?: string;
  'data-test'?: string;
}

export const InitialsTile: React.FC<InitialsTileProps> = ({ 
  text, 
  size = 64, 
  className = '',
  'data-test': dataTest 
}) => {
  const initials = (text || "Food")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]!.toUpperCase())
    .join("");

  const gradientA = "#10d1c4";
  const gradientB = "#2e6bff";

  return (
    <div
      className={`flex items-center justify-center rounded-xl ${className}`}
      data-test={dataTest}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${gradientA}, ${gradientB})`,
        color: '#ecfeff',
        fontSize: Math.floor(size * 0.4),
        fontWeight: 600,
        fontFamily: 'Inter, ui-sans-serif'
      }}
    >
      {initials}
    </div>
  );
};