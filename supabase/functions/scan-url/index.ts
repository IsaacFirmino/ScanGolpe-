// supabase/functions/scan-url/index.ts
//
// Edge Function que verifica URLs no Google Safe Browsing.
// Endpoint: POST https://ujdybixqxkbylbjcjjfk.supabase.co/functions/v1/scan-url
// Body:    { "urls": ["http://...", "https://..."] }
// Retorna: { "results": [{ url, safe, threatType, platformType, source, error? }] }
//
// Notas:
// - A chave do GSB vem de process.env.GOOGLE_SAFE_BROWSING_API_KEY (secret do projeto).
// - Timeout curto para nao atrasar o scanner quando o GSB estiver lento.
// - Erros nao sao propagados ao usuario final — devolvemos "safe: null, error: ...".

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type ThreatType =
  | "MALWARE"
  | "SOCIAL_ENGINEERING"
  | "UNWANTED_SOFTWARE"
  | "POTENTIALLY_HARMFUL_APPLICATION";

type PlatformType = "ANY_PLATFORM" | "WINDOWS" | "LINUX" | "OSX" | "ANDROID" | "IOS" | "ALL_PLATFORMS";

interface ThreatMatch {
  threatType: ThreatType;
  platformType: PlatformType;
  threat: { url: string };
}

interface ScanResult {
  url: string;
  safe: boolean | null;
  threatType: ThreatType | null;
  platformType: PlatformType | null;
  source: "google-safe-browsing";
  error?: string;
}

const TIMEOUT_MS = 3500;
const MAX_URLS_PER_REQUEST = 5;
const MAX_URL_LENGTH = 2048;
const MAX_BODY_BYTES = 16 * 1024;
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, apikey",
  "access-control-max-age": "86400",
};

function isPrivateOrLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1" || normalized.endsWith(".local")) return true;

  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return true;
  const [first, second] = octets;
  return first === 0
    || first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

function normalizePublicHttpUrl(value: string): string | null {
  if (value.length === 0 || value.length > MAX_URL_LENGTH) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password || isPrivateOrLocalHostname(parsed.hostname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

async function checkSingleUrl(
  apiKey: string,
  url: string,
  signal: AbortSignal,
): Promise<ScanResult> {
  const body = {
    client: { clientId: "scangolpe", clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };

  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      },
    );

    if (!res.ok) {
      return {
        url,
        safe: null,
        threatType: null,
        platformType: null,
        source: "google-safe-browsing",
        error: `GSB ${res.status}`,
      };
    }

    const data: { matches?: ThreatMatch[] } = await res.json();
    const match = data.matches?.[0];

    if (!match) {
      return {
        url,
        safe: true,
        threatType: null,
        platformType: null,
        source: "google-safe-browsing",
      };
    }

    return {
      url,
      safe: false,
      threatType: match.threatType,
      platformType: match.platformType,
      source: "google-safe-browsing",
    };
  } catch (err) {
    return {
      url,
      safe: null,
      threatType: null,
      platformType: null,
      source: "google-safe-browsing",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(
      JSON.stringify({ error: "Request body is too large" }),
      { status: 413, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }

  const apiKey = Deno.env.get("GOOGLE_SAFE_BROWSING_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_SAFE_BROWSING_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }

  let payload: { urls?: unknown };
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }

  const inputUrls = Array.isArray(payload.urls) ? payload.urls.filter((u): u is string => typeof u === "string") : [];
  const urls = [...new Set(inputUrls
    .map(normalizePublicHttpUrl)
    .filter((url): url is string => Boolean(url)))]
    .slice(0, MAX_URLS_PER_REQUEST);

  if (urls.length === 0) {
    return new Response(
      JSON.stringify({ error: "Provide at least one public HTTP or HTTPS URL" }),
      { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const results = await Promise.all(
      urls.map((url) => checkSingleUrl(apiKey, url, controller.signal)),
    );

    return new Response(
      JSON.stringify({ results }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          ...corsHeaders,
          "cache-control": "no-store",
        },
      },
    );
  } finally {
    clearTimeout(timeout);
  }
});
