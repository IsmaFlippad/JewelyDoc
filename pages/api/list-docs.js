import fs from "fs"
import path from "path"

export default function handler(req, res) {
  try {
    // 1. API Key Validation
    const apiKey = req.headers.authorization?.split(" ")[1]
    if (apiKey !== process.env.WP_API_KEY) {
      return res.status(403).json({ error: "Invalid API key" })
    }

    // 2. File Path Configuration
    const docsPath = path.join(process.cwd(), "docs")

    // 3. Check if directory exists
    if (!fs.existsSync(docsPath)) {
      return res.status(200).json({ docs: [] })
    }

    // 4. Read directory and filter for markdown files
    const files = fs
      .readdirSync(docsPath)
      .filter((file) => file.endsWith(".md"))
      .map((file) => {
        const filePath = path.join(docsPath, file)
        const content = fs.readFileSync(filePath, "utf8")
        const slug = file.replace(".md", "")

        // Extract title from frontmatter
        const titleMatch = content.match(/title:\s*(.*)/)
        const title = titleMatch ? titleMatch[1] : slug

        return {
          slug,
          title,
          lastModified: fs.statSync(filePath).mtime,
        }
      })

    return res.status(200).json({ docs: files })
  } catch (error) {
    console.error("API error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

