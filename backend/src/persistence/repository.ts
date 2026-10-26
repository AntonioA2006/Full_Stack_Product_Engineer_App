import type { Attempt, JourneyState, NewAttempt } from '../domain/types.js';

export interface LearningRepository {
  getState(): JourneyState | null;
  saveState(state: JourneyState): void;
  /** Guarda el intento y el nuevo estado en la misma transacción. */
  saveTransition(attempt: NewAttempt, state: JourneyState): Attempt;
  listAttempts(): Attempt[];
}
