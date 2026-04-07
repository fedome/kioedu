import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest'; // <--- ¡LA LÍNEA QUE FALTABA!
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // --- ¡AQUÍ ESTÁ EL ARREGLO! (Para el prefijo api/v1) ---
    app.setGlobalPrefix('api/v1');
    // ----------------------------

    await app.init();
  });

  afterAll(async () => {
    await app.close(); // Usamos afterAll para cerrar solo una vez
  });

  it('/api/v1/health (GET)', () => {
    // --- ARREGLADO: Probamos un endpoint real ---
    return request(app.getHttpServer())
      .get('/api/v1/health') // Asumiendo que HealthController está en /health
      .expect(200)
      .expect((res) => {
        // Verificamos que la respuesta tenga la estructura de salud
        expect(res.body).toHaveProperty('status', 'ok');
      });
  });
});