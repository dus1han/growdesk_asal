"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GUIDE_SCENES } from "./scenes";
import { ScaledStage } from "./stage";

/**
 * Plays the animated guide: each scene runs like a short screen recording, then the next one
 * starts. Viewers can pause, step back and forward, or jump to any step.
 */
export function GuidePlayer() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0); // bump to replay the current scene
  const scene = GUIDE_SCENES[index];
  const last = GUIDE_SCENES.length - 1;

  const go = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(GUIDE_SCENES.length - 1, i)));
    setRun((r) => r + 1);
  }, []);
  // At the end of the last scene, stop rather than loop.
  const onDone = useCallback(() => (index < last ? go(index + 1) : setPaused(true)), [index, last, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)] [&>*]:min-w-0">
      {/* Steps */}
      <Card className="self-start p-2">
        <ol className="flex gap-1 overflow-x-auto xl:flex-col" aria-label="Steps">
          {GUIDE_SCENES.map((s, i) => {
            const active = i === index;
            return (
              <li key={s.title} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    active ? "text-brand-strong" : "text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span layoutId="guide-step" className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                  )}
                  <span
                    className={cn(
                      "relative flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      active ? "bg-brand text-white" : i < index ? "bg-brand/15 text-brand-strong" : "bg-surface-muted text-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="relative hidden whitespace-nowrap font-medium sm:inline">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Stage + caption + controls */}
      <div className="min-w-0">
        <Card className="overflow-hidden" onMouseEnter={() => !reduced && setPaused(true)} onMouseLeave={() => !reduced && setPaused(false)}>
          <ScaledStage>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${index}-${run}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                <scene.Scene paused={paused} onDone={onDone} />
              </motion.div>
            </AnimatePresence>
          </ScaledStage>
          {/* Progress through the steps */}
          <div className="flex h-1 gap-1 bg-surface-muted/60 px-0">
            {GUIDE_SCENES.map((s, i) => (
              <span key={s.title} className={cn("h-full flex-1 transition-colors duration-300", i <= index ? "bg-gradient-to-r from-brand to-accent" : "bg-transparent")} />
            ))}
          </div>
        </Card>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <AnimatePresence mode="wait">
            <motion.div key={index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                Step {index + 1} of {GUIDE_SCENES.length}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold tracking-tight">{scene.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{scene.text}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous step">
              <ChevronLeft className="size-4" />
            </Button>
            {!reduced && (
              <Button variant="secondary" size="icon" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play" : "Pause"}>
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </Button>
            )}
            <Button variant="secondary" size="icon" onClick={() => go(index)} aria-label="Replay this step">
              <RotateCcw className="size-4" />
            </Button>
            {index < last ? (
              <Button onClick={() => go(index + 1)}>
                Next <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={() => go(0)}>
                Start again <RotateCcw className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Hover the video to pause it. Arrow keys move between steps; the space bar pauses.</p>
      </div>
    </div>
  );
}
