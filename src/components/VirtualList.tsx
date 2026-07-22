"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  count: number;
  rowHeight: number;
  gap?: number;
  overscan?: number;
  height?: number; // viewport height for the scroll area
  renderRow: (index: number) => React.ReactNode;
  keyFor: (index: number) => string;
}

/** Minimal fixed-height virtualization — renders only the visible window. */
export function VirtualList({
  count,
  rowHeight,
  gap = 10,
  overscan = 6,
  height = 620,
  renderRow,
  keyFor,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(height);

  const stride = rowHeight + gap;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onResize = () => setViewport(el.clientHeight);
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset scroll to top when the result set changes size drastically.
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [count]);

  const total = count * stride;
  const first = Math.max(0, Math.floor(scrollTop / stride) - overscan);
  const visibleCount = Math.ceil(viewport / stride) + overscan * 2;
  const last = Math.min(count, first + visibleCount);

  const items: React.ReactNode[] = [];
  for (let i = first; i < last; i++) {
    items.push(
      <div
        key={keyFor(i)}
        style={{
          position: "absolute",
          top: i * stride,
          left: 0,
          right: 0,
          height: rowHeight,
        }}
      >
        {renderRow(i)}
      </div>,
    );
  }

  return (
    <div
      ref={ref}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{
        height,
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        WebkitOverflowScrolling: "touch",
      }}
      role="list"
    >
      <div style={{ height: total, position: "relative" }}>{items}</div>
    </div>
  );
}
