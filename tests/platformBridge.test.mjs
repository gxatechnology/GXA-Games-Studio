import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const start = code.indexOf('class PlatformBridge {');
const end = code.indexOf('const platformSDK = new PlatformBridge();',start);
assert.ok(start >= 0 && end > start, 'PlatformBridge source exists');

function makeBridge(adAdapter) {
  const store = new Map();
  const mockWindow = { GXAAdAdapter: adAdapter };
  const context = { window: mockWindow, localStorage: {
    getItem: k => store.get(k) ?? null,
    setItem: (k,v) => store.set(k,v),
  }, console };
  vm.runInNewContext(code.slice(start,end) + '\nthis.PlatformBridge = PlatformBridge;', context);
  return { bridge: new context.PlatformBridge(), store };
}

test('no SDK: rewarded ad cannot issue fake coins', async () => {
  const {bridge} = makeBridge(null);
  assert.equal(bridge.hasRewardedAds(), false);
  let awarded;
  await bridge.requestRewardedAd(v => { awarded = v; });
  assert.equal(awarded, false);
});

test('no SDK: replay continues without fake interstitial', async () => {
  const {bridge} = makeBridge(null);
  let shown;
  await bridge.requestInterstitialAd(v => { shown = v; });
  assert.equal(shown, false);
});

test('reward requires verified true SDK completion', async () => {
  const {bridge} = makeBridge({showRewarded: async () => true});
  assert.equal(bridge.hasRewardedAds(), true);
  let rewarded;
  await bridge.requestRewardedAd(v => { rewarded = v; });
  assert.equal(rewarded, true);
});

test('rejected rewarded SDK call never awards coins', async () => {
  const {bridge} = makeBridge({showRewarded: async () => {throw Error('blocked')}});
  let rewarded;
  await bridge.requestRewardedAd(v => { rewarded = v; });
  assert.equal(rewarded, false);
});

test('high-score storage only increases', () => {
  const {bridge,store} = makeBridge(null);
  bridge.submitScore('quick_2',22);
  bridge.submitScore('quick_2',10);
  assert.equal(store.get('gxa_cricket_hs_quick_2'),'22');
});
