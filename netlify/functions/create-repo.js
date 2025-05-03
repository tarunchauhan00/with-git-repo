// install @octokit/rest in this folder: npm install @octokit/rest
const { Octokit } = require("@octokit/rest");
exports.handler = async ({ body }) => {
  const { name } = JSON.parse(body);
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const template_owner = process.env.TEMPLATE_OWNER;
  const template_repo  = process.env.TEMPLATE_REPO;
  const resp = await octokit.request('POST /repos/{template_owner}/{template_repo}/generate',{
    template_owner,template_repo,name,owner:template_owner,include_all_branches:false,private:false
  });
  return { statusCode:200, body: JSON.stringify({ org: template_owner, repo: resp.data.name }) };
};