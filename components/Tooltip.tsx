
"use client";
import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isTooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div className="relative flex items-center">
      {children}
      <div
        className="ml-2 cursor-pointer"
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <Info size={16} className="text-gray-400" />
      </div>
      {isTooltipVisible && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-md shadow-lg z-10">
          {text}
        </div>
      )}
    </div>
  );
};
