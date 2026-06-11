'use client';
import { useEffect, useState } from 'react';

// Registers the service worker (production only) and shows a subtle
// "Add to home screen" banner when Chrome/Android fires beforeinstallprompt.
// iOS has no programmatic prompt — the apple-* meta tags handle its A2HS flow.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    let dismissed = false;
    try {
      dismissed = localStorage.getItem('a2hs-dismissed') === '1';
    } catch (e) {}

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      if (!dismissed) setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
      setDeferred(null);
      try {
        localStorage.setItem('a2hs-dismissed', '1');
      } catch (e) {}
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!show) return null;

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch (e) {}
    setShow(false);
    setDeferred(null);
  };

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem('a2hs-dismissed', '1');
    } catch (e) {}
  };

  return (
    <div className="fixed inset-x-0 bottom-[68px] z-50 px-4">
      <div className="mx-auto flex max-w-content items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg">
        <span className="h-8 w-8 shrink-0 rounded-md bg-accent" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-medium text-ink">Install MIT Dining Ops</p>
          <p className="m-0 text-[11px] text-muted">Add to your home screen for quick access.</p>
        </div>
        <button onClick={dismiss} className="rounded-lg px-2.5 py-1.5 text-[12px] text-muted hover:text-ink">
          Not now
        </button>
        <button onClick={install} className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-white">
          Add
        </button>
      </div>
    </div>
  );
}
