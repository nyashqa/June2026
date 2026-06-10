"use client";

import { useEffect, useState } from "react";

const GLYPHS = ["✨", "💖", "⭐", "🌟", "💕", "🩷", "💎"];

type Spark = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  glyph: string;
};

// Falling glitter, like the cursor-trail scripts every 2000s fan site had.
// 12 штук — компромисс: каждая блёстка это отдельный композитный слой.
export default function Sparkles({ count = 12 }: { count?: number }) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  useEffect(() => {
    setSparks(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 12 + Math.random() * 16,
        duration: 6 + Math.random() * 10,
        delay: Math.random() * 10,
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      }))
    );
  }, [count]);

  return (
    <>
      {sparks.map((s) => (
        <span
          key={s.id}
          className="sparkle"
          style={{
            left: `${s.left}vw`,
            fontSize: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        >
          {s.glyph}
        </span>
      ))}
    </>
  );
}
