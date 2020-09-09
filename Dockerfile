FROM node:current-slim

WORKDIR /urs/src/appraisal-back

COPY package.json .

RUN npm install

EXPOSE 3001

CMD ["node", "index.js"]

COPY . .
