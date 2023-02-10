FROM node:lts-alpine as builder

WORKDIR /build/
COPY . /build/
RUN yarn install --frozen-lockfile && yarn build

FROM node:lts-alpine
WORKDIR /app/
COPY --from=builder /build/package.json /build/yarn.lock /app/
COPY --from=builder /build/dist /app/dist
COPY --from=builder /build/prisma /app/prisma
RUN yarn install --frozen-lockfile --production=true
EXPOSE 8000
CMD yarn start:prod
