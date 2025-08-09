import { supabase } from '@/integrations/supabase/client'

export type ShareSize = 'og' | 'square' | 'story'
export type ShareType = 'win' | 'streak' | 'weekly' | 'podium' | 'insight'

export interface SharePayloadCommon {
  title: string
  subtitle?: string
  statBlocks?: { label: string; value: string }[]
  emojiOrIcon?: string
  userDisplayName?: string // first name only or 'Voyager'
  date?: string
  theme?: 'dark' | 'light'
}

export interface CreateShareCardInput {
  template: 'win_basic' | 'streak' | 'weekly_recap' | 'podium'
  size?: ShareSize
  data: SharePayloadCommon
}

export interface CreateShareResult {
  id: string
  imageUrl: string
  title: string
  description: string
  shareUrl: string
  deepLink: string
}

export async function createShareCard(input: CreateShareCardInput): Promise<CreateShareResult> {
  const { template, size = 'og', data } = input

  const { data: resp, error } = await supabase.functions.invoke('share-card', {
    method: 'POST',
    body: { template, size, data },
  })

  if (error || !resp) {
    throw new Error(error?.message || 'Failed to generate share card')
  }

  const id = resp.id as string
  const imageUrl = resp.imageUrl as string
  const title = resp.title as string
  const description = resp.description as string

  const shareUrl = `${window.location.origin}/s/${id}?utm_source=share&utm_medium=user&utm_campaign=${template}`
  const deepLink = `myvoyage://share/${id}`

  return { id, imageUrl, title, description, shareUrl, deepLink }
}

export function captionFor(type: ShareType, payload: any): string {
  switch (type) {
    case 'win':
      return `I just earned ${payload?.title ?? 'a badge'} on VOYAGE 💪 #voyageapp`
    case 'streak':
      return `Day ${payload?.streak ?? ''}! Keeping the momentum. #consistency`
    case 'weekly':
      return `My week on VOYAGE: ${payload?.kpi1 ?? ''}, ${payload?.kpi2 ?? ''}, ${payload?.kpi3 ?? ''}.`
    case 'podium':
      return `I made the podium! 🏆 Join me on VOYAGE.`
    case 'insight':
      return `Progress insight on VOYAGE: ${payload?.title ?? ''}`
    default:
      return 'Sharing my progress on VOYAGE'
  }
}

export async function shareWebOrDownload(opts: {
  title: string
  text: string
  url: string
  imageUrl: string
}) {
  const { title, text, url, imageUrl } = opts
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url })
      return 'web_share'
    }
  } catch (e) {
    // fallthrough to download
  }

  // Fallback: download image + copy link
  try {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = (title || 'voyage-share') + '.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
    await navigator.clipboard?.writeText(url)
    return 'download_image'
  } catch (e) {
    console.error('Share fallback error', e)
    return 'error'
  }
}
