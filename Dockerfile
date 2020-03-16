FROM node:12-alpine AS intermediate

RUN set -x \
    apk add --no-cache expect && \
    apk add coreutils python make git

WORKDIR /temp

COPY package.json package.json
COPY public public
COPY src src
COPY views views

RUN npm install --only=prod --unsafe-perm=true --loglevel=error

FROM node:12-alpine

COPY --from=intermediate temp app

WORKDIR /app

EXPOSE 3000

CMD ["node", "src"]
