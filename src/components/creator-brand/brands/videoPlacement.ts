// REVIEW-ONLY placement switch for the 9:16 example-video strip (Sep 11 call: the video quality
// is the convincer, so the page shows the work itself; placement is being decided from three
// candidates). Storage + reload, the same mechanism BrandPreview already uses for agency state,
// so one gear drives both. 'off' is the page as it ships today, and the honest fallback when
// storage is unavailable.
export type VideoPlacement = 'off' | 'a' | 'b' | 'c'

export const K_VIDEO_PLACEMENT = 'cb-video-placement'

export function readVideoPlacement(): VideoPlacement {
  try {
    const v = localStorage.getItem(K_VIDEO_PLACEMENT)
    if (v === 'a' || v === 'b' || v === 'c') return v
  } catch {
    // Storage unavailable: fall through to 'off'.
  }
  return 'off'
}

export function writeVideoPlacement(next: VideoPlacement) {
  try {
    if (next === 'off') localStorage.removeItem(K_VIDEO_PLACEMENT)
    else localStorage.setItem(K_VIDEO_PLACEMENT, next)
  } catch {
    // Nothing useful to do; the caller's reload lands on the unchanged state.
  }
}
