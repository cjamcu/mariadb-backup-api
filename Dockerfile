FROM node:18.12-alpine

WORKDIR /usr/src/app

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build


EXPOSE 3000

CMD ["node", "dist/app.js"]