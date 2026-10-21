export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "macro-maxxer-theme";
export const THEME_EVENT = "macro-maxxer-theme";

// Runs in the root head before paint. Light is always the first-visit
// default, independent of device appearance. Storage may be unavailable in
// private WebViews; manual selection still applies for the current session.
export const themeBootstrapScript = `(() => {
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const read = () => {
    try { return localStorage.getItem(key) === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  };
  const apply = theme => document.documentElement.classList.toggle('dark', theme === 'dark');
  apply(read());
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(read());
  });
  window.addEventListener(${JSON.stringify(THEME_EVENT)}, event => {
    const theme = event.detail;
    if (theme !== 'light' && theme !== 'dark') return;
    try { localStorage.setItem(key, theme); } catch {}
    apply(theme);
  });
})();`;

export function setTheme(theme: Theme) {
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function subscribeToTheme(onChange: () => void) {
  // The pre-paint bootstrap handles each event first, so subscribers read
  // the already-applied theme. Root layout persists through client routing.
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
