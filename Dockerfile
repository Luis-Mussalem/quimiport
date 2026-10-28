# Etapa 1: instala todas as dependências e compila o TypeScript.
FROM node:24-alpine AS build
# O Prisma precisa do OpenSSL para conversar com o PostgreSQL.
RUN apk add --no-cache openssl
WORKDIR /app

# Copiar só os manifestos primeiro aproveita o cache do Docker: as
# dependências só são reinstaladas quando package*.json ou o schema mudam.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Etapa 2: imagem final, só com o necessário para executar.
FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma
# Sem devDependencies (TypeScript, Vitest...): imagem menor e com menos
# pacotes expostos. O postinstall gera o client do Prisma para esta imagem.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Não roda como root.
USER node
EXPOSE 3333

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3333) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Aplica as migrations pendentes e inicia a API. O exec faz o Node receber
# os sinais de parada (SIGTERM) e encerrar a aplicação corretamente.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/main.js"]
