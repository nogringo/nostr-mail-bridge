FROM node:22-alpine

WORKDIR /app

# Copy core first
COPY bridge-inbound/core ./bridge-inbound/core
RUN cd bridge-inbound/core && npm install && npm run build

# Copy bridge-outbound
COPY bridge-outbound ./bridge-outbound
RUN cd bridge-outbound && npm install && npm run build

WORKDIR /app/bridge-outbound
CMD ["npm", "start"]
