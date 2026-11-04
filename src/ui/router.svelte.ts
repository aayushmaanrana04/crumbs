export const ROUTES = ['library', 'search', 'projects', 'project', 'ask', 'settings', 'doc'] as const;
export type Route = (typeof ROUTES)[number];

interface RouteState {
  route: Route;
  /** Path segment after the route name, e.g. the document id in #/doc/<id>. */
  param: string;
  query: URLSearchParams;
}

function parseHash(): RouteState {
  const [path = '', search = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [name = '', ...rest] = path.split('/');
  // "research" was the old name of the projects page.
  const known = name === 'research' ? 'projects' : name;
  const route = (ROUTES as readonly string[]).includes(known) ? (known as Route) : 'library';
  return { route, param: decodeURIComponent(rest.join('/')), query: new URLSearchParams(search) };
}

export const router = $state(parseHash());

window.addEventListener('hashchange', () => {
  Object.assign(router, parseHash());
});

export function docHref(docId: string, passage?: { start: number; end: number }): string {
  const query = passage ? `?p=${passage.start}-${passage.end}` : '';
  return `#/doc/${encodeURIComponent(docId)}${query}`;
}
