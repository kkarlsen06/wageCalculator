// Simple smoke test to assert SPA pages render non-empty HTML strings
import { pathToFileURL } from 'url';
import { resolve } from 'path';

async function load(modulePath) {
  const url = pathToFileURL(resolve(modulePath)).href;
  return import(url);
}

async function main() {
  const loginMod = await load('app/src/pages/login.js');
  const onboardingMod = await load('app/src/pages/onboarding.js');

  const loginHtml = await loginMod.renderLogin();
  if (typeof loginHtml !== 'string' || loginHtml.trim().length < 50) {
    throw new Error('renderLogin() returned empty/invalid HTML');
  }

  const onboardHtml = await onboardingMod.renderOnboarding();
  if (typeof onboardHtml !== 'string' || onboardHtml.trim().length < 50) {
    throw new Error('renderOnboarding() returned empty/invalid HTML');
  }

  console.log('OK: SPA page renderers return non-empty HTML');
}

main().catch((e) => { console.error(e); process.exit(1); });

