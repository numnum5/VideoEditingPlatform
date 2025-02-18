FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the app
RUN npm run build

# Step 2: Serve the React app using nginx
FROM nginx:alpine

# Copy the build output to nginx's default directory
COPY --from=build /app/build /usr/share/nginx/html
# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]