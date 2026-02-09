/**
 * Utility Functions
 */

const Utils = {
    /**
     * Show a toast notification
     */
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toastEl);
        
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
        
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    },
    
    /**
     * Show confirmation modal
     */
    showConfirm(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmModalTitle');
        const bodyEl = document.getElementById('confirmModalBody');
        const actionBtn = document.getElementById('confirmModalAction');
        
        titleEl.textContent = title;
        bodyEl.textContent = message;
        
        // Remove old event listeners by cloning
        const newActionBtn = actionBtn.cloneNode(true);
        actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);
        
        newActionBtn.addEventListener('click', () => {
            onConfirm();
            bootstrap.Modal.getInstance(modal).hide();
        });
        
        const confirmModal = new bootstrap.Modal(modal);
        confirmModal.show();
    },
    
    /**
     * Format numbers with proper decimals
     */
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined) return 'N/A';
        if (typeof num !== 'number') return num;
        return num.toFixed(decimals);
    },
    
    /**
     * Format large numbers with commas
     */
    formatInteger(num) {
        if (num === null || num === undefined) return 'N/A';
        return num.toLocaleString();
    },
    
    /**
     * Format datetime strings
     */
    formatDateTime(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString();
    },
    
    /**
     * Format time ago
     */
    timeAgo(dateStr) {
        if (!dateStr) return 'N/A';
        
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    },
    
    /**
     * Get category color class
     */
    getCategoryColor(category) {
        const colorMap = {
            'EEG': 'eeg',
            'HRV': 'hrv',
            'Blood': 'blood',
            'Saliva': 'saliva',
            'Urine': 'urine',
            'CSF': 'csf',
            'Sweat': 'sweat',
            'Hair': 'hair',
            'Scales': 'scales',
            'Wearable': 'wearable',
            'Other': 'other'
        };
        return colorMap[category] || 'other';
    },
    
    /**
     * Download JSON as file
     */
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    /**
     * Download CSV
     */
    downloadCSV(data, filename) {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Make Utils available globally
window.Utils = Utils;
