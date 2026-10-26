import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import request from 'supertest';
import { initialJourneyState } from '../src/domain/learningPath.ts';
import { createApp } from '../src/http/app.ts';
import { SqliteLearningRepository } from '../src/persistence/sqliteRepository.ts';

function boot() {
  const repo = new SqliteLearningRepository(':memory:');
  repo.saveState(initialJourneyState());
  return { repo, app: createApp(repo) };
}

describe('SQLite', () => {
  it('guarda estado e intentos y los recupera', () => {
    const repo = new SqliteLearningRepository(':memory:');
    repo.saveState({ step: 'THEORY', currentTopicId: 'tema-1' });
    const saved = repo.saveTransition(
      {
        activityId: 'R1',
        topicId: 'tema-1',
        optionId: 'b',
        correct: false,
        createdAt: '2026-10-25T18:00:00.000Z',
      },
      { step: 'THEORY', currentTopicId: 'tema-1' },
    );

    assert.equal(saved.id, 1);
    assert.deepEqual(repo.getState(), { step: 'THEORY', currentTopicId: 'tema-1' });
    assert.equal(repo.listAttempts().length, 1);
    assert.equal(repo.listAttempts()[0]?.correct, false);
    repo.close();
  });
});

describe('HTTP', { concurrency: false }, () => {
  const { repo, app } = boot();
  after(() => repo.close());

  it('GET /api/journey no expone la respuesta correcta', async () => {
    const res = await request(app).get('/api/journey');
    assert.equal(res.status, 200);
    assert.equal(JSON.stringify(res.body).includes('correctOptionId'), false);
    assert.equal(res.body.activity.id, 'A1');
    assert.equal(res.body.step, 'MAIN');
  });

  it('GET /api/syllabus lista A/T/R sin enunciados', async () => {
    const res = await request(app).get('/api/syllabus');
    assert.equal(res.status, 200);
    assert.equal(JSON.stringify(res.body).includes('correctOptionId'), false);
    assert.equal(res.body.topics[2].contents[2].id, 'R3');
  });

  it('opción inválida, salto de ruta y actividad no disponible', async () => {
    const invalid = await request(app).post('/api/answers').send({ activityId: 'A1', optionId: 'z' });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'INVALID_OPTION');

    const jump = await request(app).post('/api/answers').send({ activityId: 'R1', optionId: 'a' });
    assert.equal(jump.status, 409);
    assert.equal(jump.body.error.code, 'PATH_VIOLATION');

    const early = await request(app).post('/api/continue').send({});
    assert.equal(early.status, 409);
    assert.equal(early.body.error.code, 'PATH_VIOLATION');

    const missing = await request(app).post('/api/answers').send({ activityId: 'A1' });
    assert.equal(missing.status, 400);
    assert.equal(missing.body.error.code, 'INVALID_REQUEST');

    const still = await request(app).get('/api/journey');
    assert.equal(still.body.step, 'MAIN');
    assert.equal(still.body.attempts.length, 0);
  });

  it('fallo, teoría, refuerzo reutilizado y acierto quedan persistidos', async () => {
    const wrong = await request(app).post('/api/answers').send({ activityId: 'A1', optionId: 'a' });
    assert.equal(wrong.status, 200);
    assert.equal(wrong.body.correct, false);
    assert.equal(wrong.body.outcome, 'INCORRECT_TO_THEORY');
    assert.equal(wrong.body.journey.step, 'THEORY');
    assert.equal(wrong.body.journey.theory.id, 'T1');
    assert.equal(wrong.body.journey.activity, null);

    const skip = await request(app).post('/api/answers').send({ activityId: 'R1', optionId: 'a' });
    assert.equal(skip.status, 409);
    assert.equal(skip.body.error.code, 'PATH_VIOLATION');

    const next = await request(app).post('/api/continue').send({});
    assert.equal(next.status, 200);
    assert.equal(next.body.journey.step, 'REINFORCEMENT');
    assert.equal(next.body.journey.activity.id, 'R1');
    assert.equal(JSON.stringify(next.body).includes('correctOptionId'), false);

    const again = await request(app).post('/api/answers').send({ activityId: 'R1', optionId: 'b' });
    assert.equal(again.body.journey.step, 'THEORY');

    await request(app).post('/api/continue').send({});
    const pass = await request(app).post('/api/answers').send({ activityId: 'R1', optionId: 'a' });
    assert.equal(pass.body.outcome, 'CORRECT_NEXT_TOPIC');
    assert.equal(pass.body.journey.currentTopic.id, 'tema-2');
    assert.equal(pass.body.journey.activity.id, 'A2');
    assert.equal(pass.body.journey.progress.completedTopics, 1);

    const closed = await request(app).post('/api/answers').send({ activityId: 'A1', optionId: 'b' });
    assert.equal(closed.status, 409);
    assert.equal(closed.body.error.code, 'ACTIVITY_NOT_AVAILABLE');

    const history = await request(app).get('/api/journey');
    assert.equal(history.body.attempts.length, 3);
    assert.equal(history.body.attempts[0].activityId, 'R1');
    assert.equal(history.body.attempts[0].correct, true);
  });

  it('el último tema correcto cierra el curso y rechaza envíos posteriores', async () => {
    await request(app).post('/api/answers').send({ activityId: 'A2', optionId: 'b' });
    const done = await request(app).post('/api/answers').send({ activityId: 'A3', optionId: 'a' });
    assert.equal(done.body.outcome, 'CORRECT_COURSE_DONE');
    assert.equal(done.body.journey.step, 'COURSE_DONE');
    assert.equal(done.body.journey.progress.completedTopics, 3);
    assert.equal(done.body.journey.activity, null);

    const late = await request(app).post('/api/answers').send({ activityId: 'R3', optionId: 'b' });
    assert.equal(late.status, 409);
    assert.equal(late.body.error.code, 'COURSE_ALREADY_FINISHED');

    const lateContinue = await request(app).post('/api/continue').send({});
    assert.equal(lateContinue.status, 409);
    assert.equal(lateContinue.body.error.code, 'COURSE_ALREADY_FINISHED');
  });
});
