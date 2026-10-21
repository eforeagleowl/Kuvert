FROM node:22-alpine
WORKDIR /app
# The app's files stay root's and read-only to the service; only /data, its rooms, is writable.
COPY . .
ENV NODE_ENV=production KUVERT_HOST=0.0.0.0 PORT=8123 KUVERT_DATA_FILE=/data/rooms.json
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8123
# Attach persistent storage at /data: `docker run -v kuvert-data:/data ...`, or a Railway volume mounted at
# /data. No VOLUME line, because Railway refuses to build a Dockerfile that has one.
CMD ["node", "server/server.mjs"]
