# GitHub Actions Workflows

## Deployment Workflow

### `release-deploy.yml` - Production Deployment Pipeline
Comprehensive deployment workflow using official Cloudflare wrangler-action with:
- Node.js 22 and pnpm support
- Dependency caching with pnpm
- Linting and type checking
- Testing (backend and frontend)
- Building frontend application
- Deploying backend to Cloudflare Workers
- Deploying frontend to Cloudflare Pages
- Running D1 database migrations
- Deployment summaries and notifications

## Required Secrets

Add these secrets to your GitHub repository settings:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with necessary permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## Setup Instructions

1. **Get Cloudflare API Token**:
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Create a custom token with permissions:
     - Account:Cloudflare Workers:Edit
     - Account:Cloudflare Pages:Edit
     - Account:D1:Edit
     - Account:Account Settings:Read
     - Zone:Zone:Read (if using custom domain)

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