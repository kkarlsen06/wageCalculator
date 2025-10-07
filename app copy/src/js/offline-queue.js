/*
  Offline Queue Manager for Shift Mutations
  - IndexedDB wrapper for queuing shift operations while offline
  - Background sync integration for automatic retry when online
  - De-duplication and idempotency support
*/

class OfflineQueueManager {
    constructor(dbName = 'wc-offline', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create shiftQueue object store
                if (!db.objectStoreNames.contains('shiftQueue')) {
                    const shiftQueueStore = db.createObjectStore('shiftQueue', { keyPath: 'id', autoIncrement: true });
                    shiftQueueStore.createIndex('createdAt', 'createdAt', { unique: false });
                    shiftQueueStore.createIndex('clientId', 'clientId', { unique: false });
                }
                
                // Create meta object store for versioning/migrations
                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta', { keyPath: 'key' });
                }
            };
        });
    }

    generateClientId() {
        return 'client-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
    }

    async addToQueue(method, url, body = null, headersNeeded = {}) {
        await this.init();
        
        const clientId = this.generateClientId();
        const queueItem = {
            method,
            url,
            body: body ? JSON.stringify(body) : null,
            headersNeeded: JSON.stringify(headersNeeded),
            clientId,
            createdAt: Date.now()
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['shiftQueue'], 'readwrite');
            const store = transaction.objectStore('shiftQueue');
            const request = store.add(queueItem);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve({ id: request.result, clientId });
        });
    }

    async getAllQueued() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['shiftQueue'], 'readonly');
            const store = transaction.objectStore('shiftQueue');
            const index = store.index('createdAt');
            const request = index.getAll();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async deleteFromQueue(id) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['shiftQueue'], 'readwrite');
            const store = transaction.objectStore('shiftQueue');
            const request = store.delete(id);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async clearQueue() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['shiftQueue'], 'readwrite');
            const store = transaction.objectStore('shiftQueue');
            const request = store.clear();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async getQueueCount() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['shiftQueue'], 'readonly');
            const store = transaction.objectStore('shiftQueue');
            const request = store.count();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async setMeta(key, value) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['meta'], 'readwrite');
            const store = transaction.objectStore('meta');
            const request = store.put({ key, value });
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async getMeta(key) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['meta'], 'readonly');
            const store = transaction.objectStore('meta');
            const request = store.get(key);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
        });
    }
}

// Singleton instance
const offlineQueue = new OfflineQueueManager();

// Export for global access
if (typeof window !== 'undefined') {
    window.OfflineQueueManager = OfflineQueueManager;
    window.offlineQueue = offlineQueue;
}

export default offlineQueue;
export { OfflineQueueManager };