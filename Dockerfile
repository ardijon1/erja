FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm run build

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
