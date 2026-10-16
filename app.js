document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const mobile = matchMedia('(max-width: 900px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const closeMenu = () => {
    links?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('nav-open');
  };
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-open', open);
  });
  links?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (nav && !nav.contains(event.target)) closeMenu(); });
  document.addEventListener('focusin', event => { if (nav && !nav.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); toggle.focus();
    }
  });
  mobile.addEventListener('change', closeMenu);
  const updateNav = () => nav?.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', updateNav, { passive: true });
  updateNav();
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      const hash = anchor.getAttribute('href');
      if (!hash || hash === '#') { event.preventDefault(); return; }
      let id;
      try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
      if (anchor.classList.contains('skip-link')) target.focus({ preventScroll: true });
      history.replaceState(null, '', hash);
    });
  });

  const grid = document.querySelector('.diamond-grid');
  if (grid) {
    const cards = Array.from(grid.querySelectorAll('.diamond-card')).map((element, index) => {
      const params = new URL(element.querySelector('.view-btn').href).searchParams;
      const specs = Object.fromEntries(Array.from(element.querySelectorAll('.card-specs > div')).map(row => [row.querySelector('dt').textContent.toLowerCase(), row.querySelector('dd').textContent.trim()]));
      return { element, index, price: Number(params.get('price')), carat: parseFloat(params.get('stone')),
        shape: element.querySelector('.card-eyebrow').textContent.trim().split(/\s/)[0].toLowerCase(), ...specs };
    });
    const filters = document.querySelector('.search-filters');
    const groups = Array.from(filters.querySelectorAll('.filter-group'));
    const groupName = group => group.querySelector('.filter-label').textContent.trim().toLowerCase().split(' ')[0];
    let shape = new URLSearchParams(location.search).get('shape')?.toLowerCase() || 'all';
    let page = 1;
    const perPage = 3;
    const sort = document.getElementById('diamond-sort');
    const pages = document.querySelectorAll('.page-btn');
    const empty = document.querySelector('.empty-results');
    const filterToggle = document.querySelector('.filter-toggle');
    filterToggle.addEventListener('click', () => {
      const open = filterToggle.getAttribute('aria-expanded') !== 'true';
      filterToggle.setAttribute('aria-expanded', String(open));
      filters.classList.toggle('filters-open', open);
    });
    groups.forEach(group => {
      const name = groupName(group);
      group.dataset.filter = name;
      group.querySelectorAll('.chip').forEach(chip => {
        chip.classList.add('active'); chip.setAttribute('aria-pressed', 'true');
        chip.addEventListener('click', () => {
          const active = chip.classList.toggle('active');
          chip.setAttribute('aria-pressed', String(active)); page = 1; render();
        });
      });
      const ranges = Array.from(group.querySelectorAll('input[type="range"]'));
      ranges.forEach((range, index) => {
        range.setAttribute('aria-label', `${name === 'price' ? 'Price in AUD' : 'Carat'} ${index ? 'maximum' : 'minimum'}`);
        range.addEventListener('input', () => {
          if (Number(ranges[0].value) > Number(ranges[1].value)) ranges[index ? 0 : 1].value = range.value;
          page = 1; render();
        });
      });
    });
    const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value);
    function render() {
      filters.querySelectorAll('.shape-btn').forEach(button => {
        const active = button.textContent.trim().toLowerCase() === shape;
        button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
      });
      // Update controls even when another filter leaves zero matching cards.
      groups.forEach(group => {
        const ranges = group.querySelectorAll('input[type="range"]');
        if (!ranges.length) return;
        const name = group.dataset.filter;
        group.querySelector('.range-min').textContent = name === 'price' ? money(Number(ranges[0].value)) : Number(ranges[0].value).toFixed(1);
        group.querySelector('.range-max').textContent = name === 'price' ? money(Number(ranges[1].value)) : Number(ranges[1].value).toFixed(1);
      });
      const matched = cards.filter(card => {
        if (shape !== 'all' && card.shape !== shape) return false;
        return groups.every(group => {
          const name = group.dataset.filter;
          const ranges = group.querySelectorAll('input[type="range"]');
          if (ranges.length) return card[name] >= Number(ranges[0].value) && card[name] <= Number(ranges[1].value);
          const chips = group.querySelectorAll('.chip');
          if (!chips.length) return true;
          return Array.from(chips).filter(chip => chip.classList.contains('active')).map(chip => chip.textContent.trim()).includes(card[name === 'certification' ? 'cert' : name]);
        });
      });
      const sorting = [() => 0, (a,b) => a.price-b.price, (a,b) => b.price-a.price, (a,b) => a.carat-b.carat, (a,b) => b.carat-a.carat][sort.selectedIndex];
      matched.sort((a,b) => sorting(a,b) || a.index-b.index);
      const totalPages = Math.max(1, Math.ceil(matched.length / perPage));
      page = Math.min(page, totalPages);
      cards.forEach(card => { card.element.hidden = true; });
      matched.slice((page-1)*perPage, page*perPage).forEach(card => { card.element.hidden = false; grid.appendChild(card.element); });
      document.querySelector('.count-num').textContent = String(matched.length);
      document.querySelector('.count-suffix').textContent = matched.length === 1 ? 'diamond' : 'diamonds';
      document.querySelector('.page-status').textContent = `Page ${page} of ${totalPages}`;
      pages[0].disabled = page === 1; pages[1].disabled = page === totalPages;
      empty.hidden = matched.length > 0;
      document.querySelector('.results-pagination').hidden = matched.length === 0;
    }
    function reset() {
      shape = 'all'; page = 1; sort.selectedIndex = 0;
      filters.querySelectorAll('.chip').forEach(chip => { chip.classList.add('active'); chip.setAttribute('aria-pressed', 'true'); });
      filters.querySelectorAll('input[type="range"]').forEach(input => { input.value = input.defaultValue; });
      history.replaceState(null, '', location.pathname); render();
    }
    filters.querySelectorAll('.shape-btn').forEach(button => button.addEventListener('click', () => {
      shape = button.textContent.trim().toLowerCase(); page = 1;
      const url = new URL(location.href);
      shape === 'all' ? url.searchParams.delete('shape') : url.searchParams.set('shape', shape);
      history.replaceState(null, '', url); render();
    }));
    filters.querySelector('.filter-clear').addEventListener('click', reset);
    document.getElementById('reset-filters').addEventListener('click', reset);
    sort.addEventListener('change', () => { page = 1; render(); });
    pages.forEach((button,index) => button.addEventListener('click', () => {
      page += index ? 1 : -1; render();
      document.querySelector('.results-header').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    }));
    addEventListener('popstate', () => { shape = new URLSearchParams(location.search).get('shape')?.toLowerCase() || 'all'; page = 1; render(); });
    render();
  }

  const designEnquiry = document.getElementById('design-enquiry');
  if (designEnquiry) {
    let shape = '', setting = '';
    function updateDesign() {
      const description = ['Custom Design Consultation', shape && `${shape} diamond`, setting && `${setting} setting`].filter(Boolean).join(' - ');
      designEnquiry.href = 'contact.html?item=' + encodeURIComponent(description) + '#enquiry-form';
      document.getElementById('design-selection').textContent = shape || setting ? [shape && `${shape} diamond`, setting && `${setting} setting`].filter(Boolean).join(' / ') : 'Personal design consultation';
    }
    document.querySelectorAll('.shape-wizard-btn').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('.shape-wizard-btn').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      shape = button.textContent.trim(); updateDesign();
    }));
    document.querySelectorAll('.setting-wizard-card').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('.setting-wizard-card').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      setting = button.querySelector('h4').textContent.trim(); updateDesign();
    }));
  }

  const form = document.getElementById('enquiry-form');
  if (form) {
    const params = new URLSearchParams(location.search);
    const stone = params.get('stone'), item = params.get('item'), price = params.get('price');
    const reference = stone ? `Stone ${stone}` : item;
    const context = document.getElementById('enquiry-context');
    if (reference) { context.textContent = reference + (price ? ` / A$${price}` : ''); context.hidden = false; }
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const get = id => document.getElementById(id)?.value.trim() || '';
      const contact = form.querySelector('input[name="contact"]:checked')?.value || 'Email';
      const subject = `Celestyn enquiry - ${reference || 'Private consultation'}${price ? ` A$${price}` : ''}`;
      const body = [reference ? `${reference}${price ? ` (listed A$${price})` : ''}` : 'Private consultation',
        `Name: ${get('cf-name')}`, `Email: ${get('cf-email')}`, `Phone: ${get('cf-phone') || '-'}`,
        `Budget: ${get('cf-budget') || 'To discuss'}`, `Preferred contact: ${contact}`, '', get('cf-message')].join('\n');
      location.href = `mailto:hello@celestynjewels.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
  const player = document.getElementById('music-player');
  if (player) {
    setTimeout(() => player.classList.add('visible'), 1500);
    player.querySelector('.player-close')?.addEventListener('click', () => {
      player.classList.remove('visible');
    });
  }
});
