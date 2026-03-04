#!/bin/bash

# Script to connect this repository to GitHub
# Repository: https://github.com/adityarajavi05/Webchatplatform.git

echo "🚀 Connecting repository to GitHub..."
echo ""

# Remove existing .git if it exists and is corrupted
if [ -d .git ]; then
    echo "Removing existing .git directory..."
    rm -rf .git
fi

# Initialize git repository
echo "Initializing git repository..."
git init --initial-branch=main

# Add all files
echo "Adding all files..."
git add .

# Create initial commit
echo "Creating initial commit..."
git commit -m "first commit"

# Set branch to main
echo "Setting branch to main..."
git branch -M main

# Add remote origin
echo "Adding remote origin..."
git remote add origin https://github.com/adityarajavi05/Webchatplatform.git

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Successfully connected to GitHub!"
echo "Repository: https://github.com/adityarajavi05/Webchatplatform"
