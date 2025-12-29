import { NextRequest, NextResponse } from "next/server";

const FILE_SERVER_URL =
  process.env.FILE_SERVER_URL || "http://43.228.213.41:3001";
const FILE_SERVER_API_KEY =
  process.env.FILE_SERVER_API_KEY || "onpost_file_api_k3y_2024_s3cur3";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Forward to file server
    const uploadFormData = new FormData();
    uploadFormData.append("image", image);

    const response = await fetch(`${FILE_SERVER_URL}/upload`, {
      method: "POST",
      headers: {
        "x-api-key": FILE_SERVER_API_KEY,
      },
      body: uploadFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Upload failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Upload API Error]", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
