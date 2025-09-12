// minimal stub so CI/preview deploys cleanly
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((_req) =>
  new Response(JSON.stringify({ ok: true, reason: "stub" }), {
    headers: { "content-type": "application/json" },
  })
);