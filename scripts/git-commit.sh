#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configure git user
git config user.name "$GITHUB_USERNAME"
git config user.email "$GITHUB_EMAIL"

# Add all changes
git add -A

# Commit with message
if [ -z "$1" ]; then
    echo "Usage: $0 <commit-message>"
    exit 1
fi

git commit -m "$1"

# Push to GitHub
echo "Pushing to GitHub..."
git push https://${GITHUB_USERNAME}:${GITHUB_PAT}@github.com/${GITHUB_USERNAME}/neon-fhe-rps.git main

echo "Done!"
