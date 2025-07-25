// app/api/rebuild-docs/route.ts
import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Helper function pour déclencher un rebuild Vercel
async function triggerVercelRebuild() {
  if (!process.env.VERCEL_DEPLOY_HOOK_URL) {
    console.warn("Vercel Deploy Hook URL is missing");
    return;
  }
  
  try {
    const response = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { 
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to trigger Vercel deploy: ${response.statusText}`);
      return false;
    } else {
      console.log("Vercel rebuild triggered successfully");
      return true;
    }
  } catch (error) {
    console.error("Error triggering Vercel rebuild:", error);
    return false;
  }
}

// Helper function pour formatter le contenu Markdown
function formatMarkdownContent(content: string, title?: string, slug?: string) {
  // Supprimer le front matter existant
  const cleaned = content.replace(/^---[\s\S]*?---\s*/g, "").trim();
  
  // Construire le nouveau front matter
  const frontMatter = `---
title: ${title || slug}
slug: /${slug}
---\n\n`;
  
  return frontMatter + cleaned;
}

// Helper function pour gérer les erreurs GitHub
function handleGitHubError(error: any, slug: string, operation: string) {
  if (error.status === 404) {
    console.log(`File ${slug}.md not found during ${operation}, skipping`);
    return 'not_found';
  } else {
    console.error(`Error ${operation} ${slug}.md:`, error);
    return 'error';
  }
}

// Ajoute les headers CORS
function setCorsHeaders(response: NextResponse) {
  const allowedOrigin = process.env.WP_SITE_URL || "*";
  
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-WPDS-Operation");
  response.headers.set("Access-Control-Max-Age", "86400"); // Cache preflight pour 24h
  
  return response;
}

export async function POST(request: Request) {
  // Gérer CORS preflight
  if (request.method === "OPTIONS") {
    const resp = new NextResponse(null, { status: 204 });
    return setCorsHeaders(resp);
  }

  // Authentification
  const authHeader = request.headers.get("authorization");
  const operation = request.headers.get("x-wpds-operation") || "unknown";
  
  if (!authHeader || authHeader !== `Bearer ${process.env.REBUILD_SECRET}`) {
    console.error("Unauthorized request to rebuild-docs");
    const resp = NextResponse.json({ 
      error: "Unauthorized",
      message: "Invalid or missing authorization token"
    }, { status: 401 });
    return setCorsHeaders(resp);
  }

  // Validation du payload
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    console.error("Invalid JSON payload:", e);
    const resp = NextResponse.json({ 
      error: "Invalid JSON",
      message: "The request body is not valid JSON"
    }, { status: 400 });
    return setCorsHeaders(resp);
  }

  // Validation des données
  const docs: Array<{ slug: string; title?: string; content: string }> = Array.isArray(body.docs) ? body.docs : [];
  const deletes: string[] = Array.isArray(body.deletes) ? body.deletes : [];
  
  if (docs.length === 0 && deletes.length === 0) {
    console.log("No changes detected in sync request");
    const resp = NextResponse.json({ 
      success: true, 
      message: "No changes detected",
      operation
    });
    return setCorsHeaders(resp);
  }

  const octokit = new Octokit({ 
    auth: process.env.GITHUB_TOKEN,
    userAgent: 'WP-Docusaurus-Sync/v1.0'
  });
  
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");
  
  // Structures pour suivre les résultats
  const results = {
    upserts: {
      success: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    },
    deletes: {
      success: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    }
  };

  // 1️⃣ Traitement des upserts (mises à jour/créations)
  for (const { slug, title, content } of docs) {
    try {
      console.log(`Processing ${slug}.md`);
      
      // Formater le contenu Markdown
      const formattedContent = formatMarkdownContent(content, title, slug);
      
      let sha: string | undefined;
      
      // Vérifier si le fichier existe déjà
      try {
        const existing = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: `frontend/docs/${slug}.md`,
          ref: 'main'
        });
        
        sha = (existing.data as any).sha;
        console.log(`File ${slug}.md exists, updating...`);
      } catch (e) {
        console.log(`File ${slug}.md does not exist, creating new file...`);
      }

      // Créer ou mettre à jour le fichier
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `frontend/docs/${slug}.md`,
        message: `Sync ${slug}.md from WordPress (${operation})`,
        content: Buffer.from(formattedContent).toString("base64"),
        sha,
        branch: "main",
      });
      
      results.upserts.success++;
      results.upserts.details.push({ slug, status: 'success' });
      console.log(`Processed ${slug}.md successfully`);
    } catch (error) {
      results.upserts.errors++;
      results.upserts.details.push({ 
        slug, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`Error processing ${slug}.md:`, error);
    }
  }

  // 2️⃣ Traitement des suppressions
  for (const slug of deletes) {
    try {
      console.log(`Deleting ${slug}.md`);
      
      // Récupérer le SHA du fichier à supprimer
      const file = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: `frontend/docs/${slug}.md`,
        ref: 'main'
      });
      
      // Supprimer le fichier
      await octokit.rest.repos.deleteFile({
        owner,
        repo,
        path: `frontend/docs/${slug}.md`,
        message: `Delete ${slug}.md from WordPress (${operation})`,
        sha: (file.data as any).sha,
        branch: "main",
      });
      
      results.deletes.success++;
      results.deletes.details.push({ slug, status: 'success' });
      console.log(`Deleted ${slug}.md successfully`);
    } catch (error: any) {
      const status = handleGitHubError(error, slug, 'delete');
      
      if (status === 'not_found') {
        results.deletes.skipped++;
        results.deletes.details.push({ slug, status: 'skipped' });
      } else {
        results.deletes.errors++;
        results.deletes.details.push({ 
          slug, 
          status: 'error',
          error: error.message || 'Unknown error'
        });
      }
    }
  }

  // 3️⃣ Déclencher le rebuild Vercel
  const rebuildSuccess = await triggerVercelRebuild();
  
  // Réponse finale
  const resp = NextResponse.json({
    success: true,
    operation,
    rebuildTriggered: rebuildSuccess,
    results: {
      upserts: {
        total: docs.length,
        ...results.upserts
      },
      deletes: {
        total: deletes.length,
        ...results.deletes
      }
    }
  });
  
  return setCorsHeaders(resp);
}