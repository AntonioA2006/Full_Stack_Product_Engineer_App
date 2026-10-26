import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toJourneyView, toPublicActivity, toSyllabusView } from '../src/domain/presenter.ts';
import { TOPICS } from '../src/domain/syllabus.ts';
import type { Attempt, JourneyState } from '../src/domain/types.ts';

describe('vista pública', () => {
  it('no incluye la respuesta correcta al pedir una actividad pendiente', () => {
    const state: JourneyState = { step: 'MAIN', currentTopicId: 'tema-1' };
    const view = toJourneyView(state, []);
    const serialized = JSON.stringify(view);

    assert.equal(serialized.includes('correctOptionId'), false);
    assert.equal(view.activity?.id, 'A1');
    assert.equal(view.theory, null);
    assert.deepEqual(
      view.activity?.options.map((option) => option.id),
      ['a', 'b', 'c'],
    );
    for (const option of view.activity?.options ?? []) {
      assert.equal('correct' in option, false);
      assert.equal('correctOptionId' in option, false);
    }
  });

  it('en teoría muestra el texto y no la pregunta de refuerzo', () => {
    const view = toJourneyView({ step: 'THEORY', currentTopicId: 'tema-2' }, []);
    assert.equal(view.activity, null);
    assert.equal(view.theory?.id, 'T2');
    assert.match(view.theory?.body ?? '', /2x \+ 3 = 11/);
    assert.equal(JSON.stringify(view).includes('correctOptionId'), false);
  });

  it('marca progreso: completados, actual y bloqueados', () => {
    const view = toJourneyView({ step: 'REINFORCEMENT', currentTopicId: 'tema-2' }, []);
    assert.deepEqual(
      view.topics.map((topic) => topic.status),
      ['completed', 'current', 'locked'],
    );
    assert.deepEqual(view.progress, { completedTopics: 1, totalTopics: 3 });
    assert.equal(view.activity?.id, 'R2');
  });

  it('con el curso terminado los tres temas quedan completados', () => {
    const view = toJourneyView({ step: 'COURSE_DONE', currentTopicId: 'tema-3' }, []);
    assert.equal(view.activity, null);
    assert.equal(view.theory, null);
    assert.deepEqual(view.progress, { completedTopics: 3, totalTopics: 3 });
    assert.ok(view.topics.every((topic) => topic.status === 'completed'));
  });

  it('el temario público no lleva opciones ni respuestas', () => {
    const syllabus = toSyllabusView();
    const serialized = JSON.stringify(syllabus);
    assert.equal(serialized.includes('correctOptionId'), false);
    assert.equal(serialized.includes('Resuelve'), false);
    assert.deepEqual(syllabus.topics.map((topic) => topic.contents.map((item) => item.id)), [
      ['A1', 'T1', 'R1'],
      ['A2', 'T2', 'R2'],
      ['A3', 'T3', 'R3'],
    ]);
  });

  it('la actividad pública es una copia sin la clave correcta', () => {
    const publicActivity = toPublicActivity(TOPICS[0].main);
    assert.equal('correctOptionId' in publicActivity, false);
    assert.equal(TOPICS[0].main.correctOptionId, 'b');
  });

  it('el historial muestra la opción elegida y si fue correcta, no la clave', () => {
    const attempts: Attempt[] = [
      {
        id: 1,
        activityId: 'A1',
        topicId: 'tema-1',
        optionId: 'a',
        correct: false,
        createdAt: '2026-10-25T18:00:00.000Z',
      },
    ];
    const view = toJourneyView({ step: 'THEORY', currentTopicId: 'tema-1' }, attempts);
    assert.equal(view.attempts[0]?.optionText, '3');
    assert.equal(view.attempts[0]?.correct, false);
    assert.equal(JSON.stringify(view.attempts).includes('correctOptionId'), false);
  });
});
