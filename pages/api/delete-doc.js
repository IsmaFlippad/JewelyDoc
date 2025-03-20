import fs from "fs"
import path from "path"

export default function handler(req, res) {
  // Only allow DELETE requests
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    // 1. API Key Validation
    const apiKey = req.headers.authorization?.split(" ")[1]
    if (apiKey !== process.env.WP_API_KEY) {
      return res.status(403).json({ error: "Invalid API key" })
    }

    // 2. Get slug from request
    const { slug } = req.query

    // 3. Validate input
    if (!slug) {
      return res.status(400).json({ error: "Missing slug parameter" })
    }

    // 4. File Path Configuration
    const docsPath = path.join(process.cwd(), "docs")
    const filePath = path.join(docsPath, `${slug}.md`)

    // 5. Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Document not found" })
    }

    // 6. Delete the file
    fs.unlinkSync(filePath)

    // 7. Trigger Vercel deployment
    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
        method: "POST",
      }).catch((error) => {
        console.error("Deploy hook error:", error)
      })
    }

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      slug,
    })
  } catch (error) {
    console.error("API error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

