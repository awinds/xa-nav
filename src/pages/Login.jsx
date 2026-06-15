import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestJson } from '../lib/api.js';
import { t } from '../lib/i18n.js';
import packageInfo from '../../package.json';

export default function Login({ onLogin, lang = 'zh', siteTitle = 'XA-Nav', siteLogo = '', siteCopyright = '' }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [captcha, setCaptcha] = useState({ image: '', token: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [config, setConfig] = useState({ enable_captcha: '1', enable_turnstile: '0', turnstile_sitekey: '', turnstile_secret_configured: '0' });
  const turnstileWidgetId = useRef(null);
  const turnstileContainerRef = useRef(null);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((d) => {
        const c = d.config || {};
        setConfig({
          enable_captcha: c.enable_captcha ?? '1',
          enable_turnstile: c.enable_turnstile || '0',
          turnstile_sitekey: c.turnstile_sitekey || '',
          turnstile_secret_configured: c.turnstile_secret_configured || '0',
        });
      });
  }, []);

  useEffect(() => {
    if (config.enable_captcha !== '0') {
      refreshCaptcha();
    }
  }, [config.enable_captcha]);

  useEffect(() => {
    const enabled = config.enable_turnstile === '1' && config.turnstile_secret_configured === '1';
    const container = turnstileContainerRef.current;

    if (!config.turnstile_sitekey || !enabled || !container) {
      setTurnstileToken('');
      turnstileWidgetId.current = null;
      return undefined;
    }

    let attempts = 0;
    let disposed = false;
    const renderTurnstile = () => {
      if (disposed || !turnstileContainerRef.current) return;
      if (!window.turnstile) {
        attempts += 1;
        if (attempts <= 50) window.setTimeout(renderTurnstile, 100);
        return;
      }
      if (turnstileWidgetId.current !== null) return;
      turnstileContainerRef.current.innerHTML = '';
      turnstileWidgetId.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: config.turnstile_sitekey,
        action: 'login',
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      });
    };

    renderTurnstile();

    return () => {
      disposed = true;
      if (window.turnstile && turnstileWidgetId.current !== null) {
        window.turnstile.remove(turnstileWidgetId.current);
      }
      if (turnstileContainerRef.current) turnstileContainerRef.current.innerHTML = '';
      turnstileWidgetId.current = null;
      setTurnstileToken('');
    };
  }, [config.turnstile_sitekey, config.enable_turnstile, config.turnstile_secret_configured]);

  async function refreshCaptcha() {
    const data = await requestJson('/api/captcha');
    setCaptcha({ image: data.image, token: data.token });
    setCaptchaAnswer('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await requestJson('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          captchaToken: captcha.token,
          captchaAnswer,
          turnstileToken,
        }),
      });
      if (response.success) onLogin(response.admin);
    } catch (err) {
      setError(err.message);
      if (window.turnstile && turnstileWidgetId.current !== null) {
        window.turnstile.reset(turnstileWidgetId.current);
        setTurnstileToken('');
      }
      if (config.enable_captcha !== '0') refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  const showCaptcha = config.enable_captcha !== '0';
  const showTurnstile = config.enable_turnstile === '1' && config.turnstile_sitekey && config.turnstile_secret_configured === '1';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-100 px-4">
      <div className="w-full max-w-[364px]">
        <div className="mb-8 text-center">
          <Link to="/" className="mx-auto mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl text-sky-500 transition hover:text-sky-400" title="返回首页">
            {siteLogo ? <img src={siteLogo} alt="" className="h-full w-full object-cover" /> : <i className="fa-solid fa-bookmark text-2xl" />}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{siteTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{t(lang, 'login.title')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/60">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{t(lang, 'login.username')}</label>
              <div className="relative">
                <i className="fa-solid fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                <input autoComplete="username" value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder={t(lang, 'login.username.placeholder')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15" required />
              </div>
            </div>

            {/* 密码 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{t(lang, 'login.password')}</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={t(lang, 'login.password.placeholder')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15" required />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" tabIndex={-1}>
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
              </div>
            </div>

            {/* 图片验证码 */}
            {showCaptcha && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t(lang, 'login.captcha')}</label>
                <div className={`flex overflow-hidden rounded-xl border ${captcha.image ? 'border-slate-200' : 'border-dashed border-slate-200'} bg-slate-50`}>
                  {captcha.image ? (
                    <button type="button" onClick={refreshCaptcha} className="group relative shrink-0" title="点击刷新" tabIndex={-1}>
                      <img src={captcha.image} alt="captcha" className="h-12 w-auto max-w-[140px] object-contain" />
                      <div className="absolute inset-0 flex items-center justify-center rounded-l-xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <i className="fa-solid fa-rotate-right text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-12 w-32 items-center justify-center">
                      <i className="fa-solid fa-spinner fa-spin text-slate-400" />
                    </div>
                  )}
                  <input value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder={t(lang, 'login.captcha.placeholder')}
                    className="flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" required />
                </div>
              </div>
            )}

            {showTurnstile && <div ref={turnstileContainerRef} id="turnstile-widget" />}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <i className="fa-solid fa-circle-exclamation shrink-0" /><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-400 active:scale-[0.98] disabled:opacity-60">
              {loading ? <><i className="fa-solid fa-spinner fa-spin" /> {t(lang, 'login.loading')}</>
                       : <><i className="fa-solid fa-right-to-bracket" /> {t(lang, 'login.submit')}</>}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">{siteCopyright || `© ${siteTitle} · v${packageInfo.version} · Cloudflare Pages`}</p>
      </div>
    </div>
  );
}
