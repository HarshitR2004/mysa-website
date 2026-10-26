type Card = { identity: string; text: string; html: string };
export async function initCollections() {
  const key =
    location.pathname === '/blogs'
      ? 'blogs'
      : location.pathname === '/customers'
        ? 'customers'
        : null;
  const wrapper = key
    ? document.querySelector<HTMLElement>(
        key === 'blogs' ? '.blogs-collection-list-wrapper' : '.listing-stories_wrapper',
      )
    : null;
  const list = wrapper?.querySelector<HTMLElement>(':scope > .w-dyn-items');
  if (key && wrapper && list) {
    const response = await fetch(`/content/${key}.json`);
    if (!response.ok) return;
    const data = (await response.json()) as { cards: Card[]; pageSize: number };
    let page = 0,
      category = '';
    const next = wrapper.querySelector<HTMLAnchorElement>('.w-pagination-next');
    const previous = document.createElement('a');
    previous.href = '#';
    previous.className =
      'w-pagination-previous ' + (key === 'blogs' ? 'blog-next-button' : 'load-more-button');
    previous.textContent = 'Previous';
    previous.hidden = true;
    next?.before(previous);
    const render = () => {
      const filtered = data.cards.filter(
        (c) => !category || c.text.toLowerCase().includes(category),
      );
      const selected = filtered.slice(page * data.pageSize, (page + 1) * data.pageSize);
      list.innerHTML = selected.map((c) => c.html).join('');
      if (next) next.hidden = (page + 1) * data.pageSize >= filtered.length;
      previous.hidden = page === 0;
      wrapper
        .querySelector('.w-page-count')
        ?.replaceChildren(
          document.createTextNode(
            `${page + 1} / ${Math.max(1, Math.ceil(filtered.length / data.pageSize))}`,
          ),
        );
    };
    next?.addEventListener('click', (e) => {
      e.preventDefault();
      if (key === 'customers') {
        list.insertAdjacentHTML(
          'beforeend',
          data.cards
            .slice((page + 1) * data.pageSize, (page + 2) * data.pageSize)
            .map((c) => c.html)
            .join(''),
        );
        page++;
        next.hidden = (page + 1) * data.pageSize >= data.cards.length;
      } else {
        page++;
        render();
        wrapper.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
    previous.addEventListener('click', (e) => {
      e.preventDefault();
      page = Math.max(0, page - 1);
      render();
    });
    document
      .querySelectorAll<HTMLInputElement>(
        '[fs-cmsfilter-element^="filters"] input[type=radio],[fs-cmsfilter-element^="filters"] input[type=checkbox]',
      )
      .forEach((input) =>
        input.addEventListener('change', () => {
          const label = input.closest('label');
          category = label?.hasAttribute('fs-cmsfilter-element')
            ? ''
            : (label?.textContent || input.value).trim().toLowerCase();
          if (category === 'all' || category === 'all articles' || category === 'all stories')
            category = '';
          page = 0;
          render();
        }),
      );
  }
  // Glossary filters operate on all frozen terms, without the original Finsweet runtime.
  if (location.pathname === '/glossary') {
    const search = document.querySelector<HTMLInputElement>('input[fs-cmsfilter-field="name"]');
    let category = '';
    const lists = [...document.querySelectorAll<HTMLElement>('[fs-cmsfilter-element="list"]')];
    const filter = () => {
      const term = search?.value.toLowerCase().trim() || '';
      lists.forEach((list) =>
        list.querySelectorAll<HTMLElement>(':scope > .w-dyn-item').forEach((item) => {
          const name =
            item.querySelector('[fs-cmsfilter-field="name"]')?.textContent?.toLowerCase().trim() ||
            item.textContent?.toLowerCase().trim() ||
            '';
          const letter =
            item
              .querySelector('.tr-category,[fs-cmsfilter-field="category"]')
              ?.textContent?.toLowerCase()
              .trim() || name.charAt(0);
          item.hidden = !(name.includes(term) && (!category || letter === category));
        }),
      );
    };
    search?.addEventListener('input', filter);
    document.querySelectorAll<HTMLInputElement>('.formblock input[type=radio]').forEach((input) =>
      input.addEventListener('change', () => {
        const label = input.closest('label');
        category =
          label?.getAttribute('fs-cmsfilter-element') === 'reset'
            ? ''
            : (label?.textContent || '').trim().toLowerCase();
        document
          .querySelectorAll('.gloss-radio-button')
          .forEach((e) => e.classList.toggle('active', e === label));
        filter();
      }),
    );
  }
}
