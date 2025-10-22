FROM node:20-alpine3.18
ARG MODE
ARG CACHEBUST=1
WORKDIR /app
COPY . .

RUN npm install

# Set environment variables
ENV TZ="Asia/Dubai"

CMD ["npm","start"]