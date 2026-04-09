export function ThemeScript() {
  const script = `
    (function() {
      try {
        var saved = localStorage.getItem('doclair-theme');
        var dark = window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;
        var resolved =
          saved === 'dark'  ? 'dark'  :
          saved === 'light' ? 'light' :
          dark              ? 'dark'  : 'light';
        document.documentElement.setAttribute('data-theme', resolved);
      } catch(e) {}
    })();
  `
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
