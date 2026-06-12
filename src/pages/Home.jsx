import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestJson, formatCategoryTree } from '../lib/api.js';
import { t, LANGS } from '../lib/i18n.js';

function getCategoryIcon(category) {
  return category?.icon || 'fa-solid fa-folder';
}

const DEFAULT_FAVICON_API = 'https://icon.horse/icon/';
const EMPTY_QUICK_BOOKMARK = { title: '', url: '', description: '', favicon: '', categoryId: '', tags: '', sortOrder: 0, enabled: 1 };

function getBookmarkHostname(url) {
  try {
    return new URL(String(url || '').startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return String(url || '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  }
}

function getFaviconUrl(bookmark, faviconApi = DEFAULT_FAVICON_API) {
  if (bookmark.favicon) return bookmark.favicon;
  const hostname = getBookmarkHostname(bookmark.url);
  if (!hostname) return '';
  return `${faviconApi || DEFAULT_FAVICON_API}${hostname}`;
}

function getFriendLinkIconUrl(friendLink, faviconApi = DEFAULT_FAVICON_API) {
  if (friendLink.icon) return friendLink.icon;
  const hostname = getBookmarkHostname(friendLink.url);
  if (!hostname) return '';
  return `${faviconApi || DEFAULT_FAVICON_API}${hostname}`;
}

function prepareBookmark(bookmark) {
  const displayHost = getBookmarkHostname(bookmark.url);
  const displayTags = String(bookmark.tags || '')
    .split(',')
    .slice(0, 3)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    ...bookmark,
    _displayHost: displayHost,
    _displayTags: displayTags,
    _searchText: [bookmark.title, bookmark.description, bookmark.tags, bookmark.url].map((v) => String(v || '').toLowerCase()).join(' '),
  };
}

const BookmarkCard = memo(function BookmarkCard({ bookmark, isDark, faviconApi }) {
  const initialFaviconUrl = useMemo(() => getFaviconUrl(bookmark, faviconApi), [bookmark, faviconApi]);
  const [imgSrc, setImgSrc] = useState(initialFaviconUrl);
  const [errCount, setErrCount] = useState(0);

  useEffect(() => {
    setImgSrc(initialFaviconUrl);
    setErrCount(0);
  }, [initialFaviconUrl]);

  const handleImgError = useCallback(() => {
    if (errCount === 0 && bookmark.favicon) {
      setImgSrc(getFaviconUrl({ ...bookmark, favicon: '' }, faviconApi));
      setErrCount(1);
    } else {
      setImgSrc(null);
    }
  }, [bookmark, errCount, faviconApi]);

  return (
    <a href={bookmark.url} target="_blank" rel="noreferrer"
      className={`group flex flex-col gap-3 rounded-2xl border p-4 text-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        isDark ? 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-sky-500/50 hover:bg-slate-900 hover:shadow-sky-500/10'
               : 'border-slate-200/80 bg-white text-slate-900 hover:border-sky-300/60 hover:shadow-sky-100/80'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
          {imgSrc ? <img src={imgSrc} alt="" className="h-6 w-6 rounded object-contain" loading="lazy" decoding="async" onError={handleImgError} />
                  : <i className="fa-solid fa-globe text-slate-400 text-sm" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-snug">{bookmark.title}</div>
          <div className={`mt-0.5 truncate text-xs leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {bookmark.description || bookmark._displayHost || bookmark.url}
          </div>
        </div>
      </div>
      {bookmark._displayTags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {bookmark._displayTags.map((tag) => (
            <span key={tag} className={`rounded-full px-2 py-0.5 text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{tag}</span>
          ))}
        </div>
      )}
    </a>
  );
});

function CategorySection({ cat, isDark, activeChild, onSetActiveChild, lang, faviconApi }) {
  const children = cat.children || [];
  const allItems = cat._items || cat._defaultItems || [];

  const childCounts = useMemo(() => {
    const counts = new Map();
    for (const bookmark of allItems) {
      const key = Number(bookmark.categoryId);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [allItems]);

  const visibleItems = useMemo(() => {
    if (activeChild === null || activeChild === undefined) return allItems;
    const cid = Number(activeChild);
    return allItems.filter((b) => Number(b.categoryId) === cid);
  }, [allItems, activeChild]);

  if (allItems.length === 0) return null;

  const icon = getCategoryIcon(cat);

  return (
    <section id={`cat-${cat.id}`} className="mb-8 scroll-mt-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${isDark ? 'bg-slate-800 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
          <i className={icon} />
        </span>
        <button type="button" onClick={() => onSetActiveChild(null)}
          className={`rounded-lg px-2.5 py-1 text-sm font-semibold transition ${activeChild == null ? isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-700' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}>
          {cat.isDefault ? t(lang, 'category.default') : cat.name}
        </button>
        {children.map((child) => {
          const cnt = childCounts.get(Number(child.id)) || 0;
          if (cnt === 0) return null;
          return (
            <button key={child.id} type="button" onClick={() => onSetActiveChild(Number(child.id))}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                activeChild === Number(child.id) ? isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-700'
                : isDark ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
              {child.name}<span className={`ml-1 tabular-nums ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{cnt}</span>
            </button>
          );
        })}
      </div>
      <div style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }} className="grid gap-3">
        {visibleItems.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} isDark={isDark} faviconApi={faviconApi} />)}
      </div>
    </section>
  );
}

function FriendLinkIcon({ src }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <i className="fa-solid fa-link text-sm text-slate-400" />;
  return <img src={src} alt="" className="h-6 w-6 rounded object-contain" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

function FriendLinksSection({ friendLinks, isDark, lang, faviconApi }) {
  if (!friendLinks.length) return null;

  return (
    <section className={`mt-10 rounded-2xl border p-5 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200/80 bg-white'}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${isDark ? 'bg-slate-800 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
          <i className="fa-solid fa-user-group" />
        </span>
        <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t(lang, 'home.friendLinks')}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {friendLinks.map((item) => (
          <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
            className={`group flex items-center gap-3 rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${isDark ? 'border-slate-800 bg-slate-950/40 hover:border-sky-500/40' : 'border-slate-100 bg-slate-50 hover:border-sky-200 hover:bg-white'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white'}`}>
              <FriendLinkIcon src={getFriendLinkIconUrl(item, faviconApi)} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</span>
              <span className={`mt-0.5 block truncate text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.description || item.url}</span>
            </span>
            <i className={`fa-solid fa-arrow-up-right-from-square text-xs opacity-0 transition group-hover:opacity-100 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          </a>
        ))}
      </div>
    </section>
  );
}

function QuickAddBookmarkModal({ isDark, lang, form, categories, defaultCatId, fetching, saving, error, onChange, onFetchSite, onSubmit, onClose }) {
  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${isDark ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30' : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20'}`;
  const labelCls = `mb-1.5 block text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-5 shadow-2xl ${isDark ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}>
        <div className={`mb-4 flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div>
            <h2 className="text-base font-semibold">{t(lang, 'quickAdd.title')}</h2>
            <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t(lang, 'quickAdd.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {error && <div className={`mb-4 rounded-xl border px-3 py-2 text-sm ${isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-100 bg-rose-50 text-rose-600'}`}>{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelCls}>{t(lang, 'quickAdd.url')}</label>
            <div className="flex gap-2">
              <input value={form.url} onChange={(e) => onChange({ url: e.target.value })} className={inputCls} placeholder={t(lang, 'quickAdd.url.placeholder')} />
              <button type="button" onClick={onFetchSite} disabled={fetching || !form.url}
                className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60">
                {fetching ? t(lang, 'quickAdd.fetching') : t(lang, 'quickAdd.autofill')}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t(lang, 'quickAdd.titleField')}</label>
            <input value={form.title} onChange={(e) => onChange({ title: e.target.value })} className={inputCls} placeholder={t(lang, 'quickAdd.title.placeholder')} />
          </div>

          <div>
            <label className={labelCls}>{t(lang, 'quickAdd.category')}</label>
            <select value={form.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })} className={inputCls}>
              {!defaultCatId && <option value="">{t(lang, 'quickAdd.category.placeholder')}</option>}
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>{t(lang, 'quickAdd.description')}</label>
            <textarea value={form.description} onChange={(e) => onChange({ description: e.target.value })} className={`${inputCls} min-h-20 resize-y`} placeholder={t(lang, 'quickAdd.description.placeholder')} />
          </div>

          <div>
            <label className={labelCls}>{t(lang, 'quickAdd.favicon')}</label>
            <input value={form.favicon} onChange={(e) => onChange({ favicon: e.target.value })} className={inputCls} placeholder={t(lang, 'quickAdd.favicon.placeholder')} />
          </div>

          <div>
            <label className={labelCls}>{t(lang, 'quickAdd.tags')}</label>
            <input value={form.tags} onChange={(e) => onChange({ tags: e.target.value })} className={inputCls} placeholder={t(lang, 'quickAdd.tags.placeholder')} />
          </div>

          <div>
            <label className={labelCls}>{t(lang, 'quickAdd.sort')}</label>
            <input type="number" value={form.sortOrder} onChange={(e) => onChange({ sortOrder: Number(e.target.value) || 0 })} className={inputCls} />
          </div>

          <label className={`flex items-center gap-2 pt-7 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <input type="checkbox" checked={!!form.enabled} onChange={(e) => onChange({ enabled: e.target.checked ? 1 : 0 })} className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500" />
            {t(lang, 'quickAdd.enabled')}
          </label>
        </div>

        <div className={`mt-5 flex justify-end gap-2 border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <button type="button" onClick={onClose} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t(lang, 'common.cancel')}</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? t(lang, 'quickAdd.saving') : t(lang, 'quickAdd.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Home({ isDark, admin, theme, themeOptions, onThemeChange, onLogout, lang, onLangChange, siteTitle, siteLogo, siteCopyright, faviconApi }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [friendLinks, setFriendLinks] = useState([]);
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('local');
  const contentRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const inputRef = useRef(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);
  const [hoveredCat, setHoveredCat] = useState(null);
  const [activeChildMap, setActiveChildMap] = useState({});
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState(EMPTY_QUICK_BOOKMARK);
  const [quickAddFetching, setQuickAddFetching] = useState(false);
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');

  const setActiveCat = useCallback((catId, childId) => {
    setActiveChildMap((p) => ({ ...p, [catId]: childId === null ? null : Number(childId) }));
  }, []);

  const SEARCH_OPTIONS = [
    { key: 'local',  label: t(lang, 'search.local'),  placeholder: t(lang, 'search.local.placeholder'),  iconClass: 'fa-solid fa-magnifying-glass' },
    { key: 'google', label: t(lang, 'search.google'), placeholder: t(lang, 'search.google.placeholder'), url: 'https://www.google.com/search?q=', iconClass: 'fa-brands fa-google' },
    { key: 'github', label: t(lang, 'search.github'), placeholder: t(lang, 'search.github.placeholder'), url: 'https://github.com/search?q=',    iconClass: 'fa-brands fa-github' },
    { key: 'baidu',  label: t(lang, 'search.baidu'),  placeholder: t(lang, 'search.baidu.placeholder'),  url: 'https://www.baidu.com/s?wd=',    iconClass: 'fa-solid fa-paw' },
  ];

  useEffect(() => {
    const handler = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) setThemeMenuOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) setLangMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadHomeData = useCallback(async (includeMeta = true) => {
    const requests = includeMeta
      ? [requestJson('/api/categories'), requestJson('/api/bookmarks'), requestJson('/api/friend-links')]
      : [requestJson('/api/bookmarks')];
    const [categoryData, bookmarkData, friendLinkData] = await Promise.all(requests);
    if (includeMeta) {
      setCategories(categoryData.categories || []);
      setBookmarks(bookmarkData.bookmarks || []);
      setFriendLinks(friendLinkData.friendLinks || []);
      setActiveChildMap({});
    } else {
      setBookmarks(categoryData.bookmarks || []);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadHomeData().catch(() => {
      if (!cancelled) {
        setCategories([]);
        setBookmarks([]);
        setFriendLinks([]);
        setActiveChildMap({});
      }
    });

    return () => { cancelled = true; };
  }, [admin?.id, loadHomeData]);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    let ticking = false;
    let lastVisible = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const nextVisible = node.scrollTop > 300;
        if (nextVisible !== lastVisible) {
          lastVisible = nextVisible;
          setShowScrollTop(nextVisible);
        }
        ticking = false;
      });
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, []);

  const categoryTree = useMemo(() => formatCategoryTree(categories), [categories]);
  const defaultCategory = useMemo(() => categoryTree.find((c) => c.isDefault), [categoryTree]);
  const defaultCatId = useMemo(() => {
    return defaultCategory ? String(defaultCategory.id) : '';
  }, [defaultCategory]);
  const quickAddCategoryOptions = useMemo(() => {
    const flatten = (items, level = 0) => items.flatMap((item) => {
      const displayName = item.isDefault ? t(lang, 'category.default') : item.name;
      return [
        { ...item, label: `${level > 0 ? `${'　'.repeat(level)}└ ` : ''}${displayName}` },
        ...flatten(item.children || [], level + 1),
      ];
    });
    return flatten(categoryTree);
  }, [categoryTree, lang]);
  const deferredQuery = useDeferredValue(query);
  const preparedBookmarks = useMemo(() => bookmarks.map(prepareBookmark), [bookmarks]);

  const filtered = useMemo(() => {
    const text = deferredQuery.trim().toLowerCase();
    if (searchMode !== 'local' || !text) return preparedBookmarks;
    return preparedBookmarks.filter((b) => b._searchText.includes(text));
  }, [preparedBookmarks, deferredQuery, searchMode]);
  const showEmptySearchActions = searchMode === 'local' && query.trim();

  const bookmarkIndex = useMemo(() => {
    const byCategoryId = new Map();
    for (const bookmark of filtered) {
      const key = Number(bookmark.categoryId || 0);
      const list = byCategoryId.get(key);
      if (list) list.push(bookmark);
      else byCategoryId.set(key, [bookmark]);
    }
    return { byCategoryId };
  }, [filtered]);

  // 有书签的顶级分类 + 默认分类（未分类书签归入）
  const visibleCats = useMemo(() => {
    const normalCats = categoryTree.reduce((acc, cat) => {
      if (cat.isDefault) return acc;
      const childIds = (cat.children || []).map((c) => Number(c.id));
      const items = [
        ...(bookmarkIndex.byCategoryId.get(Number(cat.id)) || []),
        ...childIds.flatMap((id) => bookmarkIndex.byCategoryId.get(id) || []),
      ];
      if (items.length > 0) acc.push({ ...cat, _items: items });
      return acc;
    }, []);
    // 未归类（无 categoryId 或归属默认分类）
    const defaultItems = [
      ...(bookmarkIndex.byCategoryId.get(0) || []),
      ...(defaultCategory ? (bookmarkIndex.byCategoryId.get(Number(defaultCategory.id)) || []) : []),
    ];
    if (defaultCategory && defaultItems.length > 0) {
      return [...normalCats, { ...defaultCategory, _defaultItems: defaultItems, _items: defaultItems }];
    }
    return normalCats;
  }, [categoryTree, bookmarkIndex, defaultCategory]);

  const sidebarCats = useMemo(() => {
    if (visibleCats.length > 0 || !defaultCategory) return visibleCats;
    return [{ ...defaultCategory, _defaultItems: [], _items: [] }];
  }, [visibleCats, defaultCategory]);

  const currentSearch = SEARCH_OPTIONS.find((o) => o.key === searchMode) || SEARCH_OPTIONS[0];
  const handleSearch = () => {
    if (searchMode === 'local' || !query.trim()) return;
    window.open(`${currentSearch.url}${encodeURIComponent(query.trim())}`, '_blank');
  };

  useEffect(() => {
    setQuickAddForm((form) => (form.categoryId ? form : { ...form, categoryId: defaultCatId }));
  }, [defaultCatId]);

  const openQuickAdd = () => {
    setQuickAddForm({ ...EMPTY_QUICK_BOOKMARK, categoryId: defaultCatId });
    setQuickAddError('');
    setQuickAddOpen(true);
  };

  const updateQuickAddForm = (patch) => {
    setQuickAddForm((form) => ({ ...form, ...patch }));
    setQuickAddError('');
  };

  const fetchQuickAddSiteInfo = async () => {
    if (!quickAddForm.url) {
      setQuickAddError(t(lang, 'quickAdd.urlRequired'));
      return;
    }
    setQuickAddFetching(true);
    setQuickAddError('');
    try {
      const res = await requestJson(`/api/admin/fetch-site?url=${encodeURIComponent(quickAddForm.url)}`);
      setQuickAddForm((form) => ({
        ...form,
        title: res.title || form.title,
        description: res.description || form.description,
        favicon: res.favicon ?? '',
        tags: res.tags || form.tags,
      }));
    } catch (err) {
      setQuickAddError(err.message || t(lang, 'quickAdd.fetchFail'));
    } finally {
      setQuickAddFetching(false);
    }
  };

  const submitQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddForm.title || !quickAddForm.url) {
      setQuickAddError(t(lang, 'quickAdd.required'));
      return;
    }
    setQuickAddSaving(true);
    setQuickAddError('');
    try {
      await requestJson('/api/admin/bookmarks', { method: 'POST', body: JSON.stringify(quickAddForm) });
      await loadHomeData(false);
      setQuickAddOpen(false);
      setQuickAddForm({ ...EMPTY_QUICK_BOOKMARK, categoryId: defaultCatId });
    } catch (err) {
      setQuickAddError(err.message || t(lang, 'quickAdd.addFail'));
    } finally {
      setQuickAddSaving(false);
    }
  };

  const bg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const sidebarBg = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/80';
  const headerBg = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/80';
  const menuBg = isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white';
  const menuItem = isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50';
  const iconBtn = `flex h-8 w-8 items-center justify-center rounded-lg text-sm transition ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`;

  return (
    <div className={`${bg} flex h-screen flex-col overflow-hidden`}>
      {/* Header */}
      <header className={`${headerBg} shrink-0 border-b shadow-sm`}>
        <div className="flex h-14 items-stretch">
          {/* Logo */}
          <div className={`hidden w-56 shrink-0 items-center gap-2.5 border-r px-4 md:flex xl:w-64 ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}>
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg text-sky-500">
              {siteLogo ? <img src={siteLogo} alt="" className="h-full w-full object-cover" /> : <i className="fa-solid fa-bookmark text-xs" />}
            </div>
            <span className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{siteTitle}</span>
          </div>

          {/* Search */}
          <div className="flex flex-1 items-center gap-3 px-4 xl:px-6">
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg text-sky-500">
                {siteLogo ? <img src={siteLogo} alt="" className="h-full w-full object-cover" /> : <i className="fa-solid fa-bookmark text-xs" />}
              </div>
            </div>
            <div className={`hidden items-center gap-0.5 rounded-lg border p-0.5 sm:flex ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-slate-100'}`}>
              {SEARCH_OPTIONS.map((opt) => (
                <button key={opt.key} type="button" onClick={() => { setSearchMode(opt.key); inputRef.current?.focus(); }}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${searchMode === opt.key ? 'bg-sky-500 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                  <i className={opt.iconClass} /><span className="hidden lg:inline">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <i className={`fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder={currentSearch.placeholder}
                className={`w-full rounded-lg border py-2 pl-8 pr-3 text-sm outline-none transition-all ${isDark ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30' : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-sky-400 focus:bg-white focus:ring-1 focus:ring-sky-400/20'}`}
              />
            </div>
            {searchMode !== 'local' && (
              <button type="button" onClick={handleSearch} className="shrink-0 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-400 active:scale-95">
                {t(lang, 'common.search')}
              </button>
            )}
          </div>

          {/* Right tools */}
          <div className="flex shrink-0 items-center gap-1 pr-4">
            {/* Theme */}
            <div className="relative" ref={themeMenuRef}>
              <button type="button" onClick={() => setThemeMenuOpen((v) => !v)} className={iconBtn}>
                <i className={isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} />
              </button>
              {themeMenuOpen && (
                <div className={`absolute right-0 top-10 z-50 w-40 overflow-hidden rounded-xl border shadow-xl ${menuBg}`}>
                  {themeOptions?.map((opt) => (
                    <button key={opt.key} type="button" onClick={() => { onThemeChange(opt.key); setThemeMenuOpen(false); }}
                      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition ${theme === opt.key ? 'bg-sky-500 text-white' : menuItem}`}>
                      <i className={`${opt.icon} w-4 text-center text-xs`} />{opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language */}
            <div className="relative" ref={langMenuRef}>
              <button type="button" onClick={() => setLangMenuOpen((v) => !v)} className={iconBtn} title={t(lang, 'header.lang')}>
                <i className="fa-solid fa-language text-sm" />
              </button>
              {langMenuOpen && (
                <div className={`absolute right-0 top-10 z-50 w-32 overflow-hidden rounded-xl border shadow-xl ${menuBg}`}>
                  {LANGS.map((l) => (
                    <button key={l.key} type="button" onClick={() => { onLangChange(l.key); setLangMenuOpen(false); }}
                      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition ${lang === l.key ? 'bg-sky-500 text-white' : menuItem}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={`mx-1 h-4 w-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

            {/* User */}
            <div className="relative" ref={userMenuRef}>
              <button type="button" onClick={() => { if (!admin) { navigate('/login'); return; } setUserMenuOpen((v) => !v); }}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition ${admin ? isDark ? 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30' : 'bg-sky-50 text-sky-600 hover:bg-sky-100' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                title={admin ? (admin.displayName || admin.username) : t(lang, 'header.login')}>
                <i className="fa-solid fa-user text-xs" />
              </button>
              {admin && userMenuOpen && (
                <div className={`absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-xl border shadow-xl ${menuBg}`}>
                  <div className={`border-b px-4 py-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{admin.displayName || admin.username}</div>
                    <div className={`mt-0.5 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{admin.role || t(lang, 'admin.title')}</div>
                  </div>
                  <Link to="/admin" onClick={() => setUserMenuOpen(false)} className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition ${menuItem}`}>
                    <i className="fa-solid fa-sliders w-4 text-center text-xs" />{t(lang, 'header.admin')}
                  </Link>
                  <button type="button" onClick={() => { setUserMenuOpen(false); onLogout?.(); }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition ${isDark ? 'text-rose-400 hover:bg-slate-800' : 'text-rose-500 hover:bg-rose-50'}`}>
                    <i className="fa-solid fa-right-from-bracket w-4 text-center text-xs" />{t(lang, 'header.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarBg} hidden w-56 shrink-0 border-r md:flex md:flex-col xl:w-64`}>
          <div className="flex-1 overflow-y-auto p-3">
            <div className={`mb-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {t(lang, 'category.label')}
            </div>
            {sidebarCats.map((cat) => {
              const icon = getCategoryIcon(cat);
              const hasChildren = (cat.children || []).length > 0;
              const isHovered = hoveredCat === cat.id;
              const totalCount = cat._items?.length || cat._defaultItems?.length || 0;
              const childCounts = new Map();
              for (const bookmark of cat._items || []) {
                const key = Number(bookmark.categoryId);
                childCounts.set(key, (childCounts.get(key) || 0) + 1);
              }

              return (
                <div key={cat.id} onMouseEnter={() => setHoveredCat(cat.id)} onMouseLeave={() => setHoveredCat(null)}>
                  <button type="button" onClick={() => { setActiveCat(cat.id, null); document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${isDark ? 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-sky-400' : 'bg-slate-100 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-600'}`}>
                      <i className={icon} />
                    </span>
                    <span className="flex-1 truncate">{cat.isDefault ? t(lang, 'category.default') : cat.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>{totalCount}</span>
                    {hasChildren && <i className={`fa-solid fa-chevron-right text-xs transition-transform duration-200 ${isHovered ? 'rotate-90 text-sky-400' : isDark ? 'text-slate-700' : 'text-slate-300'}`} />}
                  </button>
                  {hasChildren && isHovered && (
                    <div className="ml-4 mt-0.5 space-y-0.5 pb-1">
                      {cat.children.map((child) => {
                        const cnt = childCounts.get(Number(child.id)) || 0;
                        if (cnt === 0) return null;
                        return (
                          <button key={child.id} type="button"
                            onClick={() => { setActiveCat(cat.id, child.id); setTimeout(() => document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
                            className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${isDark ? 'text-slate-500 hover:bg-slate-800 hover:text-sky-400' : 'text-slate-400 hover:bg-sky-50 hover:text-sky-600'}`}>
                            <i className={`${getCategoryIcon(child)} w-4 text-center text-xs ${isDark ? 'text-slate-700 group-hover:text-sky-400' : 'text-slate-300 group-hover:text-sky-600'}`} />
                            <span className="flex-1 truncate">{child.name}</span>
                            <span className={`tabular-nums ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>{cnt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <main ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="p-4 xl:p-5">
            {visibleCats.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-24 text-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                <i className="fa-solid fa-face-frown-open mb-4 text-4xl" />
                <p className="text-lg font-medium">{t(lang, 'home.empty')}</p>
                {showEmptySearchActions && <p className="mt-1 text-sm">{t(lang, 'home.empty.tip')}</p>}
                {showEmptySearchActions && (
                  <button type="button" onClick={() => setQuery('')} className="mt-4 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400">
                    {t(lang, 'common.clear')}
                  </button>
                )}
              </div>
            ) : (
              <>
                {visibleCats.map((cat) => (
                  <CategorySection key={cat.id} cat={cat} isDark={isDark} lang={lang}
                    activeChild={activeChildMap[cat.id] ?? null}
                    onSetActiveChild={(childId) => setActiveCat(cat.id, childId)}
                    faviconApi={faviconApi}
                  />
                ))}
                <FriendLinksSection friendLinks={friendLinks} isDark={isDark} lang={lang} faviconApi={faviconApi} />
                <footer className={`mt-8 pb-2 text-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  {siteCopyright || `© ${siteTitle}`}
                </footer>
              </>
            )}
          </div>
        </main>
      </div>

      {quickAddOpen && (
        <QuickAddBookmarkModal
          isDark={isDark}
          lang={lang}
          form={quickAddForm}
          categories={quickAddCategoryOptions}
          defaultCatId={defaultCatId}
          fetching={quickAddFetching}
          saving={quickAddSaving}
          error={quickAddError}
          onChange={updateQuickAddForm}
          onFetchSite={fetchQuickAddSiteInfo}
          onSubmit={submitQuickAdd}
          onClose={() => setQuickAddOpen(false)}
        />
      )}

      {(admin || showScrollTop) && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
          {admin && (
            <button type="button" onClick={openQuickAdd} title={t(lang, 'quickAdd.buttonTitle')}
              className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition hover:scale-110 ${isDark ? 'border-sky-500/40 bg-sky-500 text-white shadow-sky-500/10' : 'border-sky-400 bg-sky-500 text-white shadow-sky-200'}`}>
              <i className="fa-solid fa-plus text-sm" />
            </button>
          )}
          {showScrollTop && (
            <button type="button" onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition hover:scale-110 ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`}>
              <i className="fa-solid fa-chevron-up text-xs" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
