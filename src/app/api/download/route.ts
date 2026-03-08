import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const spotifyUrl = searchParams.get('url');

    if (!spotifyUrl) {
        return NextResponse.json({ status: false, message: "Parameter 'url' diperlukan." }, { status: 400 });
    }

    try {
        const headers = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-ch-ua": "\"Not)A;Brand\";v=\"24\", \"Chromium\";v=\"116\"",
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": "\"Android\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "Referer": "https://spotifydownload.org/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
        };

        // 1. Get Metadata
        // Menggunakan encodeURIComponent agar URL aman
        const initialResponse = await axios.get(
            `https://api.fabdl.com/spotify/get?url=${encodeURIComponent(spotifyUrl)}`,
            { headers }
        );

        const { result } = initialResponse.data;
        if (!result) throw new Error("Gagal mengambil metadata Spotify (Mungkin IP terblokir atau link salah).");

        // Logic scrape: cek apakah album atau track
        const trackId = result.type === "album" ? result.tracks[0].id : result.id;
        const gid = result.gid;

        // 2. Start Conversion Task
        const convertResponse = await axios.get(
            `https://api.fabdl.com/spotify/mp3-convert-task/${gid}/${trackId}`,
            { headers }
        );

        const tid = convertResponse.data?.result?.tid;
        if (!tid) throw new Error("Gagal memulai konversi MP3.");

        // 3. Polling Progress (Looping)
        let downloadResult = null;
        let attempts = 0;
        
        while (attempts < 30) { // Max 15 detik (30 * 500ms)
            try {
                const progressResponse = await axios.get(
                    `https://api.fabdl.com/spotify/mp3-convert-progress/${tid}`,
                    { headers }
                );
                
                if (progressResponse.data.result.status === 3) {
                    downloadResult = progressResponse.data.result;
                    break;
                }
                
                // Jika status error (biasanya < 0 atau specific error code)
                if (progressResponse.data.result.status < 0) {
                     throw new Error("Proses konversi gagal di sisi server.");
                }

            } catch (err) {
                // Ignore transient errors during polling
            }

            // Tunggu 500ms
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (!downloadResult) throw new Error("Timeout: Gagal mendapatkan link download, coba lagi.");

        return NextResponse.json({
            status: true,
            result: {
                title: result.name,
                type: result.type,
                artist: result.artists,
                duration_ms: result.type === "album" ? result.tracks[0].duration_ms : result.duration_ms,
                image: result.image,
                // Construct URL download final
                download_url: `https://api.fabdl.com${downloadResult.download_url}`,
                status: downloadResult.status,
            }
        });

    } catch (error: any) {
        console.error("Download Error:", error.message);
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
