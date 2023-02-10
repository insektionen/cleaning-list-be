FROM node:lts-alpine as builder
# Migrate and compile
WORKDIR /build/
COPY . /build/
RUN yarn install --frozen-lockfile && yarn migrate deploy && yarn build

FROM node:lts-alpine
WORKDIR /app/
COPY --from=builder /build/package.json /build/yarn.lock /app/
COPY --from=builder /build/dist /app/dist
RUN yarn install --frozen-lockfile --production=true
EXPOSE 8000
CMD yarn start
