
# Deploy to GitHub Pages (Project site)

1. Push all files to `main` branch.
2. Ensure GitHub Pages is enabled for the repository (Settings → Pages → Build & deployment → Source: GitHub Actions).
3. The provided workflow `.github/workflows/deploy.yml` will publish the site automatically after each commit to `main`.

## Manual (no Actions)
- You can also host via `gh-pages` branch or GitHub Pages default for project repositories.
- For quick testing, you can upload files via the GitHub UI.
