#!/bin/bash

# Get current branch name
BRANCH=$(git symbolic-ref --short HEAD)

# Default commit message with timestamp if no argument provided
MSG="${1:-Auto-deploy $(date +'%Y-%m-%d %H:%M:%S')}"

echo "🚀 Starting deployment for branch: $BRANCH"
echo "📝 Commit message: $MSG"

# Add all changes
git add .

# Commit
git commit -m "$MSG"

# Push to origin (set upstream if needed)
echo "☁️ Pushing to GitHub..."
git push origin "$BRANCH"

# Deploy to Vercel
echo "⚡️ Triggering Vercel production build..."
npx vercel deploy --prod

echo "✅ Deployment complete!"
