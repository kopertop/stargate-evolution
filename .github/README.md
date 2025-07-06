# GitHub Actions Workflows

## Deployment Workflows

### `deploy.yml` - Simple Deployment
Basic deployment workflow that runs on pushes to main or when PRs are merged.

### `release-deploy.yml` - Full Release Pipeline
Comprehensive deployment workflow with:
- Dependency caching
- Linting and type checking
- Testing
- Building applications
- Deploying backend and frontend
- Running database migrations
- Deployment summaries

## Required Secrets

Add these secrets to your GitHub repository settings:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with necessary permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## Setup Instructions

1. **Get Cloudflare API Token**:
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Create a custom token with permissions:
     - Zone:Zone:Read
     - Zone:Zone Settings:Edit
     - Zone:Page Rules:Edit
     - Account:Cloudflare Workers:Edit
     - Account:Account Settings:Read

2. **Get Account ID**:
   - Go to your Cloudflare dashboard
   - Copy the Account ID from the right sidebar

3. **Add Secrets to GitHub**:
   - Go to your repository settings
   - Navigate to Secrets and variables → Actions
   - Add the secrets above

## Workflow Triggers

- **Push to main**: Automatic deployment
- **PR merged to main**: Automatic deployment after merge
- **Manual trigger**: Can be run manually from Actions tab

## Environment Protection

The `release-deploy.yml` workflow uses the `production` environment which allows you to:
- Add required reviewers
- Set deployment protection rules
- Add environment secrets
- Configure deployment branches

Configure this in your repository settings under Environments.