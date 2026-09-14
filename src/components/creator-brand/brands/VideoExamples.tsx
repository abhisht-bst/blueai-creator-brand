'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Reveal from '../Reveal'
import { readVideoPlacement, type VideoPlacement } from './videoPlacement'

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger)

// The 9:16 example-video strip. Three REAL agent-made samples (21 Aug batch: calm / meal / reply,
// transcoded to 540x960 at public/videos/<slug>.mp4 + .jpg) hold the centre; the outer pair stay
// skeletons on purpose — more samples are coming, and the empty frames say so without a caption.
// The decision on the table is PLACEMENT, from three candidates rendered off this same strip:
//   A — its own section right after the hero        (<VideoExamples slot="a" /> in page.tsx)
//   B — its own section after How it works          (<VideoExamples slot="b" /> in page.tsx)
//   C — the strip replacing the hero artwork        (Hero.tsx branches on useVideoPlacement())
// The reviewer switches from BrandPreview's gear (bottom left). Default is 'off': the shipped page.

export function useVideoPlacement(): VideoPlacement {
  // Read after mount, never during render — the same hydration rule BrandSession follows. The
  // first paint is always the shipped page; a chosen placement pops in one frame later, which is
  // acceptable for a review tool and keeps SSR markup identical for every reviewer.
  const [placement, setPlacement] = useState<VideoPlacement>('off')
  useEffect(() => setPlacement(readVideoPlacement()), [])
  // RE-MEASURE EVERY SCROLLTRIGGER once the late-mounted strip has landed. StepCards pins itself
  // against offsets measured at load, and this strip mounts AFTER that measurement — without the
  // refresh, placement A shifts everything below by the strip's height while the pin still fires
  // at its stale scroll positions, which parked the pinned "No PR team" title on top of the strip.
  // rAF so the refresh runs after the browser has actually laid the new section out; placement 'off'
  // changes nothing, so nothing to re-measure.
  useEffect(() => {
    if (placement === 'off') return
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [placement])
  return placement
}

// Center-weighted fan: middle card largest and straight, neighbours tilt away and step down in
// size, outermost pair dimmed — the same playful language as the hero's edge cards, so the strip
// reads as native to this page rather than a bolted-on gallery. Real durations for the real clips
// (13.2s / 11.6s / 13.0s per ffprobe); captions quote each video's own opening line.
type Clip =
  | { kind: 'skel'; rot: number; w: number }
  | { kind: 'video'; rot: number; w: number; dur: string; slug: string; caption: string }

const CLIPS: Clip[] = [
  { kind: 'skel', rot: -4, w: 150 },
  { kind: 'video', rot: -2, w: 170, dur: '0:13', slug: 'calm', caption: 'ChatGPT talked me down at 2am' },
  { kind: 'video', rot: 0, w: 200, dur: '0:12', slug: 'meal', caption: 'A week of real meals for $30' },
  { kind: 'video', rot: 2, w: 170, dur: '0:13', slug: 'reply', caption: 'The perfect reply, in my tone' },
  { kind: 'skel', rot: 4, w: 150 },
]

const FRAME = 'relative aspect-[9/16] overflow-hidden rounded-chat border border-divider bg-white shadow-hairline'
const PLAY_BADGE = 'absolute inset-0 m-auto flex h-11 w-11 items-center justify-center rounded-circle border border-divider bg-white/90 text-ink-muted'
const DUR_CHIP = 'absolute bottom-2.5 right-2.5 rounded-pill border border-divider bg-white/85 px-2 py-0.5 text-[11px] font-medium text-ink-muted'

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="ml-0.5" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

// An empty frame awaiting a clip: shimmer fill, inert play badge, caption placeholder bars.
function SkeletonCard({ c }: { c: Extract<Clip, { kind: 'skel' }> }) {
  return (
    <div className="shrink-0 snap-center opacity-70" style={{ width: c.w, transform: `rotate(${c.rot}deg)` }}>
      <div className={FRAME}>
        <div className="cb-skel absolute inset-0" aria-hidden="true" />
        <span className={PLAY_BADGE}>
          <PlayGlyph />
        </span>
      </div>
      <div className="mt-3 flex flex-col items-center gap-1.5" aria-hidden="true">
        <span className="h-2 w-[70%] rounded-pill bg-[#E9EBF1]" />
        <span className="h-2 w-[45%] rounded-pill bg-[#E9EBF1]" />
      </div>
    </div>
  )
}

// A real sample: poster at rest, click toggles play/pause. MUTED BY DEFAULT (asked for,
// 2026-09-14) — the strip sits mid-page and a click that suddenly talks is a jump scare; the
// speaker chip at the card's bottom-left unmutes when the audio is wanted. No native controls,
// same as the marketing site's VideoCard; the overlay play badge and duration chip hide while
// playing so the clip is the only thing on screen. onStart lets the strip pause whichever
// sibling was playing.
//
// The speaker chip is a SIBLING of the play/pause <button>, absolutely positioned over the same
// frame from the relative wrapper — nesting it inside would be a button inside a button, which
// is invalid markup and makes one click do both things.
function VideoClipCard({ c, onStart }: { c: Extract<Clip, { kind: 'video' }>; onStart: (el: HTMLVideoElement) => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  function toggle() {
    const el = ref.current
    if (!el) return
    if (el.paused) {
      onStart(el)
      el.play()?.catch(() => {})
    } else {
      el.pause()
    }
  }

  function toggleMute() {
    const el = ref.current
    if (!el) return
    // The element property is the source of truth (React's `muted` prop is initial-render only);
    // state just redraws the icon.
    el.muted = !el.muted
    setMuted(el.muted)
  }

  return (
    <div className="shrink-0 snap-center" style={{ width: c.w, transform: `rotate(${c.rot}deg)` }}>
      <div className="relative">
        <button type="button" onClick={toggle} className={`${FRAME} block w-full cursor-pointer`} aria-label={playing ? `Pause sample: ${c.caption}` : `Play sample: ${c.caption}`}>
          <video
            ref={ref}
            src={`/videos/${c.slug}.mp4`}
            poster={`/videos/${c.slug}.jpg`}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          {!playing && (
            <>
              <span className={PLAY_BADGE}>
                <PlayGlyph />
              </span>
              <span className={DUR_CHIP}>{c.dur}</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-2.5 left-2.5 flex h-7 w-7 items-center justify-center rounded-circle border border-divider bg-white/85 text-ink-muted transition-colors hover:text-ink-heading"
          aria-label={muted ? `Unmute sample: ${c.caption}` : `Mute sample: ${c.caption}`}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9.4v5.2h3.2L14 19V5L7.2 9.4z" />
            {muted ? <path d="M17 9.5 21.5 14M21.5 9.5 17 14" /> : <path d="M17.4 9a4.2 4.2 0 0 1 0 6" />}
          </svg>
        </button>
      </div>
      <p className="mt-3 px-1 text-center text-[12.5px] leading-snug text-ink-muted">{c.caption}</p>
    </div>
  )
}

export function VideoStrip() {
  // One clip audible at a time: starting a card pauses whichever one was playing.
  const current = useRef<HTMLVideoElement | null>(null)
  function handleStart(el: HTMLVideoElement) {
    if (current.current && current.current !== el) current.current.pause()
    current.current = el
  }
  // One row everywhere: centred fan on sm+, horizontal scroll with snap below it. The vertical
  // padding is load-bearing on mobile — overflow-x-auto clips the tilted corners without it.
  return (
    <div className="flex snap-x items-start justify-start gap-4 overflow-x-auto px-6 pb-5 pt-3 sm:justify-center sm:overflow-visible sm:pb-0 sm:pt-0">
      {CLIPS.map((c, i) => (c.kind === 'video' ? <VideoClipCard key={c.slug} c={c} onStart={handleStart} /> : <SkeletonCard key={`skel-${i}`} c={c} />))}
    </div>
  )
}

// The full section used by placements A and B — same heading pattern as the page's other
// sections (plain first line, gradient-italic second). The "Tap a sample" hint is A-only
// (dropped from B on request, 2026-09-14): right after the hero the strip is the reader's first
// interactive object and earns an instruction; below the four how-it-works steps the reader has
// already been clicking, and the play badges say it on their own.
export function VideoExamplesSection({ showTapHint = false }: { showTapHint?: boolean }) {
  return (
    <section id="video-examples" className="px-6 py-24">
      <div className="mx-auto max-w-content">
        <Reveal className="text-center">
          <h2 className="mx-auto max-w-[26ch] font-head text-3xl font-bold text-ink-display sm:text-4xl">
            Made by agents.
            <span className="block text-gradient italic pr-[0.2em]">The work speaks for itself.</span>
          </h2>
          <p className="bai-body-lg mx-auto mt-4 max-w-[52ch] text-ink-body-2">
            Short-form video created end to end by creator agents.{showTapHint && ' Tap a sample to play it.'}
          </p>
        </Reveal>
        <Reveal delay={0.12} className="mt-14">
          <VideoStrip />
        </Reveal>
      </div>
    </section>
  )
}

// Placement gate for the two section slots. Both are always mounted in page.tsx; whichever one
// matches the stored placement renders, the other returns null — so page.tsx stays a plain
// server component and the slot markers document where each option lives.
export default function VideoExamples({ slot }: { slot: 'a' | 'b' }) {
  const placement = useVideoPlacement()
  if (placement !== slot) return null
  return <VideoExamplesSection showTapHint={slot === 'a'} />
}
