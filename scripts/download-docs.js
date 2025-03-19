#!/usr/bin/env node

/**
 * This script downloads Markdown files from your WordPress site
 * and saves them to the Docusaurus docs directory.
 *
 * Usage:
 * node scripts/download-docs.js
 */

const fs = require("fs")
const path = require("path")
const https = require("https")
const http = require("http")

// WordPress site details
const wpSiteUrl = process.env.WP_SITE_URL || "https://www.jewely.fr"
const docsPath = "/wp-content/uploads/docusaurus/"

// Target directory in the Docusaurus project
const targetDir = path.join(__dirname, "../docs")

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

// Function to download a file
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} to ${filePath}`)

    // Choose http or https based on URL
    const client = url.startsWith("https") ? https : http

    const request = client.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        console.log(`Redirected to ${redirectUrl}`)
        return downloadFile(redirectUrl, filePath).then(resolve).catch(reject)
      }

      // Check if the response is successful
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
      }

      // Create write stream
      const file = fs.createWriteStream(filePath)

      // Pipe the response to the file
      response.pipe(file)

      // Handle errors
      file.on("error", (err) => {
        fs.unlink(filePath, () => {}) // Delete the file on error
        reject(err)
      })

      // Close the file when done
      file.on("finish", () => {
        file.close()
        resolve()
      })
    })

    // Handle request errors
    request.on("error", (err) => {
      fs.unlink(filePath, () => {}) // Delete the file on error
      reject(err)
    })

    // Set timeout
    request.setTimeout(30000, () => {
      request.abort()
      fs.unlink(filePath, () => {}) // Delete the file on timeout
      reject(new Error(`Request timeout for ${url}`))
    })
  })
}

// Function to list files in a directory (this is a placeholder since we can't directly list files)
async function getFileList() {
  // Since we can't list files directly, we'll use a placeholder file list
  // In a real scenario, you would need to know the file names in advance or get them from an API

  // This is just an example - you'll need to replace with your actual file names
  return [
    "introduction.md",
    "getting-started.md",
    "features.md",
    // Add more files as needed
  ]
}

// Main function to download all docs
async function downloadAllDocs() {
  try {
    console.log("Starting download of documentation files...")

    // Get list of files to download
    const files = await getFileList()

    // Create a sample index.md file if it doesn't exist in the list
    if (!files.includes("index.md")) {
      const indexPath = path.join(targetDir, "index.md")
      const indexContent = `---
title: Jewely Documentation
slug: /
---

# Jewely Documentation

Welcome to the Jewely documentation. Choose a topic from the sidebar to get started.
`
      fs.writeFileSync(indexPath, indexContent)
      console.log("Created index.md")
    }

    // Download each file
    for (const file of files) {
      const fileUrl = `${wpSiteUrl}${docsPath}${file}`
      const filePath = path.join(targetDir, file)

      try {
        await downloadFile(fileUrl, filePath)
        console.log(`Downloaded ${file}`)
      } catch (error) {
        console.error(`Error downloading ${file}:`, error.message)
      }
    }

    console.log("Documentation download completed!")
  } catch (error) {
    console.error("Error downloading documentation:", error)
    process.exit(1)
  }
}

// Run the main function
downloadAllDocs()

