# ---- Etapa 1: Builder ----
# Usamos la versión de Node de tu stack [cite: 5]
FROM node:18.20.4-alpine AS builder

# Establecemos el directorio de trabajo
WORKDIR /usr/src/app

# Copiamos package.json y package-lock.json primero (para cacheo de capas)
COPY package.json package-lock.json ./

# Instalamos TODAS las dependencias (incl. devDependencies para el build)
RUN npm install

# Copiamos el resto del código fuente
COPY . .

# Generamos el cliente de Prisma (necesario para el build)
RUN npx prisma generate

# Construimos la aplicación de producción
RUN npm run build

# ---- Etapa 2: Producción ----
FROM node:18.20.4-alpine

WORKDIR /usr/src/app

# Copiamos package.json y package-lock.json
COPY package.json package-lock.json ./

# Instalamos SOLO las dependencias de producción
RUN npm install --omit=dev

# Copiamos la aplicación construida desde la etapa 'builder'
COPY --from=builder /usr/src/app/dist ./dist

# Copiamos el cliente de Prisma generado desde la etapa 'builder'
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Copiamos el schema (necesario para que Prisma sepa la ubicación de la DB)
COPY --from=builder /usr/src/app/prisma ./prisma

# Exponemos el puerto que definiste en tu .env [cite: 52]
EXPOSE 3000

# Comando para correr la app (tu script "start:prod")
CMD ["node", "dist/main.js"]