FROM node:20-alpine

WORKDIR /app

# Copiar código fuente
COPY package.json package-lock.json* ./
COPY shared ./shared
COPY backend ./backend

WORKDIR /app/backend

# Instalar dependencias de producción
RUN npm install

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["npx", "tsx", "src/index.ts"]
