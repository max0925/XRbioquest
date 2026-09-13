import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAssignmentFields } from '../lib/assignments/validation.ts';
import { parseProgress, parseStartAttempt } from '../lib/assignments/progress-validation.ts';
import { csvCell, formatDuration, getStudentAssignmentAction, parseReview } from '../lib/assignments/gradebook.ts';

test('assignment fields parse valid optional values and retry setting', () => {
  const parsed = parseAssignmentFields({ classId: 'class-1', experienceId: 'game-1', title: ' Cell Quest ', instructions: '', dueAt: '', allowRetries: true });
  assert.deepEqual(parsed, { classId: 'class-1', experienceId: 'game-1', title: 'Cell Quest', instructions: null, dueAt: null, allowRetries: true });
});

test('attempt context accepts only bounded assignment and experience identifiers', () => {
  assert.deepEqual(parseStartAttempt({ assignmentId: 'assignment-a', experienceId: 'experience-a' }), {
    assignmentId: 'assignment-a', experienceId: 'experience-a',
  });
  assert.equal(parseStartAttempt(null), null);
  assert.equal(parseStartAttempt([]), null);
  assert.equal(parseStartAttempt({ assignmentId: 1, experienceId: 'experience-a' }), null);
});

test('progress input does not accept client score, correctness, or duration fields', () => {
  assert.deepEqual(parseProgress({ experienceId: 'experience-a', phaseId: 'quiz-1', answer: { option_id: 'b' } }), {
    experienceId: 'experience-a', phaseId: 'quiz-1', answer: { option_id: 'b' },
  });
  assert.deepEqual(parseProgress({ experienceId: 'experience-a', phaseId: 'click-1' }), {
    experienceId: 'experience-a', phaseId: 'click-1', answer: null,
  });
  assert.equal(parseProgress({ experienceId: 'experience-a', phaseId: 'quiz-1', answer: { option_id: 'b', score: 999 } }), null);
  assert.equal(parseProgress({ experienceId: 'experience-a', phaseId: 'quiz-1', answer: [] }), null);
  assert.equal(parseProgress({ experienceId: 'experience-a', phaseId: 4 }), null);
});

test('completed assignments with retries disabled have no launch action', () => {
  assert.deepEqual(getStudentAssignmentAction('completed', false), { enabled: false, label: 'Completed · Retries disabled' });
  assert.deepEqual(getStudentAssignmentAction('completed', true), { enabled: true, label: 'Try again' });
});

test('teacher review fields are bounded and CSV cells cannot inject columns', () => {
  assert.deepEqual(parseReview({ manualAdjustment: -1.5, teacherFeedback: 'Review meiosis.' }), {
    manualAdjustment: -1.5, teacherFeedback: 'Review meiosis.',
  });
  assert.equal(parseReview({ manualAdjustment: '5', teacherFeedback: '' }), null);
  assert.equal(parseReview({ manualAdjustment: 5, teacherFeedback: 'x'.repeat(4001) }), null);
  assert.equal(csvCell('Student, "A"'), '"Student, ""A"""');
  assert.equal(csvCell('=IMPORTXML("bad")'), '"\'=IMPORTXML(""bad"")"');
  assert.equal(formatDuration(125), '2m 5s');
});

test('assignment fields reject malformed bodies and invalid dates', () => {
  assert.equal(parseAssignmentFields(null), null);
  assert.equal(parseAssignmentFields([]), null);
  assert.equal(parseAssignmentFields({ classId: 'c', experienceId: 'g', title: 'T', allowRetries: 'yes' }), null);
  assert.equal(parseAssignmentFields({ classId: 'c', experienceId: 'g', title: 'T', dueAt: 'not-a-date', allowRetries: false }), null);
  assert.equal(parseAssignmentFields({ classId: 'c', experienceId: 'g', title: '', allowRetries: false }), null);
});
