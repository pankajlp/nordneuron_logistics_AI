# Use a lightweight Nginx alpine image to serve static files
FROM nginx:alpine

# Copy static frontend files to the default Nginx public directory
COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js /usr/share/nginx/html/app.js
COPY modules.js /usr/share/nginx/html/modules.js
COPY load-planner.js /usr/share/nginx/html/load-planner.js

# Expose HTTP port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
