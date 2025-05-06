// netlify/functions/init-repo.js
const { Octokit } = require("@octokit/rest");

exports.handler = async ({ body }) => {
  try {
    const { repo } = JSON.parse(body);           // e.g. "org-name/repo-name"
    const [owner, repoName] = repo.split("/");

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // 1) verify the repo exists
    await octokit.repos.get({ owner, repo: repoName });

    // 2) define all files to seed (inline admin HTML + YAML)
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

      // Admin UI entry‑point
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

      // Netlify‑CMS config
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
`
    };

    // 3) commit each file
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
