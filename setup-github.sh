#!/bin/bash

# Script to connect this repository to GitHub
# Run this script in your terminal: bash setup-github.sh

echo "Setting up Git repository and GitHub connection..."
echo ""

# Initialize git repository
git init --initial-branch=main

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit"

echo ""
echo "✅ Git repository initialized!"
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/new and create a new repository"
echo "2. Copy the repository URL (e.g., https://github.com/yourusername/Mywebchat-main.git)"
echo "3. Run the following commands (replace YOUR_REPO_URL with your actual GitHub URL):"
echo ""
echo "   git remote add origin YOUR_REPO_URL"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Or, if you already have a GitHub repository URL, run:"
echo "   git remote add origin YOUR_GITHUB_REPO_URL"
echo "   git push -u origin main"
