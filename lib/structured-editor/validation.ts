import type { GameConfig, PhaseConfig, QuizOption, QuizPhase } from '../../types/game-config.ts';

export type StructuredPhaseInput = {
  id: string;
  title: string;
  instruction: string;
  hint?: string;
  learningObjectiveIndices?: number[];
  quiz?: {
    question: string;
    options: QuizOption[];
    correctExplanation: string;
    incorrectExplanation?: string;
    points: number;
  };
};

export type StructuredLessonInput = {
  learningObjectives: string[];
  phases: StructuredPhaseInput[];
};

export class StructuredLessonError extends Error {}

const text = (value: unknown, label: string, min: number, max: number) => {
  if (typeof value !== 'string') throw new StructuredLessonError(`${label} must be text.`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) {
    throw new StructuredLessonError(`${label} must be between ${min} and ${max} characters.`);
  }
  return clean;
};

function parseQuiz(value: unknown, phaseId: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new StructuredLessonError(`Quiz ${phaseId} is required.`);
  }
  const quiz = value as Record<string, unknown>;
  if (!Array.isArray(quiz.options) || quiz.options.length < 2 || quiz.options.length > 8) {
    throw new StructuredLessonError(`Quiz ${phaseId} must have 2 to 8 options.`);
  }
  const seen = new Set<string>();
  const options = quiz.options.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new StructuredLessonError(`Quiz ${phaseId} option ${index + 1} is invalid.`);
    }
    const option = raw as Record<string, unknown>;
    const id = text(option.id, `Quiz ${phaseId} option ID`, 1, 80);
    if (seen.has(id)) throw new StructuredLessonError(`Quiz ${phaseId} option IDs must be unique.`);
    seen.add(id);
    if (typeof option.is_correct !== 'boolean') {
      throw new StructuredLessonError(`Quiz ${phaseId} must identify one correct option.`);
    }
    return { id, text: text(option.text, `Quiz ${phaseId} option`, 1, 300), is_correct: option.is_correct };
  });
  if (options.filter((option) => option.is_correct).length !== 1) {
    throw new StructuredLessonError(`Quiz ${phaseId} must have exactly one correct option.`);
  }
  if (typeof quiz.points !== 'number' || !Number.isInteger(quiz.points) || quiz.points < 1 || quiz.points > 100) {
    throw new StructuredLessonError(`Quiz ${phaseId} points must be a whole number from 1 to 100.`);
  }
  return {
    question: text(quiz.question, `Quiz ${phaseId} question`, 1, 500),
    options,
    explanation: text(quiz.correctExplanation, `Quiz ${phaseId} correct explanation`, 1, 1000),
    incorrect_explanation: quiz.incorrectExplanation
      ? text(quiz.incorrectExplanation, `Quiz ${phaseId} incorrect explanation`, 1, 1000)
      : undefined,
    points: quiz.points,
  };
}

export function applyStructuredLesson(original: GameConfig, input: unknown): GameConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new StructuredLessonError('Invalid structured lesson body.');
  }
  const raw = input as Record<string, unknown>;
  if (!Array.isArray(raw.learningObjectives) || raw.learningObjectives.length > 20) {
    throw new StructuredLessonError('Learning objectives must be a list of at most 20 items.');
  }
  const objectives = raw.learningObjectives.map((item, index) => text(item, `Learning objective ${index + 1}`, 3, 300));
  if (new Set(objectives.map((item) => item.toLocaleLowerCase())).size !== objectives.length) {
    throw new StructuredLessonError('Learning objectives must be unique.');
  }
  if (!Array.isArray(raw.phases) || raw.phases.length !== original.phases.length) {
    throw new StructuredLessonError('All existing phases must be preserved.');
  }
  const originals = new Map(original.phases.map((phase) => [phase.id, phase]));
  const ids = new Set<string>();
  const hints: Record<string, string> = { ...(original.npc?.hints ?? {}) };
  const phases = raw.phases.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StructuredLessonError(`Phase ${index + 1} is invalid.`);
    const item = value as Record<string, unknown>;
    const id = text(item.id, `Phase ${index + 1} ID`, 1, 200);
    const source = originals.get(id);
    if (!source || ids.has(id)) throw new StructuredLessonError('Phase IDs cannot be added, removed, or duplicated.');
    ids.add(id);
    const indices = item.learningObjectiveIndices ?? [];
    if (!Array.isArray(indices) || indices.some((entry) => !Number.isInteger(entry) || Number(entry) < 0 || Number(entry) >= objectives.length)) {
      throw new StructuredLessonError(`Phase ${id} has an invalid learning objective link.`);
    }
    const updated: PhaseConfig = {
      ...source,
      title: text(item.title, `Phase ${id} title`, 1, 200),
      instruction: text(item.instruction, `Phase ${id} instruction`, 1, 600),
      learning_objective_indices: [...new Set(indices as number[])],
    };
    if (typeof item.hint === 'string' && item.hint.trim()) hints[id] = text(item.hint, `Phase ${id} hint`, 1, 500);
    else delete hints[id];
    if (source.type === 'quiz') Object.assign(updated, parseQuiz(item.quiz, id));
    else if (item.quiz !== undefined) throw new StructuredLessonError(`Phase ${id} is not a quiz.`);
    return updated;
  });
  if (phases[0]?.type !== 'intro' || phases.at(-1)?.type !== 'complete') {
    throw new StructuredLessonError('Intro must remain first and Complete must remain last.');
  }
  const maxPossible = phases.reduce((sum, phase) => {
    if (phase.type === 'intro' || phase.type === 'complete') return sum;
    return sum + (phase.points ?? 0) + (phase.time_bonus?.bonus_points ?? 0);
  }, 0);
  return {
    ...original,
    meta: { ...original.meta, learning_objectives: objectives },
    phases,
    scoring: { ...original.scoring, max_possible: maxPossible },
    npc: original.npc ? { ...original.npc, hints } : original.npc,
  };
}

export function structuredLessonImpact(visibility: string | null, isAssigned: boolean) {
  return visibility === 'published' || isAssigned
    ? 'Changes affect students who start after you save. Existing attempts, answers, and scores stay unchanged.'
    : null;
}
