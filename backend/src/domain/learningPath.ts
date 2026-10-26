import { findActivity, requireTopic, TOPICS, topicIndex } from './syllabus.js';
import {
  DomainError,
  type JourneyState,
  type NewAttempt,
  type Outcome,
  type Step,
} from './types.js';

/**
 * Máquina de estados del recorrido (un solo estudiante).
 *
 * MAIN --acierto--> MAIN del siguiente tema (o COURSE_DONE si era el último)
 * MAIN --fallo--> THEORY --continuar--> REINFORCEMENT
 * REINFORCEMENT --acierto--> MAIN del siguiente (o COURSE_DONE)
 * REINFORCEMENT --fallo--> THEORY  (el mismo refuerzo se reutiliza)
 *
 * Solo este módulo decide el siguiente paso. HTTP y SQLite guardan el resultado;
 * no recalculan la ruta. La opción correcta se compara aquí y no sale en la vista pública.
 */

export interface AnswerCommand {
  activityId: string;
  optionId: string;
  now: Date;
}

export interface AnswerDecision {
  state: JourneyState;
  attempt: NewAttempt;
  correct: boolean;
  outcome: Outcome;
}

export function initialJourneyState(): JourneyState {
  return { step: 'MAIN', currentTopicId: TOPICS[0].id };
}

export function submitAnswer(state: JourneyState, command: AnswerCommand): AnswerDecision {
  if (state.step === 'COURSE_DONE') {
    throw new DomainError('COURSE_ALREADY_FINISHED', 'El temario ya está completo.');
  }

  const located = findActivity(command.activityId);
  if (!located) {
    throw new DomainError(
      'ACTIVITY_NOT_AVAILABLE',
      'Esa actividad no existe o no está disponible.',
    );
  }

  const currentIndex = topicIndex(state.currentTopicId);
  const targetIndex = topicIndex(located.topic.id);

  if (targetIndex < currentIndex) {
    throw new DomainError(
      'ACTIVITY_NOT_AVAILABLE',
      'Ese tema ya está completado y no acepta más respuestas.',
    );
  }

  if (targetIndex > currentIndex) {
    throw new DomainError(
      'PATH_VIOLATION',
      'No puedes responder una actividad de un tema que todavía no toca.',
    );
  }

  if (state.step === 'THEORY') {
    if (located.activity.kind === 'REINFORCEMENT') {
      throw new DomainError(
        'PATH_VIOLATION',
        'Antes del refuerzo tienes que consultar la teoría y continuar.',
      );
    }
    throw new DomainError(
      'ACTIVITY_NOT_AVAILABLE',
      'Ahora estás en la teoría. Esta actividad no acepta respuesta.',
    );
  }

  const expected = activityForStep(state);
  if (located.activity.id !== expected.id) {
    if (state.step === 'MAIN' && located.activity.kind === 'REINFORCEMENT') {
      throw new DomainError(
        'PATH_VIOLATION',
        'El refuerzo solo aparece si fallas la actividad principal y revisas la teoría.',
      );
    }
    throw new DomainError(
      'ACTIVITY_NOT_AVAILABLE',
      'Esa actividad no corresponde al paso actual.',
    );
  }

  const option = located.activity.options.find((item) => item.id === command.optionId);
  if (!option) {
    throw new DomainError('INVALID_OPTION', 'La opción elegida no pertenece a esta actividad.');
  }

  const correct = option.id === located.activity.correctOptionId;
  const attempt: NewAttempt = {
    activityId: located.activity.id,
    topicId: located.topic.id,
    optionId: option.id,
    correct,
    createdAt: command.now.toISOString(),
  };

  if (!correct) {
    return {
      state: { step: 'THEORY', currentTopicId: located.topic.id },
      attempt,
      correct: false,
      outcome: 'INCORRECT_TO_THEORY',
    };
  }

  const nextTopic = TOPICS[currentIndex + 1];
  if (!nextTopic) {
    return {
      state: { step: 'COURSE_DONE', currentTopicId: located.topic.id },
      attempt,
      correct: true,
      outcome: 'CORRECT_COURSE_DONE',
    };
  }

  return {
    state: { step: 'MAIN', currentTopicId: nextTopic.id },
    attempt,
    correct: true,
    outcome: 'CORRECT_NEXT_TOPIC',
  };
}

export function continueAfterTheory(state: JourneyState): JourneyState {
  if (state.step === 'COURSE_DONE') {
    throw new DomainError('COURSE_ALREADY_FINISHED', 'El temario ya está completo.');
  }
  if (state.step !== 'THEORY') {
    throw new DomainError(
      'PATH_VIOLATION',
      'Solo puedes continuar al refuerzo después de la teoría.',
    );
  }
  return { step: 'REINFORCEMENT', currentTopicId: state.currentTopicId };
}

export function completedTopicCount(state: JourneyState): number {
  if (state.step === 'COURSE_DONE') {
    return TOPICS.length;
  }
  return topicIndex(state.currentTopicId);
}

export function topicStatus(
  state: JourneyState,
  index: number,
): 'completed' | 'current' | 'locked' {
  if (state.step === 'COURSE_DONE') {
    return 'completed';
  }
  const current = topicIndex(state.currentTopicId);
  if (index < current) return 'completed';
  if (index === current) return 'current';
  return 'locked';
}

function activityForStep(state: JourneyState) {
  const topic = requireTopic(state.currentTopicId);
  const step: Step = state.step;
  if (step === 'MAIN') return topic.main;
  if (step === 'REINFORCEMENT') return topic.reinforcement;
  throw new DomainError('ACTIVITY_NOT_AVAILABLE', 'Este paso no tiene una actividad evaluable.');
}
