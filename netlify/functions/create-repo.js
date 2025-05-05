// netlify/functions/create-repo.js
// npm install @octokit/rest
const { Octokit } = require("@octokit/rest");

exports.handler = async (event) => {
  try {
    const { name } = JSON.parse(event.body);
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const resp = await octokit.request(
      'POST /repos/{template_owner}/{template_repo}/generate',
      {
        template_owner: process.env.TEMPLATE_OWNER,  // e.g. your GitHub org
        template_repo:  process.env.TEMPLATE_REPO,   // the mkdocs‑template repo
        name,
        owner:          process.env.TEMPLATE_OWNER,
        include_all_branches: false,
        private:        false
      }
    );

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        org:  process.env.TEMPLATE_OWNER,
        repo: resp.data.name
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
