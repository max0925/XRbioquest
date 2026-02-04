import { useState, useCallback, useEffect, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING TOUR HOOK - Guided walkthrough for first-time users
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'bioquest_onboarding_complete';

export interface TourStep {
  title: string;
  description: string;
  target: string; // CSS selector (matches data-tour attributes)
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to BioQuest',
    description: 'Build immersive VR biology lessons with AI. Let\u2019s take a quick tour of your workspace.',
    target: '[data-tour="welcome"]',
  },
  {
    title: 'AI Chat',
    description: 'Describe your lesson here. The AI agent will find 3D models, build environments, and assemble your scene automatically.',
    target: '[data-tour="agent-sidebar"]',
  },
  {
    title: 'AI Orchestrator',
    description: 'Ask a question naturally \u2014 the AI will change the environment and adjust 3D model parameters to match. Try: \u201CWhat happens to the heart in zero gravity?\u201D',
    target: '[data-tour="ai-orchestrator-btn"]',
  },
  {
    title: '3D Viewport',
    description: 'Your live VR scene renders here. Click any model to select it, then use the toolbar to move, rotate, or scale.',
    target: '[data-tour="viewport"]',
  },
  {
    title: 'Scene Inspector',
    description: 'View and edit every asset in your scene. Adjust transforms, toggle visibility, or remove models.',
    target: '[data-tour="inspector-panel"]',
  },
  {
    title: 'Transform Tools',
    description: 'Move, rotate, and scale selected objects. Use the AI Orchestrator button on the right to control the entire scene with natural language.',
    target: '[data-tour="transform-toolbar"]',
  },
  {
    title: 'Export to VR',
    description: 'When your scene is ready, export it to VR for an immersive classroom experience.',
    target: '[data-tour="export-btn"]',
  },
];

export interface UseOnboardingTourReturn {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TourStep | null;
  showDismissPrompt: boolean;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  resetTour: () => void;
  dismissForever: () => void;
  dismissRemindLater: () => void;
}

export function useOnboardingTour(): UseOnboardingTourReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDismissPrompt, setShowDismissPrompt] = useState(false);
  const totalSteps = TOUR_STEPS.length;

  // Auto-start on first visit after a short delay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    const timer = setTimeout(() => {
      setIsActive(true);
      setCurrentStep(0);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setShowDismissPrompt(false);
    setIsActive(true);
  }, []);

  // End tour (skip or complete) — show dismiss prompt, don't save yet
  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    setShowDismissPrompt(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      const next = prev + 1;
      if (next >= totalSteps) {
        setIsActive(false);
        setShowDismissPrompt(true);
        return 0;
      }
      return next;
    });
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const resetTour = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setCurrentStep(0);
    setIsActive(false);
    setShowDismissPrompt(false);
  }, []);

  // User explicitly chose "don't show again"
  const dismissForever = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
    setShowDismissPrompt(false);
  }, []);

  // User chose "remind me next time" — no save, will auto-start on next visit
  const dismissRemindLater = useCallback(() => {
    setShowDismissPrompt(false);
  }, []);

  const currentStepData = useMemo(() => {
    if (!isActive || currentStep < 0 || currentStep >= totalSteps) return null;
    return TOUR_STEPS[currentStep];
  }, [isActive, currentStep, totalSteps]);

  return {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    showDismissPrompt,
    startTour,
    endTour,
    nextStep,
    prevStep,
    resetTour,
    dismissForever,
    dismissRemindLater,
  };
}
