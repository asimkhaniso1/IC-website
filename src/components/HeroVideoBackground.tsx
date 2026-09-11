import { useEffect, useRef, useState } from 'react';

// The homepage hero loop (docs/hero-video), reused as a decorative background for other dark headers.
// Same rules as HeroSlider in pages/Home.tsx: mobile/desktop files swap at 768 px, silent + looping,
// no video for reduced motion / Save-Data, and the header simply keeps its own background if
// autoplay is blocked.
const MOBILE_QUERY = '(max-width: 767px)';

const wantsVideo = () => {
  if (typeof window === 'undefined') return false;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return !reduceMotion && !saveData;
};

export default function HeroVideoBackground({ className = '' }: { className?: string }) {
  const [enabled] = useState(wantsVideo);
  const [failed, setFailed] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(MOBILE_QUERY).matches
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  // Swap files if the viewport crosses the breakpoint; the <video> is keyed on it and reloads.
  useEffect(() => {
    const mq = window.matchMedia?.(MOBILE_QUERY);
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // React doesn't reliably set the `muted` attribute iOS needs for autoplay.
  // NotAllowedError = autoplay blocked (e.g. iOS Low Power Mode) → drop the video.
  // AbortError = interrupted (e.g. hidden tab paused to save power) → retry when visible.
  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || failed || !video) return;
    let cancelled = false;
    video.muted = true;
    const tryPlay = () =>
      video.play().catch((err: DOMException) => {
        if (!cancelled && err.name === 'NotAllowedError') setFailed(true);
      });
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && video.paused) tryPlay();
    };
    tryPlay();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, failed, isMobile]);

  if (!enabled || failed) return null;

  return (
    <video
      key={isMobile ? 'mobile' : 'desktop'}
      ref={videoRef}
      className={className}
      poster={isMobile ? '/video/hero-poster-mobile.webp' : '/video/hero-poster.webp'}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      onError={() => setFailed(true)}
    >
      {isMobile ? (
        <source src="/video/hero-mobile.mp4" type="video/mp4" onError={() => setFailed(true)} />
      ) : (
        <>
          <source src="/video/hero-desktop.webm" type="video/webm" />
          <source src="/video/hero-desktop.mp4" type="video/mp4" onError={() => setFailed(true)} />
        </>
      )}
    </video>
  );
}
