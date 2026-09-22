FROM node:20-alpine

# Configurar zona horaria de Argentina
RUN apk add --no-cache tzdata
ENV TZ=America/Argentina/Buenos_Aires

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

CMD ["npm", "start"]
