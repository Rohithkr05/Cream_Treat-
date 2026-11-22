import React from 'react';

interface CocoaPodWatermarkProps {
  className?: string;
  opacity?: number;
}

/**
 * Botanical Cocoa Pod Line-Art Motif
 * Delicate botanical line work echoing the printed patisserie menu watermark.
 */
export function CocoaPodWatermark({
  className = 'w-72 h-72 text-current opacity-[0.06]',
}: CocoaPodWatermarkProps) {
  return (
    <svg
      viewBox="0 0 200 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* Stem / Branch attachment */}
      <path
        d="M95 18 C92 28, 90 35, 96 42 C99 44, 103 44, 105 40 C108 34, 106 24, 102 16 C99 12, 96 12, 95 18 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M88 20 C94 22, 104 22, 110 20"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Main outer cocoa pod contour */}
      <path
        d="M96 42 
           C60 55, 30 95, 30 135 
           C30 170, 55 200, 96 226 
           C100 228, 102 228, 106 226 
           C147 200, 172 170, 172 135 
           C172 95, 142 55, 106 42 
           Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Longitudinal furrow ribs (distinctive botanical ridges of the Theobroma cacao pod) */}
      {/* Central ridge */}
      <path
        d="M101 42 C98 85, 98 175, 101 226"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2 1"
        strokeLinecap="round"
      />

      {/* Left major ridge */}
      <path
        d="M98 43 C72 70, 58 110, 58 140 C58 175, 78 205, 99 224"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Left intermediate ridge */}
      <path
        d="M99 44 C84 75, 76 115, 78 145 C80 180, 90 205, 100 225"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Right major ridge */}
      <path
        d="M104 43 C130 70, 144 110, 144 140 C144 175, 124 205, 103 224"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Right intermediate ridge */}
      <path
        d="M103 44 C118 75, 126 115, 124 145 C122 180, 112 205, 102 225"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Subtle surface texture striae */}
      <path
        d="M48 115 C55 120, 68 122, 75 121"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M44 135 C52 140, 65 142, 74 141"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M50 155 C58 160, 70 162, 78 160"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M154 115 C147 120, 134 122, 127 121"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M158 135 C150 140, 137 142, 128 141"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M152 155 C144 160, 132 162, 124 160"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Subtle small cocoa leaves at the base of the stem */}
      <path
        d="M93 38 C80 32, 74 25, 78 20 C82 18, 88 24, 94 36"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M108 38 C120 32, 126 25, 122 20 C118 18, 112 24, 106 36"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
