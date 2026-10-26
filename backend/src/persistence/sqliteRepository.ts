import { DatabaseSync } from 'node:sqlite';
import type { Attempt, JourneyState, NewAttempt, Step } from '../domain/types.js';
import type { LearningRepository } from './repository.js';

const STEPS: readonly Step[] = ['MAIN', 'THEORY', 'REINFORCEMENT', 'COURSE_DONE'];

type StateRow = { step: string; current_topic_id: string };
type AttemptRow = {
  id: number;
  activity_id: string;
  topic_id: string;
  option_id: string;
  correct: number;
  created_at: string;
};

export class SqliteLearningRepository implements LearningRepository {
  private readonly db: DatabaseSync;

  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS journey_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        step TEXT NOT NULL,
        current_topic_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id TEXT NOT NULL,
        topic_id TEXT NOT NULL,
        option_id TEXT NOT NULL,
        correct INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  getState(): JourneyState | null {
    const row = this.db
      .prepare('SELECT step, current_topic_id FROM journey_state WHERE id = 1')
      .get() as StateRow | undefined;
    if (!row) return null;
    if (!STEPS.includes(row.step as Step)) {
      throw new Error(`Paso inválido guardado en la base: ${row.step}`);
    }
    return { step: row.step as Step, currentTopicId: row.current_topic_id };
  }

  saveState(state: JourneyState): void {
    this.writeState(state);
  }

  saveTransition(attempt: NewAttempt, state: JourneyState): Attempt {
    this.db.exec('BEGIN');
    try {
      const saved = this.insertAttempt(attempt);
      this.writeState(state);
      this.db.exec('COMMIT');
      return saved;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  listAttempts(): Attempt[] {
    const rows = this.db
      .prepare(
        `SELECT id, activity_id, topic_id, option_id, correct, created_at
         FROM attempts
         ORDER BY id ASC`,
      )
      .all() as unknown as AttemptRow[];

    return rows.map((row) => ({
      id: Number(row.id),
      activityId: row.activity_id,
      topicId: row.topic_id,
      optionId: row.option_id,
      correct: row.correct === 1,
      createdAt: row.created_at,
    }));
  }

  close(): void {
    this.db.close();
  }

  private writeState(state: JourneyState): void {
    this.db
      .prepare(
        `INSERT INTO journey_state (id, step, current_topic_id)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           step = excluded.step,
           current_topic_id = excluded.current_topic_id`,
      )
      .run(state.step, state.currentTopicId);
  }

  private insertAttempt(attempt: NewAttempt): Attempt {
    const result = this.db
      .prepare(
        `INSERT INTO attempts (activity_id, topic_id, option_id, correct, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        attempt.activityId,
        attempt.topicId,
        attempt.optionId,
        attempt.correct ? 1 : 0,
        attempt.createdAt,
      );

    return { ...attempt, id: Number(result.lastInsertRowid) };
  }
}
