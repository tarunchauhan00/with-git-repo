// netlify/functions/init-repo.js
const { Octokit } = require("@octokit/rest");

exports.handler = async ({ body }) => {
  try {
    const { repo } = JSON.parse(body);
    const [owner, repoName] = repo.split("/");
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // verify repo exists
    await octokit.repos.get({ owner, repo: repoName });

    // files to seed, including your custom mkdocs.yml
    const files = {
      "mkdocs.yml": `
site_name: My Docs Site
site_description: Documentation with Netlify CMS

theme:
  name: material

# We remove the static nav: section so awesome-pages can auto-generate it.
# If you want to force-order or hide certain files, see the _.pages trick below.

docs_dir: docs

# Ensure admin UI is published
include:
  - admin/**

plugins:
  - search
  - awesome-pages:
      # When a folder has a single page, still show it instead of collapsing
      collapse_single_pages: false

# Optional extra config for awesome-pages:
# You can drop a file named docs/_pages in any folder to explicitly list & order pages.
# Example docs/_pages:
#   - index.md
#   - introduction.md
#   - usage.md
#   - faq.md
#   - test-page.md
#   - test-page-2.md
`,

      "docs/index.md": `
# Welcome to MkDocs

Start editing your documentation here.
`,

      "docs/admin/index.html": `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Documentation CMS</title>
  <base href="/" />
  <style>
    body { font-family: sans-serif; padding:2rem; text-align:center }
    #controls { max-width:400px; margin:auto }
    #controls button { padding:.75rem; margin:.5rem 0; width:100% }
    #nc-root { margin-top:2rem }
  </style>
</head>
<body>
  <div id="controls">
    <h2>📘 Documentation CMS</h2>
    <button id="defaultBtn">Continue with Default Project</button>
    <button id="newBtn">Create New Project</button>
  </div>
  <div id="nc-root" style="display:none"></div>

  <script>window.CMS_MANUAL_INIT = true;</script>
  <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
  <script src="https://unpkg.com/netlify-cms@^2.10.0/dist/netlify-cms.js"></script>
  <script>
    const defaultRepo = "your-org/your-default-repo";

    function normalizeRepo(input) {
      try { return new URL(input).pathname.slice(1).replace(/\.git$/,''); }
      catch { return input.trim().replace(/^\/|\.git$/g,''); }
    }

    async function initMkDocsInRepo(repo) {
      const res = await fetch('/.netlify/functions/init-repo', {
        method: 'POST',
        body: JSON.stringify({ repo })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'init failed');
      return repo;
    }

    function loadCMS(repo) {
      document.getElementById('controls').style.display = 'none';
      document.getElementById('nc-root').style.display    = 'block';

      netlifyIdentity.init({ open_signup: true });
      netlifyIdentity.on('init', u => u || netlifyIdentity.open());

      CMS.init({
        config: {
          backend: {
            name:   'git-gateway',
            repo:   repo,      // ← tell CMS which repo to use
            branch: 'main'
          },
          media_folder: 'docs/images',
          public_folder: '/images',
          collections: [{
            name:   'pages',
            label:  'Pages',
            folder: 'docs',
            create: true,
            slug:   '{{slug}}',
            fields: [
              { label: 'Title', name: 'title', widget: 'string' },
              { label: 'Body',  name: 'body',  widget: 'markdown' }
            ]
          }]
        },
        root: document.getElementById('nc-root')
      });
    }

    document.getElementById('defaultBtn').onclick = () => loadCMS(defaultRepo);

    document.getElementById('newBtn').onclick = async () => {
      const input = prompt('Paste GitHub repo URL (must be empty or git‑gateway enabled):');
      if (!input) return;
      const repo = normalizeRepo(input);
      try {
        await initMkDocsInRepo(repo);
        loadCMS(repo);
      } catch (e) {
        alert('Error initializing repo: ' + e.message);
        console.error(e);
      }
    };
  </script>
</body>
</html>
`,

      "docs/admin/config.yaml": `
backend:
  name: git-gateway
  branch: main

media_folder: "docs/images"
public_folder: "/images"

collections:
  - name: "pages"
    label: "Pages"
    folder: "docs"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Body",  name: "body",  widget: "markdown" }
`,

      "netlify.toml": `
[build]
  command   = "pip install --upgrade pip && pip install -r requirements.txt && mkdocs build"
  publish   = "site"
  functions = "netlify/functions"

[build.environment]
  PYTHON_VERSION = "3.9"

[context.production.environment]
  GIT_GATEWAY_ENABLED = "true"

[[redirects]]
  from   = "/api/*"
  to     = "/.netlify/functions/git-gateway/:splat"
  status = 200
  force  = true

[[redirects]]
  from   = "/admin"
  to     = "/docs/admin/index.html"
  status = 200

[[plugins]]
  package = "@netlify/plugin-functions-install-core"
`,

      "requirements.txt": `
mkdocs>=1.6
mkdocs-material>=9.6
mkdocs-pdf-export-plugin>=0.5
weasyprint>=65.1
mkdocs-mermaid2-plugin>=1.2
mkdocs-awesome-pages-plugin>=2.6
`
    };

    // for each file: fetch sha if exists, then create/update
    for (const [path, content] of Object.entries(files)) {
      let sha;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo: repoName, path });
        sha = data.sha;
      } catch (err) {
        if (err.status !== 404) throw err;
      }
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path,
        message: sha ? `chore: update ${path}` : `chore: add ${path}`,
        content: Buffer.from(content.trimStart()).toString("base64"),
        branch: "main",
        ...(sha ? { sha } : {})
      });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("init-repo error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
