#!/usr/bin/env node

/**
 * This script fetches Markdown files from your WordPress site
 * and saves them to the Docusaurus project.
 *
 * Usage:
 * node scripts/fetch-wordpress-docs.js
 */

const fs = require("fs")
const path = require("path")
const https = require("https")
const { promisify } = require("util")

// Target directory in the Docusaurus project
const targetDir = path.join(__dirname, "../wordpress-docs")

// WordPress site details
const wpSiteUrl = process.env.WP_SITE_URL || "https://www.jewely.fr"
const wpApiEndpoint = `${wpSiteUrl}/wp-json/wp/v2/jewely-docs?per_page=100`

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

// Function to fetch data from WordPress API
async function fetchFromWordPress(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ""

        res.on("data", (chunk) => {
          data += chunk
        })

        res.on("end", () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`))
          }
        })
      })
      .on("error", (err) => {
        reject(err)
      })
  })
}

// Main function to fetch docs and save as Markdown
async function fetchAndSaveDocs() {
  try {
    console.log("Fetching documentation from WordPress...")
    const posts = await fetchFromWordPress(wpApiEndpoint)

    if (!Array.isArray(posts) || posts.length === 0) {
      console.log("No documentation posts found.")
      return
    }

    console.log(`Found ${posts.length} documentation posts.`)

    for (const post of posts) {
      const title = post.title.rendered
      const content = post.content.rendered
      const slug = post.slug

      // Create markdown content
      const markdown = `---
title: ${title}
slug: /${slug}
---

${content}`

      // Save to file
      const filePath = path.join(targetDir, `${slug}.md`)
      fs.writeFileSync(filePath, markdown)
      console.log(`Saved: ${slug}.md`)
    }

    console.log("Documentation sync completed successfully!")
  } catch (error) {
    console.error("Error fetching documentation:", error)
    process.exit(1)
  }
}

// Run the main function
fetchAndSaveDocs()

