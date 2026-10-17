import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeJoinCode, optionalClassText, parseClassFields, parseJoinRequest } from '../lib/classroom/validation.ts';
import { createJoinCode } from '../lib/classroom/join-code.ts';
import { getClassroomRole } from '../lib/classroom/roles.ts';

test('join code normalization accepts classroom-friendly formatting', () => {
  assert.equal(normalizeJoinCode(' abcd-2345 '), 'ABCD2345');
  assert.equal(normalizeJoinCode('O0IL1234'), null);
  assert.equal(normalizeJoinCode('TOO-SHORT'), null);
});

test('generated join codes use the safe alphabet and expected length', () => {
  const codes = Array.from({ length: 1_000 }, createJoinCode);
  for (const code of codes) assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  assert.ok(new Set(codes).size > 990, 'join codes should have practical entropy');
});

test('class metadata requires nonempty bounded strings', () => {
  assert.equal(optionalClassText(' Biology 10 ', 20), 'Biology 10');
  assert.equal(optionalClassText('   ', 20), null);
  assert.equal(optionalClassText('x'.repeat(21), 20), null);
});

test('classroom request parsing rejects null, arrays, and incorrect field types', () => {
  assert.equal(parseClassFields(null), null);
  assert.equal(parseClassFields([]), null);
  assert.equal(parseClassFields({ name: 'Biology', grade: 10, subject: 'Biology' }), null);
  assert.deepEqual(parseClassFields({ name: ' Period 3 ', grade: ' Grade 10 ', subject: ' Biology ' }), {
    name: 'Period 3', grade: 'Grade 10', subject: 'Biology',
  });
  assert.equal(parseJoinRequest(null), null);
  assert.equal(parseJoinRequest([]), null);
  assert.equal(parseJoinRequest({ joinCode: 12345678 }), null);
  assert.equal(parseJoinRequest({ joinCode: 'abcd-2345' }), 'ABCD2345');
});

test('classroom authorization accepts only trusted app metadata roles', () => {
  assert.equal(getClassroomRole({ app_metadata: { role: 'teacher' } }), 'teacher');
  assert.equal(getClassroomRole({ app_metadata: { role: 'student' } }), 'student');
  assert.equal(getClassroomRole({ app_metadata: {} }), null);
  assert.equal(getClassroomRole({ app_metadata: { role: 'admin' } }), null);
  assert.equal(getClassroomRole({ app_metadata: {}, user_metadata: { role: 'teacher' } } as never), null);
});
