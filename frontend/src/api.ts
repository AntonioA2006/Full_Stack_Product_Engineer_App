import type { AnswerResponse, ContinueResponse, JourneyView } from './types';

const base = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  readonly code: string;

  constructor(message: string, code = 'SERVER_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function getJourney(): Promise<JourneyView> {
  return request<JourneyView>('/api/journey');
}

export function submitAnswer(activityId: string, optionId: string): Promise<AnswerResponse> {
  return request<AnswerResponse>('/api/answers', {
    method: 'POST',
    body: JSON.stringify({ activityId, optionId }),
  });
}

export function continueAfterTheory(): Promise<ContinueResponse> {
  return request<ContinueResponse>('/api/continue', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      'No se pudo contactar al servidor. Revisa que la API esté en marcha e inténtalo de nuevo.',
      'NETWORK',
    );
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const message = payload?.error?.message ?? 'El servidor respondió con un error.';
    const code = payload?.error?.code ?? 'SERVER_ERROR';
    throw new ApiError(message, code);
  }
  return payload as T;
}

async function readJson(response: Response): Promise<{ error?: { code?: string; message?: string } } | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as { error?: { code?: string; message?: string } };
  } catch {
    return null;
  }
}
