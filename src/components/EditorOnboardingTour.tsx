"use client";

import {
  EDITOR_ONBOARDING_STEPS,
  getOnboardingSelector,
  markEditorOnboardingComplete,
} from "@/lib/editorOnboarding";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PAD = 8;
const Z_OVERLAY = 10050;
const BLUR_PX = 14;

type Props = {
  open: boolean;
  onRequestClose: () => void;
  /** Ensure the sidebar is visible for the AI panel step */
  onNeedAiPanelVisible?: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function EditorOnboardingTour({ open, onRequestClose, onNeedAiPanelVisible }: Props) {
  const rawMaskId = useId();
  const maskId = `editor-onboarding-spot-${rawMaskId.replace(/:/g, "")}`;
  const [stepIndex, setStepIndex] = useState(0);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(
    null
  );
  const [viewport, setViewport] = useState({ w: 1200, h: 800 });
  const [mounted, setMounted] = useState(false);
  const [cardPos, setCardPos] = useState<{ top: number; left: number; maxW: number } | null>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    reduceMotionRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const step = EDITOR_ONBOARDING_STEPS[stepIndex]!;
  const total = EDITOR_ONBOARDING_STEPS.length;
  const isLast = stepIndex >= total - 1;
  const isCenter = "center" in step && step.center === true;

  useEffect(() => {
    if (!open) setStepIndex(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !mounted) return;
    const current = EDITOR_ONBOARDING_STEPS[stepIndex]!;
    if (current.id === "ai-panel") onNeedAiPanelVisible?.();
  }, [open, mounted, stepIndex, onNeedAiPanelVisible]);

  useLayoutEffect(() => {
    if (!open || !mounted) return;

    const current = EDITOR_ONBOARDING_STEPS[stepIndex]!;
    const centerStep = "center" in current && current.center === true;
    const selector = getOnboardingSelector(current);
    const measureDelay = current.id === "ai-panel" ? 60 : 0;

    function positionCenterCard() {
      const w = Math.min(400, window.innerWidth - 32);
      setCardPos({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        maxW: w,
      });
    }

    function positionCardNear(r: DOMRect) {
      const margin = 16;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cw = Math.min(360, vw - margin * 2);
      const ch = 200;
      let left = r.right + margin;
      let top = r.top + r.height / 2;
      if (left + cw > vw - margin) {
        left = r.left - margin - cw;
      }
      if (left < margin) {
        left = clamp(r.left + r.width / 2 - cw / 2, margin, vw - cw - margin);
      }
      top = clamp(top, margin + ch / 2, vh - margin - ch / 2);
      setCardPos({ top, left: left + cw / 2, maxW: cw });
    }

    function measure() {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      if (centerStep || !selector) {
        setBox(null);
        positionCenterCard();
        return;
      }
      const el = document.querySelector(selector);
      if (!el) {
        setBox(null);
        positionCenterCard();
        return;
      }
      const r = el.getBoundingClientRect();
      setBox({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
      positionCardNear(r);
    }

    let intervalId = 0;
    const startId = window.setTimeout(() => {
      measure();
      intervalId = window.setInterval(measure, 400);
    }, measureDelay);

    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      window.clearTimeout(startId);
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, mounted, stepIndex]);

  const finish = useCallback(() => {
    markEditorOnboardingComplete();
    onRequestClose();
  }, [onRequestClose]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const next = useCallback(() => {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  }, [isLast, finish]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, skip]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const cardAnim = reduceMotionRef.current ? "" : "editor-onboarding-card-pop";
  const spotlightAnim = reduceMotionRef.current ? "" : "editor-onboarding-spotlight-pop";

  return createPortal(
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: Z_OVERLAY }} aria-hidden={false}>
      <svg width="0" height="0" className="fixed" aria-hidden style={{ zIndex: 0 }}>
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={viewport.w}
            height={viewport.h}
          >
            <rect x="0" y="0" width={viewport.w} height={viewport.h} fill="white" />
            {box ? (
              <rect
                x={box.left}
                y={box.top}
                width={box.width}
                height={box.height}
                rx="12"
                ry="12"
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
      </svg>

      <div
        className="editor-onboarding-backdrop pointer-events-auto fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/55"
        style={{
          WebkitMaskImage: `url(#${maskId})`,
          maskImage: `url(#${maskId})`,
          WebkitMaskSize: `${viewport.w}px ${viewport.h}px`,
          maskSize: `${viewport.w}px ${viewport.h}px`,
          WebkitMaskPosition: "0 0",
          maskPosition: "0 0",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitBackdropFilter: `blur(${BLUR_PX}px)`,
          backdropFilter: `blur(${BLUR_PX}px)`,
        }}
        onMouseDown={(e) => e.preventDefault()}
        aria-hidden
      />

      {box ? (
        <div
          className={`pointer-events-none fixed z-[1] rounded-xl border-2 border-blue-500 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/50 dark:border-blue-400 dark:ring-blue-400/40 ${spotlightAnim}`}
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            transition: reduceMotionRef.current
              ? undefined
              : "top 0.28s ease, left 0.28s ease, width 0.28s ease, height 0.28s ease",
          }}
        />
      ) : null}

      {cardPos ? (
        <div
          key={stepIndex}
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-onboarding-title"
          aria-describedby="editor-onboarding-desc"
          className={`fixed z-[2] w-[min(100vw-2rem,var(--tw-card-max,360px))] rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl pointer-events-auto dark:border-zinc-600 dark:bg-zinc-900 ${cardAnim}`}
          style={{
            top: isCenter ? "50%" : cardPos.top,
            left: isCenter ? "50%" : cardPos.left,
            maxWidth: cardPos.maxW,
            transform: isCenter ? "translate(-50%, -50%)" : "translate(-50%, -50%)",
            ["--tw-card-max" as string]: `${cardPos.maxW}px`,
          }}
        >
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Step {stepIndex + 1} of {total}
          </div>
          <h2 id="editor-onboarding-title" className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {step.title}
          </h2>
          <p id="editor-onboarding-desc" className="mb-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            {step.body}
          </p>
          <p className="mb-4 text-[10px] text-zinc-400 dark:text-zinc-500">Esc also skips the tour.</p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={skip}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              title="End the tour (same as Esc)"
            >
              Skip tour
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}
