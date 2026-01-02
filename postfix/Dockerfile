FROM alpine:latest

RUN apk add --no-cache postfix

COPY main.cf /etc/postfix/main.cf

EXPOSE 587

CMD ["postfix", "start-fg"]
