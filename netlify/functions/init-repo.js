// netlify/functions/init-repo.js
const { Octokit } = require("@octokit/rest");

exports.handler = async ({ body }) => {
  try {
    const { repo } = JSON.parse(body);           // e.g. "org-name/repo-name"
    const [owner, repoName] = repo.split("/");
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // verify the repo exists & we have access
    await octokit.repos.get({ owner, repo: repoName });

    // the six files we want to commit
    const files = {
      "mkdocs.yml": `
site_name: My Docs
nav:
  - Home: index.md
  - Admin: admin/index.html
`,
      "docs/index.md": `
# Welcome to MkDocs

Start editing your documentation here.
`,
      "docs/admin/index.html": `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>CMS</title><base href="/"/>
<style>body{font-family:sans-serif;padding:2rem;text-align:center}#nc-root{margin-top:2rem}</style></head>
<body>
  <h2>📘 Documentation CMS</h2><div id="nc-root"></div>
  <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
  <script src="https://unpkg.com/netlify-cms@^2.10.0/dist/netlify-cms.js"></script>
  <script>
    netlifyIdentity.init();
    netlifyIdentity.on('init', u => u||netlifyIdentity.open());
    CMS.init({ config:{
      backend:{ name:'git-gateway', branch:'main' },
      media_folder:'docs/images', public_folder:'/images',
      collections:[{
        name:'pages',label:'Pages',folder:'docs',create:true,slug:'{{slug}}',
        fields:[
          { label:'Title', name:'title', widget:'string' },
          { label:'Body',  name:'body',  widget:'markdown' }
        ]
      }]
    }});
  </script>
</body></html>`,

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

    // iterate each file, fetch existing sha if present, then create/update
    for (const [path, content] of Object.entries(files)) {
      let sha;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo: repoName, path });
        sha = data.sha;
      } catch (err) {
        // 404 means “file not found” → ok to create
        if (err.status !== 404) throw err;
      }

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo:    repoName,
        path,
        message: sha ? `chore: update ${path}` : `chore: add ${path}`,
        content: Buffer.from(content.trimStart()).toString("base64"),
        branch:  "main",
        ...(sha ? { sha } : {})             // only include sha when updating
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  }
  catch (err) {
    console.error("init-repo error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
