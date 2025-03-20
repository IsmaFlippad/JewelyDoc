import { NextResponse } from "next/server";
import { Octokit } from "octokit";

export async function POST(request: Request) {
  try {
    // Vérification sécurité (identique)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.REBUILD_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Gestion des opérations DELETE
    if (request.headers.get("X-WPDS-Operation") === "delete") {
      const { slug } = await request.json();
      return handleDelete(slug);
    }

    // Gestion normale POST (création/mise à jour)
    const { slug, content } = await request.json();
    return handleUpsert(slug, content);

  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleUpsert(slug: string, content: string) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");

  // Récupération SHA existant pour mise à jour
  let sha: string | undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: `docs/${slug}.md`,
    });
    sha = (data as any).sha;
  } catch {} // Fichier non existant = création

  // Commit GitHub
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `docs/${slug}.md`,
    message: `Sync ${slug}.md from WordPress`,
    content: Buffer.from(content).toString("base64"),
    sha,
    branch: "main",
  });

  triggerVercelRebuild();
  return NextResponse.json({ success: true });
}

async function handleDelete(slug: string) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");

  try {
    // Récupération SHA nécessaire pour suppression
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: `docs/${slug}.md`,
    });

    // Commit de suppression
    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path: `docs/${slug}.md`,
      message: `Delete ${slug}.md from WordPress`,
      sha: (data as any).sha,
      branch: "main",
    });

    triggerVercelRebuild();
    return NextResponse.json({ success: true });

  } catch (error) {
    if (error.status === 404) {
      return NextResponse.json({ success: true, warning: "File already deleted" });
    }
    throw error;
  }
}

function triggerVercelRebuild() {
  if (process.env.VERCEL_DEPLOY_HOOK_URL) {
    fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" });
  }
}