// src/infra/firebase-admin.config.ts
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

let app: admin.app.App | null = null;

export function getFirebaseApp(): admin.app.App {
  if (app) return app;

  // Podés leer JSON desde env o path
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH no configurado');
  }

  const serviceAccount = JSON.parse(
    readFileSync(join(process.cwd(), serviceAccountPath), 'utf8'),
  );

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return app;
}
