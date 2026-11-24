// Forwards ESPN fantasy league reads so the static site can get around ESPN's CORS policy.
// ESPN cookies arrive per request in X-ESPN-S2 / X-ESPN-SWID headers and are never stored here.

const ESPN_BASE = "https://lm-api-reads.fantasy.espn.com";
const LEAGUE_PATH = /^\/apps\/fantasy\/v3\/games\/fba\/seasons\/\d{4}\/segments\/0\/leagues\/(\d+)$/;

const list = (s) => (s ?? "").split(",").map((v) => v.trim()).filter(Boolean);

function corsHeaders(origin, env) {
    const allowed = list(env.ALLOWED_ORIGINS);
    return {
        "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] ?? "",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "X-ESPN-S2, X-ESPN-SWID",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
    };
}

function error(status, message, cors) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
    });
}

export default {
    async fetch(req, env) {
        const cors = corsHeaders(req.headers.get("Origin"), env);
        if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
        if (req.method !== "GET") return error(405, "Method not allowed", cors);

        const url = new URL(req.url);
        const match = url.pathname.match(LEAGUE_PATH);
        if (!match) return error(404, "Not found", cors);
        if (!list(env.ALLOWED_LEAGUE_IDS).includes(match[1]))
            return error(403, "League not allowed by this proxy", cors);

        const s2 = req.headers.get("X-ESPN-S2");
        const swid = req.headers.get("X-ESPN-SWID");
        if (!s2 || !swid) return error(400, "Missing ESPN credentials", cors);
        // Cookie values can't contain separators; reject anything that could smuggle extra cookies
        if (/[;\s]/.test(s2) || /[;\s]/.test(swid)) return error(400, "Malformed ESPN credentials", cors);

        const res = await fetch(ESPN_BASE + url.pathname + url.search, {
            headers: {
                Cookie: `espn_s2=${s2}; SWID=${swid}`,
                Accept: "application/json",
            },
        });

        return new Response(res.body, {
            status: res.status,
            headers: {
                ...cors,
                "Content-Type": res.headers.get("Content-Type") ?? "application/json",
                "Cache-Control": "no-store",
            },
        });
    },
};
