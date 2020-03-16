FROM node:12-alpine AS intermediate

RUN set -x \
    apk add --no-cache expect && \
    apk add coreutils python make git

COPY package.json temp/package.json
COPY public temp/public
COPY src temp/src
COPY views temp/views

RUN cd temp && npm install --only=prod --unsafe-perm=true --loglevel=error

FROM node:12-alpine

COPY --from=intermediate temp app

WORKDIR /app

EXPOSE 3000

CMD ["node", "src"]
