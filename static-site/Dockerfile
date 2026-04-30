FROM node:20-alpine
WORKDIR /app
COPY template-site.html .
COPY template-dashboard.html .
COPY generate.js .
COPY server.js .
EXPOSE 3000
CMD ["sh", "-c", "node generate.js && node server.js"]
