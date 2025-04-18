#!/bin/bash

# Stop the Node.js server
echo "Stopping Node.js server..."
pm2 stop rosepapermill-server

# Run the cleanup script
echo "Running database cleanup..."
node cleanupDatabase.js

# Start the Node.js server
echo "Starting Node.js server..."
pm2 start rosepapermill-server

echo "Database cleanup completed successfully!" 