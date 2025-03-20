import fs from "fs"
import path from "path"

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    // 1. API Key Validation
    const apiKey = req.headers.authorization?.split(" ")[1]
    if (apiKey !== process.env.WP_API_KEY) {
      return res.status(403).json({ error: "Invalid API key" })
    }

    // 2. Get data from request
    const { docs } = req.body

    // 3. Validate input
    if (!Array.isArray(docs)) {
      return res.status(400).json({ error: "Invalid docs array" })
    }

    // 4. File Path Configuration
    const docsPath = path.join(process.cwd(), "docs")

    // Ensure docs directory exists
    if (!fs.existsSync(docsPath)) {
      fs.mkdirSync(docsPath, { recursive: true })
    }

    // 5. Process each document
    const results = []
    for (const doc of docs) {
      const { slug, title, content } = doc

      if (!slug || !content) {
        results.push({
          slug: slug || "unknown",
          success: false,
          error: "Missing required fields",
        })
        continue
      }

      try {
        // Format the content with frontmatter
        const formattedContent = `---
title: ${title || slug}
slug: /${slug}
---

${content}`

        // Write Markdown file
        const filePath = path.join(docsPath, `${slug}.md`)
        fs.writeFileSync(filePath, formattedContent)

        results.push({
          slug,
          success: true,
        })
      } catch (error) {
        results.push({
          slug,
          success: false,
          error: error.message,
        })
      }
    }

    // 6. Trigger Vercel deployment
    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      const deployResponse = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
        method: "POST",
      })

      if (!deployResponse.ok) {
        throw new Error(`Deploy hook failed: ${deployResponse.statusText}`)
      }
    }

    return res.status(200).json({
      success: true,
      message: "Documentation sync completed",
      results,
    })
  } catch (error) {
    console.error("API error:", error)
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
}

