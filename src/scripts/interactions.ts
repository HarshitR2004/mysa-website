const focusable = 'a[href],button,input:not([type=hidden]),select,textarea,[tabindex="0"]';
export function initInteractions() {
  let previousFocus: HTMLElement | null = null;
  const modal = document.querySelector<HTMLElement>('.prototype-modal');
  function closeModal() {
    if (modal) {
      modal.hidden = true;
      document.body.style.overflow = '';
      previousFocus?.focus();
    }
  }
  function openModal(trigger: HTMLElement) {
    if (!modal) {
      location.href = '/book-a-demo';
      return;
    }
    previousFocus = trigger;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector<HTMLElement>('input:not([type=hidden]),button,[tabindex="0"]')?.focus();
  }
  document
    .querySelectorAll<HTMLElement>('.bad-button,.get-started-btn-outline,[href="#instant-demo"]')
    .forEach((trigger) =>
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(trigger);
      }),
    );
  modal?.querySelectorAll<HTMLElement>('.close-div').forEach((close) => {
    close.addEventListener('click', closeModal);
    close.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        closeModal();
      }
    });
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (!modal || modal.hidden) return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key === 'Tab') {
      const list = [...modal.querySelectorAll<HTMLElement>(focusable)].filter(
        (x) => x.getClientRects().length > 0,
      );
      const first = list[0],
        last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
  if (location.hash === '#instant-demo' && modal) openModal(document.body);
  const email = document.querySelector<HTMLInputElement>('#hero-work-email');
  const heroCTA = document.querySelector<HTMLAnchorElement>('.hero-v5-demo-btn');
  if (email && heroCTA) {
    const go = (e: Event) => {
      e.preventDefault();
      email.required = true;
      if (!email.reportValidity()) return;
      openModal(heroCTA);
      const destination = modal?.querySelector<HTMLInputElement>('input[type=email]');
      if (destination) destination.value = email.value;
    };
    heroCTA.addEventListener('click', go);
    email.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go(e);
    });
  }
  document.querySelectorAll<HTMLFormElement>('form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (
        form.matches('[fs-cmsfilter-element],.formblock,.listing_stories-filter') ||
        form.closest('[fs-cmsfilter-element^="filters"]')
      )
        return;
      if (!form.reportValidity()) return;
      let status = form.querySelector<HTMLElement>('.prototype-status');
      if (!status) {
        status = document.createElement('p');
        status.className = 'prototype-status';
        status.setAttribute('role', 'status');
        status.tabIndex = -1;
        form.append(status);
      }
      status.textContent =
        'Prototype only — your details have not been sent or saved, and no meeting has been booked.';
      status.focus();
    });
  });
  // Forms are local demonstrations; intercept all original Webflow submit affordances.
  document
    .querySelectorAll<HTMLAnchorElement>('.feature-cta-button[href="#"]')
    .forEach((a) => (a.href = '/erpnext-integration'));
  document
    .querySelectorAll<HTMLElement>('.faqv2_question,.faqv2_question-2')
    .forEach((question, i) => {
      const answer = question.parentElement?.querySelector<HTMLElement>('.faqv2_answer');
      if (!answer) return;
      answer.id ||= `faq-answer-${i}`;
      answer.hidden = true;
      question.tabIndex = 0;
      question.setAttribute('role', 'button');
      question.setAttribute('aria-controls', answer.id);
      question.setAttribute('aria-expanded', 'false');
      const toggle = () => {
        const open = answer.hidden;
        answer.hidden = !open;
        answer.style.height = open ? 'auto' : '0px';
        question.setAttribute('aria-expanded', String(open));
        question
          .querySelector<HTMLElement>('[class*=icon-wrapper]')
          ?.style.setProperty('transform', open ? 'rotate(180deg)' : 'rotate(0deg)');
      };
      question.addEventListener('click', toggle);
      question.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  document.querySelectorAll<HTMLElement>('.w-tabs').forEach((tabs, index) => {
    const links = [...tabs.querySelectorAll<HTMLElement>('.w-tab-link')];
    const panels = [...tabs.querySelectorAll<HTMLElement>('.w-tab-pane')];
    tabs.querySelector('.w-tab-menu')?.setAttribute('role', 'tablist');
    const select = (link: HTMLElement) => {
      links.forEach((t) => {
        const active = t === link;
        t.classList.toggle('w--current', active);
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
      });
      panels.forEach((p) =>
        p.classList.toggle('w--tab-active', p.dataset.wTab === link.dataset.wTab),
      );
    };
    links.forEach((link, i) => {
      link.id ||= `tab-${index}-${i}`;
      link.setAttribute('role', 'tab');
      const panel = panels.find((p) => p.dataset.wTab === link.dataset.wTab);
      if (panel) {
        panel.id ||= `tab-panel-${index}-${i}`;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', link.id);
        link.setAttribute('aria-controls', panel.id);
      }
      link.addEventListener('click', (e) => {
        e.preventDefault();
        select(link);
      });
      link.addEventListener('keydown', (e) => {
        if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          const next =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? links.length - 1
                : (i + (e.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length;
          select(links[next]);
          links[next].focus();
        }
      });
    });
    if (links.length) select(links.find((l) => l.classList.contains('w--current')) || links[0]);
  });
  document
    .querySelectorAll<HTMLElement>('.w-slider,.testimonial-swiper,.swiper')
    .forEach((root) => {
      const track = root.querySelector<HTMLElement>(
        '.w-slider-mask,.swiper-wrapper,.capabilities-track-1',
      );
      if (!track) return;
      const slides = [...track.children] as HTMLElement[];
      if (!slides.length) return;
      let current = 0;
      const width = () =>
        slides[0].getBoundingClientRect().width +
        parseFloat(getComputedStyle(track).columnGap || '0');
      const move = (index: number) => {
        current = (index + slides.length) % slides.length;
        if (track.classList.contains('w-slider-mask'))
          track.scrollTo({ left: current * width(), behavior: 'smooth' });
        else {
          track.style.transition = 'transform .45s ease';
          track.style.transform = `translateX(-${current * width()}px)`;
        }
        root
          .querySelectorAll('.w-slider-dot,.swiper-pagination-bullet')
          .forEach((d, i) => d.classList.toggle('w-active', i === current));
      };
      root
        .querySelectorAll<HTMLElement>(
          '.w-slider-arrow-right,.swiper-button-next,.capabilities-next',
        )
        .forEach((n) => n.addEventListener('click', () => move(current + 1)));
      root
        .querySelectorAll<HTMLElement>(
          '.w-slider-arrow-left,.swiper-button-prev,.capabilities-prev',
        )
        .forEach((n) => n.addEventListener('click', () => move(current - 1)));
      if (track.classList.contains('w-slider-mask')) {
        track.style.display = 'flex';
        track.style.overflowX = 'auto';
        slides.forEach((s) => {
          s.style.flex = '0 0 auto';
          s.style.position = 'relative';
        });
      }
      root
        .querySelectorAll<HTMLElement>('.w-slider-dot,.swiper-pagination-bullet')
        .forEach((d, i) => {
          d.tabIndex = 0;
          d.setAttribute('role', 'button');
          d.setAttribute('aria-label', `Show slide ${i + 1}`);
          d.addEventListener('click', () => move(i));
          d.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') move(i);
          });
        });
    });
  // Native horizontal interaction for capability cards, including trackpad/touch input.
  document.querySelectorAll<HTMLElement>('.capabilities-carousel-wrap').forEach((wrap) => {
    const track = wrap.querySelector<HTMLElement>('.capabilities-track-1');
    if (!track) return;
    const originals = [...track.children] as HTMLElement[];
    if (!originals.length) return;
    originals.forEach((card) => {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('inert', '');
      track.append(clone);
    });
    let index = 0,
      visible = false,
      paused = false;
    const move = (direction: number) => {
      index += direction;
      const step = originals[0].offsetWidth + (parseFloat(getComputedStyle(track).gap) || 0);
      if (index < 0) index = originals.length - 1;
      track.style.transition = 'transform 600ms ease';
      track.style.transform = `translateX(-${index * step}px)`;
    };
    track.addEventListener('transitionend', () => {
      if (index >= originals.length) {
        index = 0;
        track.style.transition = 'none';
        track.style.transform = 'translateX(0)';
      }
    });
    wrap.querySelectorAll<HTMLElement>('.capabilities-nav-btn').forEach((button) => {
      const direction = button.classList.contains('left') ? -1 : 1;
      button.style.display = 'flex';
      button.tabIndex = 0;
      button.setAttribute('role', 'button');
      button.setAttribute('aria-label', direction < 0 ? 'Previous cards' : 'Next cards');
      button.addEventListener('click', () => move(direction));
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          move(direction);
        }
      });
    });
    wrap.addEventListener('pointerenter', () => (paused = true));
    wrap.addEventListener('pointerleave', () => (paused = false));
    wrap.addEventListener('focusin', () => (paused = true));
    wrap.addEventListener('focusout', () => (paused = false));
    let startX: number | null = null;
    wrap.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
    });
    wrap.addEventListener('pointerup', (e) => {
      if (startX !== null && Math.abs(e.clientX - startX) > 40) move(e.clientX < startX ? 1 : -1);
      startX = null;
    });
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
      },
      { threshold: 0.3 },
    ).observe(wrap);
    setInterval(() => {
      if (
        visible &&
        !paused &&
        !document.hidden &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        move(1);
    }, 3000);
  });
  function showVideo(url: string) {
    const id = url.match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/)?.[1];
    if (!id) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'prototype-video-dialog';
    dialog.setAttribute('aria-label', 'Mysa video');
    const close = document.createElement('button');
    close.className = 'prototype-video-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close video');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
    iframe.title = 'Mysa video';
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;
    dialog.append(close, iframe);
    document.body.append(dialog);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => dialog.remove());
    dialog.showModal();
  }
  document
    .querySelectorAll<HTMLAnchorElement>(
      '.video-watch-btn,a[href*="youtu.be"],a[href*="youtube.com/watch"]',
    )
    .forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        showVideo(
          a.classList.contains('video-watch-btn') ? 'https://youtu.be/dua5mwTd0f0' : a.href,
        );
      }),
    );
  // CMS category links stay real links; collection search/filter inputs filter local cards.
  document.querySelectorAll<HTMLInputElement>('input[type=search]').forEach((input) =>
    input.addEventListener('input', () => {
      const term = input.value.toLowerCase();
      document
        .querySelectorAll<HTMLElement>('.w-dyn-item')
        .forEach((item) => (item.hidden = !item.textContent?.toLowerCase().includes(term)));
    }),
  );
}
