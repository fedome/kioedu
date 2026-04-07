<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>
<h1 align="center">MiKiosco Edu - Backend API</h1>

Este es el backend del proyecto MiKiosco Edu. Es un sistema de Punto de Venta (POS) completo construido con **NestJS**, **Prisma** y **PostgreSQL**, diseñado para gestionar saldos de cuentas, un catálogo de productos, inventario trazable y sesiones de caja (turnos).

El sistema sigue una arquitectura V2 robusta que incluye:
* [cite_start]**Gestión de Caja:** Sesiones de caja (`CashSession`) con arqueo (cálculo de esperado vs. contado) [cite: 6, 23-25].
* [cite_start]**Flujo de Venta (Carrito):** Creación de transacciones en estado `PENDING`, adición de ítems (`TransactionItem`) y confirmación de pago (`PAID`) [cite: 34, 42-44].
* [cite_start]**Gestión de Stock:** Catálogo de productos (`Product`) con control de inventario (`stockQuantity`) [cite: 14-16].
* [cite_start]**Auditoría de Inventario:** Trazabilidad completa de entradas (`PURCHASE`), salidas (`SALE`) y devoluciones (`VOID`/`RETURN`) a través de `StockMovement` [cite: 7, 26-27, 57-61].
* [cite_start]**RBAC Avanzado:** Seguridad granular que diferencia entre roles `ADMIN`, `ENCARGADO` y `CASHIER`[cite: 8, 52].

---

## 🚀 Stack Tecnológico

* [cite_start]**Framework:** NestJS 11 [cite: 136]
* [cite_start]**Base de Datos:** PostgreSQL (gestionado con Prisma 6) [cite: 137]
* [cite_start]**Runtime:** Node.js 18+ [cite: 135]
* **Autenticación:** JWT (Tokens de Usuario `ADMIN`/`CASHIER` y Tokens de Sesión de Kiosco/Cajero)
* [cite_start]**Seguridad:** `helmet`, `class-validator`, `throttler` (Rate Limiting) [cite: 138, 278]

---

## 🛠️ Instalación y Setup (Desarrollo Local)

Sigue estos pasos para levantar el entorno de desarrollo.

### Requisitos Previos

* [cite_start]**Node.js** (v18.20.4 o superior) [cite: 135]
* [cite_start]**Docker** y **Docker Compose** (para levantar la base de datos Postgres) [cite: 143, 186]

### 1. Configuración del Backend

1.  **Clonar el repositorio** (si aún no lo has hecho).
2.  **Navegar a la carpeta del backend:**
    ```bash
    cd backend
    ```
3.  **Instalar dependencias:**
    ```bash
    npm install
    ```
4.  **Crear el archivo de entorno:**
    Crea una copia de `.env.example` (si existe) o crea un archivo `.env` en la raíz de `backend/` con el siguiente contenido:

    ```env
    # Puerto de la aplicación
    PORT=3000

    # URL de conexión a la DB (Docker)
    # (Asegúrate de que 'postgres:postgres@localhost:5432' coincida con tu docker-compose.yml)
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mikioscoedu?schema=public"

    # Claves de JWT (¡genera las tuyas!)
    JWT_SECRET=tu-clave-secreta-muy-larga-y-segura-aqui
    JWT_EXPIRES_IN=30m
    ```

### 2. Levantar la Base de Datos

1.  Abre una **nueva terminal** en la **raíz del proyecto** (`mikioscoedu/`).
2.  Levanta el servicio de Postgres (y Redis) en modo "detached":
    ```bash
    docker compose up -d db
    ```
    *(Nota: El `docker-compose.yml` también levanta Redis, aunque actualmente no lo usamos).*

### 3. Sincronizar y Sembrar la Base de Datos

Una vez que la base de datos esté corriendo, vuelve a la terminal de `backend/`.

1.  **Resetear y Aplicar Migraciones:** (Esto borra la DB y aplica el schema V2).
    ```bash
    npx prisma migrate reset
    ```
    *(Confirma con `y` (Yes) para resetear).*

2.  **Sembrar datos iniciales:** (Esto crea tu usuario `ADMIN` y el `Kiosco` de prueba).
    ```bash
    npx prisma db seed
    ```

### 4. Iniciar el Servidor

```bash
npm run start:dev