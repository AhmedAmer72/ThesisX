"use client";

import { useEffect, useRef } from "react";

export function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      video.pause();
      video.removeAttribute("autoplay");
      return;
    }

    video.play().catch(() => {
      /* autoplay blocked — first user gesture will start playback */
    });
  }, []);

  return (
    <div className="hero-video-wallpaper" aria-hidden>
      <video
        ref={videoRef}
        className="hero-video-bg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/images/hero-wallpaper.png"
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div className="hero-video-scrim" />
      <div className="hero-video-vignette" />
    </div>
  );
}
