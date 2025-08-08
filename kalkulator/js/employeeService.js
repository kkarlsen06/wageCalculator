/**
 * Employee Data Service
 * Handles all employee-related API calls, caching, and data management
 * Following PLACEHOLDER_EMPLOYEES_V1 ruleset
 */

export class EmployeeService {
    constructor(apiBase = window.CONFIG?.apiBase || 'http://localhost:5173') {
        this.apiBase = apiBase;
        this.cache = new Map();
        this.avatarCache = new Map();
        this.loadingStates = new Map();
    }

    /**
     * Get authentication headers for API requests
     * @returns {Object} Headers object with authorization
     */
    async getAuthHeaders() {
        try {
            const { data: { session } } = await window.supa.auth.getSession();
            if (!session?.access_token) {
                throw new Error('No valid session found');
            }
            return {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            console.error('Error getting auth headers:', error);
            throw new Error('Authentication required');
        }
    }

    /**
     * Fetch all employees for the authenticated manager
     * @param {boolean} includeArchived - Include archived employees
     * @returns {Promise<Array>} Array of employee objects
     */
    async fetchEmployees(includeArchived = false) {
        const cacheKey = `employees_${includeArchived}`;
        
        // Return cached data if available and fresh (5 minutes)
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
            return cached.data;
        }

        try {
            this.setLoadingState('fetchEmployees', true);
            
            const headers = await this.getAuthHeaders();
            const url = new URL(`${this.apiBase}/employees`);
            if (includeArchived) {
                url.searchParams.set('include_archived', '1');
            }

            const response = await fetch(url, { headers });

            if (!response.ok) {
                // Treat 404 as "no employees API available" and return empty list
                if (response.status === 404) {
                    console.info('Employees API not available (404). Continuing without employees.');
                    return [];
                }
                throw new Error(`Failed to fetch employees: ${response.status} ${response.statusText}`);
            }

            const result = await response.json().catch(() => ({ employees: [] }));
            const employees = result.employees || [];

            // Cache the result
            this.cache.set(cacheKey, {
                data: employees,
                timestamp: Date.now()
            });

            return employees;

        } catch (error) {
            console.error('Error fetching employees:', error);
            throw error;
        } finally {
            this.setLoadingState('fetchEmployees', false);
        }
    }

    /**
     * Create a new employee
     * @param {Object} employeeData - Employee data object
     * @returns {Promise<Object>} Created employee object
     */
    async createEmployee(employeeData) {
        try {
            this.setLoadingState('createEmployee', true);
            
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.apiBase}/employees`, {
                method: 'POST',
                headers,
                body: JSON.stringify(employeeData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to create employee: ${response.status}`);
            }

            const result = await response.json();
            
            // Invalidate cache
            this.invalidateEmployeeCache();
            
            return result.employee;

        } catch (error) {
            console.error('Error creating employee:', error);
            throw error;
        } finally {
            this.setLoadingState('createEmployee', false);
        }
    }

    /**
     * Update an existing employee
     * @param {string} employeeId - Employee ID
     * @param {Object} employeeData - Updated employee data
     * @returns {Promise<Object>} Updated employee object
     */
    async updateEmployee(employeeId, employeeData) {
        try {
            this.setLoadingState('updateEmployee', true);
            
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.apiBase}/employees/${employeeId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(employeeData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to update employee: ${response.status}`);
            }

            const result = await response.json();
            
            // Invalidate cache
            this.invalidateEmployeeCache();
            
            return result.employee;

        } catch (error) {
            console.error('Error updating employee:', error);
            throw error;
        } finally {
            this.setLoadingState('updateEmployee', false);
        }
    }

    /**
     * Archive (soft delete) an employee
     * @param {string} employeeId - Employee ID
     * @returns {Promise<void>}
     */
    async archiveEmployee(employeeId) {
        try {
            this.setLoadingState('archiveEmployee', true);
            
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.apiBase}/employees/${employeeId}`, {
                method: 'DELETE',
                headers
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to archive employee: ${response.status}`);
            }

            // Invalidate cache
            this.invalidateEmployeeCache();

        } catch (error) {
            console.error('Error archiving employee:', error);
            throw error;
        } finally {
            this.setLoadingState('archiveEmployee', false);
        }
    }

    /**
     * Get signed upload URL for employee avatar
     * @param {string} employeeId - Employee ID
     * @returns {Promise<Object>} Upload URL and fields
     */
    async getAvatarUploadUrl(employeeId) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.apiBase}/employees/${employeeId}/avatar-upload-url`, {
                method: 'POST',
                headers
            });

            if (!response.ok) {
                throw new Error(`Failed to get upload URL: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Error getting avatar upload URL:', error);
            throw error;
        }
    }

    /**
     * Get signed read URL for employee avatar
     * @param {string} employeeId - Employee ID
     * @returns {Promise<string>} Avatar URL
     */
    async getAvatarReadUrl(employeeId) {
        // Check cache first
        const cached = this.avatarCache.get(employeeId);
        if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 minutes
            return cached.url;
        }

        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.apiBase}/employees/${employeeId}/avatar-read-url`, {
                headers
            });

            if (!response.ok) {
                throw new Error(`Failed to get avatar URL: ${response.status}`);
            }

            const result = await response.json();
            const avatarUrl = result.avatar_url;

            // Cache the URL
            this.avatarCache.set(employeeId, {
                url: avatarUrl,
                timestamp: Date.now()
            });

            return avatarUrl;

        } catch (error) {
            console.error('Error getting avatar read URL:', error);
            return null; // Return null for missing avatars
        }
    }

    /**
     * Upload employee avatar
     * @param {string} employeeId - Employee ID
     * @param {File|Blob} file - Image file to upload
     * @returns {Promise<string>} Avatar URL
     */
    async uploadAvatar(employeeId, file) {
        try {
            // Get upload URL
            const uploadData = await this.getAvatarUploadUrl(employeeId);
            
            // Upload file to storage
            const formData = new FormData();
            Object.entries(uploadData.fields || {}).forEach(([key, value]) => {
                formData.append(key, value);
            });
            formData.append('file', file);

            const uploadResponse = await fetch(uploadData.url, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            // Invalidate avatar cache
            this.avatarCache.delete(employeeId);
            
            // Get new avatar URL
            return await this.getAvatarReadUrl(employeeId);

        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    }

    /**
     * Set loading state for an operation
     * @param {string} operation - Operation name
     * @param {boolean} loading - Loading state
     */
    setLoadingState(operation, loading) {
        this.loadingStates.set(operation, loading);
    }

    /**
     * Get loading state for an operation
     * @param {string} operation - Operation name
     * @returns {boolean} Loading state
     */
    isLoading(operation) {
        return this.loadingStates.get(operation) || false;
    }

    /**
     * Invalidate employee cache
     */
    invalidateEmployeeCache() {
        // Clear all employee-related cache entries
        for (const key of this.cache.keys()) {
            if (key.startsWith('employees_')) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all caches
     */
    clearAllCaches() {
        this.cache.clear();
        this.avatarCache.clear();
    }
}

// Create singleton instance
export const employeeService = new EmployeeService();
