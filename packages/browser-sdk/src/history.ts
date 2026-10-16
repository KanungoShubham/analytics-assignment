/** Calls onChange after pushState/replaceState/popstate (client-side navigation in SPAs like Next.js). */
export function watchLocation(onChange: () => void): () => void {
  const { pushState, replaceState } = history;
  // Run after the router has updated the page (and usually document.title).
  const notify = () => setTimeout(onChange, 0);

  history.pushState = function (...args: Parameters<History['pushState']>) {
    const result = pushState.apply(this, args);
    notify();
    return result;
  };
  history.replaceState = function (...args: Parameters<History['replaceState']>) {
    const result = replaceState.apply(this, args);
    notify();
    return result;
  };
  window.addEventListener('popstate', notify);

  return () => {
    history.pushState = pushState;
    history.replaceState = replaceState;
    window.removeEventListener('popstate', notify);
  };
}
