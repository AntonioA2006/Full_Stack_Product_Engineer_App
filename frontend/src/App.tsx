import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, continueAfterTheory, getJourney, submitAnswer } from './api';
import type { JourneyView, Outcome, PublicAttempt, Step, TopicProgress } from './types';

const STEP_LABEL: Record<Step, string> = {
  MAIN: 'Actividad principal',
  THEORY: 'Teoría',
  REINFORCEMENT: 'Refuerzo',
  COURSE_DONE: 'Temario completo',
};

const STATUS_LABEL: Record<TopicProgress['status'], string> = {
  completed: 'Completado',
  current: 'En curso',
  locked: 'Bloqueado',
};

const NEXT_HINT: Record<Step, string> = {
  MAIN: 'Si respondes bien, pasas al siguiente tema. Si fallas, verás la teoría de este tema.',
  THEORY: 'Lee el apoyo y, cuando termines, continúa a la actividad de refuerzo.',
  REINFORCEMENT: 'Si respondes bien, completas el tema. Si fallas, vuelves a la teoría antes de reintentar.',
  COURSE_DONE: 'No hay más pasos.',
};

const OUTCOME_TEXT: Record<Outcome, string> = {
  CORRECT_NEXT_TOPIC: 'Correcto. Completaste el tema y sigues con la actividad principal del siguiente.',
  CORRECT_COURSE_DONE: 'Correcto. Completaste el último tema y con eso el temario.',
  INCORRECT_TO_THEORY: 'Incorrecto. Revisa la teoría. Después podrás intentar el refuerzo.',
};

export function App() {
  const [journey, setJourney] = useState<JourneyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJourney(await getJourney());
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelected('');
  }, [journey?.activity?.id, journey?.step]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!journey?.activity || !selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitAnswer(journey.activity.id, selected);
      setJourney(result.journey);
      setFeedback({ ok: result.correct, text: OUTCOME_TEXT[result.outcome] });
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  async function onContinue() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await continueAfterTheory();
      setJourney(result.journey);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Ruta de aprendizaje</p>
          <h1>Matemáticas</h1>
        </div>
        {journey ? (
          <p className="progress-count">
            {journey.progress.completedTopics} de {journey.progress.totalTopics} temas
          </p>
        ) : null}
      </header>

      {loading ? <p className="muted">Cargando tu recorrido…</p> : null}

      {!loading && error && !journey ? (
        <section className="card">
          <p className="banner bad" role="alert">
            {error}
          </p>
          <button type="button" onClick={() => void load()}>
            Reintentar
          </button>
        </section>
      ) : null}

      {journey ? (
        <main className="layout">
          <aside className="card path" aria-label="Temario">
            <h2>Temario</h2>
            <ol>
              {journey.topics.map((topic) => (
                <li key={topic.id} className={`topic topic-${topic.status}`}>
                  <span className="topic-order">{topic.order}</span>
                  <span>
                    <strong>{topic.title}</strong>
                    <small>{STATUS_LABEL[topic.status]}</small>
                  </span>
                </li>
              ))}
            </ol>
            <div
              className="bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={journey.progress.totalTopics}
              aria-valuenow={journey.progress.completedTopics}
            >
              <span
                style={{
                  width: `${(journey.progress.completedTopics / journey.progress.totalTopics) * 100}%`,
                }}
              />
            </div>
          </aside>

          <section className="stack">
            {error ? (
              <p className="banner bad" role="alert">
                {error}
              </p>
            ) : null}
            {feedback ? (
              <p className={`banner ${feedback.ok ? 'ok' : 'bad'}`} role="status">
                {feedback.text}
              </p>
            ) : null}

            <article className="card" aria-busy={busy}>
              <p className="eyebrow">
                {journey.step === 'COURSE_DONE'
                  ? 'Recorrido terminado'
                  : `Tema ${journey.currentTopic.order} de ${journey.progress.totalTopics}`}
              </p>
              <h2>
                {journey.step === 'COURSE_DONE'
                  ? 'Completaste la ruta'
                  : journey.currentTopic.title}
              </h2>
              <p className="badge">{STEP_LABEL[journey.step]}</p>
              <p className="hint">{NEXT_HINT[journey.step]}</p>

              {journey.activity ? (
                <form onSubmit={(event) => void onSubmit(event)}>
                  <fieldset disabled={busy}>
                    <legend>{journey.activity.prompt}</legend>
                    {journey.activity.options.map((option) => (
                      <label key={option.id} className={selected === option.id ? 'option selected' : 'option'}>
                        <input
                          type="radio"
                          name="option"
                          value={option.id}
                          checked={selected === option.id}
                          onChange={() => setSelected(option.id)}
                        />
                        <span className="option-key">{option.id}</span>
                        <span>{option.text}</span>
                      </label>
                    ))}
                  </fieldset>
                  <button type="submit" disabled={busy || selected === ''}>
                    {busy ? 'Enviando…' : 'Enviar respuesta'}
                  </button>
                </form>
              ) : null}

              {journey.theory ? (
                <div className="theory">
                  <h3>{journey.theory.title}</h3>
                  <p className="theory-body">{journey.theory.body}</p>
                  <button type="button" onClick={() => void onContinue()} disabled={busy}>
                    {busy ? 'Continuando…' : 'Continuar al refuerzo'}
                  </button>
                </div>
              ) : null}

              {journey.step === 'COURSE_DONE' ? (
                <p className="done-copy">
                  Resolviste los tres temas. Tu historial de intentos queda guardado: si recargas la página,
                  sigues en este punto.
                </p>
              ) : null}
            </article>

            <History attempts={journey.attempts} />
          </section>
        </main>
      ) : null}
    </div>
  );
}

function History({ attempts }: { attempts: PublicAttempt[] }) {
  return (
    <section className="card history">
      <h2>Intentos</h2>
      {attempts.length === 0 ? <p className="muted">Todavía no hay intentos.</p> : null}
      {attempts.length > 0 ? (
        <ul>
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <span className={attempt.correct ? 'pill ok' : 'pill bad'}>
                {attempt.correct ? 'Correcta' : 'Incorrecta'}
              </span>
              <span>
                <strong>
                  {attempt.activityId} · {attempt.topicTitle}
                </strong>
                <small>
                  Opción {attempt.optionId}: {attempt.optionText} · {formatWhen(attempt.createdAt)}
                </small>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function messageFrom(cause: unknown): string {
  if (cause instanceof ApiError) return cause.message;
  return 'Ocurrió un error inesperado.';
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}
