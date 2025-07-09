# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

# Set environment variable for production
ENV NODE_ENV production

# Expose port (same as used in dev script: 9002)
EXPOSE 9002

# Start the app
CMD ["npm", "run", "start"]
