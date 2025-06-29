const mongoose = require('mongoose');

class PermissionCache {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = 0;
    }

    // Get all permissions from cache or database
    async getAllPermissions() {
        const now = Date.now();
        
        // Check if cache is still valid
        if (this.cache.size > 0 && (now - this.lastCacheUpdate) < this.cacheExpiry) {
            return Array.from(this.cache.values());
        }

        // Refresh cache from database
        await this.refreshCache();
        return Array.from(this.cache.values());
    }

    // Refresh cache from database
    async refreshCache() {
        try {
            const permissions = await mongoose.connection.db.collection('permissions')
                .find({})
                .toArray();

            // Clear existing cache
            this.cache.clear();

            // Populate cache
            permissions.forEach(permission => {
                this.cache.set(permission.name, permission);
            });

            this.lastCacheUpdate = Date.now();
            console.log(`Permission cache refreshed with ${permissions.length} permissions`);
        } catch (error) {
            console.error('Error refreshing permission cache:', error);
        }
    }

    // Get specific permission by name
    async getPermissionByName(name) {
        const permissions = await this.getAllPermissions();
        return permissions.find(p => p.name === name);
    }

    // Check if permission exists
    async hasPermission(name) {
        const permissions = await this.getAllPermissions();
        return permissions.some(p => p.name === name);
    }

    // Clear cache manually
    clearCache() {
        this.cache.clear();
        this.lastCacheUpdate = 0;
    }
}

// Export singleton instance
module.exports = new PermissionCache(); 