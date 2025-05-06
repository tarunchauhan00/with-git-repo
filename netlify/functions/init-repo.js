// netlify/functions/init-repo.js
const { Octokit } = require("@octokit/rest");

exports.handler = async ({ body }) => {
  try {
    const { repo } = JSON.parse(body);           // e.g. "org-name/repo-name"
    const [owner, repoName] = repo.split("/");

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // 1) verify the repo exists
    await octokit.repos.get({ owner, repo: repoName });

    // 2) define all files to seed
    const files = {
      // MkDocs config
      "mkdocs.yml": `
site_name: My Docs
nav:
  - Home: index.md
  - Admin: admin/index.html
`,

      // Homepage
      "docs/index.md": `
# Welcome to MkDocs

Start editing your documentation here.
`,

      // Netlify CMS admin UI
      "docs/admin/index.html": `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Documentation CMS</title>
  <base href="/" />
  <style>body{font-family:sans-serif;padding:2rem;text-align:center}#nc-root{margin-top:2rem}</style>
</head>
<body>
  <h2>📘 Documentation CMS</h2>
  <div id="nc-root"></div>
  <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
  <script src="https://unpkg.com/netlify-cms@^2.10.0/dist/netlify-cms.js"></script>
  <script>
    netlifyIdentity.init();
    netlifyIdentity.on('init', user => user||netlifyIdentity.open());
    CMS.init({
      config: {
        backend:{name:'git-gateway',branch:'main'},
        media_folder:'docs/images',public_folder:'/images',
        collections:[{
          name:'pages',label:'Pages',folder:'docs',create:true,slug:'{{slug}}',
          fields:[
            {label:'Title',name:'title',widget:'string'},
            {label:'Body', name:'body', widget:'markdown'}
          ]
        }]
      }
    });
  </script>
</body>
</html>`,

      // Netlify CMS config
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

      // Netlify build settings
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

      // Python dependencies
      "requirements.txt": `
mkdocs>=1.6
mkdocs-material>=9.6
mkdocs-pdf-export-plugin>=0.5
weasyprint>=65.1
mkdocs-mermaid2-plugin>=1.2
mkdocs-awesome-pages-plugin>=2.6
`
    };

    // 3) commit each file to the repo
    for (const [path, content] of Object.entries(files)) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo:    repoName,
        path,
        message: `chore: add ${path}`,
        content: Buffer.from(content.trimStart()).toString("base64"),
        branch:  "main"
      });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }
  catch (err) {
    console.error("init-repo error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
