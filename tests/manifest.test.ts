import {
  normalizeViewId,
  routePathToViewId,
  isBrowserForbiddenTokenId,
} from '../src/manifest';
import { matchPathToKey } from '../src/patterns';

describe('manifest utilities', () => {
  it('normalizes view ids', () => {
    expect(normalizeViewId('App.Dashboard')).toBe('app.dashboard');
    expect(normalizeViewId('bad id!')).toBeNull();
  });

  it('maps routes to view ids', () => {
    expect(routePathToViewId('/')).toBe('route.home');
    expect(routePathToViewId('/users/:id/edit')).toBe('route.users.id.edit');
  });

  it('rejects security token range for browser mapping', () => {
    expect(isBrowserForbiddenTokenId(1002)).toBe(true);
    expect(isBrowserForbiddenTokenId(805)).toBe(false);
  });
});

describe('matchPathToKey', () => {
  it('matches globs to view keys', () => {
    const map = { '/app/*': 'app.shell', '/app/settings': 'app.settings' };
    expect(matchPathToKey('/app/dashboard', map)).toBe('app.shell');
    expect(matchPathToKey('/app/settings', map)).toBe('app.settings');
  });
});
