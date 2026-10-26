# Ruta de matemáticas

Un estudiante recorre tres temas. El backend decide el siguiente paso y guarda intentos, estado y progreso.

## Requisitos

- Node.js 22 o superior y npm (para correrlo sin Docker)
- Docker y Docker Compose (recomendado)

La API usa `node:sqlite`, que viene con Node 22. Al arrancar puede salir un aviso de que SQLite es experimental. Es esperado.

## Docker Compose

Desde la raíz del repositorio:

```bash
docker compose up --build
```

Abre http://localhost:8090

La base SQLite vive en el volumen `learning_data`. Para borrar el progreso y volver al tema 1:

```bash
docker compose down -v
```

## Sin Docker

Terminal 1, API:

```bash
cd backend
npm install
npm run dev
```

La API queda en http://localhost:3001. Crea `backend/data/learning.db` al arrancar.

Terminal 2, interfaz:

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173. Vite reenvía `/api` al puerto 3001.

Para reiniciar el progreso, detén la API y borra `backend/data/learning.db`.

## Variables de entorno

Hay valores por defecto. Si quieres cambiarlos, copia `.env.example` a `backend/.env`.

| Variable | Default | Uso |
| --- | --- | --- |
| `PORT` | `3001` | Puerto de la API |
| `DATA_DIR` | `./data` | Carpeta del archivo SQLite |
| `VITE_API_BASE_URL` | vacío | Solo si el frontend no usa el proxy. Vacío significa pedir `/api` al mismo origen |

## Seed

Al iniciar, si no hay recorrido guardado, el estudiante empieza en la actividad principal del tema 1 (A1).

Los tres temas (A1/T1/R1, A2/T2/R2, A3/T3/R3) están en `backend/src/domain/syllabus.ts`. No hace falta un script de carga ni editar la base a mano.

## Tests

```bash
cd backend
npm test
```

Cubren las reglas del recorrido, que la respuesta correcta no salga en la vista pública, y la API con SQLite en memoria.
