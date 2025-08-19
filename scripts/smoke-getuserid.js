// Smoke test for getUserId helper integration
// This script should be run in browser console after login to verify getUserId functionality

(async () => {
  console.log("🧪 Starting getUserId smoke test...");
  
  try {
    // Check if getUserId is available on window
    if (!window.getUserId) {
      console.error("❌ FAIL: window.getUserId is not available");
      return;
    }
    console.log("✅ window.getUserId is available");
    
    // Test getUserId functionality
    const id = await window.getUserId();
    
    if (!id) {
      console.warn("⚠️  WARN: getUserId returned null - user might not be logged in");
    } else {
      console.log("✅ SMOKE TEST USER ID:", id);
      console.log("✅ PASS: getUserId helper is working correctly");
    }
    
    // Test cache clearing functionality
    if (!window.clearUserIdCache) {
      console.error("❌ FAIL: window.clearUserIdCache is not available");
      return;
    }
    console.log("✅ window.clearUserIdCache is available");
    
    console.log("🎉 Smoke test completed successfully!");
    
  } catch (error) {
    console.error("❌ FAIL: Smoke test failed with error:", error);
  }
})();
