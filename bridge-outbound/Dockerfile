FROM node:24

WORKDIR /app

# Copy bridge-core first (required by bridge-outbound)
COPY bridge-core ./bridge-core
RUN cd bridge-core && npm install && npm run build

# Copy and build bridge-outbound
COPY bridge-outbound ./bridge-outbound
RUN cd bridge-outbound && npm install && npm run build

WORKDIR /app/bridge-outbound
CMD ["npm", "start"]
