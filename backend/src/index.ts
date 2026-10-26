import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { initialJourneyState } from './domain/learningPath.js';

dotenv.config();
import { createApp } from './http/app.js';
import { SqliteLearningRepository } from './persistence/sqliteRepository.js';

const port = Number(process.env.PORT ?? 3001);
const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');

fs.mkdirSync(dataDir, { recursive: true });

const repo = new SqliteLearningRepository(path.join(dataDir, 'learning.db'));
if (!repo.getState()) {
  repo.saveState(initialJourneyState());
}

const app = createApp(repo);
app.listen(port, '0.0.0.0', () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
