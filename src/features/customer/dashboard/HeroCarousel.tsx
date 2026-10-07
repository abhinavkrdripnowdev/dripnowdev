import React, { useEffect, useState } from 'react';

export interface HeroSlide {
  kicker: string;
  title: React.ReactNode;
  text: string;
  cta: string;
  onCta: () => void;
  images: string[];
  theme: 'crimson' | 'midnight' | 'forest';
  pill: [string, string];
}

export const HeroCarousel: React.FC<{ slides: HeroSlide[]; onSecondary: () => void; secondaryLabel: string }> = ({ slides, onSecondary, secondaryLabel }) => {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [paused, slides.length]);
  const active = Math.min(i, slides.length - 1);

  return (
    <section className="sl-hero" aria-roledescription="carousel" aria-label="Featured" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="sl-hero__stack">
        {slides.map((s, idx) => (
          <div key={idx} className={`sl-marquee sl-hero__frame sl-hero__frame--${s.theme} ${idx === active ? 'is-active' : ''}`} aria-hidden={idx !== active} role="group" aria-label={`${idx + 1} of ${slides.length}`}>
            <div className="sl-hero__content">
              <span className="sl-hero__badge">{s.kicker}</span>
              <h1>{s.title}</h1>
              <p>{s.text}</p>
              <div className="sl-hero__actions">
                <button className="sl-btn sl-btn--gold" tabIndex={idx === active ? 0 : -1} onClick={s.onCta}>{s.cta} <span>→</span></button>
                <button className="sl-btn sl-btn--ghost" tabIndex={idx === active ? 0 : -1} onClick={onSecondary}>{secondaryLabel}</button>
              </div>
            </div>
            <div className="sl-hero__visual" aria-hidden="true">
              {s.images.map((src, k) => <img key={src + k} src={src} alt="" className={`sl-hero__img sl-hero__img--${k}`} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />)}
              {s.images.length === 0 && <span className="sl-hero__word">DRIP</span>}
              <div className="sl-hero__pill"><b>{s.pill[0]}</b><small>{s.pill[1]}</small></div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="sl-hero__dots" role="tablist" aria-label="Choose slide">
          {slides.map((_, idx) => <button key={idx} role="tab" aria-selected={idx === active} aria-label={`Slide ${idx + 1}`} className={idx === active ? 'is-active' : ''} onClick={() => setI(idx)} />)}
        </div>
      )}
    </section>
  );
};
