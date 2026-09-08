// src/components/features/links/layouts/MasonryGrid.tsx
import React from "react";

interface MasonryGridProps {
  children: React.ReactNode[];
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({ children }) => {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2">
      {React.Children.map(children, (child, index) => (
        <div key={index} className="break-inside-avoid mb-2">
          {child}
        </div>
      ))}
    </div>
  );
};
