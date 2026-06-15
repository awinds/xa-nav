import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { requestJson, formatCategoryTree } from '../lib/api.js';
import { t, LANGS } from '../lib/i18n.js';
import packageInfo from '../../package.json';

const EMPTY_BOOKMARK = { title: '', url: '', description: '', favicon: '', categoryId: '', tags: '', sortOrder: 0, enabled: 1 };
const EMPTY_CATEGORY = { name: '', icon: '', parentId: '', sortOrder: 0, isPrivate: 0 };
const EMPTY_FRIEND_LINK = { name: '', icon: '', description: '', url: '', sortOrder: 0, enabled: 1 };

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15';
const DEFAULT_FAVICON_API = 'https://icon.horse/icon/';

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

function FormField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed right-5 top-5 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
      <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} />
      {toast.msg}
    </div>
  );
}

function AdminTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisible = () => setVisible(window.scrollY > 0);
    updateVisible();
    window.addEventListener('scroll', updateVisible, { passive: true });
    return () => window.removeEventListener('scroll', updateVisible);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="返回顶部"
      className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
    >
      <i className="fa-solid fa-chevron-up text-xs" />
    </button>
  );
}

function DeleteModal({ item, onConfirm, onCancel }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
          <i className="fa-solid fa-trash text-rose-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">确认删除</h3>
        <p className="mt-1.5 text-sm text-slate-500">确定要删除 <span className="font-medium text-slate-700">"{item.name}"</span> 吗？此操作不可撤销。</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">取消</button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-medium text-white transition hover:bg-rose-400">删除</button>
        </div>
      </div>
    </div>
  );
}

function FaviconImage({ src, className }) {
  const [failedSrc, setFailedSrc] = useState('');
  if (!src || failedSrc === src) return <i className="fa-solid fa-globe text-xs text-slate-300" />;
  return <img key={src} src={src} alt="" className={className} onError={() => setFailedSrc(src)} />;
}

// ─── 书签管理 ────────────────────────────────────────────────────────────────
function BookmarksSection({ categories, showToast, faviconApi = DEFAULT_FAVICON_API }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [form, setForm] = useState(EMPTY_BOOKMARK);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [filterCat, setFilterCat] = useState('');
  const [fetching, setFetching] = useState(false);

  // 默认分类 id
  const defaultCatId = useMemo(() => {
    const d = categories.find((c) => c.isDefault);
    return d ? String(d.id) : '';
  }, [categories]);

  const categoryOptions = useMemo(() => {
    const flatten = (items, level = 0) => items.flatMap((item) => [
      { ...item, label: `${level > 0 ? `${'　'.repeat(level)}└ ` : ''}${item.name}` },
      ...flatten(item.children || [], level + 1),
    ]);
    return flatten(formatCategoryTree(categories));
  }, [categories]);

  // 表单初始分类跟随默认分类
  useEffect(() => {
    if (!editing) setForm((f) => ({ ...f, categoryId: defaultCatId }));
  }, [defaultCatId, editing]);

  const load = useCallback(async () => {
    const res = await requestJson('/api/admin/bookmarks');
    setBookmarks(res.bookmarks || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterCat ? bookmarks.filter((b) => String(b.categoryId) === filterCat) : bookmarks;

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        const res = await requestJson(`/api/admin/bookmarks/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
        if (res.bookmark) {
          setBookmarks((items) => items.map((item) => Number(item.id) === Number(res.bookmark.id) ? res.bookmark : item));
        } else {
          await load();
        }
        showToast('修改成功');
        setEditing(null);
      } else {
        const res = await requestJson('/api/admin/bookmarks', { method: 'POST', body: JSON.stringify(form) });
        if (res.bookmark) {
          setBookmarks((items) => [res.bookmark, ...items]);
        } else {
          await load();
        }
        showToast('添加成功');
      }
      setForm({ ...EMPTY_BOOKMARK, categoryId: defaultCatId });
    } catch (err) { showToast(err.message, 'error'); }
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ title: item.title, url: item.url, description: item.description || '', favicon: item.favicon || '', categoryId: item.categoryId ? String(item.categoryId) : '', tags: item.tags || '', sortOrder: item.sortOrder || 0, enabled: item.enabled ?? 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete() {
    try {
      await requestJson(`/api/admin/bookmarks/${deleteItem.id}`, { method: 'DELETE' });
      showToast('已删除');
      await load();
    } catch (err) { showToast(err.message, 'error'); }
    setDeleteItem(null);
  }

  async function fetchSiteInfo() {
    if (!form.url) return showToast('请先填写链接', 'error');
    setFetching(true);
    try {
      const res = await requestJson(`/api/admin/fetch-site?url=${encodeURIComponent(form.url)}`);
      setForm((f) => ({
        ...f,
        title: res.title || f.title,
        description: res.description ?? '',
        favicon: res.favicon ?? '',
        tags: res.tags ?? '',
      }));
      showToast(res.ai ? '信息获取成功（AI 生成）' : '信息获取成功');
    } catch { showToast('获取失败，请手动填写', 'error'); }
    finally { setFetching(false); }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <DeleteModal item={deleteItem} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} />
      <AdminTopButton />

      {/* Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-24 xl:self-start">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{editing ? '编辑收藏' : '添加收藏'}</h2>
          {editing && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">编辑中</span>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL + 智能填充 */}
          <FormField label="链接">
            <div className="flex gap-2">
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value, description: '', favicon: '', tags: '' })}
                placeholder="https://..."
                className={`${inputCls} flex-1`}
                required
              />
              <button
                type="button"
                onClick={fetchSiteInfo}
                disabled={fetching || !form.url}
                title="自动获取标题、描述、图标、标签"
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-600 transition hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {fetching
                  ? <><i className="fa-solid fa-spinner fa-spin" /><span className="hidden sm:inline">获取中</span></>
                  : <><i className="fa-solid fa-wand-magic-sparkles" /><span className="hidden sm:inline">智能填充</span></>}
              </button>
            </div>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="标题">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="网站名称" className={inputCls} required />
            </FormField>
            <FormField label="分类">
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
                {!defaultCatId && <option value="">请选择分类</option>}
                {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="描述">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="简短描述（可选）" className={inputCls} />
          </FormField>
          <FormField label="图标地址">
            <div className="relative">
              {form.favicon && (
                <span className="absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center">
                  <FaviconImage src={form.favicon} className="h-4 w-4 rounded object-contain" />
                </span>
              )}
              <input
                value={form.favicon}
                onChange={(e) => setForm({ ...form, favicon: e.target.value })}
                placeholder="favicon URL（自动填充或手动填写）"
                className={`${inputCls} ${form.favicon ? 'pl-9' : ''}`}
              />
            </div>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="标签（逗号分隔）">
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="标签1,标签2" className={inputCls} />
            </FormField>
            <FormField label="排序">
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="状态">
            <label className="flex h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <div className="relative">
                <input type="checkbox" checked={Boolean(form.enabled)} onChange={(e) => setForm({ ...form, enabled: e.target.checked ? 1 : 0 })} className="sr-only peer" />
                <div className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-sky-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
              </div>
              <span className="text-sm text-slate-600">启用显示</span>
            </label>
          </FormField>
          <div className="flex justify-end gap-3 pt-1">
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_BOOKMARK); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">取消</button>
            )}
            <button type="submit" className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-400">{editing ? '保存修改' : '添加收藏'}</button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 gap-3">
          <h2 className="shrink-0 text-base font-semibold text-slate-900">收藏列表</h2>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-sky-400"
            >
              <option value="">全部分类</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <span className="text-xs text-slate-400 tabular-nums">{filtered.length} 条</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">标题</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">分类</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">链接</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">状态</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="group transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FaviconImage src={getFaviconUrl(item, faviconApi)} className="h-4 w-4 rounded object-contain shrink-0" />
                      <span className="font-medium text-slate-800 truncate max-w-[140px]">{item.title}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{item.categoryName || categories.find((c) => c.isDefault)?.name || '默认'}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="block max-w-[200px] truncate text-xs text-slate-400">{item.url}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {item.enabled ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button type="button" onClick={() => startEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600" title="编辑">
                        <i className="fa-solid fa-pen text-xs" />
                      </button>
                      <button type="button" onClick={() => setDeleteItem({ id: item.id, name: item.title })} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="删除">
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-slate-400">暂无数据</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Font Awesome 图标选择器 ─────────────────────────────────────────────────
const AWESOME_GROUPS = [
  { label: '常用', icons: ['fa-solid fa-folder','fa-solid fa-folder-open','fa-solid fa-bookmark','fa-solid fa-star','fa-solid fa-heart','fa-solid fa-tag','fa-solid fa-tags','fa-solid fa-thumbtack','fa-solid fa-fire','fa-solid fa-bolt','fa-solid fa-check','fa-solid fa-circle-check','fa-solid fa-circle-info','fa-solid fa-circle-question','fa-solid fa-link','fa-solid fa-link-slash','fa-solid fa-list','fa-solid fa-table-cells','fa-solid fa-layer-group','fa-solid fa-box-archive','fa-solid fa-clock','fa-solid fa-calendar-days','fa-solid fa-calendar-check','fa-solid fa-bell','fa-solid fa-lock','fa-solid fa-unlock','fa-solid fa-shield-halved','fa-solid fa-key','fa-solid fa-eye','fa-solid fa-eye-slash','fa-solid fa-magnifying-glass','fa-solid fa-filter','fa-solid fa-gear','fa-solid fa-sliders','fa-solid fa-wrench','fa-solid fa-screwdriver-wrench','fa-solid fa-pen','fa-solid fa-pen-to-square','fa-solid fa-trash','fa-solid fa-plus','fa-solid fa-minus','fa-solid fa-download','fa-solid fa-upload','fa-solid fa-share-nodes','fa-solid fa-copy','fa-solid fa-paste','fa-solid fa-ellipsis','fa-solid fa-bars','fa-solid fa-house','fa-solid fa-globe','fa-solid fa-user','fa-solid fa-users','fa-solid fa-user-group','fa-solid fa-address-card','fa-solid fa-envelope','fa-solid fa-inbox','fa-solid fa-paper-plane','fa-solid fa-comment','fa-solid fa-comments','fa-solid fa-phone','fa-solid fa-print','fa-solid fa-qrcode','fa-solid fa-barcode','fa-solid fa-location-dot','fa-solid fa-map','fa-solid fa-flag','fa-solid fa-award','fa-solid fa-trophy','fa-solid fa-gift','fa-solid fa-cart-shopping','fa-solid fa-credit-card','fa-solid fa-wallet','fa-solid fa-database','fa-solid fa-server','fa-solid fa-cloud','fa-solid fa-code','fa-solid fa-terminal','fa-solid fa-rocket','fa-solid fa-lightbulb','fa-solid fa-book'] },
  { label: '技术', icons: ['fa-solid fa-robot','fa-solid fa-code','fa-solid fa-terminal','fa-solid fa-laptop-code','fa-solid fa-server','fa-solid fa-database','fa-solid fa-cloud','fa-solid fa-cloud-arrow-up','fa-solid fa-cloud-arrow-down','fa-solid fa-microchip','fa-solid fa-screwdriver-wrench','fa-solid fa-gears','fa-solid fa-network-wired','fa-solid fa-wifi','fa-solid fa-bug','fa-solid fa-keyboard','fa-solid fa-desktop','fa-solid fa-mobile-screen','fa-solid fa-plug','fa-brands fa-git-alt','fa-brands fa-github','fa-brands fa-gitlab','fa-brands fa-docker','fa-brands fa-npm','fa-brands fa-node-js','fa-brands fa-js','fa-brands fa-react','fa-brands fa-vuejs','fa-brands fa-angular','fa-brands fa-python','fa-brands fa-java','fa-brands fa-php','fa-brands fa-rust','fa-brands fa-golang','fa-solid fa-code-branch','fa-solid fa-diagram-project','fa-solid fa-rocket','fa-solid fa-cube','fa-solid fa-cubes','fa-solid fa-box','fa-solid fa-memory','fa-solid fa-hard-drive','fa-solid fa-satellite-dish','fa-solid fa-tower-broadcast','fa-solid fa-ethernet','fa-solid fa-shield','fa-solid fa-fingerprint','fa-solid fa-flask','fa-solid fa-vial','fa-solid fa-chart-line'] },
  { label: '内容', icons: ['fa-solid fa-newspaper','fa-solid fa-book-open','fa-solid fa-book','fa-solid fa-file-lines','fa-solid fa-file-code','fa-solid fa-file-pdf','fa-solid fa-file-word','fa-solid fa-file-excel','fa-solid fa-file-powerpoint','fa-solid fa-file-image','fa-solid fa-pen-nib','fa-solid fa-feather','fa-solid fa-image','fa-solid fa-images','fa-solid fa-photo-film','fa-solid fa-video','fa-solid fa-film','fa-solid fa-clapperboard','fa-solid fa-music','fa-solid fa-headphones','fa-solid fa-podcast','fa-solid fa-rss','fa-solid fa-language','fa-solid fa-palette','fa-solid fa-icons','fa-solid fa-brush','fa-solid fa-paintbrush','fa-solid fa-droplet','fa-solid fa-camera','fa-solid fa-camera-retro','fa-solid fa-microphone','fa-solid fa-volume-high','fa-solid fa-play','fa-solid fa-pause','fa-solid fa-forward','fa-solid fa-backward','fa-solid fa-quote-left','fa-solid fa-font','fa-solid fa-heading','fa-solid fa-align-left','fa-solid fa-list-check','fa-solid fa-clipboard','fa-solid fa-note-sticky','fa-solid fa-book-journal-whills','fa-solid fa-graduation-cap','fa-solid fa-chalkboard-user','fa-solid fa-lightbulb','fa-solid fa-wand-magic-sparkles','fa-solid fa-crop-simple','fa-solid fa-vector-square'] },
  { label: '生活', icons: ['fa-solid fa-house','fa-solid fa-building','fa-solid fa-city','fa-solid fa-cart-shopping','fa-solid fa-bag-shopping','fa-solid fa-basket-shopping','fa-solid fa-store','fa-solid fa-gift','fa-solid fa-graduation-cap','fa-solid fa-gamepad','fa-solid fa-trophy','fa-solid fa-medal','fa-solid fa-plane','fa-solid fa-train','fa-solid fa-car','fa-solid fa-bus','fa-solid fa-bicycle','fa-solid fa-motorcycle','fa-solid fa-ship','fa-solid fa-route','fa-solid fa-utensils','fa-solid fa-mug-hot','fa-solid fa-pizza-slice','fa-solid fa-burger','fa-solid fa-dumbbell','fa-solid fa-heart-pulse','fa-solid fa-hospital','fa-solid fa-briefcase','fa-solid fa-wallet','fa-solid fa-credit-card','fa-solid fa-camera','fa-solid fa-map-location-dot','fa-solid fa-location-dot','fa-solid fa-compass','fa-solid fa-tree','fa-solid fa-leaf','fa-solid fa-seedling','fa-solid fa-sun','fa-solid fa-moon','fa-solid fa-cloud-sun','fa-solid fa-umbrella','fa-solid fa-shirt','fa-solid fa-glasses','fa-solid fa-bed','fa-solid fa-couch','fa-solid fa-bath','fa-solid fa-paw','fa-solid fa-child','fa-solid fa-people-roof','fa-solid fa-hand-holding-heart'] },
  { label: '社交', icons: ['fa-solid fa-comments','fa-solid fa-comment-dots','fa-solid fa-comment','fa-solid fa-users','fa-solid fa-user','fa-solid fa-user-group','fa-solid fa-address-book','fa-solid fa-envelope','fa-solid fa-paper-plane','fa-solid fa-inbox','fa-solid fa-bell','fa-solid fa-share-nodes','fa-solid fa-globe','fa-solid fa-earth-asia','fa-solid fa-hashtag','fa-solid fa-at','fa-solid fa-thumbs-up','fa-solid fa-thumbs-down','fa-solid fa-handshake','fa-solid fa-people-arrows','fa-brands fa-github','fa-brands fa-discord','fa-brands fa-telegram','fa-brands fa-twitter','fa-brands fa-x-twitter','fa-brands fa-weixin','fa-brands fa-qq','fa-brands fa-weibo','fa-brands fa-facebook','fa-brands fa-instagram','fa-brands fa-youtube','fa-brands fa-tiktok','fa-brands fa-linkedin','fa-brands fa-slack','fa-brands fa-whatsapp','fa-brands fa-reddit','fa-brands fa-medium','fa-brands fa-dribbble','fa-brands fa-behance','fa-solid fa-user-plus','fa-solid fa-user-check','fa-solid fa-user-shield','fa-solid fa-id-card','fa-solid fa-id-badge','fa-solid fa-bullhorn','fa-solid fa-radio','fa-solid fa-sitemap','fa-solid fa-ranking-star','fa-solid fa-award','fa-solid fa-heart'] },
  { label: '方向', icons: ['fa-solid fa-arrow-up','fa-solid fa-arrow-down','fa-solid fa-arrow-left','fa-solid fa-arrow-right','fa-solid fa-arrow-up-right-from-square','fa-solid fa-right-left','fa-solid fa-up-down','fa-solid fa-rotate','fa-solid fa-arrows-rotate','fa-solid fa-compass','fa-solid fa-location-dot','fa-solid fa-map','fa-solid fa-map-location-dot','fa-solid fa-route','fa-solid fa-signs-post','fa-solid fa-chevron-up','fa-solid fa-chevron-down','fa-solid fa-chevron-left','fa-solid fa-chevron-right','fa-solid fa-circle-arrow-right','fa-solid fa-circle-arrow-left','fa-solid fa-circle-arrow-up','fa-solid fa-circle-arrow-down','fa-solid fa-angles-right','fa-solid fa-angles-left','fa-solid fa-angles-up','fa-solid fa-angles-down','fa-solid fa-maximize','fa-solid fa-minimize','fa-solid fa-expand','fa-solid fa-compress','fa-solid fa-up-right-and-down-left-from-center','fa-solid fa-down-left-and-up-right-to-center','fa-solid fa-turn-up','fa-solid fa-turn-down','fa-solid fa-reply','fa-solid fa-share','fa-solid fa-forward','fa-solid fa-backward','fa-solid fa-forward-step','fa-solid fa-backward-step','fa-solid fa-caret-up','fa-solid fa-caret-down','fa-solid fa-caret-left','fa-solid fa-caret-right','fa-solid fa-location-arrow','fa-solid fa-crosshairs','fa-solid fa-street-view','fa-solid fa-diamond-turn-right','fa-solid fa-shuffle'] },
  { label: '搜索', icons: ['fa-solid fa-magnifying-glass','fa-solid fa-magnifying-glass-plus','fa-solid fa-magnifying-glass-minus','fa-solid fa-magnifying-glass-chart','fa-solid fa-filter','fa-solid fa-filter-circle-xmark','fa-solid fa-filter-circle-dollar','fa-solid fa-binoculars','fa-solid fa-eye','fa-solid fa-eye-low-vision','fa-solid fa-eye-slash','fa-solid fa-glasses','fa-solid fa-circle-question','fa-solid fa-circle-info','fa-solid fa-question','fa-solid fa-info','fa-solid fa-location-crosshairs','fa-solid fa-crosshairs','fa-solid fa-bullseye','fa-solid fa-radar','fa-solid fa-map-location-dot','fa-solid fa-map','fa-solid fa-location-dot','fa-solid fa-map-pin','fa-solid fa-thumbtack','fa-solid fa-compass','fa-solid fa-sitemap','fa-solid fa-diagram-project','fa-solid fa-list','fa-solid fa-list-check','fa-solid fa-table-list','fa-solid fa-table-cells','fa-solid fa-layer-group','fa-solid fa-folder-tree','fa-solid fa-tags','fa-solid fa-tag','fa-solid fa-hashtag','fa-solid fa-at','fa-solid fa-barcode','fa-solid fa-qrcode','fa-solid fa-fingerprint','fa-solid fa-id-card','fa-solid fa-address-card','fa-solid fa-user-magnifying-glass','fa-solid fa-user-check','fa-solid fa-user-clock','fa-solid fa-clock','fa-solid fa-calendar-days','fa-solid fa-calendar-check','fa-solid fa-sort','fa-solid fa-sort-up','fa-solid fa-sort-down','fa-solid fa-arrow-down-a-z','fa-solid fa-arrow-up-a-z','fa-solid fa-arrow-down-z-a','fa-solid fa-arrow-up-z-a','fa-solid fa-arrow-down-wide-short','fa-solid fa-arrow-up-wide-short','fa-solid fa-arrow-down-short-wide','fa-solid fa-arrow-up-short-wide','fa-solid fa-chart-line','fa-solid fa-chart-simple','fa-solid fa-chart-column','fa-solid fa-ranking-star','fa-solid fa-star','fa-solid fa-fire','fa-solid fa-bolt','fa-solid fa-lightbulb','fa-solid fa-wand-magic-sparkles','fa-solid fa-robot','fa-solid fa-database','fa-solid fa-server','fa-solid fa-cloud','fa-solid fa-globe','fa-solid fa-link','fa-solid fa-code','fa-solid fa-terminal','fa-solid fa-bug','fa-solid fa-shield-halved','fa-solid fa-key'] },
];

const ICON_GROUP_SIZE = 80;
const EXTRA_AWESOME_ICONS = {
  技术: ['fa-solid fa-sitemap','fa-solid fa-layer-group','fa-solid fa-cubes-stacked','fa-solid fa-boxes-stacked','fa-solid fa-window-maximize','fa-solid fa-window-restore','fa-solid fa-display','fa-solid fa-tablet-screen-button','fa-solid fa-code-compare','fa-solid fa-code-fork','fa-solid fa-file-code','fa-solid fa-laptop-file','fa-solid fa-dna','fa-solid fa-atom','fa-solid fa-brain','fa-solid fa-gauge-high','fa-solid fa-toolbox','fa-solid fa-hammer','fa-solid fa-magnifying-glass-chart','fa-solid fa-chart-simple','fa-brands fa-html5','fa-brands fa-css3-alt','fa-brands fa-sass','fa-brands fa-less','fa-brands fa-bootstrap','fa-brands fa-ubuntu','fa-brands fa-linux','fa-brands fa-windows','fa-brands fa-apple','fa-brands fa-cloudflare'],
  内容: ['fa-solid fa-file','fa-solid fa-file-pen','fa-solid fa-file-signature','fa-solid fa-file-audio','fa-solid fa-file-video','fa-solid fa-file-zipper','fa-solid fa-folder-tree','fa-solid fa-scroll','fa-solid fa-marker','fa-solid fa-highlighter','fa-solid fa-pen-fancy','fa-solid fa-eraser','fa-solid fa-paint-roller','fa-solid fa-fill-drip','fa-solid fa-eye-dropper','fa-solid fa-object-group','fa-solid fa-object-ungroup','fa-solid fa-table','fa-solid fa-chart-pie','fa-solid fa-chart-column','fa-solid fa-spell-check','fa-solid fa-closed-captioning','fa-solid fa-tv','fa-solid fa-radio','fa-solid fa-circle-play','fa-solid fa-circle-pause','fa-solid fa-backward-step','fa-solid fa-forward-step','fa-solid fa-repeat','fa-solid fa-shuffle'],
  生活: ['fa-solid fa-school','fa-solid fa-book','fa-solid fa-book-open-reader','fa-solid fa-shop','fa-solid fa-receipt','fa-solid fa-coins','fa-solid fa-money-bill','fa-solid fa-suitcase','fa-solid fa-passport','fa-solid fa-earth-asia','fa-solid fa-mountain-sun','fa-solid fa-campground','fa-solid fa-person-hiking','fa-solid fa-person-swimming','fa-solid fa-person-running','fa-solid fa-football','fa-solid fa-basketball','fa-solid fa-baseball','fa-solid fa-table-tennis-paddle-ball','fa-solid fa-ice-cream','fa-solid fa-wine-glass','fa-solid fa-martini-glass','fa-solid fa-bowl-food','fa-solid fa-apple-whole','fa-solid fa-carrot','fa-solid fa-fish','fa-solid fa-dog','fa-solid fa-cat','fa-solid fa-baby','fa-solid fa-heart'],
  社交: ['fa-solid fa-user-pen','fa-solid fa-user-lock','fa-solid fa-user-secret','fa-solid fa-user-tie','fa-solid fa-user-ninja','fa-solid fa-users-gear','fa-solid fa-people-group','fa-solid fa-person-circle-check','fa-solid fa-person-circle-question','fa-solid fa-circle-user','fa-solid fa-square-share-nodes','fa-solid fa-comment-medical','fa-solid fa-comment-slash','fa-solid fa-message','fa-solid fa-face-smile','fa-solid fa-face-grin','fa-solid fa-face-laugh','fa-solid fa-face-meh','fa-solid fa-face-frown','fa-solid fa-icons','fa-brands fa-stack-overflow','fa-brands fa-codepen','fa-brands fa-dev','fa-brands fa-hacker-news','fa-brands fa-product-hunt','fa-brands fa-pinterest','fa-brands fa-snapchat','fa-brands fa-twitch','fa-brands fa-steam','fa-brands fa-gitlab'],
  方向: ['fa-solid fa-arrow-trend-up','fa-solid fa-arrow-trend-down','fa-solid fa-arrow-pointer','fa-solid fa-arrow-rotate-left','fa-solid fa-arrow-rotate-right','fa-solid fa-arrow-right-arrow-left','fa-solid fa-arrow-right-to-bracket','fa-solid fa-arrow-right-from-bracket','fa-solid fa-arrow-up-from-bracket','fa-solid fa-arrow-up-short-wide','fa-solid fa-arrow-down-short-wide','fa-solid fa-arrow-up-wide-short','fa-solid fa-arrow-down-wide-short','fa-solid fa-arrow-up-a-z','fa-solid fa-arrow-down-a-z','fa-solid fa-arrow-up-z-a','fa-solid fa-arrow-down-z-a','fa-solid fa-arrow-up-1-9','fa-solid fa-arrow-down-1-9','fa-solid fa-arrow-up-9-1','fa-solid fa-arrow-down-9-1','fa-solid fa-circle-chevron-up','fa-solid fa-circle-chevron-down','fa-solid fa-circle-chevron-left','fa-solid fa-circle-chevron-right','fa-solid fa-square-arrow-up-right','fa-solid fa-square-caret-up','fa-solid fa-square-caret-down','fa-solid fa-square-caret-left','fa-solid fa-square-caret-right'],
};
const PICKER_GROUPS = AWESOME_GROUPS.map((item) => ({
  ...item,
  icons: [...item.icons, ...(EXTRA_AWESOME_ICONS[item.label] || [])].slice(0, ICON_GROUP_SIZE),
}));

function isAwesomeIcon(value) {
  return /^fa-(solid|regular|brands)\s+fa-[\w-]+/.test(String(value || '').trim());
}

function IconPreview({ icon, className = '' }) {
  return isAwesomeIcon(icon) ? <i className={`${icon} ${className}`} /> : <i className={`fa-solid fa-folder ${className}`} />;
}

function AwesomeIconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(0);
  const [iconQuery, setIconQuery] = useState('');
  const ref = useRef(null);

  const visibleIcons = useMemo(() => {
    const query = iconQuery.trim().toLowerCase();
    if (!query) return PICKER_GROUPS[group]?.icons || [];
    if (query.length < 2) return [];
    return [...new Set(PICKER_GROUPS.flatMap((item) => item.icons))]
      .filter((icon) => icon.toLowerCase().includes(query));
  }, [group, iconQuery]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="fa-solid fa-folder"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
          title="选择图标"
        >
          <IconPreview icon={value} className="text-base" />
        </button>
      </div>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[380px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mb-2 flex flex-wrap gap-1">
            {PICKER_GROUPS.map((g, i) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setGroup(i)}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition ${group === i ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-10 gap-1">
            {visibleIcons.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => { onChange(icon); setOpen(false); }}
                className={`flex h-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-sky-50 hover:text-sky-600 ${value === icon ? 'bg-sky-100 text-sky-600' : ''}`}
                title={icon}
              >
                <i className={icon} />
              </button>
            ))}
          </div>
          {visibleIcons.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              {iconQuery.trim() && iconQuery.trim().length < 2 ? '请输入至少 2 个字符' : '未找到匹配图标'}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <input
              value={iconQuery}
              onChange={(e) => setIconQuery(e.target.value)}
              placeholder="搜索图标，如：folder"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
            />
            <div className="min-w-0 flex-1 truncate text-xs text-slate-400">当前：{value || 'fa-solid fa-folder'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 分类管理 ────────────────────────────────────────────────────────────────
function CategoriesSection({ categories, onReload, showToast }) {
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await requestJson(`/api/admin/categories/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
        showToast('修改成功');
        setEditing(null);
      } else {
        await requestJson('/api/admin/categories', { method: 'POST', body: JSON.stringify(form) });
        showToast('添加成功');
      }
      setForm(EMPTY_CATEGORY);
      await onReload();
    } catch (err) { showToast(err.message, 'error'); }
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ name: item.name, icon: item.icon || '', parentId: item.parentId ? String(item.parentId) : '', sortOrder: item.sortOrder || 0, isPrivate: item.isPrivate ? 1 : 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete() {
    try {
      await requestJson(`/api/admin/categories/${deleteItem.id}`, { method: 'DELETE' });
      showToast('已删除');
      await onReload();
    } catch (err) { showToast(err.message, 'error'); }
    setDeleteItem(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <DeleteModal item={deleteItem} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} />
      <AdminTopButton />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-24 xl:self-start">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{editing ? '编辑分类' : '添加分类'}</h2>
          {editing && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">编辑中</span>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="名称">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="分类名称" className={inputCls} required />
            </FormField>
            <FormField label="图标">
              <AwesomeIconPicker value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="父级分类">
              <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={inputCls}>
                <option value="">顶级分类</option>
                {categories.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="排序">
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="访问权限">
            <label className={`flex h-[42px] cursor-pointer items-center gap-3 rounded-xl border px-3 ${form.isPrivate ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="relative">
                <input type="checkbox" checked={Boolean(form.isPrivate)} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked ? 1 : 0 })} className="sr-only peer" />
                <div className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-amber-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
              </div>
              <span className="text-sm text-slate-600">私密分类（仅登录后显示）</span>
            </label>
          </FormField>
          <div className="flex justify-end gap-3 pt-1">
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_CATEGORY); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">取消</button>
            )}
            <button type="submit" className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-400">{editing ? '保存修改' : '添加分类'}</button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">分类列表</h2>
          <span className="text-xs text-slate-400">{categories.length} 个</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">名称</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">父级</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">排序</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((item) => {
                const parent = categories.find((c) => c.id === item.parentId);
                return (
                  <tr key={item.id} className="group transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="mr-2 inline-flex w-5 justify-center text-slate-500"><IconPreview icon={item.icon} /></span>
                      <span className="font-medium text-slate-800">{item.name}</span>
                      {item.isPrivate ? <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"><i className="fa-solid fa-lock text-[10px]" />私密</span> : null}
                      {item.isDefault ? <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">默认</span> : null}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{parent?.name || '顶级'}</td>
                    <td className="px-4 py-3 text-slate-500">{item.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        {item.isDefault ? (
                          <span className="text-xs text-slate-400 px-2">受保护</span>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"><i className="fa-solid fa-pen text-xs" /></button>
                            <button type="button" onClick={() => setDeleteItem({ id: item.id, name: item.name })} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><i className="fa-solid fa-trash text-xs" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {categories.length === 0 && <div className="py-12 text-center text-sm text-slate-400">暂无分类</div>}
        </div>
      </div>
    </div>
  );
}

// ─── 友情链接管理 ──────────────────────────────────────────────────────────────
function FriendLinksSection({ showToast, faviconApi = DEFAULT_FAVICON_API }) {
  const [friendLinks, setFriendLinks] = useState([]);
  const [form, setForm] = useState(EMPTY_FRIEND_LINK);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const load = useCallback(async () => {
    const res = await requestJson('/api/admin/friend-links');
    setFriendLinks(res.friendLinks || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        const res = await requestJson(`/api/admin/friend-links/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
        if (res.friendLink) {
          setFriendLinks((items) => items.map((item) => Number(item.id) === Number(res.friendLink.id) ? res.friendLink : item));
        } else {
          await load();
        }
        showToast('修改成功');
        setEditing(null);
      } else {
        const res = await requestJson('/api/admin/friend-links', { method: 'POST', body: JSON.stringify(form) });
        if (res.friendLink) {
          setFriendLinks((items) => [res.friendLink, ...items]);
        } else {
          await load();
        }
        showToast('添加成功');
      }
      setForm(EMPTY_FRIEND_LINK);
    } catch (err) { showToast(err.message, 'error'); }
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ name: item.name, icon: item.icon || '', description: item.description || '', url: item.url, sortOrder: item.sortOrder || 0, enabled: item.enabled ?? 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete() {
    try {
      await requestJson(`/api/admin/friend-links/${deleteItem.id}`, { method: 'DELETE' });
      setFriendLinks((items) => items.filter((item) => Number(item.id) !== Number(deleteItem.id)));
      showToast('已删除');
    } catch (err) { showToast(err.message, 'error'); }
    setDeleteItem(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <DeleteModal item={deleteItem} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} />
      <AdminTopButton />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-24 xl:self-start">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{editing ? '编辑友情链接' : '添加友情链接'}</h2>
          {editing && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">编辑中</span>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="站点名">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="站点名称" className={inputCls} required />
          </FormField>
          <FormField label="站点 URL">
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." className={inputCls} required />
          </FormField>
          <FormField label="站点图标">
            <div className="relative">
              {form.icon && (
                <span className="absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center">
                  <FaviconImage src={form.icon} className="h-4 w-4 rounded object-contain" />
                </span>
              )}
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="图标 URL（可选）"
                className={`${inputCls} ${form.icon ? 'pl-9' : ''}`}
              />
            </div>
          </FormField>
          <FormField label="站点描述">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="简短描述（可选）" className={inputCls} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="排序">
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className={inputCls} />
            </FormField>
            <FormField label="状态">
              <label className="flex h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3">
                <div className="relative">
                  <input type="checkbox" checked={Boolean(form.enabled)} onChange={(e) => setForm({ ...form, enabled: e.target.checked ? 1 : 0 })} className="sr-only peer" />
                  <div className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-sky-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
                </div>
                <span className="text-sm text-slate-600">启用显示</span>
              </label>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_FRIEND_LINK); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">取消</button>
            )}
            <button type="submit" className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-400">{editing ? '保存修改' : '添加友情链接'}</button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">友情链接列表</h2>
          <span className="text-xs text-slate-400">{friendLinks.length} 个</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">站点</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">描述</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">URL</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">状态</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {friendLinks.map((item) => (
                <tr key={item.id} className="group transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FaviconImage src={getFriendLinkIconUrl(item, faviconApi)} className="h-4 w-4 rounded object-contain shrink-0" />
                      <span className="font-medium text-slate-800 truncate max-w-[140px]">{item.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell"><span className="block max-w-[180px] truncate">{item.description || '-'}</span></td>
                  <td className="hidden px-4 py-3 lg:table-cell"><span className="block max-w-[200px] truncate text-xs text-slate-400">{item.url}</span></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {item.enabled ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button type="button" onClick={() => startEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600" title="编辑">
                        <i className="fa-solid fa-pen text-xs" />
                      </button>
                      <button type="button" onClick={() => setDeleteItem({ id: item.id, name: item.name })} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="删除">
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {friendLinks.length === 0 && <div className="py-12 text-center text-sm text-slate-400">暂无友情链接</div>}
        </div>
      </div>
    </div>
  );
}

// ─── 备份恢复 ────────────────────────────────────────────────────────────────
function BackupSection({ showToast }) {
  const [importing, setImporting] = useState(false);

  function download(type) {
    window.open(`/api/admin/backup?type=${type}`, '_blank');
  }

  async function importFile(event, type) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const content = await file.text();
      const payload = type === 'html' ? { type: 'html', content } : JSON.parse(content);
      await requestJson('/api/admin/backup', { method: 'POST', body: JSON.stringify(payload) });
      showToast(type === 'html' ? '书签文件导入完成' : 'JSON 备份导入完成');
    } catch (err) {
      showToast(err.message || '导入失败，请检查文件格式', 'error');
    } finally {
      event.target.value = '';
      setImporting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">导出备份</h2>
        <p className="mb-5 text-sm text-slate-500">导出当前分类、收藏和基础配置。Secret Key 不会被导出。</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => download('json')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600"><i className="fa-solid fa-file-code" /></span>
            <span><span className="block text-sm font-semibold text-slate-800">JSON 备份文件</span><span className="text-xs text-slate-400">用于完整恢复</span></span>
          </button>
          <button type="button" onClick={() => download('html')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><i className="fa-solid fa-book-bookmark" /></span>
            <span><span className="block text-sm font-semibold text-slate-800">浏览器书签 HTML</span><span className="text-xs text-slate-400">可导入浏览器</span></span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">导入恢复</h2>
        <p className="mb-5 text-sm text-slate-500">支持导入 JSON 备份文件和浏览器导出的书签 HTML 文件。</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50 ${importing ? 'pointer-events-none opacity-60' : ''}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600"><i className="fa-solid fa-file-import" /></span>
            <span><span className="block text-sm font-semibold text-slate-800">导入 JSON</span><span className="text-xs text-slate-400">恢复备份数据</span></span>
            <input type="file" accept="application/json,.json" onChange={(e) => importFile(e, 'json')} className="hidden" />
          </label>
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50 ${importing ? 'pointer-events-none opacity-60' : ''}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><i className="fa-solid fa-upload" /></span>
            <span><span className="block text-sm font-semibold text-slate-800">导入书签 HTML</span><span className="text-xs text-slate-400">从浏览器书签导入</span></span>
            <input type="file" accept="text/html,.html,.htm" onChange={(e) => importFile(e, 'html')} className="hidden" />
          </label>
        </div>
        {importing && <div className="mt-4 text-sm text-slate-400"><i className="fa-solid fa-spinner fa-spin mr-2" />导入中...</div>}
      </div>
    </div>
  );
}

// ─── 配置管理 ────────────────────────────────────────────────────────────────
function ConfigSection({ showToast }) {
  const [config, setConfig] = useState({
    site_title: '', site_description: '', site_logo: '', site_copyright: '', favicon_api: 'https://icon.horse/icon/', enable_ai_meta: false, cookie_max_age: '24',
    enable_captcha: true, enable_turnstile: false, turnstile_sitekey: '',
    turnstile_secret: '', turnstile_secret_configured: '0',
    default_lang: 'zh',
  });
  const [loading, setLoading] = useState(true);
  const [showTurnstileSecret, setShowTurnstileSecret] = useState(false);

  useEffect(() => {
    requestJson('/api/admin/config').then((res) => {
      const c = res.config || {};
      setConfig({
        site_title: c.site_title || 'XA-Nav',
        site_description: c.site_description || '',
        site_logo: c.site_logo || '',
        site_copyright: c.site_copyright || '',
        favicon_api: c.favicon_api || 'https://icon.horse/icon/',
        enable_ai_meta: c.enable_ai_meta === '1',
        cookie_max_age: String(Math.max(1, Math.round(Number(c.cookie_max_age || '86400') / 3600))),
        enable_captcha: c.enable_captcha !== '0',
        enable_turnstile: c.enable_turnstile === '1',
        turnstile_sitekey: c.turnstile_sitekey || '',
        turnstile_secret: '',
        turnstile_secret_configured: c.turnstile_secret_configured || '0',
        default_lang: c.default_lang || 'zh',
      });
      setLoading(false);
    });
  }, []);

  async function handleConfigSave(e) {
    e.preventDefault();
    try {
      if (config.enable_turnstile && !config.turnstile_sitekey.trim()) {
        return showToast('启用 Turnstile 时必须填写 Site Key', 'error');
      }
      if (config.enable_turnstile && config.turnstile_secret_configured !== '1' && !config.turnstile_secret.trim()) {
        return showToast('启用 Turnstile 时必须填写 Secret Key，并保存成功后登录页才会显示验证框', 'error');
      }
      const payload = {
        ...config,
        cookie_max_age: String(Math.max(1, Number(config.cookie_max_age) || 24) * 3600),
        turnstile_sitekey: config.turnstile_sitekey.trim(),
        turnstile_secret: config.turnstile_secret.trim(),
        site_logo: config.site_logo.trim(),
        site_copyright: config.site_copyright.trim(),
        favicon_api: config.favicon_api.trim() || 'https://icon.horse/icon/',
      };
      const res = await requestJson('/api/admin/config', { method: 'POST', body: JSON.stringify(payload) });
      const saved = res.config || {};
      setConfig((c) => ({
        ...c,
        site_title: saved.site_title || c.site_title,
        site_description: saved.site_description ?? c.site_description,
        site_logo: saved.site_logo ?? c.site_logo,
        site_copyright: saved.site_copyright ?? c.site_copyright,
        favicon_api: saved.favicon_api || c.favicon_api,
        enable_ai_meta: saved.enable_ai_meta === '1',
        cookie_max_age: String(Math.max(1, Math.round(Number(saved.cookie_max_age || payload.cookie_max_age) / 3600))),
        enable_captcha: saved.enable_captcha !== '0',
        enable_turnstile: saved.enable_turnstile === '1',
        turnstile_sitekey: saved.turnstile_sitekey || c.turnstile_sitekey,
        turnstile_secret: '',
        turnstile_secret_configured: saved.turnstile_secret_configured || '0',
        default_lang: saved.default_lang || c.default_lang,
      }));
      showToast('配置已保存');
    } catch (err) { showToast(err.message, 'error'); }
  }

  if (loading) return <div className="py-16 text-center text-sm text-slate-400"><i className="fa-solid fa-spinner fa-spin mr-2" />加载中...</div>;

  return (
    <div className="grid gap-6">
      {/* 网站配置 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-base font-semibold text-slate-900">网站配置</h2>
        <form onSubmit={handleConfigSave} className="space-y-4">
          <FormField label="网站名称">
            <input value={config.site_title} onChange={(e) => setConfig({ ...config, site_title: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="网站描述">
            <input value={config.site_description} onChange={(e) => setConfig({ ...config, site_description: e.target.value })} placeholder="简短介绍" className={inputCls} />
          </FormField>
          <FormField label="网站 Logo URL">
            <div className="relative">
              {config.site_logo && (
                <span className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center overflow-hidden rounded">
                  <FaviconImage src={config.site_logo} className="h-full w-full object-cover" />
                </span>
              )}
              <input
                value={config.site_logo}
                onChange={(e) => setConfig({ ...config, site_logo: e.target.value })}
                placeholder="留空则使用默认 logo"
                className={`${inputCls} ${config.site_logo ? 'pl-10' : ''}`}
              />
            </div>
          </FormField>
          <FormField label="页脚版权">
            <input
              value={config.site_copyright}
              onChange={(e) => setConfig({ ...config, site_copyright: e.target.value })}
              placeholder={`© ${config.site_title || 'XA-Nav'} · v${packageInfo.version}`}
              className={inputCls}
            />
          </FormField>
          <FormField label="Favicon API 接口前缀">
            <input
              value={config.favicon_api}
              onChange={(e) => setConfig({ ...config, favicon_api: e.target.value })}
              placeholder="https://icon.horse/icon/"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">用于收藏未填写图标时自动拼接域名，例如 https://icon.horse/icon/www.v2ex.com。</p>
          </FormField>
          <div className={`rounded-xl border p-4 ${config.enable_ai_meta ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" checked={config.enable_ai_meta} onChange={(e) => setConfig({ ...config, enable_ai_meta: e.target.checked })} className="sr-only peer" />
                <div className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-purple-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">启用 AI 获取 Meta</div>
                <div className="text-xs text-slate-400">默认关闭；智能填充只有在无法获取描述或标签时才调用 Workers AI。</div>
              </div>
            </label>
          </div>
          <FormField label="登录 Cookie 有效期（小时）">
            <input type="number" value={config.cookie_max_age} onChange={(e) => setConfig({ ...config, cookie_max_age: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="默认语言">
            <select value={config.default_lang} onChange={(e) => setConfig({ ...config, default_lang: e.target.value })} className={inputCls}>
              {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </FormField>
          <div className="space-y-3">
            {/* 图片验证码 */}
            <div className={`rounded-xl border p-4 ${config.enable_captcha ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" checked={config.enable_captcha} onChange={(e) => setConfig({ ...config, enable_captcha: e.target.checked })} className="sr-only peer" />
                  <div className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">启用图片验证码</div>
                  <div className="text-xs text-slate-400">登录时显示图形验证码</div>
                </div>
              </label>
            </div>
            {/* Turnstile */}
            <div className={`rounded-xl border p-4 space-y-3 ${config.enable_turnstile ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" checked={config.enable_turnstile} onChange={(e) => setConfig({ ...config, enable_turnstile: e.target.checked })} className="sr-only peer" />
                  <div className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-sky-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">启用 Cloudflare Turnstile</div>
                  <div className="text-xs text-slate-400">机器人防护，需填写 Site Key</div>
                </div>
              </label>
              {config.enable_turnstile && (
                <div className="space-y-3">
                  <FormField label="Turnstile Site Key">
                    <input value={config.turnstile_sitekey} onChange={(e) => setConfig({ ...config, turnstile_sitekey: e.target.value })} placeholder="0x4AAAAAAA..." className={inputCls} />
                  </FormField>
                  <FormField label="Turnstile Secret">
                    <div className="relative">
                      <input
                        type={showTurnstileSecret ? 'text' : 'password'}
                        value={config.turnstile_secret}
                        onChange={(e) => setConfig({ ...config, turnstile_secret: e.target.value })}
                        placeholder={config.turnstile_secret_configured === '1' ? '已配置，留空则不修改' : '请输入 Secret Key'}
                        className={`${inputCls} pr-10`}
                      />
                      <button type="button" onClick={() => setShowTurnstileSecret((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <i className={`fa-solid ${showTurnstileSecret ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {config.turnstile_secret_configured === '1' ? 'Secret Key 已配置。为安全起见不会回显，留空保存将保持不变。' : 'Secret Key 未配置，登录页不会显示 Turnstile，也不会验证 Turnstile。'}
                    </p>
                  </FormField>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-400">保存配置</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────
export default function Admin({ admin, lang = 'zh', siteLogo = '', faviconApi = DEFAULT_FAVICON_API, onLogout }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('bookmarks');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadCategories = useCallback(async () => {
    const res = await requestJson('/api/admin/categories');
    setCategories(res.categories || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const navItems = [
    { key: 'bookmarks', label: '网址管理', icon: 'fa-solid fa-link' },
    { key: 'categories', label: '分类管理', icon: 'fa-solid fa-folder' },
    { key: 'friendLinks', label: '友情链接', icon: 'fa-solid fa-user-group' },
    { key: 'backup', label: '备份恢复', icon: 'fa-solid fa-database' },
    { key: 'config', label: '系统配置', icon: 'fa-solid fa-gear' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl text-sky-500">
              {siteLogo ? <img src={siteLogo} alt="" className="h-full w-full object-cover" /> : <i className="fa-solid fa-bookmark text-sm" />}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">XA-Nav · 管理后台 · v{packageInfo.version}</div>
              <div className="text-xs text-slate-400">欢迎，{admin.displayName || admin.username}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
              <i className="fa-solid fa-arrow-left" /> 返回首页
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-100 px-3 py-2 text-xs font-medium text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <i className="fa-solid fa-right-from-bracket" /> 退出登录
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
        {/* Tab nav */}
        <div className="mb-6 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveSection(item.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${activeSection === item.key ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <i className={item.icon} />
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <i className="fa-solid fa-spinner fa-spin mr-2" /> 加载中...
          </div>
        ) : activeSection === 'bookmarks' ? (
          <BookmarksSection categories={categories} showToast={showToast} faviconApi={faviconApi} />
        ) : activeSection === 'categories' ? (
          <CategoriesSection categories={categories} onReload={loadCategories} showToast={showToast} />
        ) : activeSection === 'friendLinks' ? (
          <FriendLinksSection showToast={showToast} faviconApi={faviconApi} />
        ) : activeSection === 'backup' ? (
          <BackupSection showToast={showToast} />
        ) : (
          <ConfigSection showToast={showToast} />
        )}
      </div>
    </div>
  );
}
