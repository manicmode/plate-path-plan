import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "")
  .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);

const db = createClient(SUPABASE_URL, SERVICE_ROLE);

async function isAdmin(req: Request) {
  const jwt = req.headers.get("Authorization")?.replace("Bearer ","");
  if (!jwt) return false;
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data?.user?.email) return false;
  return ADMIN_EMAILS.includes(data.user.email.toLowerCase());
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!(await isAdmin(req))) {
    return new Response(JSON.stringify({ error: "forbidden" }), { 
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const url = new URL(req.url);
  
  if (req.method === "GET" && url.pathname === "/") {
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const { data, error } = await db.from("habit_search_synonyms")
      .select("id,term,synonym,weight").order("term").range(offset, offset+limit-1);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ ok: true, data }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (req.method === "POST" && url.pathname === "/upsert") {
    const body = await req.json();
    if (!body?.term || !body?.synonym) {
      return new Response(JSON.stringify({ error: "term & synonym required" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { error } = await db.from("habit_search_synonyms").upsert({
      id: body.id ?? undefined, 
      term: body.term, 
      synonym: body.synonym, 
      weight: body.weight ?? 0.3
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (req.method === "POST" && url.pathname === "/delete") {
    const body = await req.json();
    if (!body?.id) {
      return new Response(JSON.stringify({ error: "id required" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { error } = await db.from("habit_search_synonyms").delete().eq("id", body.id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: "not found" }), { 
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});