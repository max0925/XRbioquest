// @ts-nocheck
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { UseOnboardingTourReturn } from "../../hooks/useOnboardingTour";

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING TOUR — Spotlight overlay with guided tooltip
// Observatory-instrument aesthetic: precise, warm, authoritative
// ═══════════════════════════════════════════════════════════════════════════

interface OnboardingTourProps {
  tour: UseOnboardingTourReturn;
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Padding around the spotlight cutout
const SPOT_PAD = 12;
// Rounded corner radius for cutout
const SPOT_RADIUS = 16;

export default function OnboardingTour({ tour }: OnboardingTourProps) {
  const { isActive, currentStep, totalSteps, currentStepData, nextStep, prevStep, endTour, showDismissPrompt, dismissForever, dismissRemindLater } = tour;

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipSide, setTooltipSide] = useState<"top" | "bottom">("bottom");
  const rafRef = useRef<number>(0);

  // ── Measure the target element ──────────────────────────────────────────
  const measure = useCallback(() => {
    if (!currentStepData?.target) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStepData.target);
    if (!el) {
      // Target not found — show centered (welcome screen)
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });

    // Determine tooltip placement
    const centerY = rect.y + rect.height / 2;
    setTooltipSide(centerY > window.innerHeight * 0.5 ? "top" : "bottom");
  }, [currentStepData]);

  // Re-measure on step change and window resize
  useEffect(() => {
    if (!isActive) return;

    // Small delay for DOM to settle (panels animating in, etc.)
    const timer = setTimeout(measure, 80);

    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, currentStep, measure]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") endTour();
      if (e.key === "ArrowRight" || e.key === "Enter") nextStep();
      if (e.key === "ArrowLeft") prevStep();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, endTour, nextStep, prevStep]);

  // Show dismiss prompt even when tour is inactive
  if (!isActive && !showDismissPrompt) return null;

  // If tour is inactive but dismiss prompt is showing, render only the modal
  if (!isActive && showDismissPrompt) {
    return (
      <AnimatePresence>
        <motion.div
          key="dismiss-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={dismissRemindLater}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-[340px]"
            style={{
              background: "linear-gradient(170deg, rgba(28,28,28,0.99) 0%, rgba(12,12,12,0.99) 100%)",
              borderRadius: "16px",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.07), " +
                "0 32px 80px -16px rgba(0,0,0,0.8), " +
                "0 0 40px -8px rgba(251,191,36,0.06)",
            }}
          >
            {/* Accent line */}
            <div
              className="absolute top-0 left-6 right-6 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(251,191,36,0.3) 30%, rgba(251,191,36,0.3) 70%, transparent)",
              }}
            />

            <div className="px-6 pt-6 pb-5">
              <h3
                className="text-[16px] font-semibold mb-2"
                style={{ color: "rgba(255,255,255,0.95)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Don&apos;t show this again?
              </h3>
              <p
                className="text-[13px] leading-relaxed mb-6"
                style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                You can always restart the tour from the help button in the bottom-left corner.
              </p>

              <div className="flex items-center gap-2.5">
                {/* Remind me next time */}
                <button
                  onClick={dismissRemindLater}
                  className="flex-1 h-9 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                  }}
                >
                  Remind me next time
                </button>

                {/* Don't show again */}
                <button
                  onClick={dismissForever}
                  className="flex-1 h-9 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#000",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 16px rgba(245,158,11,0.25)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 24px rgba(245,158,11,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 16px rgba(245,158,11,0.25)";
                  }}
                >
                  Don&apos;t show again
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Spotlight cutout coordinates (with padding)
  const spot = targetRect
    ? {
        x: targetRect.x - SPOT_PAD,
        y: targetRect.y - SPOT_PAD,
        w: targetRect.width + SPOT_PAD * 2,
        h: targetRect.height + SPOT_PAD * 2,
      }
    : null;

  // Tooltip position
  const tooltipStyle = getTooltipPosition(spot, tooltipSide);

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isCentered = !spot; // No target → welcome/centered mode

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[9999]"
        style={{ pointerEvents: "auto" }}
      >
        {/* ── SVG Spotlight Mask ───────────────────────────────────────── */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              {/* White = visible (the dark overlay) */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black = cutout (the spotlight hole) */}
              {spot && (
                <motion.rect
                  initial={{ opacity: 0 }}
                  animate={{
                    x: spot.x,
                    y: spot.y,
                    width: spot.w,
                    height: spot.h,
                    opacity: 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  rx={SPOT_RADIUS}
                  ry={SPOT_RADIUS}
                  fill="black"
                />
              )}
            </mask>
          </defs>

          {/* Dark overlay with the cutout */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.72)"
            mask="url(#tour-spotlight-mask)"
          />

          {/* Spotlight border ring — warm amber glow */}
          {spot && (
            <motion.rect
              initial={{ opacity: 0 }}
              animate={{
                x: spot.x - 1,
                y: spot.y - 1,
                width: spot.w + 2,
                height: spot.h + 2,
                opacity: 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              rx={SPOT_RADIUS + 1}
              ry={SPOT_RADIUS + 1}
              fill="none"
              stroke="rgba(251,191,36,0.25)"
              strokeWidth="2"
            />
          )}
        </svg>

        {/* ── Click-away layer (outside spotlight) ────────────────────── */}
        <div
          className="absolute inset-0"
          onClick={endTour}
          style={{ pointerEvents: spot ? "auto" : "none" }}
        />

        {/* ── Tooltip Card ────────────────────────────────────────────── */}
        <motion.div
          key={`tooltip-${currentStep}`}
          initial={{ opacity: 0, y: tooltipSide === "top" ? 10 : -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute z-10"
          style={{
            ...tooltipStyle,
            ...(isCentered && {
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              position: "fixed",
            }),
            pointerEvents: "auto",
          }}
        >
          <div
            className="relative w-[340px]"
            style={{
              background: "linear-gradient(170deg, rgba(28,28,28,0.98) 0%, rgba(15,15,15,0.99) 100%)",
              borderRadius: "16px",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.07), " +
                "0 24px 80px -16px rgba(0,0,0,0.7), " +
                "0 0 40px -8px rgba(251,191,36,0.06)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-6 right-6 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(251,191,36,0.3) 30%, rgba(251,191,36,0.3) 70%, transparent)",
              }}
            />

            {/* Content */}
            <div className="px-6 pt-5 pb-4">
              {/* Step indicator */}
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3"
                style={{ color: "rgba(251,191,36,0.6)" }}
              >
                {currentStep + 1} / {totalSteps}
              </div>

              {/* Title */}
              <h3
                className="text-[17px] font-semibold leading-snug mb-2"
                style={{
                  color: "rgba(255,255,255,0.95)",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                {currentStepData.title}
              </h3>

              {/* Description */}
              <p
                className="text-[13px] leading-[1.6] mb-5"
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                {currentStepData.description}
              </p>

              {/* Progress dots + navigation */}
              <div className="flex items-center justify-between">
                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === currentStep ? "18px" : "5px",
                        height: "5px",
                        background:
                          i === currentStep
                            ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                            : i < currentStep
                              ? "rgba(251,191,36,0.3)"
                              : "rgba(255,255,255,0.1)",
                        boxShadow:
                          i === currentStep
                            ? "0 0 8px rgba(251,191,36,0.3)"
                            : "none",
                      }}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-1.5">
                  {/* Skip */}
                  <button
                    onClick={endTour}
                    className="px-3 py-1.5 text-[11px] rounded-lg transition-all"
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                    }}
                  >
                    Skip
                  </button>

                  {/* Prev */}
                  {!isFirst && (
                    <button
                      onClick={prevStep}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}

                  {/* Next / Finish */}
                  <button
                    onClick={isLast ? endTour : nextStep}
                    className="h-8 px-4 flex items-center gap-1.5 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "#000",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 2px 16px rgba(245,158,11,0.25)",
                      letterSpacing: "0.01em",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 24px rgba(245,158,11,0.4)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 16px rgba(245,158,11,0.25)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {isLast ? "Get Started" : "Next"}
                    {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Position the tooltip relative to the spotlight
// ═══════════════════════════════════════════════════════════════════════════

function getTooltipPosition(
  spot: { x: number; y: number; w: number; h: number } | null,
  side: "top" | "bottom"
): React.CSSProperties {
  if (!spot) return {};

  const TOOLTIP_W = 340;
  const TOOLTIP_H_EST = 200; // estimated max tooltip height
  const GAP = 16;
  const EDGE = 20; // minimum distance from viewport edges
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // Horizontal: center on spotlight, clamp to viewport
  let left = spot.x + spot.w / 2 - TOOLTIP_W / 2;
  left = Math.max(EDGE, Math.min(left, vw - TOOLTIP_W - EDGE));

  if (side === "bottom") {
    // Place below — clamp so it doesn't overflow bottom edge
    let top = spot.y + spot.h + GAP;
    if (top + TOOLTIP_H_EST > vh - EDGE) {
      top = vh - TOOLTIP_H_EST - EDGE;
    }
    top = Math.max(EDGE, top);
    return { top, left };
  }

  // Place above — use top instead of bottom for reliable clamping
  let top = spot.y - GAP - TOOLTIP_H_EST;
  if (top < EDGE) {
    top = EDGE;
  }
  return { top, left };
}
