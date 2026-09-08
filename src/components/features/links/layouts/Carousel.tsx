// src/components/features/links/layouts/Carousel.tsx
import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CarouselProps {
  children: React.ReactNode[];
}

export const Carousel: React.FC<CarouselProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    containerRef.current.scrollBy({
      left: dir === "left" ? -width / 2 : width / 2, // Scroll by half the container width for a smoother feel
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full flex items-center">
      <Button
        variant="outline"
        size="icon"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 h-8 w-8 rounded-full shadow-md bg-background/80 backdrop-blur"
        aria-label="Scroll left"
      >
        <ChevronLeft size={16} />
      </Button>
      <div
        ref={containerRef}
        className="flex w-full space-x-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-4 scrollbar-hide"
      >
        {React.Children.map(children, (child, i) => (
          <div
            key={i}
            className="snap-start shrink-0" // Removed fixed width to allow items to size naturally
          >
            {child}
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 h-8 w-8 rounded-full shadow-md bg-background/80 backdrop-blur"
        aria-label="Scroll right"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
};
