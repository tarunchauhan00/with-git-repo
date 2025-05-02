// netlify/functions/create-repo.js
import { Octokit } from "@octokit/rest";

export const handler = async (event) => {
  const { name } = JSON.parse(event.body);
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // create a new repo from a template or blank
  const template_owner = process.env.TEMPLATE_OWNER;      // e.g. your GitHub org
  const template_repo  = process.env.TEMPLATE_REPO;       // e.g. "mkdocs‑template"
  
  // create from template
  const create = await octokit.request('POST /repos/{template_owner}/{template_repo}/generate', {
    template_owner,
    template_repo,
    name,
    owner: template_owner,
    include_all_branches: false,
    private: false
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      org: template_owner,
      repo: create.data.name
    })
  };
};
