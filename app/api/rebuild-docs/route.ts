import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get("authorization")

    if (!process.env.REBUILD_SECRET || authHeader !== `Bearer ${process.env.REBUILD_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get data from request
    const body = await request.json()
    const { slug, title, content } = body

    // Validate input
    if (!slug || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // File Path Configuration
    const docsPath = path.join(process.cwd(), "docs")

    // Ensure docs directory exists
    if (!fs.existsSync(docsPath)) {
      fs.mkdirSync(docsPath, { recursive: true })
    }

    // Format the content with frontmatter
    const formattedContent = `---
title: ${title || slug}
slug: /${slug}
---

${content}`

    // Write Markdown file
    const filePath = path.join(docsPath, `${slug}.md`)
    fs.writeFileSync(filePath, formattedContent)

    // Trigger a new build on Vercel
    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      const response = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to trigger Vercel deploy: ${response.statusText}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Documentation updated and rebuild triggered",
      file: `${slug}.md`,
    })
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json(
      {
        error: "Failed to process request",
        message: error.message,
      },
      { status: 500 },
    )
  }
}

