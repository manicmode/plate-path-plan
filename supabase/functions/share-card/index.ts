// Supabase Edge Function: share-card
// Generates shareable PNG images from simple SVG templates and stores them in Storage
// CORS enabled, requires authenticated user (verify_jwt = true in config)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Resvg, initWasm } from 'https://esm.sh/@resvg/resvg-wasm@2.4.1'
import wasm from 'https://esm.sh/@resvg/resvg-wasm@2.4.1/index_bg.wasm?url'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

await initWasm(fetch(wasm).then((r) => r.arrayBuffer()))

function getSupabaseClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  return createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
}

// Helpers
const sizes = {
  og: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const

function clamp(text: string, max = 120): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

async function sha256(str: string) {
  const data = new TextEncoder().encode(str)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function brandGradient(id: string) {
  // Simple brand gradient (adjust to your design tokens if needed)
  return `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(260, 90%, 55%)" />
        <stop offset="100%" stop-color="hsl(290, 90%, 55%)" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
  `
}

type Stat = { label: string; value: string }

function buildSVG(
  template: string,
  sizeKey: keyof typeof sizes,
  data: {
    title?: string
    subtitle?: string
    statBlocks?: Stat[]
    emojiOrIcon?: string
    userDisplayName?: string
    date?: string
    theme?: 'dark' | 'light'
  }
) {
  const { width, height } = sizes[sizeKey]
  const gradId = 'g1'
  const title = clamp(data.title ?? '')
  const subtitle = clamp(data.subtitle ?? '', 140)
  const emoji = data.emojiOrIcon ?? '💪'
  const user = data.userDisplayName ?? 'Voyager'
  const date = data.date ?? ''
  const stats = data.statBlocks ?? []
  const dark = (data.theme ?? 'dark') === 'dark'

  const bg = dark ? '#0b0b12' : '#f8f8fb'
  const text = dark ? '#FFFFFF' : '#111217'
  const subText = dark ? '#cfd2ff' : '#3b3e5a'

  // Layout constants
  const pad = 64
  const footerH = 120
  const contentW = width - pad * 2

  // Stats layout
  const statGap = 20
  const statH = 96
  const statYStart = 520
  let statItems = ''
  stats.slice(0, 4).forEach((s, i) => {
    const y = statYStart + i * (statH + statGap)
    statItems += `
      <g transform="translate(${pad}, ${y})" filter="url(#shadow)">
        <rect rx="16" width="${contentW}" height="${statH}" fill="rgba(255,255,255,${dark ? 0.06 : 0.8})" />
        <text x="24" y="58" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="28" fill="${subText}" >${clamp(
          s.label,
          36
        )}</text>
        <text x="${contentW - 24}" y="58" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="36" fill="${text}" text-anchor="end" font-weight="700">${clamp(
          s.value,
          36
        )}</text>
      </g>`
  })

  // Template variations (simple switch for MVP)
  const headerSubtitle = subtitle ? `<text x="${pad}" y="${pad + 160}" font-size="36" fill="${subText}" font-family="Inter, system-ui" >${subtitle}</text>` : ''

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    ${brandGradient(gradId)}
    <rect width="100%" height="100%" fill="${bg}"/>

    <!-- Gradient frame -->
    <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="28" fill="none" stroke="url(#${gradId})" stroke-width="3"/>

    <!-- Header -->
    <g transform="translate(${pad}, ${pad})">
      <text x="0" y="64" font-size="56" font-weight="800" fill="${text}" font-family="Inter, system-ui">${emoji} ${title}</text>
      ${headerSubtitle}
    </g>

    <!-- Brand badge -->
    <g transform="translate(${width - pad - 240}, ${pad})" filter="url(#shadow)">
      <rect rx="999" width="240" height="64" fill="url(#${gradId})" />
      <text x="120" y="42" font-size="28" font-weight="700" fill="#fff" text-anchor="middle" font-family="Inter, system-ui">VOYAGE</text>
    </g>

    <!-- Stats -->
    ${statItems}

    <!-- Footer -->
    <g transform="translate(0, ${height - footerH})" >
      <rect width="${width}" height="${footerH}" fill="rgba(0,0,0,${dark ? 0.3 : 0.06})"/>
      <text x="${pad}" y="${height - 44}" font-size="28" fill="${subText}" font-family="Inter, system-ui">${clamp(
        user,
        32
      )}${date ? ' • ' + date : ''}</text>
      <text x="${width - pad}" y="${height - 44}" font-size="24" fill="${subText}" text-anchor="end" font-family="Inter, system-ui">voyage.app</text>
    </g>
  </svg>`

  return svg
}

function normalizeTemplate(template: string) {
  switch (template) {
    case 'win_basic':
    case 'streak':
    case 'weekly_recap':
    case 'podium':
      return template
    default:
      return 'win_basic'
  }
}

async function ensureRateLimit(supabase: any, userId: string) {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('share_cards')
    .select('id', { count: 'exact', head: false })
    .eq('owner_user_id', userId)
    .gte('created_at', oneMinuteAgo)
  if (error) throw error
  if ((count ?? 0) >= 10) {
    return false
  }
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = getSupabaseClient(req)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const userId: string = user.id

    // Read input (POST preferred, fallback to GET with URL params)
    let body: any = {}
    if (req.method === 'POST') {
      body = await req.json()
    } else if (req.method === 'GET') {
      const url = new URL(req.url)
      body.template = url.searchParams.get('template')
      body.size = url.searchParams.get('size')
      const dataParam = url.searchParams.get('data')
      if (dataParam) {
        try { body.data = JSON.parse(dataParam) } catch { body.data = {} }
      }
    } else {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
    }

    const template = normalizeTemplate(body.template || 'win_basic')
    const sizeKey: keyof typeof sizes = (body.size as any) in sizes ? body.size : 'og'
    const data = body.data || {}

    // Privacy flags handled by client via data.userDisplayName/hide flags; server never adds PII on its own.

    // Hash for caching
    const payloadForHash = JSON.stringify({ template, sizeKey, data })
    const hash = await sha256(payloadForHash)

    // Cache lookup (last 24h)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing, error: existErr } = await supabase
      .from('share_cards')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('hash', hash)
      .eq('size', sizeKey)
      .gte('created_at', dayAgo)
      .limit(1)
    if (!existErr && existing && existing.length > 0) {
      const row = existing[0]
      return new Response(
        JSON.stringify({ id: row.id, imageUrl: row.image_url, title: row.title, description: row.description }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limit
    const allowed = await ensureRateLimit(supabase, userId)
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    // Render SVG
    const svg = buildSVG(template, sizeKey, {
      title: data.title,
      subtitle: data.subtitle,
      statBlocks: data.statBlocks,
      emojiOrIcon: data.emojiOrIcon,
      userDisplayName: data.userDisplayName,
      date: data.date,
      theme: data.theme || 'dark',
    })

    // Rasterize to PNG
    const resvg = new Resvg(svg, { background: 'transparent' })
    const png = resvg.render().asPng()

    // Upload to Storage
    const id = crypto.randomUUID()
    const path = `${userId}/${id}.png`
    const { error: uploadErr } = await supabase.storage
      .from('shares')
      .upload(path, new Blob([png], { type: 'image/png' }), { upsert: true, cacheControl: 'public, max-age=86400, immutable' })
    if (uploadErr) throw uploadErr

    const { data: pub } = supabase.storage.from('shares').getPublicUrl(path, { download: false })
    const imageUrl = pub.publicUrl

    // Insert DB row
    const title = clamp(data.title || 'Shared on Voyage', 80)
    const description = clamp(data.subtitle || '', 140)

    const { data: inserted, error: insErr } = await supabase
      .from('share_cards')
      .insert({
        owner_user_id: userId,
        template,
        size: sizeKey,
        title,
        description,
        image_url: imageUrl,
        hash,
        is_public: true,
      })
      .select('id')
      .single()
    if (insErr) throw insErr

    return new Response(
      JSON.stringify({ id: inserted.id, imageUrl, title, description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (e) {
    console.error('share-card error', e)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
