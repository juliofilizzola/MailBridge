FROM node:lts-alpine as worker

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:lts-alpine AS runner

WORKDIR /app

COPY --from=worker /app/dist ./dist
COPY --from=worker /app/node_modules ./node_modules
COPY --from=worker /app/package.json ./package.json

CMD ["yarn", "start"]
