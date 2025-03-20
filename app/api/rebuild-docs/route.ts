import { NextResponse } from "next/server";

console.log("GitHub Token:", process.env.GITHUB_TOKEN ? "Present" : "Missing");
console.log("GitHub Repo:", process.env.GITHUB_REPO);
console.log("Vercel Hook:", process.env.VERCEL_DEPLOY_HOOK_URL);

// Helper function to set CORS headers
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "https://www.jewely.fr");
  response.headers.set("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-WPDS-Operation");
  return response;
}

export async function POST(request: Request) {
  try {
    // Handle CORS preflight request
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      return setCorsHeaders(response);
    }

    // Security check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.REBUILD_SECRET}`) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return setCorsHeaders(response);
    }

    const operation = request.headers.get("X-WPDS-Operation");
    const body = await request.json();

    // Detailed logging for debugging
    console.log("Received request:", {
      operation,
      body: JSON.stringify(body, null, 2),
      headers: Object.fromEntries(request.headers)
    });

    let result;
    if (operation === "delete") {
      result = await handleDelete(body.slug);
    } else {
      result = await handleUpsert(body.slug, body.content, body.title);
    }

    return setCorsHeaders(result);
  } catch (error) {
    console.error("Error:", error);
    const response = NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
    return setCorsHeaders(response);
  }
}

async function handleUpsert(slug: string, content: string, title?: string) {
  const { Octokit } = await import("octokit");
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");

  // Validate parameters
  if (!slug || !content) {
    return new Response(JSON.stringify({ error: "Slug and content are required" }), {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "https://www.jewely.fr",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (typeof slug !== "string" || typeof content !== "string") {
    return new Response(JSON.stringify({ error: "Invalid data types" }), {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "https://www.jewely.fr",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Format the Markdown content with front matter
  const formattedContent = `---
title: ${title || slug}
slug: /${slug}
---

${content}`;

  // Log before making changes on GitHub
  console.log(`Upserting ${slug}.md with content:`, formattedContent);

  // Retrieve the existing SHA if the file exists (for update)
  let sha: string | undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: `docs/${slug}.md`,
    });
    sha = (data as any).sha;
  } catch (error) {
    // If file does not exist, we'll create it
    console.log(`File docs/${slug}.md does not exist. It will be created.`);
  }

  // Commit to GitHub (create or update file)
  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `docs/${slug}.md`,
      message: `Sync ${slug}.md from WordPress`,
      content: Buffer.from(formattedContent).toString("base64"),
      sha,
      branch: "main",
    });
  } catch (error) {
    console.error("GitHub API Error:", error);
    throw new Error(`Failed to update GitHub: ${error.message}`);
  }

  // Trigger a Vercel rebuild after updating GitHub
  await triggerVercelRebuild();
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://www.jewely.fr",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function handleDelete(slug: string) {
  const { Octokit } = await import("octokit");
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");

  try {
    // Retrieve the SHA necessary for deletion
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: `docs/${slug}.md`,
    });

    // Commit deletion on GitHub
    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path: `docs/${slug}.md`,
      message: `Delete ${slug}.md from WordPress`,
      sha: (data as any).sha,
      branch: "main",
    });

    await triggerVercelRebuild();
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://www.jewely.fr",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    if (error.status === 404) {
      return new Response(JSON.stringify({ success: true, warning: "File already deleted" }), {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "https://www.jewely.fr",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    throw error;
  }
}

async function triggerVercelRebuild() {
  if (!process.env.VERCEL_DEPLOY_HOOK_URL) {
    console.warn("Vercel Deploy Hook URL is missing");
    return;
  }

  try {
    const response = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger Vercel deploy: ${response.statusText}`);
    }
    console.log("Vercel rebuild triggered successfully");
  } catch (error) {
    console.error("Error triggering Vercel rebuild:", error);
  }
}