"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** The guide is drawn at a fixed laptop-like size, then scaled to fit, so nothing reflows. */
export const STAGE_W = 1300;
export const STAGE_H = 560;

const StageContext = createContext<{ root: React.RefObject<HTMLDivElement | null>; scale: number }>({
  root: { current: null },
  scale: 1,
});

export function ScaledStage({ children, className }: { children: React.ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / STAGE_W)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className={cn("relative overflow-hidden", className)} style={{ height: STAGE_H * scale }}>
      <div ref={root} className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
        <StageContext.Provider value={{ root, scale }}>{children}</StageContext.Provider>
      </div>
    </div>
  );
}

/** A browser window with an address bar. */
export function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-[#eef1f5] px-4 py-2">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex h-6 w-[420px] items-center rounded-md bg-white px-3 text-[11px] text-[#6b7686]">{url}</div>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Advances through a scene's phases on a timer, then calls onDone. With reduced motion, the
 * scene shows its last phase straight away and waits for the viewer to move on.
 */
export function usePhases(durations: number[], { paused, onDone }: { paused: boolean; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(reduced ? durations.length : 0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (paused || reduced) return;
    const wait = phase < durations.length ? durations[phase] : 1800;
    const t = setTimeout(() => (phase < durations.length ? setPhase((p) => p + 1) : done.current()), wait);
    return () => clearTimeout(t);
  }, [phase, paused, reduced, durations]);

  return phase;
}

/**
 * The guide's mouse pointer: glides to the element with the given data-target, and shows a
 * click ripple when `click` is set.
 */
export function Cursor({ target, click, offset = [0.6, 0.6] }: { target: string | null; click?: boolean; offset?: [number, number] }) {
  const { root, scale } = useContext(StageContext);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const stage = root.current;
    if (!stage || !target) return;
    // Wait a frame so elements that just appeared (menus, pickers) have their final layout.
    const id = requestAnimationFrame(() => {
      const el = stage.querySelector<HTMLElement>(`[data-target="${target}"]`);
      if (!el) return;
      const s = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setPos({ x: (r.left - s.left + r.width * offset[0]) / scale, y: (r.top - s.top + r.height * offset[1]) / scale });
    });
    return () => cancelAnimationFrame(id);
  }, [target, root, scale, offset]);

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-50"
      initial={{ x: STAGE_W * 0.55, y: STAGE_H * 0.8, opacity: 0 }}
      animate={pos ? { x: pos.x, y: pos.y, opacity: 1 } : { opacity: 0 }}
      transition={{ type: "spring", stiffness: 70, damping: 16, mass: 0.9 }}
    >
      <AnimatePresence>
        {click && (
          <motion.span
            key="ripple"
            className="absolute -left-4 -top-4 size-8 rounded-full bg-brand/35"
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
      <motion.svg width="22" height="22" viewBox="0 0 24 24" animate={{ scale: click ? 0.85 : 1 }} className="drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]">
        <path d="M4 2l15 11-6.5 1.2L9.8 21z" fill="#0f172a" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
      </motion.svg>
    </motion.div>
  );
}

/** Text that types itself out once `start` is set. */
export function TypeText({ text, start, speed = 38 }: { text: string; start: boolean; speed?: number }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || reduced) return;
    const id = setInterval(() => setCount((c) => (c >= text.length ? c : c + 1)), speed);
    return () => clearInterval(id);
  }, [start, reduced, text.length, speed]);
  const shown = !start ? 0 : reduced ? text.length : count;
  return (
    <>
      {text.slice(0, shown)}
      {start && shown < text.length && <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" />}
    </>
  );
}
