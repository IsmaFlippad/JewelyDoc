import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

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
    const { slug, title, content } = req.body

    // 3. Validate input
    if (!slug || !content) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // 4. File Path Configuration
    const docsPath = path.join(process.cwd(), "docs")

    // Ensure docs directory exists
    if (!fs.existsSync(docsPath)) {
      fs.mkdirSync(docsPath, { recursive: true })
    }

    // 5. Format the content with frontmatter
    const formattedContent = `---
title: ${title || slug}
slug: /${slug}
---

${content}`

    // 6. Write Markdown file
    const filePath = path.join(docsPath, `${slug}.md`)
    fs.writeFileSync(filePath, formattedContent)

    // 7. Trigger Vercel deployment instead of local build
    // This is more reliable for serverless environments
    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      const deployResponse = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
        method: "POST",
      })

      if (!deployResponse.ok) {
        throw new Error(`Deploy hook failed: ${deployResponse.statusText}`)
      }

      return res.status(200).json({
        success: true,
        message: "Documentation updated and rebuild triggered",
        file: `${slug}.md`,
      })
    } else {
      // Fallback to local build if no deploy hook is set
      // Note: This may timeout in serverless environments
      const { stdout, stderr } = await execAsync("npm run build", { cwd: process.cwd() })

      if (stderr) {
        console.error(`Build error: ${stderr}`)
      }

      return res.status(200).json({
        success: true,
        message: "Documentation updated and rebuilt locally",
        file: `${slug}.md`,
        buildOutput: stdout,
      })
    }
  } catch (error) {
    console.error("API error:", error)
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
}

