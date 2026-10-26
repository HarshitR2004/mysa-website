export function initMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const word = document.querySelector<HTMLElement>('[data-hero-dynamic-word]');
  if (word) {
    const words = ['Accounts Payable', 'Multi-Banking', 'Procurement', 'Expense Management'];
    let i = 0;
    word.innerHTML = '<span>Accounts Payable</span>';
    setInterval(() => {
      if (reduced.matches || document.hidden) return;
      i = (i + 1) % words.length;
      const span = document.createElement('span');
      span.textContent = words[i];
      word.replaceChildren(span);
    }, 2400);
  }
  const start = performance.now();
  const counters = [...document.querySelectorAll<HTMLElement>('[data-start][data-end]')];
  if (counters.length)
    setInterval(() => {
      if (reduced.matches || document.hidden) return;
      const progress = Math.min((performance.now() - start) / 240000, 1);
      counters.forEach((el) => {
        const value =
          Number(el.dataset.start) + (Number(el.dataset.end) - Number(el.dataset.start)) * progress;
        el.textContent =
          el.dataset.type === 'decimal'
            ? value.toFixed(1)
            : Math.floor(value).toLocaleString('en-US');
      });
    }, 800);
  document.querySelectorAll<HTMLElement>('.cs-content-container').forEach((root) => {
    const slides = [...root.querySelectorAll<HTMLElement>(':scope > [data-story-slide]')];
    if (slides.length < 2) return;
    let i = 0,
      paused = false;
    root.addEventListener('pointerenter', () => (paused = true));
    root.addEventListener('pointerleave', () => (paused = false));
    root.addEventListener('focusin', () => (paused = true));
    root.addEventListener('focusout', () => (paused = false));
    setInterval(() => {
      if (paused || reduced.matches || document.hidden || root.getBoundingClientRect().bottom < 0)
        return;
      slides[i].style.display = 'none';
      slides[i].classList.remove('cs-content-is-visible');
      i = (i + 1) % slides.length;
      slides[i].style.display = 'block';
      slides[i].classList.add('cs-content-is-visible');
    }, 3000);
  });
  document
    .querySelectorAll<HTMLElement>('#cs-logo-stage-left,#cs-logo-stage-right')
    .forEach((stage) => {
      const groups = [...stage.querySelectorAll<HTMLElement>(':scope > .cs-logo-group')];
      let index = 0,
        paused = false;
      if (groups.length < 2) return;
      groups.forEach((group, i) => {
        group.style.display = i === 0 ? '' : 'none';
        group.classList.toggle('cs-logo-is-visible', i === 0);
      });
      stage.addEventListener('pointerenter', () => (paused = true));
      stage.addEventListener('pointerleave', () => (paused = false));
      setInterval(() => {
        if (paused || document.hidden || reduced.matches) return;
        groups[index].style.display = 'none';
        groups[index].classList.remove('cs-logo-is-visible');
        index = (index + 1) % groups.length;
        groups[index].style.display = '';
        groups[index].classList.add('cs-logo-is-visible');
      }, 3000);
    });
  // Decorative animations run only when they are actually visible.
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) =>
        (e.target as HTMLElement).classList.toggle('study-motion-paused', !e.isIntersecting),
      ),
    { rootMargin: '100px' },
  );
  document
    .querySelectorAll('.logo-carousel,.logo-marquee_list-wrap,.mysa-marquee-track')
    .forEach((el) => observer.observe(el));
  if (!reduced.matches && document.querySelector('[data-dot-artwork]'))
    void import('./artwork').then(({ initArtwork }) => initArtwork());
}
