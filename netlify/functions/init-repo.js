// netlify/functions/init-repo.js
const { Octokit } = require("@octokit/rest");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async ({ body }) => {
  const { repo } = JSON.parse(body);        // e.g. "org/name"
  const [owner, repoName] = repo.split("/");

  // Supabase client (service role)
  const supa = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // GitHub client
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  try {
    // 1) ensure repo exists
    await octokit.repos.get({ owner, repo: repoName });

    // 2) push basic MkDocs files
    const files = {
      "mkdocs.yml":    "site_name: My Docs\nnav:\n  - Home: index.md",
      "docs/index.md": "# Welcome\nThis is your MkDocs site."
    };
    for (const [path, content] of Object.entries(files)) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path,
        message: `chore: add ${path}`,
        content: Buffer.from(content).toString("base64"),
        branch: "main",
      });
    }

    // 3) record in Supabase
    const { error } = await supa
      .from("projects")
      .insert({ repo });
    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
      headers: { "Access-Control-Allow-Origin": "*" }
    };
  } catch (err) {
    console.error("init-repo error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
      headers: { "Access-Control-Allow-Origin": "*" }
    };
  }
};
