FROM node:lts-alpine as worker

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:lts-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
COPY --from=worker /app/package.json /app/yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=worker /app/dist ./dist

CMD ["yarn", "start"]
