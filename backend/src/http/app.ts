import express, { type NextFunction, type Request, type Response } from 'express';
import { toSyllabusView } from '../domain/presenter.js';
import { DomainError, type DomainErrorCode } from '../domain/types.js';
import type { LearningRepository } from '../persistence/repository.js';
import { createLearningService } from '../service/learningService.js';

const STATUS: Record<DomainErrorCode, number> = {
  INVALID_REQUEST: 400,
  INVALID_OPTION: 400,
  ACTIVITY_NOT_AVAILABLE: 409,
  PATH_VIOLATION: 409,
  COURSE_ALREADY_FINISHED: 409,
};

export function createApp(repo: LearningRepository) {
  const service = createLearningService(repo);
  const app = express();

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/syllabus', (_req, res) => {
    res.json(toSyllabusView());
  });

  app.get(
    '/api/journey',
    handle(() => {
      return service.getJourney();
    }),
  );

  app.post(
    '/api/answers',
    handle((req) => {
      const { activityId, optionId } = readAnswerBody(req.body);
      return service.submitAnswer(activityId, optionId);
    }),
  );

  app.post(
    '/api/continue',
    handle(() => service.continueAfterTheory()),
  );

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' },
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainError) {
      res.status(STATUS[err.code]).json({
        error: { code: err.code, message: err.message },
      });
      return;
    }

    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'El cuerpo de la petición no es JSON válido.' },
      });
      return;
    }

    console.error(err);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Error interno del servidor.' },
    });
  });

  return app;
}

function handle(fn: (req: Request) => unknown) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(fn(req));
    } catch (error) {
      next(error);
    }
  };
}

function readAnswerBody(body: unknown): { activityId: string; optionId: string } {
  if (typeof body !== 'object' || body === null) {
    throw new DomainError('INVALID_REQUEST', 'El cuerpo debe ser un objeto JSON.');
  }
  const record = body as Record<string, unknown>;
  if (typeof record.activityId !== 'string' || record.activityId.trim() === '') {
    throw new DomainError('INVALID_REQUEST', 'Falta activityId.');
  }
  if (typeof record.optionId !== 'string' || record.optionId.trim() === '') {
    throw new DomainError('INVALID_REQUEST', 'Falta optionId.');
  }
  return { activityId: record.activityId.trim(), optionId: record.optionId.trim() };
}
