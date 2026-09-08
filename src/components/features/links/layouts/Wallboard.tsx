// src/components/features/links/layouts/Wallboard.tsx
import React from "react";

interface WallboardProps {
  children: React.ReactNode[];
}

export const Wallboard: React.FC<WallboardProps> = ({ children }) => {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 auto-rows-fr">
      {React.Children.map(children, (child, index) => (
        <div key={index} className="h-full">
            {child}
        </div>
      ))}
    </div>
  );
};
