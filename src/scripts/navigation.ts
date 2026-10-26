export function initNavigation() {
  const first = document.querySelector('section');
  if (first && !document.getElementById('main-content')) first.id = 'main-content';
  const toggles = document.querySelectorAll<HTMLElement>('.w-dropdown-toggle');
  function closeOthers(except?: Element) {
    toggles.forEach((t) => {
      if (t !== except) {
        t.setAttribute('aria-expanded', 'false');
        t.classList.remove('w--open');
        t.parentElement?.querySelector('.w-dropdown-list')?.classList.remove('w--open');
      }
    });
  }
  toggles.forEach((toggle, i) => {
    const parent = toggle.closest<HTMLElement>('.w-dropdown');
    const panel = parent?.querySelector<HTMLElement>('.w-dropdown-list');
    if (!parent || !panel) return;
    panel.id ||= `dropdown-panel-${i}`;
    toggle.setAttribute('aria-controls', panel.id);
    const set = (open: boolean) => {
      if (open) closeOthers(toggle);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.classList.toggle('w--open', open);
      panel.classList.toggle('w--open', open);
    };
    toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        set(toggle.getAttribute('aria-expanded') !== 'true');
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        set(true);
        panel.querySelector<HTMLElement>('a,button')?.focus();
      }
      if (e.key === 'Escape') set(false);
    });
    parent.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && matchMedia('(min-width:992px)').matches) set(true);
    });
    parent.addEventListener('pointerleave', () => {
      if (!parent.contains(document.activeElement) && matchMedia('(min-width:992px)').matches)
        set(false);
    });
    parent.addEventListener('focusout', (e) => {
      if (!parent.contains(e.relatedTarget as Node)) set(false);
    });
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('.w-dropdown')) closeOthers();
  });
  document.querySelectorAll<HTMLElement>('.w-nav-button').forEach((button) => {
    const nav = button.closest('.w-nav')?.querySelector<HTMLElement>('.w-nav-menu');
    if (!nav) return;
    button.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      const open = !nav.classList.contains('study-nav-open');
      nav.classList.toggle('study-nav-open', open);
      button.classList.toggle('w--open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };
    button.addEventListener('click', toggle);
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOthers();
      document
        .querySelectorAll<HTMLElement>('.study-nav-open')
        .forEach((n) => n.classList.remove('study-nav-open'));
      document
        .querySelectorAll('.w-nav-button')
        .forEach((n) => n.setAttribute('aria-expanded', 'false'));
    }
  });
  const banner = document.querySelector<HTMLElement>('[data-el="top-banner"]');
  const nav = document.querySelector<HTMLElement>('.navbar_component');
  if (banner && nav) {
    let scrolled: boolean | undefined;
    const update = () => {
      const next = scrollY > 10;
      if (next === scrolled) return;
      scrolled = next;
      banner.style.opacity = next ? '0' : '1';
      banner.style.pointerEvents = next ? 'none' : 'auto';
      nav.style.transform = next ? 'translateY(0)' : `translateY(${banner.offsetHeight}px)`;
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', () => {
      scrolled = undefined;
      update();
    });
  }
}
