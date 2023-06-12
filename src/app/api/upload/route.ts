import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const base_url = 'https://api.assemblyai.com/v2'

    const headers = {
        authorization: process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY
    }

    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
        return NextResponse.json({ success: false });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);


    const response = await axios.post(`${base_url}/upload`, data, { headers })
    const upload_url = response.data.upload_url


    return NextResponse.json({ success: true, upload_url });
}