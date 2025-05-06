const { Octokit } = require("@octokit/rest");
const path = require("path");

exports.handler = async ({ body }) => {
  try {
    const { repo } = JSON.parse(body); // e.g. your-org/your-repo
    const [owner, repoName] = repo.split("/");

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Check if repo exists
    await octokit.repos.get({ owner, repo: repoName });

    // Prepare MkDocs starter content
    const files = {
      "mkdocs.yml": "site_name: My Docs\nnav:\n  - Home: index.md",
      "docs/index.md": "# Welcome to MkDocs\n\nThis is your homepage.",
    };

    // Create each file via GitHub API
    for (const [path, content] of Object.entries(files)) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path,
        message: `Add initial MkDocs file: ${path}`,
        content: Buffer.from(content).toString("base64"),
        branch: "main",
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("init-repo error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
