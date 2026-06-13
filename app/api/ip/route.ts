import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Step 1: Get the IP
    const ipRes = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    const { ip } = await ipRes.json();

    // Step 2: Try multiple geolocation APIs in order
    const apis = [
      {
        name: "ip-api.com",
        url: `http://ip-api.com/json/${ip}?fields=66846719`,
      },
      {
        name: "freeipapi.com",
        url: `https://freeipapi.com/api/json/${ip}`,
      },
      {
        name: "ipapi.is",
        url: `https://api.ipapi.is/?q=${ip}`,
      },
      {
        name: "geojs.io",
        url: `https://get.geojs.io/v1/ip/geo/${ip}.json`,
      },
    ];

    for (const api of apis) {
      try {
        const res = await fetch(api.url, {
          cache: "no-store",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          console.log(`❌ ${api.name} → ${res.status}`);
          continue;
        }

        const data = await res.json();
        console.log(`✅ ${api.name} worked`);

        return NextResponse.json({
          _source: api.name,
          ip,
          ...data,
        });
      } catch (err: any) {
        console.log(`❌ ${api.name} → ${err.message}`);
        continue;
      }
    }

    // All failed — return just IP
    return NextResponse.json({
      ip,
      error: "All geolocation APIs failed",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}