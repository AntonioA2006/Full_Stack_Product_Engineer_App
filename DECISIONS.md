# DECISIONS

## A. Decisiones técnicas

### 1. Poner las reglas del recorrido en el backend, no en el frontend
**Problema:** 
como se describio en el PDF anexado que se nos entrego.
el usuario despues de hacer la primera accion el siguiente paso depende directamente de esa desicion 
independientemente que falle o acierte esa desicion tiene que ser calculada en el backend ya que si se calculara
en el frontend estaria predispuesta a modificaciones por parte del usuario.
**Alternativas:** validar en ambos lados pero la desicion se mantiene
validar  en el backend es lo mas seguro. 
**Elegí:** 
Guardé la lógica del siguiente paso en (`learningPath.ts`), en `submitAnswer`  (cuando resive la informacion/peticion del usuario ). 
**Ventaja:** las reglas se prueban sin levantar UI lo que agiliza el proceso de testing
**Limitación:**
tenemos que mantener en piel el contrato de la API alineado con el dominio si cambiamos los estados, 
el frontend se rompe 

### 2. Modelar el progreso como estados (MAIN / THEORY / REINFORCEMENT / COURSE_DONE)
**Problema:** 
necesitaba saber en qué tipo de contenido está el estudiante sin muchos flags sueltos.
**Alternativas:** booleans (`sawTheory`, `failedMain`);
**Elegí:** un `step` + `currentTopicId` se encuentra en (`types.ts`), Las transiciones están escritas en un solo lugar.
**Ventaja:** si en el futuro requirieramos de multiples refuerzos seria facil hacer este cambio y no dependeriamos de 
multiples estados de variables solo una verdad unica 

### 3. SQLite en el backend + Docker Compose
**Problema:** persistir intentos y estado de forma reproducible para quien revise el repo.
**Alternativas:** facilidad de implementacion 
**Elegí:** SQLite con `node:sqlite` y Compose para frontend + backend.

## B. Reflexión de producto

**Limitación:** el mismo refuerzo se reutiliza siempre. Un estudiante puede memorizar la respuesta sin haber entendido la teoría.
**Por qué importa:** el PDF busca aprendizaje, no solo “pasar el quiz”.
**Mejora que propondría:** banco de 2–3 refuerzos por tema, o un límite de intentos con ayuda distinta.
**Cómo lo validaría:** prueba corta con 5–10 usuarios midiendo intentos hasta acertar y si reportan que “adivinan”; solo después cambiaría el modelo.

(En esta entrega mantuve el comportamiento pedido: un refuerzo reutilizable.)

## C. Uso de inteligencia artificial

**Herramientas:** Cursor (agente de código) y apoyo de chat para aclarar el enunciado y la estructura.
**En qué me apoyé:** esqueleto del monorepo, boilerplate de Express/React, Docker, y borradores de tests.
**Qué decidí yo:** el modelo de estados, que el backend sea la fuente de verdad, no exponer la respuesta correcta, y el alcance (sin auth ni multi-usuario).
**Cómo validé:** leí `learningPath.ts` y el presenter, corrí `npm test`, y probé a mano acierto/fallo/teoría/refuerzo y recarga.
**Qué corregí o descarté de la IA:** ajustes cuando el flujo no respetaba una regla del PDF; evité dejar lógica de negocio solo en el frontend aunque el scaffolding lo sugeriera.

## D. Autoevaluación

**Bien resuelto:** reglas del recorrido centralizadas, tests de las 9 reglas y casos inválidos, API simple, UI clara con progreso e historial.
**Limitaciones / riesgos:** soy más fuerte en Java que en este stack; la UI es funcional pero no exhaustiva en tests de frontend; un solo estudiante.
**Con más tiempo:** más casos de integración, mejor tipado compartido frontend/backend, y quizá Postgres si escalara.
**Tiempo aproximado:** unas 5–6 horas de trabajo efectivo (entendimiento del PDF, implementación con IA, pruebas manuales y este documento).