/** Paso actual del único estudiante. */
export type Step = 'MAIN' | 'THEORY' | 'REINFORCEMENT' | 'COURSE_DONE';
//

export type ActivityKind = 'MAIN' | 'REINFORCEMENT';

export type Outcome =
  | 'CORRECT_NEXT_TOPIC'
  | 'CORRECT_COURSE_DONE'
  | 'INCORRECT_TO_THEORY';

export type DomainErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_OPTION'
  | 'ACTIVITY_NOT_AVAILABLE'
  | 'PATH_VIOLATION'
  | 'COURSE_ALREADY_FINISHED';

export interface Option {
  id: string;
  text: string;
}

/** Pregunta evaluable. `correctOptionId` solo existe en el servidor. */
export interface EvaluableActivity {
  id: string;
  kind: ActivityKind;
  prompt: string;
  options: Option[];
  correctOptionId: string;
}

export interface TheoryContent {
  id: string;
  title: string;
  body: string;
}

export interface Topic {
  id: string;
  order: number;
  title: string;
  main: EvaluableActivity;
  theory: TheoryContent;
  reinforcement: EvaluableActivity;
}
//relacionamos cada paso con una actividad
export interface JourneyState {
  step: Step;
  currentTopicId: string;
}

export interface NewAttempt {
  activityId: string;
  topicId: string;
  optionId: string;
  correct: boolean;
  createdAt: string;
}

export interface Attempt extends NewAttempt {
  id: number;
}

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
