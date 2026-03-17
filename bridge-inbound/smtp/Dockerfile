FROM node:24-alpine

WORKDIR /app

# Copy bridge-core first (required by smtp)
COPY bridge-core ./bridge-core
RUN cd bridge-core && npm install && npm run build

# Copy and build smtp server
COPY bridge-inbound/smtp ./bridge-inbound/smtp
RUN cd bridge-inbound/smtp && npm install && npm run build

WORKDIR /app/bridge-inbound/smtp
EXPOSE 25

CMD ["npm", "start"]
