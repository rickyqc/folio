// Wires the builder form to its live preview and YAML output. Lists are re-rendered only when
// rows are added, removed or moved, so typing never loses focus.
import { readableTextOn } from '../../../src/lib/color.ts';
import {
  embedType,
  emptyState,
  fromConfig,
  hasContent,
  isEmoji,
  toYaml,
  validate,
  withScheme,
  type BuilderState,
  type Issue,
  type Item,
  type Platform,
} from './model';
import { parseYamlLite } from './yaml-lite';

type Icon = { kind: 'fill' | 'stroke'; path: string } | { kind: 'emoji'; char: string };
type PlatformWithIcon = Platform & { icon: Icon };

const STORAGE_KEY = 'folio-builder-v1';

const TEMPLATES: Record<Item['kind'], string> = {
  link: 'tpl-link',
  header: 'tpl-header',
  embed: 'tpl-embed',
  image: 'tpl-image',
};

function load(): BuilderState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...emptyState(), ...(JSON.parse(saved) as Partial<BuilderState>) };
  } catch {
    // Private mode or blocked storage: start fresh.
  }
  return emptyState();
}

function save(state: BuilderState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Not saving a draft is fine.
  }
}

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

function svg(icon: Icon): string {
  if (icon.kind === 'emoji') return `<span>${escape(icon.char)}</span>`;
  const paint =
    icon.kind === 'fill'
      ? 'fill="currentColor"'
      : 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg viewBox="0 0 24 24" ${paint}><path d="${icon.path}"/></svg>`;
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '🙂'
  );
}

export function mountBuilder(root: HTMLElement): void {
  const platforms = JSON.parse(
    document.getElementById('builder-platforms')?.textContent ?? '[]',
  ) as PlatformWithIcon[];
  const form = root.querySelector('form') as HTMLFormElement;
  const preview = root.querySelector('[data-preview]') as HTMLElement;
  const yamlOut = root.querySelector('[data-yaml]') as HTMLElement;
  const status = root.querySelector('[data-status]') as HTMLElement;
  const socialList = root.querySelector('[data-list="socials"]') as HTMLElement;
  const itemList = root.querySelector('[data-list="items"]') as HTMLElement;
  const template = (id: string) =>
    (document.getElementById(id) as HTMLTemplateElement).content.firstElementChild as HTMLElement;

  const importSheet = root.querySelector('[data-import-sheet]') as HTMLDialogElement;
  const importText = root.querySelector('[data-import-text]') as HTMLTextAreaElement;
  const importError = root.querySelector('[data-import-error]') as HTMLElement;

  let state = load();
  // Errors show for fields someone has left, or everywhere after they try to copy.
  const touched = new Set<string>();
  let attempted = false;

  // Simple fields
  const text = (name: keyof BuilderState) =>
    form.elements.namedItem(name as string) as HTMLInputElement;
  const radio = (name: string, value: string) => {
    const input = [...form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)].find(
      (r) => r.value === value,
    );
    if (input) input.checked = true;
    return !!input;
  };

  /** A photo from a loaded config gets its own choice, so it isn't lost. */
  function photoOption(avatar: string): void {
    root.querySelector('[data-photo-option]')?.remove();
    if (!avatar || isEmoji(avatar)) return;
    const option = template('tpl-photo').cloneNode(true) as HTMLElement;
    const input = option.querySelector('input') as HTMLInputElement;
    input.value = avatar;
    input.setAttribute('aria-label', `Your photo (${avatar})`);
    option.title = `Your photo (${avatar})`;
    root.querySelector('.avatar-option')?.after(option);
  }

  function fillForm(): void {
    for (const key of ['name', 'bio', 'location'] as const) text(key).value = state[key];
    photoOption(state.avatar);
    radio('avatar', state.avatar);
    radio('mode', state.mode);
    radio('buttons', state.buttons);
    for (const r of form.querySelectorAll<HTMLInputElement>('input[name="accent"]'))
      r.checked = false;
    if (!radio('accent', state.accent))
      text('accentCustom' as keyof BuilderState).value = state.accent;
    text('vcard').checked = state.vcard;
    text('share').checked = state.share;
  }
  fillForm();

  function renderSocials(): void {
    socialList.replaceChildren(
      ...state.socials.map((s, i) => {
        const row = template('tpl-social').cloneNode(true) as HTMLElement;
        row.dataset['index'] = String(i);
        row.dataset['field'] = `social-${i}`;
        const select = row.querySelector('select') as HTMLSelectElement;
        select.innerHTML = platforms
          .map((p) => `<option value="${p.id}">${escape(p.label)}</option>`)
          .join('');
        select.value = s.platform;
        const input = row.querySelector('input') as HTMLInputElement;
        input.value = s.value;
        placeholderFor(input, s.platform);
        return row;
      }),
    );
  }

  function placeholderFor(input: HTMLInputElement, platformId: string): void {
    const p = platforms.find((x) => x.id === platformId);
    input.placeholder = p
      ? p.needsUrl
        ? p.example
        : `Username, e.g. ${p.example.replace(/"/g, '')}`
      : '';
    input.inputMode = platformId === 'email' ? 'email' : p?.needsUrl ? 'url' : 'text';
  }

  function renderItems(): void {
    itemList.replaceChildren(
      ...state.items.map((item, i) => {
        const row = template(TEMPLATES[item.kind]).cloneNode(true) as HTMLElement;
        row.dataset['index'] = String(i);
        for (const el of row.querySelectorAll<HTMLElement>('[data-text]')) {
          el.textContent = String((item as Record<string, string>)[el.dataset['text'] ?? ''] ?? '');
        }
        for (const input of row.querySelectorAll<HTMLInputElement>('input[data-key]')) {
          const key = input.dataset['key'] as keyof Item;
          input.value = String((item as Record<string, string>)[key] ?? '');
          input.dataset['field'] = `item-${i}-${key}`;
        }
        const star = row.querySelector<HTMLButtonElement>('[data-action="feature"]');
        star?.setAttribute('aria-pressed', String(state.featured === i));
        (row.querySelector('[data-action="up"]') as HTMLButtonElement).disabled = i === 0;
        (row.querySelector('[data-action="down"]') as HTMLButtonElement).disabled =
          i === state.items.length - 1;
        return row;
      }),
    );
  }

  const initialsChip = root.querySelector<HTMLElement>('[data-initials]');

  function renderPreview(): void {
    if (initialsChip) initialsChip.textContent = state.name.trim() ? initials(state.name) : 'Aa';
    const accent = state.accent;
    preview.dataset['mode'] = state.mode;
    preview.dataset['buttons'] = state.buttons;
    preview.style.setProperty('--p-accent', accent);
    preview.style.setProperty('--p-on-accent', readableTextOn(accent));

    const name = state.name.trim();
    const socials = state.socials
      .filter((s) => s.value.trim())
      .map((s) => platforms.find((p) => p.id === s.platform))
      .filter((p): p is PlatformWithIcon => !!p)
      .map((p) => svg(p.icon))
      .join('');

    const filled = state.items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => hasContent(item));
    const blocks = filled.length
      ? filled
          .map(({ item, i }) => {
            if (item.kind === 'header') return `<p class="bp-header">${escape(item.title)}</p>`;
            if (item.kind === 'image') {
              return `<div class="bp-media">🖼️ ${escape(item.caption || item.alt)}</div>`;
            }
            if (item.kind === 'embed') {
              const kind = embedType(item.url);
              const label =
                kind === 'spotify' ? '♫ Spotify' : kind === 'youtube' ? '▶ YouTube' : '▶';
              const title = item.title.trim() ? ` · ${escape(item.title)}` : '';
              return `<div class="bp-media">${label}${title}</div>`;
            }
            const iconValue = item.icon.trim();
            const platform = platforms.find((p) => p.id === iconValue);
            const icon = platform
              ? `<span class="bp-icon">${svg(platform.icon)}</span>`
              : isEmoji(iconValue)
                ? `<span class="bp-icon">${escape(iconValue)}</span>`
                : '';
            const sub = item.subtitle.trim() ? `<small>${escape(item.subtitle)}</small>` : '';
            const featured = state.featured === i ? ' is-featured' : '';
            return `<div class="bp-link${featured}">${icon}${escape(item.title)}${sub}</div>`;
          })
          .join('')
      : `<div class="bp-link is-featured bp-placeholder">Your first link</div><div class="bp-link bp-placeholder">Another link</div>`;

    const foot = [state.vcard && 'Save contact', state.share && 'Share']
      .filter(Boolean)
      .map((label) => `<span class="bp-pill">${label}</span>`)
      .join('');

    preview.innerHTML = `
      <div class="bp-avatar${state.avatar ? ' is-emoji' : ''}">${escape(avatarText(state))}</div>
      <p class="bp-name${name ? '' : ' bp-placeholder'}">${escape(name || 'Your name')}</p>
      ${state.bio.trim() ? `<p class="bp-bio">${escape(state.bio)}</p>` : name ? '' : '<p class="bp-bio bp-placeholder">One line about you</p>'}
      ${state.location.trim() ? `<p class="bp-loc">${escape(state.location)}</p>` : ''}
      ${socials ? `<div class="bp-socials">${socials}</div>` : ''}
      <div class="bp-blocks">${blocks}</div>
      ${foot ? `<div class="bp-foot">${foot}</div>` : ''}
      <p class="bp-credit">Made with Folio</p>`;
  }

  function renderOutput(): Issue[] {
    const issues = validate(state, platforms);
    for (const el of root.querySelectorAll('.invalid')) el.classList.remove('invalid');
    for (const el of root.querySelectorAll<HTMLElement>('.error')) el.textContent = '';
    for (const issue of issues) {
      if (!attempted && !touched.has(issue.field)) continue;
      const target = root.querySelector<HTMLElement>(`[data-field="${issue.field}"]`);
      if (!target) continue;
      target.classList.add('invalid');
      const holder = target.matches('input') ? target.closest('.item, .field') : target;
      const error = holder?.querySelector<HTMLElement>('.error');
      if (error && !error.textContent) error.textContent = issue.message;
    }
    if (attempted && issues.length) {
      status.textContent =
        issues.length === 1
          ? 'Fix the highlighted field to get your config.'
          : `Fix the ${issues.length} highlighted fields to get your config.`;
    } else if (attempted) {
      status.textContent = '';
    }
    yamlOut.textContent = toYaml(state);
    return issues;
  }

  /** Before copying or downloading: shows every problem and jumps to the first. */
  function ready(): boolean {
    attempted = true;
    const issues = renderOutput();
    const first = issues[0];
    if (!first) return true;
    const target = root.querySelector<HTMLElement>(`[data-field="${first.field}"]`);
    (target?.matches('input') ? target : target?.querySelector('input'))?.focus();
    return false;
  }

  function update(): void {
    renderPreview();
    renderOutput();
    save(state);
  }

  function renderAll(): void {
    renderSocials();
    renderItems();
    update();
  }

  form.addEventListener('input', (event) => {
    const el = event.target as HTMLInputElement | HTMLSelectElement;
    const row = el.closest<HTMLElement>('[data-index]');
    if (row && socialList.contains(row)) {
      const social = state.socials[Number(row.dataset['index'])];
      if (!social) return;
      if (el.dataset['key'] === 'platform') {
        social.platform = el.value;
        placeholderFor(row.querySelector('input') as HTMLInputElement, el.value);
      } else social.value = el.value;
    } else if (row && itemList.contains(row)) {
      const item = state.items[Number(row.dataset['index'])] as Record<string, string> | undefined;
      if (item && el.dataset['key']) item[el.dataset['key']] = el.value;
    } else if (el.name === 'accent') {
      state.accent = el.value;
    } else if (el.name === 'accentCustom') {
      state.accent = el.value;
      for (const r of form.querySelectorAll<HTMLInputElement>('input[name="accent"]'))
        r.checked = false;
    } else if (el.name === 'mode') state.mode = el.value as BuilderState['mode'];
    else if (el.name === 'buttons') state.buttons = el.value as BuilderState['buttons'];
    else if (el.name === 'vcard' || el.name === 'share')
      state[el.name] = (el as HTMLInputElement).checked;
    else if (el.name in state) (state as unknown as Record<string, string>)[el.name] = el.value;
    update();
  });

  // Mark fields as touched when someone leaves them, and add https:// to links.
  form.addEventListener('focusout', (event) => {
    const el = event.target as HTMLInputElement;
    const field = el.closest<HTMLElement>('[data-field]')?.dataset['field'];
    if (field && !touched.has(field)) {
      touched.add(field);
      renderOutput();
    }
    if (el.dataset['key'] !== 'url') return;
    const index = Number(el.closest<HTMLElement>('[data-index]')?.dataset['index']);
    const item = state.items[index];
    if (item?.kind !== 'link' && item?.kind !== 'embed') return;
    const fixed = withScheme(item.url);
    if (fixed !== item.url) {
      item.url = el.value = fixed;
      update();
    }
  });

  root.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!button) return;
    const action = button.dataset['action'];
    const index = Number(button.closest<HTMLElement>('[data-index]')?.dataset['index']);
    const inSocials = socialList.contains(button);

    if (action === 'add-social') {
      const used = new Set(state.socials.map((s) => s.platform));
      const next = ['instagram', 'tiktok', 'youtube', 'x', 'email', 'linkedin', 'github'].find(
        (p) => !used.has(p),
      );
      state.socials.push({ platform: next ?? 'website', value: '' });
      renderSocials();
      (socialList.lastElementChild?.querySelector('input') as HTMLInputElement | null)?.focus();
    } else if (action === 'add-link' || action === 'add-header' || action === 'add-embed') {
      state.items.push(
        action === 'add-link'
          ? { kind: 'link', title: '', url: '', subtitle: '', icon: '' }
          : action === 'add-embed'
            ? { kind: 'embed', url: '', title: '' }
            : { kind: 'header', title: '' },
      );
      renderItems();
      (itemList.lastElementChild?.querySelector('input') as HTMLInputElement | null)?.focus();
    } else if (action === 'remove') {
      if (inSocials) {
        state.socials.splice(index, 1);
        renderSocials();
      } else {
        state.items.splice(index, 1);
        if (state.featured === index) state.featured = null;
        else if (state.featured !== null && state.featured > index) state.featured--;
        renderItems();
      }
    } else if (action === 'up' || action === 'down') {
      const to = action === 'up' ? index - 1 : index + 1;
      const [moved] = state.items.splice(index, 1);
      if (!moved) return;
      state.items.splice(to, 0, moved);
      if (state.featured === index) state.featured = to;
      else if (state.featured === to) state.featured = index;
      renderItems();
      (
        itemList.children[to]?.querySelector(
          `[data-action="${action}"]`,
        ) as HTMLButtonElement | null
      )?.focus();
    } else if (action === 'feature') {
      state.featured = state.featured === index ? null : index;
      renderItems();
    } else if (action === 'reset') {
      if (!confirm('Clear everything and start over?')) return;
      state = emptyState();
      touched.clear();
      attempted = false;
      status.textContent = '';
      fillForm();
      renderAll();
      return;
    } else if (action === 'open-import') {
      importError.textContent = '';
      importSheet.showModal();
      return;
    } else if (action === 'import') {
      try {
        const loaded = fromConfig(parseYamlLite(importText.value), platforms);
        state = loaded.state;
        touched.clear();
        attempted = false;
        fillForm();
        renderAll();
        importSheet.close();
        importText.value = '';
        status.textContent = loaded.skipped.length
          ? `Loaded your config. Left out, since the builder can’t write them: ${loaded.skipped.join(', ')}.`
          : 'Loaded your config. Change anything, then copy it back.';
        text('name').focus();
      } catch (error) {
        importError.textContent =
          error instanceof Error ? error.message : 'That file couldn’t be read.';
      }
      return;
    } else if (action === 'copy') {
      if (!ready()) return;
      try {
        await navigator.clipboard.writeText(toYaml(state));
        status.textContent = 'Copied. Now paste it into folio.config.yaml in your repo.';
      } catch {
        (root.querySelector('details.file') as HTMLDetailsElement).open = true;
        status.textContent = 'Copying was blocked. Select the file below and copy it instead.';
      }
      return;
    } else if (action === 'download') {
      if (!ready()) return;
      const url = URL.createObjectURL(new Blob([toYaml(state)], { type: 'text/yaml' }));
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: 'folio.config.yaml',
      });
      a.click();
      URL.revokeObjectURL(url);
      status.textContent =
        'Downloaded folio.config.yaml. Upload it to your repo to replace the old one.';
      return;
    } else {
      return;
    }
    update();
  });

  renderAll();
  mountPreviewSheet(root, () => avatarText(state));
}

/** What the avatar circle shows: the emoji, a camera for a photo, or initials. */
function avatarText(state: BuilderState): string {
  const avatar = state.avatar.trim();
  if (!avatar) return initials(state.name);
  return isEmoji(avatar) ? avatar : '📷';
}

/**
 * On phones the preview is below a long form. While the form is on screen (and the preview
 * isn't), a floating button opens the same preview in a bottom sheet.
 */
function mountPreviewSheet(root: HTMLElement, avatar: () => string): void {
  const fab = document.querySelector<HTMLButtonElement>('[data-preview-fab]');
  const sheet = document.querySelector<HTMLDialogElement>('[data-preview-sheet]');
  const body = sheet?.querySelector<HTMLElement>('[data-sheet-body]');
  const phone = root.querySelector<HTMLElement>('.preview-phone');
  const form = root.querySelector('form');
  const output = root.querySelector('.output');
  const fabAvatar = document.querySelector<HTMLElement>('[data-fab-avatar]');
  if (!fab || !sheet || !body || !phone || !form || !output || !('IntersectionObserver' in window))
    return;

  const home = phone.parentElement as HTMLElement;
  const after = phone.nextSibling;
  fab.hidden = false;

  let formVisible = false;
  let outputVisible = false;
  // Hidden while typing: on phones the keyboard would push it over the field being edited.
  let typing = false;
  const sync = () => {
    fab.classList.toggle('is-shown', formVisible && !outputVisible && !typing && !sheet.open);
    fab.tabIndex = fab.classList.contains('is-shown') ? 0 : -1;
  };
  new IntersectionObserver(([entry]) => {
    formVisible = !!entry?.isIntersecting;
    sync();
  }).observe(form);
  new IntersectionObserver(([entry]) => {
    outputVisible = !!entry?.isIntersecting;
    sync();
  }).observe(output);

  fab.addEventListener('click', () => {
    body.append(phone);
    sheet.showModal();
    sync();
  });
  sheet.addEventListener('close', () => {
    home.insertBefore(phone, after);
    sync();
  });
  // Tapping the dimmed backdrop closes the sheet too.
  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) sheet.close();
  });
  form.addEventListener('input', () => {
    if (fabAvatar) fabAvatar.textContent = avatar();
  });
  const isTextField = (el: EventTarget | null) =>
    el instanceof HTMLInputElement && !['radio', 'checkbox', 'color'].includes(el.type);
  form.addEventListener('focusin', (event) => {
    typing = isTextField(event.target);
    sync();
  });
  form.addEventListener('focusout', () => {
    typing = false;
    sync();
  });
  if (fabAvatar) fabAvatar.textContent = avatar();
}
