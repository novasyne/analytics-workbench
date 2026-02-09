/**
 * API Client
 */

const API = {
    /**
     * Upload CSV file
     */
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        return await response.json();
    },

    /**
     * Get data preview
     */
    async getDataPreview() {
        const response = await fetch('/api/data/preview');

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get data preview');
        }

        return await response.json();
    },

    /**
     * Get data summary statistics
     */
    async getDataSummary() {
        const response = await fetch('/api/data/summary');

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get data summary');
        }

        return await response.json();
    },

    /**
     * Get analysis history
     */
    async getHistory() {
        const response = await fetch('/api/history');

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get history');
        }

        return await response.json();
    },

    /**
     * Download analysis history
     */
    async downloadHistory() {
        const response = await fetch('/api/history/download');

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to download history');
        }

        return await response.json();
    },

    /**
     * Clear analysis history
     */
    async clearHistory() {
        const response = await fetch('/api/history/clear', {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to clear history');
        }

        return await response.json();
    },

    /**
     * Clear session
     */
    async clearSession() {
        const response = await fetch('/api/session/clear', {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to clear session');
        }

        return await response.json();
    },

    /**
     * Generate distribution visualization
     */
    async generateDistribution(biomarker, plotType, groupBy = null) {
        const response = await fetch('/api/visualize/distribution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                biomarker: biomarker,
                plot_type: plotType,
                group_by: groupBy
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate distribution');
        }

        return await response.json();
    },

    /**
     * Generate correlation matrix
     */
    async generateCorrelation(method, categoryFilter = null, minValue = 0) {
        const response = await fetch('/api/visualize/correlation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: method,
                category_filter: categoryFilter,
                min_value: minValue
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate correlation');
        }

        return await response.json();
    },

    /**
     * Analyze missing data
     */
    async analyzeMissing(viewType, threshold = 0) {
        const response = await fetch('/api/visualize/missing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                view_type: viewType,
                threshold: threshold
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to analyze missing data');
        }

        return await response.json();
    },

    /**
     * Compare groups
     */
    async compareGroups(biomarker, groupBy, plotType) {
        const response = await fetch('/api/visualize/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                biomarker: biomarker,
                group_by: groupBy,
                plot_type: plotType
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to compare groups');
        }

        return await response.json();
    },

    /**
     * Run statistical test
     */
    async runStatisticalTest(biomarker, testType, groupBy, correction = 'none', paired = false) {
        const response = await fetch('/api/statistics/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                biomarker: biomarker,
                test_type: testType,
                group_by: groupBy,
                correction: correction,
                paired: paired
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to run statistical test');
        }

        return await response.json();
    },

    /**
     * Run batch statistical tests
     */
    async runBatchTests(biomarkers, testType, groupBy, correction = 'none') {
        const response = await fetch('/api/statistics/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                biomarkers: biomarkers,
                test_type: testType,
                group_by: groupBy,
                correction: correction
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to run batch tests');
        }

        return await response.json();
    },

    /**
     * Run PCA
     */
    async runPCA(variables, nComponents) {
        const response = await fetch('/api/advanced/pca', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variables: variables,
                n_components: nComponents
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to run PCA');
        }

        return await response.json();
    },

    /**
     * Run spectral analysis
     */
    async runSpectral(variable, samplingRate) {
        const response = await fetch('/api/timeseries/spectral', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variable: variable,
                sampling_rate: samplingRate
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to run spectral analysis');
        }

        return await response.json();
    },

    /**
     * Detect changepoints
     */
    async detectChangepoints(variable, threshold) {
        const response = await fetch('/api/timeseries/changepoint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variable: variable,
                threshold: threshold
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to detect changepoints');
        }

        return await response.json();
    },

    /**
     * Run longitudinal analysis
     */
    async runLongitudinal(variable, timeColumn, groupColumn) {
        const response = await fetch('/api/timeseries/longitudinal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variable: variable,
                time_column: timeColumn,
                group_column: groupColumn
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to run longitudinal analysis');
        }

        return await response.json();
    },

    /**
     * Run cross-domain analysis
     */
    async runCrossDomain(method, minCorrelation) {
        const response = await fetch('/api/analysis/cross_domain', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: method,
                min_correlation: minCorrelation
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to run cross-domain analysis');
        }

        return await response.json();
    },

    /**
     * Normalize features
     */
    async normalizeFeatures(columns, method) {
        const response = await fetch('/api/features/normalize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                columns: columns,
                method: method
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to normalize features');
        }

        return await response.json();
    },

    /**
     * Create composite score
     */
    async createComposite(columns, method, name, weights = null) {
        const response = await fetch('/api/features/composite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                columns: columns,
                method: method,
                name: name,
                weights: weights
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create composite score');
        }

        return await response.json();
    }
};

// Make API available globally
window.API = API;
