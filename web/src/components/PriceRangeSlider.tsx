"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type Props = {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  debounceMs?: number;
};

export function PriceRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  debounceMs = 400,
}: Props) {
  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);
  const debouncedMin = useDebouncedValue(localMin, debounceMs);
  const debouncedMax = useDebouncedValue(localMax, debounceMs);

  useEffect(() => {
    setLocalMin(valueMin);
    setLocalMax(valueMax);
  }, [valueMin, valueMax]);

  useEffect(() => {
    onChange(debouncedMin, debouncedMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin, debouncedMax]);

  const safeMin = Math.min(localMin, localMax);
  const safeMax = Math.max(localMin, localMax);
  const leftPct = ((safeMin - min) / (max - min)) * 100;
  const widthPct = ((safeMax - safeMin) / (max - min)) * 100;

  return (
    <div className="space-y-4">
      <div className="relative h-2 rounded-full bg-muted">
        <div
          className="absolute h-full rounded-full"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            background: "var(--gradient-brand)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localMin}
          onChange={(e) => setLocalMin(Math.min(Number(e.target.value), localMax))}
          className="price-range-input price-range-input--min"
          aria-label="Prix minimum"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localMax}
          onChange={(e) => setLocalMax(Math.max(Number(e.target.value), localMin))}
          className="price-range-input price-range-input--max"
          aria-label="Prix maximum"
        />
      </div>
      <div className="flex items-center justify-between text-sm font-medium text-foreground">
        <span>{safeMin} TND</span>
        <span className="text-muted-foreground">—</span>
        <span>{safeMax} TND</span>
      </div>
    </div>
  );
}
