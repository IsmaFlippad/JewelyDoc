import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get("authorization")

    if (!process.env.REBUILD_SECRET || authHeader !== `Bearer ${process.env.REBUILD_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Trigger a new build on Vercel
    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      const response = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to trigger Vercel deploy: ${response.statusText}`)
      }
    }

    return NextResponse.json({ success: true, message: "Rebuild triggered successfully" })
  } catch (error) {
    console.error("Error triggering rebuild:", error)
    return NextResponse.json({ error: "Failed to trigger rebuild" }, { status: 500 })
  }
}

