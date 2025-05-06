// netlify/functions/list-projects.js
const { createClient } = require("@supabase/supabase-js");

exports.handler = async () => {
  const supa = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const { data, error } = await supa
    .from("projects")
    .select("id, repo, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("list-projects error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: { "Access-Control-Allow-Origin": "*" }
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(data),
    headers: { "Access-Control-Allow-Origin": "*" }
  };
};
