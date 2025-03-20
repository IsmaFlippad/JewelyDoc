import { NextResponse } from "next/server";
import { Octokit } from "octokit";

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

export async function OPTIONS(request: Request) {
  // Handle CORS preflight request
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
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
  console.log("Upserting content for slug:", slug);

  try {
    const response = await octokit.request("POST /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path: `docs/${slug}.md`,
      message: `Update ${slug}`,
      content: Buffer.from(formattedContent).toString("base64"),
      branch: "main", // Specify the branch name
    });
    console.log("GitHub response:", response);
    return NextResponse.json({ message: "Content upserted successfully" }, { status: 200 });
  } catch (error) {
    console.error("GitHub error:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

async function handleDelete(slug: string) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");

  try {
    const response = await octokit.request("DELETE /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path: `docs/${slug}.md`,
      message: `Delete ${slug}`,
      branch: "main", // Specify the branch name
    });
    console.log("GitHub response:", response);
    return NextResponse.json({ message: "Content deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("GitHub error:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
