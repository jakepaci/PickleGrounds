import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const envPath = path.join(root, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}
