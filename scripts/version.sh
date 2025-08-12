#!/bin/bash

# Version management script for Chess Learning App
# Usage: ./scripts/version.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "Error: Version type must be patch, minor, or major"
    echo "Usage: $0 [patch|minor|major]"
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version
case $VERSION_TYPE in
    patch)
        NEW_VERSION=$(npm version patch --no-git-tag-version)
        ;;
    minor)
        NEW_VERSION=$(npm version minor --no-git-tag-version)
        ;;
    major)
        NEW_VERSION=$(npm version major --no-git-tag-version)
        ;;
esac

# Remove 'v' prefix from npm version output
NEW_VERSION=${NEW_VERSION#v}
echo "New version: $NEW_VERSION"

# Get current date in ISO format
RELEASE_DATE=$(date +%Y-%m-%d)

# Update CHANGELOG.md
echo "Updating CHANGELOG.md..."

# Create temp file with updated changelog
cat > temp_changelog.md << EOF
# Changelog

All notable changes to the Chess Learning App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
### Changed
### Fixed
### Removed
### Security

## [$NEW_VERSION] - $RELEASE_DATE

### Added
### Changed
### Fixed
### Removed
### Security

EOF

# Append everything after the first "## [" line from the original changelog
sed -n '/^## \[/,$p' CHANGELOG.md | tail -n +2 >> temp_changelog.md

# Replace original changelog
mv temp_changelog.md CHANGELOG.md

echo "✓ Updated CHANGELOG.md with version $NEW_VERSION"

# Create git tag
echo "Creating git tag v$NEW_VERSION..."
git add .
git commit -m "chore: bump version to $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"

echo "✓ Created git tag v$NEW_VERSION"
echo ""
echo "Release v$NEW_VERSION is ready!"
echo ""
echo "Next steps:"
echo "1. Edit CHANGELOG.md to document changes in the $NEW_VERSION section"
echo "2. Push changes: git push origin main --tags"
echo "3. Create release notes on GitHub"
echo ""
echo "To undo this release (before pushing):"
echo "  git tag -d v$NEW_VERSION"
echo "  git reset --hard HEAD~1"