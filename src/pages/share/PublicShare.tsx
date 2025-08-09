import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { getAppStoreRedirectUrl } from '@/utils/shareUtils'

interface ShareRow {
  id: string
  image_url: string
  title: string | null
  description: string | null
}

const setMeta = (property: string, content: string) => {
  if (!content) return
  let el = document.querySelector(`meta[property='${property}']`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export default function PublicShare() {
  const { shareId } = useParams()
  const [row, setRow] = useState<ShareRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShare = async () => {
      if (!shareId) return
      const { data, error } = await supabase
        .from('share_cards')
        .select('id, image_url, title, description')
        .eq('id', shareId)
        .eq('is_public', true)
        .maybeSingle()
      if (!error) setRow(data)
      setLoading(false)
    }
    fetchShare()
  }, [shareId])

  useEffect(() => {
    if (!row || !shareId) return
    const title = row.title || 'Shared on VOYAGE'
    const description = row.description || 'Check out my progress on VOYAGE!'
    const url = `${window.location.origin}/s/${shareId}`
    document.title = title
    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:image', row.image_url)
    setMeta('twitter:card', 'summary_large_image')
    // Canonical
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', url)
  }, [row, shareId])

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (!row) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-6">
        <h1 className="text-2xl font-bold">Share not found</h1>
        <p className="text-muted-foreground">This share may be expired or private.</p>
        <Button onClick={() => (window.location.href = '/')}>Go Home</Button>
      </div>
    )
  }

  const deepLink = `myvoyage://share/${row.id}`
  const storeUrl = getAppStoreRedirectUrl()

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Shared on VOYAGE</h1>
        <p className="text-muted-foreground">Open this in the VOYAGE app to see more.</p>
      </header>
      <article>
        <img src={row.image_url} alt={row.title || 'VOYAGE share image'} className="w-full rounded-xl border" loading="eager" />
      </article>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => (window.location.href = deepLink)}>Open in VOYAGE</Button>
        <Button variant="outline" onClick={() => (window.location.href = storeUrl)}>Get the App</Button>
      </div>
    </main>
  )
}
