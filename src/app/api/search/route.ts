import { NextResponse } from 'next/server';
import axios from 'axios';
import { Buffer } from 'node:buffer';

// Helper function konversi ms ke menit:detik
function convert(ms: number) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (Number(seconds) < 10 ? "0" : "") + seconds;
}

// Token Generator (Client Credentials Flow)
async function spotifyCreds() {
    try {
        const response = await axios.post(
            "https://accounts.spotify.com/api/token", 
            "grant_type=client_credentials",
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    // Ini hardcoded dari snippet kamu. Jika error 401, ganti dengan client_id:client_secret base64 kamu sendiri
                    Authorization: "Basic " + Buffer.from(`7bbae52593da45c69a27c853cc22edff:88ae1f7587384f3f83f62a279e7f87af`).toString("base64"),
                },
                timeout: 30000,
            },
        );
        return response.data.access_token
            ? { status: true, access_token: response.data.access_token }
            : { status: false, msg: "Can't generate token!" };
    } catch (e: any) {
        return { status: false, msg: e.message };
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ status: false, message: "Parameter 'q' diperlukan." }, { status: 400 });
    }

    try {
        const creds = await spotifyCreds();
        if (!creds.status) throw new Error(creds.msg);

        const response = await axios.get("https://api.spotify.com/v1/search", {
            headers: { Authorization: `Bearer ${creds.access_token}` },
            params: {
                q: query,
                type: "track",
                limit: 20,
                market: "US",
            },
            timeout: 30000,
        });

        const tracks = response.data.tracks.items;
        if (!tracks.length) throw new Error("No tracks found!");

        const results = tracks.map((item: any) => ({
            track_url: item.external_urls.spotify,
            thumbnail: item.album.images[0]?.url || "",
            title: item.name,
            artist: item.artists.map((a:any) => a.name).join(", "),
            duration: convert(item.duration_ms),
            preview_url: item.preview_url || "",
            album: item.album.name,
            release_date: item.album.release_date,
        }));

        return NextResponse.json({
            status: true,
            result: results,
            total: response.data.tracks.total
        });

    } catch (error: any) {
        console.error("Search Error:", error.message);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
