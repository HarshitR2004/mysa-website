export function initMedia() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const videos = [...document.querySelectorAll<HTMLVideoElement>('video[data-managed-video]')];
  const visible = new Set<HTMLVideoElement>();
  const sync = (video: HTMLVideoElement) => {
    const shown =
      video.getBoundingClientRect().width > 0 && video.getBoundingClientRect().height > 0;
    if (!shown || !visible.has(video) || reduced.matches || document.hidden) {
      video.pause();
      return;
    }
    if (!video.dataset.loaded) {
      video.querySelectorAll<HTMLSourceElement>('source[data-src]').forEach((s) => {
        s.src = s.dataset.src || '';
      });
      video.dataset.loaded = 'true';
      video.muted = true;
      video.load();
    }
    void video.play().catch(() => {
      /* Poster remains available when autoplay is blocked. */
    });
  };
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) visible.add(video);
        else visible.delete(video);
        sync(video);
      }),
    { rootMargin: '100px', threshold: 0 },
  );
  videos.forEach((v) => observer.observe(v));
  addEventListener('resize', () => videos.forEach(sync));
  document.addEventListener('visibilitychange', () => videos.forEach(sync));
  reduced.addEventListener('change', () => videos.forEach(sync));
  document.querySelectorAll<HTMLElement>('.w-background-video--control').forEach((control) => {
    control.setAttribute('role', 'button');
    control.tabIndex = 0;
    control.setAttribute('aria-label', 'Pause or play background video');
    const toggle = () => {
      const video = control.parentElement?.querySelector('video');
      if (video) {
        if (video.paused) void video.play();
        else video.pause();
      }
    };
    control.addEventListener('click', toggle);
    control.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}
