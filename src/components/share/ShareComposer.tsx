import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createShareCard, captionFor, ShareType } from '@/utils/share'
import { useToast } from '@/hooks/use-toast'

interface ShareComposerProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  type: ShareType
  payload: any
  initialTemplate?: 'win_basic' | 'streak' | 'weekly_recap' | 'podium'
}

export const ShareComposer: React.FC<ShareComposerProps> = ({ open, onOpenChange, type, payload, initialTemplate = 'win_basic' }) => {
  const { toast } = useToast()
  const [imageUrl, setImageUrl] = useState<string>('')
  const [shareUrl, setShareUrl] = useState<string>('')
  const [caption, setCaption] = useState<string>('')
  const [hideName, setHideName] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState(false)

  const normalized = useMemo(() => {
    const firstName = hideName ? 'Voyager' : (payload?.userDisplayName || 'Voyager')
    return {
      title: payload?.title || 'Shared on VOYAGE',
      subtitle: payload?.subtitle || '',
      statBlocks: payload?.statBlocks || [],
      emojiOrIcon: payload?.emojiOrIcon || '💪',
      userDisplayName: firstName,
      date: payload?.date || new Date().toLocaleDateString(),
      theme: 'dark' as const,
    }
  }, [payload, hideName])

  useEffect(() => {
    setCaption(captionFor(type, payload))
  }, [type, payload])

  useEffect(() => {
    if (!open) return
    let mounted = true
    ;(async () => {
      try {
        setIsLoading(true)
        const res = await createShareCard({ template: initialTemplate, size: 'og', data: normalized })
        if (!mounted) return
        setImageUrl(res.imageUrl)
        setShareUrl(res.shareUrl)
      } catch (e: any) {
        toast({ title: 'Share failed', description: e?.message || 'Unable to generate card' })
      } finally {
        setIsLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [open, normalized, initialTemplate, toast])

  const onShare = async () => {
    try {
      if (!imageUrl) return
      if (navigator.share) {
        await navigator.share({ title: normalized.title, text: caption, url: shareUrl })
      } else {
        const a = document.createElement('a')
        a.href = imageUrl
        a.download = 'voyage-share.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        await navigator.clipboard?.writeText(shareUrl)
      }
      toast({ title: 'Shared', description: 'Your image is ready to share!' })
      onOpenChange(false)
    } catch (e) {
      toast({ title: 'Share canceled' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-lg overflow-hidden aspect-[1200/630] bg-background/50 border">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Generating…</div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="VOYAGE share preview" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">Preview</div>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Caption</label>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
              <div className="flex gap-2 text-sm text-muted-foreground">
                <button type="button" onClick={() => setCaption(captionFor(type, payload))} className="underline">Reset</button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input id="hideName" type="checkbox" checked={hideName} onChange={(e) => setHideName(e.target.checked)} />
              <label htmlFor="hideName" className="text-sm">Hide my name</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={onShare} disabled={!imageUrl || isLoading}>Share</Button>
              <Button variant="outline" onClick={() => navigator.clipboard?.writeText(shareUrl)} disabled={!shareUrl}>Copy link</Button>
              <Button variant="ghost" onClick={() => imageUrl && (window.open(imageUrl, '_blank'))} disabled={!imageUrl}>Open image</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
