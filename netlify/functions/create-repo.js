
// netlify/functions/create-repo.js
const { Octokit } = require("@octokit/rest");

exports.handler = async (event) => {
  // --- DEBUG LOGGING: inspect inputs ---
  console.log("⎈ Request body:", event.body);
  console.log("⎈ ENV:",
    "TEMPLATE_OWNER=", process.env.TEMPLATE_OWNER,
    "TEMPLATE_REPO=",  process.env.TEMPLATE_REPO,
    "GITHUB_TOKEN=",   process.env.GITHUB_TOKEN ? "[present]" : "[missing]"
  );

  // Validate env
  if (!process.env.TEMPLATE_OWNER || !process.env.TEMPLATE_REPO || !process.env.GITHUB_TOKEN) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Missing one of TEMPLATE_OWNER, TEMPLATE_REPO, or GITHUB_TOKEN"
      })
    };
  }

  try {
    const { name } = JSON.parse(event.body);
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const resp = await octokit.request(
      "POST /repos/{template_owner}/{template_repo}/generate",
      {
        template_owner: process.env.TEMPLATE_OWNER,
        template_repo:  process.env.TEMPLATE_REPO,
        name,
        owner:          process.env.TEMPLATE_OWNER,
        include_all_branches: false,
        private:        false
      }
    );

    console.log("✅ Generated repo:", resp.data.full_name);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        org:  process.env.TEMPLATE_OWNER,
        repo: resp.data.name
      })
    };

  } catch (e) {
    console.error("❌ Generation error:", e);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: e.message })
    };
  }
};
