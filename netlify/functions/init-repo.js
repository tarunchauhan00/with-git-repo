// netlify/functions/init-repo.js
const { Octokit } = require("@octokit/rest");

exports.handler = async ({ body }) => {
  try {
    const { repo } = JSON.parse(body);          // e.g. "org-name/repo-name"
    const [owner, repoName] = repo.split("/");

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // 1) verify the repo exists
    await octokit.repos.get({ owner, repo: repoName });

    // 2) define all files to seed
    const files = {
      "mkdocs.yml":                 "site_name: My Docs\nnav:\n  - Home: index.md\n",
      "docs/index.md":              "# Welcome to MkDocs\n\nStart editing...",
      "docs/admin/index.html":      require("fs").readFileSync(
                                        path.join(__dirname, "../template/admin/index.html"),
                                        "utf8"
                                     ),
      "docs/admin/config.yaml":     require("fs").readFileSync(
                                        path.join(__dirname, "../template/admin/config.yaml"),
                                        "utf8"
                                     )
    };

    // 3) commit each file to the repo
    for (const [path, content] of Object.entries(files)) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo:    repoName,
        path,
        message: `chore: add ${path}`,
        content: Buffer.from(content).toString("base64"),
        branch:  "main"
      });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("init-repo error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
