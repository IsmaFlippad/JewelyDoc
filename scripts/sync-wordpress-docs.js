#!/usr/bin/env node

/**
 * This script can be used to manually sync WordPress-generated Markdown files
 * to the Docusaurus project. It's an alternative to the API endpoint.
 *
 * Usage:
 * node scripts/sync-wordpress-docs.js /path/to/wordpress/uploads/docusaurus
 */

const fs = require("fs")
const path = require("path")

// Get the source directory from command line arguments
const sourceDir = process.argv[2]
if (!sourceDir) {
  console.error("Please provide the source directory as an argument")
  process.exit(1)
}

// Target directory in the Docusaurus project
const targetDir = path.join(__dirname, "../wordpress-docs")

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

// Copy all markdown files from source to target
try {
  const files = fs.readdirSync(sourceDir)
  let count = 0

  for (const file of files) {
    if (file.endsWith(".md")) {
      const sourcePath = path.join(sourceDir, file)
      const targetPath = path.join(targetDir, file)

      fs.copyFileSync(sourcePath, targetPath)
      count++
      console.log(`Copied: ${file}`)
    }
  }

  console.log(`Successfully copied ${count} markdown files to ${targetDir}`)
} catch (error) {
  console.error("Error syncing files:", error)
  process.exit(1)
}

