// All client-side requests go through this proxy

import { type NextRequest, NextResponse } from "next/server"

const FORUMS_BASE_URL = process.env.FORUMS_BASE_URL || "https://foru.ms"
const FORUMS_API_KEY = process.env.FORUMS_API_KEY

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params)
}

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  try {
    const path = params.path.join("/")
    const url = new URL(`/api/v1/${path}`, FORUMS_BASE_URL)

    // Forward query params
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })

    // Build headers
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    // Forward authorization from client
    const authHeader = request.headers.get("Authorization")
    if (authHeader) {
      headers["Authorization"] = authHeader
    }

    // Add API key for server-to-server auth if available
    if (FORUMS_API_KEY) {
      headers["X-API-Key"] = FORUMS_API_KEY
    }

    // Build request options
    const options: RequestInit = {
      method: request.method,
      headers,
    }

    // Forward body for non-GET requests
    if (request.method !== "GET" && request.method !== "HEAD") {
      const body = await request.text()
      if (body) {
        options.body = body
      }
    }

    // Make the proxied request
    const response = await fetch(url.toString(), options)

    // Get response data
    const data = await response.text()

    // Return proxied response
    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    })
  } catch (error) {
    console.error("[v0] Proxy error:", error)
    return NextResponse.json(
      { error: "Failed to proxy request", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
