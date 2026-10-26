export type Step = 'MAIN' | 'THEORY' | 'REINFORCEMENT' | 'COURSE_DONE';

export type Outcome = 'CORRECT_NEXT_TOPIC' | 'CORRECT_COURSE_DONE' | 'INCORRECT_TO_THEORY';

export interface PublicOption {
  id: string;
  text: string;
}

export interface PublicActivity {
  id: string;
  kind: 'MAIN' | 'REINFORCEMENT';
  prompt: string;
  options: PublicOption[];
}

export interface PublicTheory {
  id: string;
  title: string;
  body: string;
}

export interface TopicProgress {
  id: string;
  order: number;
  title: string;
  status: 'completed' | 'current' | 'locked';
}

export interface PublicAttempt {
  id: number;
  activityId: string;
  topicId: string;
  topicTitle: string;
  optionId: string;
  optionText: string;
  correct: boolean;
  createdAt: string;
}

export interface JourneyView {
  step: Step;
  currentTopic: { id: string; order: number; title: string };
  activity: PublicActivity | null;
  theory: PublicTheory | null;
  topics: TopicProgress[];
  progress: { completedTopics: number; totalTopics: number };
  attempts: PublicAttempt[];
}

export interface AnswerResponse {
  correct: boolean;
  outcome: Outcome;
  journey: JourneyView;
}

export interface ContinueResponse {
  journey: JourneyView;
}
