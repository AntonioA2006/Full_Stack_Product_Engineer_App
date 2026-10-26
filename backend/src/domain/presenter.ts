import {
  completedTopicCount,
  topicStatus,
} from './learningPath.js';
import { findActivity, requireTopic, TOPICS } from './syllabus.js';
import type { Attempt, EvaluableActivity, JourneyState, TheoryContent } from './types.js';

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
  step: JourneyState['step'];
  currentTopic: { id: string; order: number; title: string };
  activity: PublicActivity | null;
  theory: PublicTheory | null;
  topics: TopicProgress[];
  progress: { completedTopics: number; totalTopics: number };
  attempts: PublicAttempt[];
}

export interface SyllabusView {
  topics: Array<{
    id: string;
    order: number;
    title: string;
    contents: Array<{ id: string; kind: 'MAIN' | 'THEORY' | 'REINFORCEMENT' }>;
  }>;
}

/** Quita `correctOptionId` antes de salir del servidor. */
export function toPublicActivity(activity: EvaluableActivity): PublicActivity {
  return {
    id: activity.id,
    kind: activity.kind,
    prompt: activity.prompt,
    options: activity.options.map((option) => ({ id: option.id, text: option.text })),
  };
}

export function toPublicTheory(theory: TheoryContent): PublicTheory {
  return { id: theory.id, title: theory.title, body: theory.body };
}

export function toSyllabusView(): SyllabusView {
  return {
    topics: TOPICS.map((topic) => ({
      id: topic.id,
      order: topic.order,
      title: topic.title,
      contents: [
        { id: topic.main.id, kind: 'MAIN' },
        { id: topic.theory.id, kind: 'THEORY' },
        { id: topic.reinforcement.id, kind: 'REINFORCEMENT' },
      ],
    })),
  };
}

export function toJourneyView(state: JourneyState, attempts: Attempt[]): JourneyView {
  const topics = TOPICS.map((topic, index) => ({
    id: topic.id,
    order: topic.order,
    title: topic.title,
    status: topicStatus(state, index),
  }));

  const topic = requireTopic(state.currentTopicId);

  let activity: PublicActivity | null = null;
  let theory: PublicTheory | null = null;
  if (state.step === 'MAIN') {
    activity = toPublicActivity(topic.main);
  } else if (state.step === 'REINFORCEMENT') {
    activity = toPublicActivity(topic.reinforcement);
  } else if (state.step === 'THEORY') {
    theory = toPublicTheory(topic.theory);
  }

  return {
    step: state.step,
    currentTopic: { id: topic.id, order: topic.order, title: topic.title },
    activity,
    theory,
    topics,
    progress: {
      completedTopics: completedTopicCount(state),
      totalTopics: TOPICS.length,
    },
    attempts: [...attempts]
      .sort((a, b) => b.id - a.id)
      .map((attempt) => ({
        id: attempt.id,
        activityId: attempt.activityId,
        topicId: attempt.topicId,
        topicTitle: requireTopic(attempt.topicId).title,
        optionId: attempt.optionId,
        optionText: optionText(attempt.activityId, attempt.optionId),
        correct: attempt.correct,
        createdAt: attempt.createdAt,
      })),
  };
}

function optionText(activityId: string, optionId: string): string {
  const located = findActivity(activityId);
  return located?.activity.options.find((option) => option.id === optionId)?.text ?? optionId;
}
