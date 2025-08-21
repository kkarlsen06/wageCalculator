const hashFragment = window.location.hash;
const searchParams = window.location.search;
const urlParams = new URLSearchParams(searchParams);
const fullUrl = window.location.href;

const hasRecoveryInHash = hashFragment.includes('access_token') && hashFragment.includes('type=recovery');
const hasRecoveryInSearch = searchParams.includes('access_token') && searchParams.includes('type=recovery');
const hasLegacyRecovery = urlParams.has('token') && urlParams.get('type') === 'recovery';

if (hasRecoveryInHash || hasRecoveryInSearch || hasLegacyRecovery) {
  const redirectTarget = '/kalkulator/login.html';
  if (hasRecoveryInHash) {
    window.location.href = redirectTarget + hashFragment;
  } else {
    window.location.href = redirectTarget + searchParams;
  }
}
