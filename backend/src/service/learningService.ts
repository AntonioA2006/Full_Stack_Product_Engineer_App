import type { JourneyView } from '../domain/presenter.js';
import { toJourneyView } from '../domain/presenter.js';
import { continueAfterTheory, submitAnswer } from '../domain/learningPath.js';
import type { Outcome } from '../domain/types.js';
import type { LearningRepository } from '../persistence/repository.js';

export interface AnswerResponse {
  correct: boolean;
  outcome: Outcome;
  journey: JourneyView;
}

export interface ContinueResponse {
  journey: JourneyView;
}

export function createLearningService(repo: LearningRepository) {
  function requireState() {
    const state = repo.getState();
    if (!state) {
      throw new Error('El recorrido no está inicializado.');
    }
    return state;
  }

  return {
    getJourney(): JourneyView {
      return toJourneyView(requireState(), repo.listAttempts());
    },

    submitAnswer(activityId: string, optionId: string): AnswerResponse {
      const result = submitAnswer(requireState(), {
        activityId,
        optionId,
        now: new Date(),
      });
      repo.saveTransition(result.attempt, result.state);
      return {
        correct: result.correct,
        outcome: result.outcome,
        journey: toJourneyView(result.state, repo.listAttempts()),
      };
    },

    continueAfterTheory(): ContinueResponse {
      const next = continueAfterTheory(requireState());
      repo.saveState(next);
      return { journey: toJourneyView(next, repo.listAttempts()) };
    },
  };
}
