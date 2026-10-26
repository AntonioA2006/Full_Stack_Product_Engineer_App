import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  continueAfterTheory,
  initialJourneyState,
  submitAnswer,
  type AnswerDecision,
} from '../src/domain/learningPath.ts';
import { findActivity } from '../src/domain/syllabus.ts';
import { DomainError, type JourneyState } from '../src/domain/types.ts';

const NOW = new Date('2026-10-25T18:00:00.000Z');

function answer(state: JourneyState, activityId: string, optionId: string): AnswerDecision {
  return submitAnswer(state, { activityId, optionId, now: NOW });
}

function expectCode(fn: () => unknown, code: string) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.code, code);
    return true;
  });
}

describe('seed del PDF', () => {
  it('conserva enunciados y la opción correcta de A1–R3', () => {
    const expected = [
      ['A1', 'Resuelve x + 4 = 9.', 'b', '5'],
      ['R1', 'Resuelve 3x = 12.', 'a', '4'],
      ['A2', 'Resuelve 2x + 3 = 11.', 'b', '4'],
      ['R2', 'Resuelve 5x - 7 = 8.', 'b', '3'],
      ['A3', 'Resuelve x² - 5x + 6 = 0.', 'a', 'x = 2, x = 3'],
      ['R3', 'Resuelve x² - 9 = 0.', 'b', 'x = -3, x = 3'],
    ] as const;

    for (const [id, prompt, optionId, text] of expected) {
      const located = findActivity(id);
      assert.ok(located);
      assert.equal(located.activity.prompt, prompt);
      assert.equal(located.activity.correctOptionId, optionId);
      assert.equal(located.activity.options.find((option) => option.id === optionId)?.text, text);
    }
  });
});

describe('reglas del recorrido', () => {
  it('empieza en la actividad principal del tema 1', () => {
    assert.deepEqual(initialJourneyState(), { step: 'MAIN', currentTopicId: 'tema-1' });
  });

  it('1. acierto en principal completa el tema y abre el siguiente', () => {
    const start = initialJourneyState();
    const result = answer(start, 'A1', 'b');

    assert.equal(result.correct, true);
    assert.equal(result.outcome, 'CORRECT_NEXT_TOPIC');
    assert.deepEqual(result.state, { step: 'MAIN', currentTopicId: 'tema-2' });
    assert.equal(result.attempt.activityId, 'A1');
    assert.equal(result.attempt.optionId, 'b');
    assert.equal(result.attempt.correct, true);
    assert.equal(result.attempt.createdAt, NOW.toISOString());
    assert.equal(start.step, 'MAIN');
  });

  it('2. fallo en principal lleva a la teoría del mismo tema', () => {
    const result = answer(initialJourneyState(), 'A1', 'a');
    assert.equal(result.outcome, 'INCORRECT_TO_THEORY');
    assert.deepEqual(result.state, { step: 'THEORY', currentTopicId: 'tema-1' });
    assert.equal(result.attempt.correct, false);
  });

  it('3. después de la teoría se puede continuar al refuerzo', () => {
    const afterFail = answer(initialJourneyState(), 'A1', 'c').state;
    const next = continueAfterTheory(afterFail);
    assert.deepEqual(next, { step: 'REINFORCEMENT', currentTopicId: 'tema-1' });
  });

  it('4. acierto en refuerzo completa el tema y abre el siguiente', () => {
    const reinforcement: JourneyState = { step: 'REINFORCEMENT', currentTopicId: 'tema-1' };
    const result = answer(reinforcement, 'R1', 'a');
    assert.equal(result.outcome, 'CORRECT_NEXT_TOPIC');
    assert.deepEqual(result.state, { step: 'MAIN', currentTopicId: 'tema-2' });
  });

  it('5 y 6. fallo en refuerzo vuelve a teoría y el mismo refuerzo se puede reintentar', () => {
    let state: JourneyState = { step: 'REINFORCEMENT', currentTopicId: 'tema-1' };

    const first = answer(state, 'R1', 'b');
    assert.equal(first.outcome, 'INCORRECT_TO_THEORY');
    state = continueAfterTheory(first.state);
    assert.equal(state.step, 'REINFORCEMENT');

    const second = answer(state, 'R1', 'c');
    state = continueAfterTheory(second.state);
    const third = answer(state, 'R1', 'a');

    assert.equal(third.correct, true);
    assert.equal(third.attempt.activityId, 'R1');
    assert.deepEqual(third.state, { step: 'MAIN', currentTopicId: 'tema-2' });
  });

  it('7. un tema completado no acepta otra respuesta', () => {
    const onTopic2: JourneyState = { step: 'MAIN', currentTopicId: 'tema-2' };
    expectCode(() => answer(onTopic2, 'A1', 'b'), 'ACTIVITY_NOT_AVAILABLE');
    expectCode(() => answer(onTopic2, 'R1', 'a'), 'ACTIVITY_NOT_AVAILABLE');
  });

  it('8. no se puede responder una actividad que no es el paso actual', () => {
    const start = initialJourneyState();
    expectCode(() => answer(start, 'R1', 'a'), 'PATH_VIOLATION');
    expectCode(() => answer(start, 'A2', 'b'), 'PATH_VIOLATION');
    expectCode(() => answer(start, 'A3', 'a'), 'PATH_VIOLATION');

    const theory: JourneyState = { step: 'THEORY', currentTopicId: 'tema-1' };
    expectCode(() => answer(theory, 'R1', 'a'), 'PATH_VIOLATION');
    expectCode(() => answer(theory, 'A1', 'b'), 'ACTIVITY_NOT_AVAILABLE');
    expectCode(() => continueAfterTheory(start), 'PATH_VIOLATION');

    const reinforcement: JourneyState = { step: 'REINFORCEMENT', currentTopicId: 'tema-2' };
    expectCode(() => answer(reinforcement, 'A2', 'b'), 'ACTIVITY_NOT_AVAILABLE');
  });

  it('9. acertar el último tema completa el temario', () => {
    const fromMain = answer({ step: 'MAIN', currentTopicId: 'tema-3' }, 'A3', 'a');
    assert.equal(fromMain.outcome, 'CORRECT_COURSE_DONE');
    assert.deepEqual(fromMain.state, { step: 'COURSE_DONE', currentTopicId: 'tema-3' });

    const fromReinforcement = answer(
      { step: 'REINFORCEMENT', currentTopicId: 'tema-3' },
      'R3',
      'b',
    );
    assert.equal(fromReinforcement.outcome, 'CORRECT_COURSE_DONE');
    assert.equal(fromReinforcement.state.step, 'COURSE_DONE');
  });

  it('rechaza opción inexistente, actividad desconocida y envíos con el curso terminado', () => {
    expectCode(() => answer(initialJourneyState(), 'A1', 'z'), 'INVALID_OPTION');
    expectCode(() => answer(initialJourneyState(), 'A9', 'a'), 'ACTIVITY_NOT_AVAILABLE');
    expectCode(() => answer(initialJourneyState(), 'T1', 'a'), 'ACTIVITY_NOT_AVAILABLE');

    const done: JourneyState = { step: 'COURSE_DONE', currentTopicId: 'tema-3' };
    expectCode(() => answer(done, 'A3', 'a'), 'COURSE_ALREADY_FINISHED');
    expectCode(() => continueAfterTheory(done), 'COURSE_ALREADY_FINISHED');
  });
});
