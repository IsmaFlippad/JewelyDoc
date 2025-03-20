import { NextResponse } from "next/server";
import { Octokit } from "octokit";

console.log("GitHub Token:", process.env.GITHUB_TOKEN ? "Present" : "Missing");
console.log("GitHub Repo:", process.env.GITHUB_REPO);
console.log("Vercel Hook:", process.env.VERCEL_DEPLOY_HOOK_URL);

export async function POST(request: Request) {
  // Add CORS headers to allow requests from WordPress domain
  const allowedOrigins = ['https://www.jewely.fr']; // Replace with your WordPress site URL

  const origin = request.headers.get('Origin');
  if (allowedOrigins.includes(origin || '')) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-WPDS-Operation');

    // If the request is a preflight (OPTIONS), respond with 200 OK
    if (request.method === 'OPTIONS') {
      return response;
    }
  }

  try {
    // Security check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.REBUILD_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const operation = request.headers.get("X-WPDS-Operation");
    const body = await request.json();

    // Detailed logging for debugging
    console.log("Received request:", {
      operation,
      body: JSON.stringify(body, null, 2),
      headers: Object.fromEntries(request.headers)
    });

    if (operation === "delete") {
      return handleDelete(body.slug);
    }

    // Call handleUpsert with title, content, and slug
    return handleUpsert(body.slug, body.content, body.title);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

async function handleUpsert(slug: string, content: string, title?: string) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");

  // Validate parameters
  if (!slug || !content) {
    return NextResponse.json(
      { error: "Slug and content are required" },
      { status: 400 }
    );
  }
  
  if (typeof slug !== "string" || typeof content !== "string") {
    return NextResponse.json(
      { error: "Invalid data types" },
      { status: 400 }
    );
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
  return NextResponse.json({ success: true });
}

async function handleDelete(slug: string) {
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
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.status === 404) {
      return NextResponse.json({ success: true, warning: "File already deleted" });
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
