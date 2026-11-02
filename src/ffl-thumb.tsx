import { useEffect, useState } from "react"
import { renderFeatureThumb, type ThumbPart } from "./ffl/runtime"

export function FeatureThumb({ part, index }: { part: ThumbPart; index: number }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancel = false
    setFailed(false)
    setUrl(null)
    void renderFeatureThumb(part, index).then(
      (next) => {
        if (!cancel) setUrl(next)
      },
      () => {
        if (!cancel) setFailed(true)
      },
    )
    return () => {
      cancel = true
    }
  }, [part, index])
  if (failed) return <span className="thumb-pending">Preview unavailable</span>
  if (!url) return <span className="thumb-pending">{index + 1}</span>
  return <img src={url} alt="" draggable={false} />
}
