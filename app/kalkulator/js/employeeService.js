/**
 * Employee Data Service
 * Handles all employee-related API calls, caching, and data management
 * Following PLACEHOLDER_EMPLOYEES_V1 ruleset
 */

import { API_BASE } from '../../src/js/apiBase.js';

export class EmployeeService {
    constructor(apiBase = (window.CONFIG?.apiBase || API_BASE || '/api')) {
        this.apiBase = apiBase;
        this.cache = new Map();
        // Avatars removed
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
            const url = new URL(`${this.apiBase}/employees`, window.location.origin);
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

    // Avatar upload/read methods removed

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
        // Avatars removed
    }
}

// Create singleton instance
export const employeeService = new EmployeeService();
