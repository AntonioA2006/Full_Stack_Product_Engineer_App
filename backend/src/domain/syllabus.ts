import type { EvaluableActivity, Topic } from './types.js';

/**
 * Seed del PDF. La respuesta correcta vive aquí y no se envía al consultar
 * una actividad pendiente (ver presenter.ts).
 */
export const TOPICS: readonly Topic[] = [
  {
    id: 'tema-1',
    order: 1,
    title: 'Operaciones algebraicas',
    main: {
      id: 'A1',
      kind: 'MAIN',
      prompt: 'Resuelve x + 4 = 9.',
      options: [
        { id: 'a', text: '3' },
        { id: 'b', text: '5' },
        { id: 'c', text: '13' },
      ],
      correctOptionId: 'b',
    },
    theory: {
      id: 'T1',
      title: 'Despeje de incógnitas',
      body: [
        'Para resolver una ecuación, debemos encontrar el valor de la incógnita que hace verdadera la igualdad.',
        'Podemos realizar operaciones equivalentes en ambos lados de la ecuación para aislar la incógnita.',
        'Por ejemplo:',
        'x + 4 = 9',
        'Restamos 4 en ambos lados:',
        'x = 9 - 4',
        'Por lo tanto:',
        'x = 5',
      ].join('\n'),
    },
    reinforcement: {
      id: 'R1',
      kind: 'REINFORCEMENT',
      prompt: 'Resuelve 3x = 12.',
      options: [
        { id: 'a', text: '4' },
        { id: 'b', text: '9' },
        { id: 'c', text: '36' },
      ],
      correctOptionId: 'a',
    },
  },
  {
    id: 'tema-2',
    order: 2,
    title: 'Ecuaciones lineales',
    main: {
      id: 'A2',
      kind: 'MAIN',
      prompt: 'Resuelve 2x + 3 = 11.',
      options: [
        { id: 'a', text: '7' },
        { id: 'b', text: '4' },
        { id: 'c', text: '5' },
      ],
      correctOptionId: 'b',
    },
    theory: {
      id: 'T2',
      title: 'Ecuaciones lineales de varios pasos',
      body: [
        'Una ecuación lineal puede requerir más de una operación para encontrar el valor de la incógnita.',
        'Primero podemos eliminar los términos que se suman o restan y después despejar el coeficiente de la incógnita.',
        'Por ejemplo:',
        '2x + 3 = 11',
        'Restamos 3 en ambos lados:',
        '2x = 8',
        'Dividimos entre 2:',
        'x = 4',
      ].join('\n'),
    },
    reinforcement: {
      id: 'R2',
      kind: 'REINFORCEMENT',
      prompt: 'Resuelve 5x - 7 = 8.',
      options: [
        { id: 'a', text: '1' },
        { id: 'b', text: '3' },
        { id: 'c', text: '5' },
      ],
      correctOptionId: 'b',
    },
  },
  {
    id: 'tema-3',
    order: 3,
    title: 'Ecuaciones cuadráticas',
    main: {
      id: 'A3',
      kind: 'MAIN',
      prompt: 'Resuelve x² - 5x + 6 = 0.',
      options: [
        { id: 'a', text: 'x = 2, x = 3' },
        { id: 'b', text: 'x = 1, x = 6' },
        { id: 'c', text: 'x = -2, x = -3' },
      ],
      correctOptionId: 'a',
    },
    theory: {
      id: 'T3',
      title: 'Resolución de ecuaciones cuadráticas',
      body: [
        'Una ecuación cuadrática contiene una incógnita elevada al cuadrado.',
        'Algunas ecuaciones cuadráticas pueden resolverse mediante factorización, expresándolas como el producto de dos factores.',
        'Por ejemplo:',
        'x² - 5x + 6 = 0',
        'Factorizamos:',
        '(x - 2)(x - 3) = 0',
        'Para que el producto sea cero, al menos uno de los factores debe ser cero.',
        'Por lo tanto:',
        'x = 2 o x = 3',
      ].join('\n'),
    },
    reinforcement: {
      id: 'R3',
      kind: 'REINFORCEMENT',
      prompt: 'Resuelve x² - 9 = 0.',
      options: [
        { id: 'a', text: 'x = 3 únicamente' },
        { id: 'b', text: 'x = -3, x = 3' },
        { id: 'c', text: 'x = -9, x = 9' },
      ],
      correctOptionId: 'b',
    },
  },
];

export function requireTopic(topicId: string): Topic {
  const topic = TOPICS.find((item) => item.id === topicId);
  if (!topic) {
    throw new Error(`Tema desconocido en el estado: ${topicId}`);
  }
  return topic;
}

export function topicIndex(topicId: string): number {
  const index = TOPICS.findIndex((item) => item.id === topicId);
  if (index < 0) {
    throw new Error(`Tema desconocido en el estado: ${topicId}`);
  }
  return index;
}

export function findActivity( activityId: string,): { topic: Topic; activity: EvaluableActivity } | undefined {
  for (const topic of TOPICS) {
    if (topic.main.id === activityId) {
      return { topic, activity: topic.main };
    }
    if (topic.reinforcement.id === activityId) {
      return { topic, activity: topic.reinforcement };
    }
  }
  return undefined;
}
