# KioEdu - Plataforma de Gestión de Kioscos Escolares

Este repositorio contiene todos los componentes del ecosistema KioEdu.

## 📁 Estructura del Proyecto
- `/backend`: API construida con NestJS, PostgreSQL y Prisma.
- `/pos-kiosco`: Aplicación de escritorio/web para el kiosco (Angular).
- `/app-padres`: Aplicación móvil para recargas y seguimiento (Ionic/Angular).
- `/admin-panel`: Panel de administración centralizada.

---

## 🛠️ Requisitos Previos
1. **Node.js** (v18 o superior).
2. **PostgreSQL** (v14 o superior).
3. **Git**.
4. **Ngrok** (opcional, para probar Mercado Pago localmente).

---

## 🚀 Guía de Instalación en otra PC

### 1. Clonar y preparar el Backend
```bash
cd backend
npm install
```
- Copiá el archivo `.env` del proyecto original (o pedilo al administrador).
- **Base de Datos:**
  ```bash
  npx prisma generate
  npx prisma migrate dev
  npx prisma db seed # Opcional: para datos de prueba
  ```
- **Iniciar:** `npm run start:dev`

### 2. Preparar el POS (Kiosco)
```bash
cd pos-kiosco
npm install
```
- Revisá `src/assets/kiosk.json` y `src/environments/environment.prod.ts` para que apunten a la IP/URL de tu backend.
- **Iniciar:** `npm start`

### 3. Preparar la App de Padres
```bash
cd app-padres
npm install
```
- Revisá `src/environments/environment.ts` para apuntar al backend.
- **Iniciar:** `ionic serve` o `npm start`

---

## 💳 Configuración de Mercado Pago
Para que las vinculaciones y pagos funcionen en local:
1. Iniciá ngrok apuntando al puerto del POS: `ngrok http 4200`.
2. Copiá la URL `https` de ngrok y pegala en el `.env` del backend bajo `FRONTEND_URL`.
3. Configurá esa misma URL en el Panel de Desarrolladores de Mercado Pago (Redirect URI).

---
*KioEdu - 2026*
