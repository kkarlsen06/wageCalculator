/*
  Offline Sync Debug Utilities
  - Console debugging tools for testing offline functionality
  - Manual queue inspection and management
  - Network simulation helpers
*/

class OfflineDebugUtils {
    constructor() {
        this.originalOnLine = navigator.onLine;
        this.networkOverride = null;
    }

    // Simulate offline mode
    async goOffline() {
        console.log('[Debug] Simulating offline mode...');
        this.networkOverride = false;
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false
        });
        window.dispatchEvent(new Event('offline'));
    }

    // Restore online mode
    async goOnline() {
        console.log('[Debug] Restoring online mode...');
        this.networkOverride = null;
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: this.originalOnLine
        });
        window.dispatchEvent(new Event('online'));
    }

    // Check queue status
    async getQueueStatus() {
        if (window.offlineQueue) {
            const count = await window.offlineQueue.getQueueCount();
            const items = await window.offlineQueue.getAllQueued();
            console.log('[Debug] Queue Status:', {
                count,
                items: items.map(item => ({
                    id: item.id,
                    method: item.method,
                    url: item.url,
                    clientId: item.clientId,
                    createdAt: new Date(item.createdAt).toISOString()
                }))
            });
            return { count, items };
        }
        console.warn('[Debug] Offline queue not available');
        return null;
    }

    // Clear all queued items
    async clearQueue() {
        if (window.offlineQueue) {
            await window.offlineQueue.clearQueue();
            console.log('[Debug] Queue cleared');
        } else {
            console.warn('[Debug] Offline queue not available');
        }
    }

    // Manually trigger sync
    async triggerSync() {
        if (window.offlineSyncManager) {
            console.log('[Debug] Manually triggering sync...');
            await window.offlineSyncManager.triggerSync();
        } else {
            console.warn('[Debug] Offline sync manager not available');
        }
    }

    // Create a test shift while offline
    async createTestShift() {
        const wasOffline = this.networkOverride === false;
        if (!wasOffline) {
            await this.goOffline();
        }

        try {
            console.log('[Debug] Creating test shift while offline...');
            
            const apiBase = window.CONFIG?.apiBase || '';
            const response = await fetch(`${apiBase}/shifts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    shift_date: new Date().toISOString().split('T')[0],
                    start_time: '09:00',
                    end_time: '17:00',
                    notes: 'Test shift created offline'
                })
            });

            console.log('[Debug] Test shift response:', response.status, response.statusText);
            
            if (response.ok) {
                const data = await response.json();
                console.log('[Debug] Test shift queued:', data);
            }

        } catch (error) {
            console.error('[Debug] Error creating test shift:', error);
        } finally {
            if (!wasOffline) {
                await this.goOnline();
            }
        }
    }

    // Check service worker status
    async checkServiceWorker() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            console.log('[Debug] Service Worker Status:', {
                registered: !!registration,
                active: !!registration?.active,
                waiting: !!registration?.waiting,
                installing: !!registration?.installing,
                scope: registration?.scope,
                supportsSync: registration && 'sync' in registration,
                supportsPeriodicSync: registration && 'periodicSync' in registration
            });
            return registration;
        } else {
            console.warn('[Debug] Service Worker not supported');
            return null;
        }
    }

    // Check IndexedDB status
    async checkIndexedDB() {
        try {
            const databases = await indexedDB.databases();
            const wcOffline = databases.find(db => db.name === 'wc-offline');
            console.log('[Debug] IndexedDB Status:', {
                supported: true,
                wcOfflineExists: !!wcOffline,
                version: wcOffline?.version,
                allDatabases: databases.map(db => ({ name: db.name, version: db.version }))
            });
        } catch (error) {
            console.error('[Debug] Error checking IndexedDB:', error);
        }
    }

    // Run comprehensive offline test
    async runFullTest() {
        console.log('[Debug] ==========================================');
        console.log('[Debug] Running comprehensive offline sync test');
        console.log('[Debug] ==========================================');

        // 1. Check initial state
        await this.checkServiceWorker();
        await this.checkIndexedDB();
        await this.getQueueStatus();

        // 2. Test offline creation
        console.log('[Debug] Step 1: Testing offline shift creation...');
        await this.createTestShift();
        await this.getQueueStatus();

        // 3. Test sync
        console.log('[Debug] Step 2: Testing sync...');
        await this.goOnline();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for online event
        await this.triggerSync();
        
        // 4. Check final state
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for sync to complete
        await this.getQueueStatus();

        console.log('[Debug] ==========================================');
        console.log('[Debug] Full test completed');
        console.log('[Debug] ==========================================');
    }

    // Monitor network events
    startNetworkMonitoring() {
        window.addEventListener('online', () => {
            console.log('[Debug] Network: ONLINE event fired');
        });

        window.addEventListener('offline', () => {
            console.log('[Debug] Network: OFFLINE event fired');
        });

        // Monitor service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('[Debug] SW Message:', event.data);
            });
        }

        console.log('[Debug] Network monitoring started');
    }
}

// Create singleton and attach to window
const debugUtils = new OfflineDebugUtils();

if (typeof window !== 'undefined') {
    window.offlineDebugUtils = debugUtils;
    
    // Auto-start monitoring
    debugUtils.startNetworkMonitoring();
    
    // Add console shortcuts
    window.debugOffline = {
        goOffline: () => debugUtils.goOffline(),
        goOnline: () => debugUtils.goOnline(),
        status: () => debugUtils.getQueueStatus(),
        clear: () => debugUtils.clearQueue(),
        sync: () => debugUtils.triggerSync(),
        test: () => debugUtils.createTestShift(),
        fullTest: () => debugUtils.runFullTest(),
        checkSW: () => debugUtils.checkServiceWorker(),
        checkDB: () => debugUtils.checkIndexedDB()
    };

    console.log(`
[Debug] Offline Debug Utils loaded!

Quick commands:
- debugOffline.goOffline()  // Simulate offline mode
- debugOffline.goOnline()   // Restore online mode  
- debugOffline.status()     // Check queue status
- debugOffline.test()       // Create test shift offline
- debugOffline.sync()       // Manually trigger sync
- debugOffline.fullTest()   // Run comprehensive test
- debugOffline.clear()      // Clear queue
- debugOffline.checkSW()    // Check service worker
- debugOffline.checkDB()    // Check IndexedDB

Example workflow:
1. debugOffline.goOffline()
2. Create shifts in UI or via debugOffline.test()
3. debugOffline.status() // See queued items
4. debugOffline.goOnline()
5. debugOffline.sync() // Process queue
6. debugOffline.status() // Verify queue cleared
    `);
}

export default debugUtils;