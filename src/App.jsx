import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import { requestJson } from './lib/api.js';
import { t, LANGS } from './lib/i18n.js';
import defaultLogo from './images/logo.png';

const THEME_OPTIONS = [
  { key: 'system', icon: 'fa-solid fa-desktop' },
  { key: 'light',  icon: 'fa-solid fa-sun' },
  { key: 'dark',   icon: 'fa-solid fa-moon' },
];

function AppShell() {
  const [admin, setAdmin] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [theme, setTheme] = useState('system');
  const [systemDark, setSystemDark] = useState(false);
  const [lang, setLang] = useState('zh');
  const [siteTitle, setSiteTitle] = useState('XA-Nav');
  const [siteLogo, setSiteLogo] = useState(defaultLogo);
  const [siteCopyright, setSiteCopyright] = useState('');
  const [faviconApi, setFaviconApi] = useState('https://icon.horse/icon/');
  const location = useLocation();

  // 加载配置（语言、标题）
  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((d) => {
        const c = d.config || {};
        const title = c.site_title || 'XA-Nav';
        setSiteTitle(title);
        setSiteLogo(c.site_logo || defaultLogo);
        setSiteCopyright(c.site_copyright || '');
        setFaviconApi(c.favicon_api || 'https://icon.horse/icon/');
        document.title = title;
        const savedLang = localStorage.getItem('xa-nav-lang');
        setLang(savedLang || c.default_lang || 'zh');
      })
      .catch(() => {});
  }, []);

  // 更新 document.title
  useEffect(() => {
    document.title = siteTitle;
  }, [siteTitle]);

  // 语言切换
  const handleLangChange = (l) => {
    setLang(l);
    localStorage.setItem('xa-nav-lang', l);
  };

  useEffect(() => {
    requestJson('/api/admin/me')
      .then((data) => { if (data.authenticated) setAdmin(data.admin); })
      .catch(() => setAdmin(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mql.matches);
    const handler = (e) => setSystemDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.body.classList.remove('bg-slate-950', 'bg-slate-50', 'text-slate-100', 'text-slate-950');
    if (theme === 'dark' || (theme === 'system' && systemDark)) {
      document.body.classList.add('bg-slate-950', 'text-slate-100');
    } else {
      document.body.classList.add('bg-slate-50', 'text-slate-950');
    }
  }, [theme, systemDark]);

  const isDark = theme === 'dark' || (theme === 'system' && systemDark);
  const appBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950';

  const themeOptions = THEME_OPTIONS.map((o) => ({
    ...o,
    label: t(lang, `header.theme.${o.key}`),
  }));

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setAdmin(null);
  };

  const sharedProps = { isDark, admin, theme, themeOptions, onThemeChange: setTheme, onLogout: handleLogout, lang, onLangChange: handleLangChange, siteTitle, siteLogo, siteCopyright, faviconApi };

  return (
    <div className={`${appBg} min-h-screen`}>
      <Routes>
        <Route path="/" element={<Home {...sharedProps} />} />
        <Route path="/login" element={admin ? <Navigate to="/admin" replace /> : <Login onLogin={setAdmin} lang={lang} siteTitle={siteTitle} siteLogo={siteLogo} siteCopyright={siteCopyright} />} />
        <Route
          path="/admin"
          element={
            checkingAuth
              ? <div className="flex min-h-screen items-center justify-center text-slate-400"><i className="fa-solid fa-spinner fa-spin mr-2" />{t(lang, 'common.loading')}</div>
              : admin
              ? <Admin admin={admin} lang={lang} siteLogo={siteLogo} faviconApi={faviconApi} onLogout={handleLogout} />
              : <Navigate to="/login" state={{ from: location }} replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
