/**
 * Main Application Logic
 */

const App = {
    currentData: null,
    metadata: null,
    dataTable: null,

    /**
     * Initialize application
     */
    init() {
        this.bindEvents();
        this.loadHistory();
    },



    /**
     * Bind event listeners
     */
    bindEvents() {
        // Import button
        document.getElementById('btnImport').addEventListener('click', () => {
            this.showImportModal();
        });

        document.getElementById('btnStartImport').addEventListener('click', () => {
            this.showImportModal();
        });

        // File input
        document.getElementById('btnBrowseFile').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        document.getElementById('btnUploadDocs')?.addEventListener('click', () => {
            this.uploadDocuments();
        });

        document.getElementById('btnBuildKnowledge')?.addEventListener('click', () => {
            this.buildVectorStore();
        });

        document.getElementById('btnSendLLM')?.addEventListener('click', () => {
            this.sendLLMQuery();
        });

        document.getElementById('llmInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendLLMQuery();
            }
        });

        document.getElementById('btnClearChat')?.addEventListener('click', () => {
            document.getElementById('llmMessages').innerHTML = '';
        });

        // Load documents when modal opens
        document.getElementById('knowledgeModal')?.addEventListener('shown.bs.modal', () => {
            this.loadDocuments();
            this.checkVectorStoreStatus();
        });

        // Drag and drop
        const dropzone = document.getElementById('dropzone');

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');

            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        // Click on dropzone (but not on browse button)
        dropzone.addEventListener('click', (e) => {
            if (e.target.id !== 'btnBrowseFile') {
                document.getElementById('fileInput').click();
            }
        });

        // Summary stats button
        document.getElementById('btnSummaryStats').addEventListener('click', () => {
            this.showSummaryStats();
        });

        // History buttons
        document.getElementById('btnDownloadHistory').addEventListener('click', () => {
            this.downloadHistory();
        });

        document.getElementById('btnClearHistory').addEventListener('click', () => {
            this.clearHistory();
        });

        // Clear session
        document.getElementById('btnClearSession').addEventListener('click', () => {
            this.clearSession();
        });

        // Search biomarkers
        const searchInput = document.getElementById('searchBiomarkers');
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.filterBiomarkers(e.target.value);
        }, 300));

        // Distribution controls
        document.getElementById('btnGenerateDist').addEventListener('click', () => {
            this.generateDistribution();
        });

        // Correlation controls
        document.getElementById('btnGenerateCorr').addEventListener('click', () => {
            this.generateCorrelation();
        });

        // Missing data controls
        document.getElementById('btnGenerateMissing').addEventListener('click', () => {
            this.analyzeMissingData();
        });

        // Compare groups controls
        document.getElementById('btnGenerateCompare').addEventListener('click', () => {
            this.compareGroups();
        });

        // Statistical test controls
        document.getElementById('btnRunTest').addEventListener('click', () => {
            this.runStatisticalTest();
        });

        document.getElementById('btnRunBatchTest').addEventListener('click', () => {
            this.runBatchTests();
        });

        // Column visibility controls
        document.getElementById('btnSelectAllColumns')?.addEventListener('click', () => {
            this.selectAllColumns();
        });

        document.getElementById('btnSelectNoneColumns')?.addEventListener('click', () => {
            this.selectNoneColumns();
        });

        // Advanced analytics controls
        document.getElementById('btnRunPCA')?.addEventListener('click', () => {
            this.runPCA();
        });

        document.getElementById('btnRunSpectral')?.addEventListener('click', () => {
            this.runSpectral();
        });

        document.getElementById('btnRunChangepoint')?.addEventListener('click', () => {
            this.runChangepoint();
        });

        document.getElementById('btnRunLongitudinal')?.addEventListener('click', () => {
            this.runLongitudinal();
        });

        // Multimodal integration controls
        document.getElementById('btnRunCrossDomain')?.addEventListener('click', () => {
            this.runCrossDomain();
        });

        document.getElementById('btnNormalize')?.addEventListener('click', () => {
            this.normalizeFeatures();
        });

        document.getElementById('btnCreateComposite')?.addEventListener('click', () => {
            this.createComposite();
        });
    },

    /**
     * Show import modal
     */
    showImportModal() {
        const modal = new bootstrap.Modal(document.getElementById('importModal'));
        modal.show();

        // Reset modal state
        document.getElementById('uploadProgress').classList.add('d-none');
        document.getElementById('uploadResult').classList.add('d-none');
    },

    /**
     * Handle file upload
     */
    async handleFileUpload(file) {
        this.resetStateForNewImport();
        
        try {
            this.resetStateForNewImport();

            // Show progress
            document.getElementById('uploadProgress').classList.remove('d-none');
            document.getElementById('uploadResult').classList.add('d-none');

            // Upload file
            const result = await API.uploadFile(file);

            // Hide progress
            document.getElementById('uploadProgress').classList.add('d-none');

            if (result.success) {
                // Show success
                document.getElementById('uploadResult').innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle me-2"></i>
                        <strong>Success!</strong> Imported ${result.metadata.rows} rows and ${result.metadata.columns} columns.
                    </div>
                `;
                document.getElementById('uploadResult').classList.remove('d-none');

                // Store data
                this.currentData = result.preview;
                this.metadata = result.metadata;


                // Update UI
                this.updateDataInfo();
                this.renderBiomarkers();
                this.enableFeatures();
                this.loadHistory();

                Utils.showToast('Data imported successfully', 'success');

                // Auto-close modal after 2 seconds
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
                }, 2000);
            }
        } catch (error) {
            document.getElementById('uploadProgress').classList.add('d-none');
            document.getElementById('uploadResult').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <strong>Error!</strong> ${error.message}
                </div>
            `;
            document.getElementById('uploadResult').classList.remove('d-none');
            Utils.showToast('Upload failed: ' + error.message, 'danger');
        }
    },

    /**
     * Reset all state for fresh import
     */
    resetStateForNewImport() {
        // Destroy DataTable instance if exists
        if (this.dataTable) {
            try {
                this.dataTable.destroy();
                this.dataTable = null;
            } catch (error) {
                console.warn('Error destroying DataTable:', error);
            }
        }
        
        // Clear column visibility state
        this.visibleColumns = null;

        // Clear data
        this.currentData = null;
        this.metadata = null;
        this.currentAnalysisContext = null;
        
        // Clear all result containers
        const resultContainers = [
            'distributionChart',
            'correlationChart',
            'missingDataChart',
            'compareChart',
            'testResultsContainer',
            'advancedResultsContainer',
            'multimodalResultsContainer'
        ];
        
        resultContainers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
            }
        });
        
        // Clear LLM chat
        const llmMessages = document.getElementById('llmMessages');
        if (llmMessages) {
            llmMessages.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-robot" style="font-size: 3rem;"></i>
                    <p class="mt-2">Ask me about your analysis results</p>
                </div>
            `;
        }
        
        // Hide data info panel
        const dataInfoPanel = document.getElementById('dataInfoPanel');
        if (dataInfoPanel) {
            dataInfoPanel.classList.add('d-none');
        }
        
        // Disable all feature tabs
        const tabs = [
            'explore-tab',
            'analyze-tab', 
            'visualize-tab',
            'stats-tests-tab',
            'advanced-tab',
            'multimodal-tab'
        ];
        
        tabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) {
                tab.classList.add('disabled');
                const button = tab.querySelector('.nav-link');
                if (button) {
                    button.classList.remove('active');
                    button.disabled = true;
                }
            }
        });
        
        // Return to preview tab
        const previewTab = document.getElementById('preview-tab');
        if (previewTab) {
            const button = previewTab.querySelector('.nav-link');
            if (button) {
                button.click();
            }
        }
        
        console.log('State reset for new import');
    },


    /**
     * Update data info panel
     */
    updateDataInfo() {
        document.getElementById('dataInfoPanel').classList.remove('d-none');
        document.getElementById('currentFileName').textContent = this.metadata.filename;
        document.getElementById('rowCount').textContent = `${this.metadata.rows} rows`;
        document.getElementById('colCount').textContent = `${this.metadata.columns} cols`;
    },

    /**
     * Render biomarker categories
     */
    renderBiomarkers() {
        const panel = document.getElementById('biomarkerPanel');
        const categories = this.metadata.structure.biomarker_categories;

        // Get all columns for visibility tracking
        const allColumns = this.metadata.structure.id_columns.concat(
            this.metadata.structure.biomarker_columns
        );

        // Initialize visible columns set
        if (!this.visibleColumns) {
            this.visibleColumns = new Set(allColumns);
        }

        let html = '';

        // Add ID columns section first
        if (this.metadata.structure.id_columns.length > 0) {
            html += `
                <div class="mb-3">
                    <div class="small text-secondary mb-2">
                        <i class="bi bi-key me-1" style="font-size: 0.5rem;"></i>
                        ID COLUMNS
                    </div>
                    <div class="biomarker-list">
            `;

            this.metadata.structure.id_columns.forEach(col => {
                const isVisible = this.visibleColumns.has(col);
                html += `
                    <div class="biomarker-item ${isVisible ? 'selected' : ''}" 
                         data-biomarker="${col}" 
                         data-category="ID"
                         data-column-toggle="true">
                        <div class="biomarker-indicator other"></div>
                        <div class="biomarker-name">${col}</div>
                        <i class="bi bi-eye${isVisible ? '' : '-slash'} ms-auto text-secondary"></i>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // Add biomarker categories
        for (const [category, biomarkers] of Object.entries(categories)) {
            const colorClass = Utils.getCategoryColor(category);

            html += `
                <div class="mb-3">
                    <div class="small text-secondary mb-2">
                        <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem; color: var(--bs-${colorClass});"></i>
                        ${category.toUpperCase()}
                    </div>
                    <div class="biomarker-list">
            `;

            biomarkers.forEach(biomarker => {
                const isVisible = this.visibleColumns.has(biomarker);
                html += `
                    <div class="biomarker-item ${isVisible ? 'selected' : ''}" 
                         data-biomarker="${biomarker}" 
                         data-category="${category}"
                         data-column-toggle="true">
                        <div class="biomarker-indicator ${colorClass}"></div>
                        <div class="biomarker-name">${biomarker}</div>
                        <i class="bi bi-eye${isVisible ? '' : '-slash'} ms-auto text-secondary"></i>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        panel.innerHTML = html;

        // Add click handlers for column visibility toggle
        panel.querySelectorAll('.biomarker-item[data-column-toggle="true"]').forEach(item => {
            item.addEventListener('click', (e) => {
                const column = item.dataset.biomarker;
                const isCurrentlyVisible = this.visibleColumns.has(column);

                // Toggle visibility
                if (isCurrentlyVisible) {
                    this.visibleColumns.delete(column);
                    item.classList.remove('selected');
                } else {
                    this.visibleColumns.add(column);
                    item.classList.add('selected');
                }

                // Update eye icon
                const eyeIcon = item.querySelector('i.bi-eye, i.bi-eye-slash');
                if (eyeIcon) {
                    eyeIcon.className = `bi bi-eye${isCurrentlyVisible ? '-slash' : ''} ms-auto text-secondary`;
                }

                // Update table column visibility
                this.toggleTableColumn(column, !isCurrentlyVisible);
            });
        });
    },

    /**
     * Toggle table column visibility
     */
    toggleTableColumn(columnName, visible) {
        if (this.dataTable) {
            // Get all columns
            const columns = Object.keys(this.currentData[0]);
            const columnIndex = columns.indexOf(columnName);

            if (columnIndex !== -1) {
                // Toggle column visibility in DataTable
                const column = this.dataTable.column(columnIndex);
                column.visible(visible);
            }
        }
    },

    /**
     * Populate advanced analytics selects
     */
    populateAdvancedSelects() {
        const biomarkers = this.metadata.structure.biomarker_columns;
        const categories = this.metadata.structure.biomarker_categories;

        // PCA category filter
        const pcaCatSelect = document.getElementById('pcaCategoryFilter');
        pcaCatSelect.innerHTML = '<option value="">All Biomarkers</option>';
        for (const category in categories) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `${category} (${categories[category].length})`;
            pcaCatSelect.appendChild(option);
        }

        // Variable selects for spectral, changepoint, longitudinal
        const selects = ['spectralVariable', 'changepointVariable', 'longitudinalVariable'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Choose biomarker...</option>';
            biomarkers.forEach(biomarker => {
                const option = document.createElement('option');
                option.value = biomarker;
                option.textContent = biomarker;
                select.appendChild(option);
            });
        });

        // Time column select
        const timeSelect = document.getElementById('longitudinalTimeCol');
        const idCols = this.metadata.structure.id_columns;
        idCols.forEach(col => {
            if (col.toLowerCase().includes('time') || col.toLowerCase().includes('date')) {
                const option = document.createElement('option');
                option.value = col;
                option.textContent = col;
                timeSelect.appendChild(option);
            }
        });
    },

    /**
     * Run PCA
     */
    async runPCA() {
        try {
            const categoryFilter = document.getElementById('pcaCategoryFilter').value;
            const nComponents = parseInt(document.getElementById('pcaComponents').value);

            let variables = [];
            if (categoryFilter) {
                const categories = this.metadata.structure.biomarker_categories;
                variables = categories[categoryFilter] || [];
            }

            const result = await API.runPCA(variables, nComponents);

            if (result.success) {
                this.renderPCAResults(result.results);
                this.loadHistory();
                Utils.showToast('PCA complete', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to run PCA: ' + error.message, 'danger');
        }
    },

    /**
     * Render PCA results
     */
    renderPCAResults(results) {
        const container = document.getElementById('advancedResultsContainer');

        // Get top loadings for context
        const pc1Loadings = Object.entries(results.loadings.PC1)
            .map(([var_name, loading]) => ({ var_name, loading: Math.abs(loading), original: loading }))
            .sort((a, b) => b.loading - a.loading)
            .slice(0, 5);

        const topLoadingsList = pc1Loadings.map(l => l.var_name).join(', ');

        let html = `
        <div class="card mb-3">
            <div class="card-header">
                <h6 class="mb-0">
                    <i class="bi bi-diagram-3 me-2"></i>
                    Principal Component Analysis
                </h6>
            </div>
            <div class="card-body">
                <div class="row g-3 mb-3">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Variables</div>
                            <div class="stat-value">${results.variables.length}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Components</div>
                            <div class="stat-value">${results.n_components}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Observations</div>
                            <div class="stat-value">${results.n_observations}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Cumulative Var</div>
                            <div class="stat-value">${Utils.formatNumber(results.cumulative_variance[results.n_components - 1] * 100, 1)}%</div>
                        </div>
                    </div>
                </div>
                
                <h6 class="mb-2">Variance Explained</h6>
                <div class="table-responsive mb-3">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Component</th>
                                <th class="text-end">Variance</th>
                                <th class="text-end">% Variance</th>
                                <th class="text-end">Cumulative %</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

        for (let i = 0; i < results.n_components; i++) {
            html += `
            <tr>
                <td><strong>PC${i + 1}</strong></td>
                <td class="text-end">${Utils.formatNumber(results.explained_variance[i], 2)}</td>
                <td class="text-end">${Utils.formatNumber(results.explained_variance_ratio[i] * 100, 1)}%</td>
                <td class="text-end">${Utils.formatNumber(results.cumulative_variance[i] * 100, 1)}%</td>
            </tr>
        `;
        }

        html += `
                        </tbody>
                    </table>
                </div>
                
                <h6 class="mb-2">Top Loadings (PC1)</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Variable</th>
                                <th class="text-end">Loading</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

        // Get top 10 loadings for PC1
        const pc1LoadingsAll = Object.entries(results.loadings.PC1)
            .map(([var_name, loading]) => ({ var_name, loading: Math.abs(loading), original: loading }))
            .sort((a, b) => b.loading - a.loading)
            .slice(0, 10);

        pc1LoadingsAll.forEach(item => {
            html += `
            <tr>
                <td>${item.var_name}</td>
                <td class="text-end">${Utils.formatNumber(item.original, 3)}</td>
            </tr>
        `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
                

            </div>
        </div>
    `;

        container.innerHTML = html;
    },

    /**
     * Run spectral analysis
     */
    async runSpectral() {
        try {
            const variable = document.getElementById('spectralVariable').value;
            const samplingRate = parseFloat(document.getElementById('spectralSamplingRate').value);

            if (!variable) {
                Utils.showToast('Please select a variable', 'warning');
                return;
            }

            const result = await API.runSpectral(variable, samplingRate);

            if (result.success) {
                this.renderSpectralResults(result.results);
                this.loadHistory();
                Utils.showToast('Spectral analysis complete', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to run spectral analysis: ' + error.message, 'danger');
        }
    },

    /**
     * Render spectral results
     */
    renderSpectralResults(results) {
        const container = document.getElementById('advancedResultsContainer');

        let html = `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="bi bi-activity me-2"></i>
                        Spectral Analysis: ${results.variable}
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">Dominant Frequency</div>
                                <div class="stat-value">${Utils.formatNumber(results.dominant_frequency, 3)} Hz</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">Period</div>
                                <div class="stat-value">${results.dominant_frequency > 0 ? Utils.formatNumber(1 / results.dominant_frequency, 1) : 'N/A'} samples</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">Peak Count</div>
                                <div class="stat-value">${results.peak_frequencies.length}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="psdPlot" style="height: 400px;"></div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Plot PSD
        const trace = {
            x: results.frequencies,
            y: results.psd,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#00539f' },
            name: 'PSD'
        };

        // Mark peaks
        const peakTrace = {
            x: results.peak_frequencies,
            y: results.peak_powers,
            type: 'scatter',
            mode: 'markers',
            marker: { color: '#e74c3c', size: 10 },
            name: 'Peaks'
        };

        const layout = {
            title: {
                text: 'Power Spectral Density',
                font: { color: '#e0e0e0' }
            },
            xaxis: {
                title: 'Frequency (Hz)',
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            yaxis: {
                title: 'Power',
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' }
        };

        Plotly.newPlot('psdPlot', [trace, peakTrace], layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        });
    },

    /**
     * Run changepoint detection
     */
    async runChangepoint() {
        try {
            const variable = document.getElementById('changepointVariable').value;
            const threshold = parseFloat(document.getElementById('changepointThreshold').value);

            if (!variable) {
                Utils.showToast('Please select a variable', 'warning');
                return;
            }

            const result = await API.detectChangepoints(variable, threshold);

            if (result.success) {
                this.renderChangepointResults(result.results);
                this.loadHistory();
                Utils.showToast(`Found ${result.results.n_changepoints} changepoints`, 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to detect changepoints: ' + error.message, 'danger');
        }
    },

    /**
     * Render changepoint results
     */
    renderChangepointResults(results) {
        const container = document.getElementById('advancedResultsContainer');

        let html = `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="bi bi-graph-up me-2"></i>
                        Change Point Detection: ${results.variable}
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">Changepoints Found</div>
                                <div class="stat-value">${results.n_changepoints}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">Threshold</div>
                                <div class="stat-value">${results.threshold} SD</div>
                            </div>
                        </div>
                    </div>
                    
                    ${results.n_changepoints > 0 ? `
                    <h6 class="mb-2">Detected Changepoints</h6>
                    <div class="table-responsive mb-3">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Index</th>
                                    <th class="text-end">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${results.changepoint_indices.slice(0, 10).map((idx, i) => `
                                    <tr>
                                        <td><strong>${idx}</strong></td>
                                        <td class="text-end">${Utils.formatNumber(results.changepoint_values[i], 2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}
                    
                    <div id="changepointPlot" style="height: 400px;"></div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Plot z-scores with changepoints
        const indices = results.z_scores.map((_, i) => i);

        const trace = {
            x: indices,
            y: results.z_scores,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#00539f' },
            name: 'Z-score'
        };

        // Threshold lines
        const threshLine = {
            x: [0, indices.length - 1],
            y: [results.threshold, results.threshold],
            type: 'scatter',
            mode: 'lines',
            line: { color: '#e74c3c', dash: 'dash' },
            name: 'Threshold'
        };

        // Changepoints
        const changepointTrace = {
            x: results.changepoint_indices,
            y: results.changepoint_indices.map(idx => results.z_scores[idx]),
            type: 'scatter',
            mode: 'markers',
            marker: { color: '#e74c3c', size: 10, symbol: 'x' },
            name: 'Changepoints'
        };

        const layout = {
            title: {
                text: 'Change Point Detection',
                font: { color: '#e0e0e0' }
            },
            xaxis: {
                title: 'Index',
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            yaxis: {
                title: 'Z-score',
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' }
        };

        Plotly.newPlot('changepointPlot', [trace, threshLine, changepointTrace], layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        });
    },

    /**
     * Run longitudinal analysis
     */
    async runLongitudinal() {
        try {
            const variable = document.getElementById('longitudinalVariable').value;
            const timeCol = document.getElementById('longitudinalTimeCol').value;
            const groupCol = document.getElementById('longitudinalGroupCol').value;

            if (!variable) {
                Utils.showToast('Please select a variable', 'warning');
                return;
            }

            const result = await API.runLongitudinal(variable, timeCol, groupCol);

            if (result.success) {
                this.renderLongitudinalResults(result.results);
                this.loadHistory();
                Utils.showToast('Longitudinal analysis complete', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to run longitudinal analysis: ' + error.message, 'danger');
        }
    },

    /**
     * Render longitudinal results
     */
    renderLongitudinalResults(results) {
        const container = document.getElementById('advancedResultsContainer');

        let html = `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="bi bi-arrow-right me-2"></i>
                        Longitudinal Analysis: ${results.variable}
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-3">
                        <div class="col-md-2">
                            <div class="stat-card">
                                <div class="stat-label">Subjects</div>
                                <div class="stat-value">${results.n_subjects}</div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="stat-card">
                                <div class="stat-label">Mean Change</div>
                                <div class="stat-value">${Utils.formatNumber(results.summary.mean_change, 1)}</div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="stat-card">
                                <div class="stat-label">Mean Slope</div>
                                <div class="stat-value">${Utils.formatNumber(results.summary.mean_slope, 2)}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-label">Increasing</div>
                                <div class="stat-value text-success">${results.summary.increasing}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-label">Decreasing</div>
                                <div class="stat-value text-danger">${results.summary.decreasing}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="trajectoryPlot" style="height: 400px;"></div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Plot trajectories
        const traces = [];
        for (const [subject, traj] of Object.entries(results.trajectories)) {
            traces.push({
                x: Array.from({ length: traj.values.length }, (_, i) => i),
                y: traj.values,
                type: 'scatter',
                mode: 'lines+markers',
                name: subject,
                line: { width: 1 },
                marker: { size: 4 }
            });
        }

        const layout = {
            title: {
                text: 'Individual Trajectories',
                font: { color: '#e0e0e0' }
            },
            xaxis: {
                title: 'Time Point',
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            yaxis: {
                title: results.variable,
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' },
            showlegend: results.n_subjects <= 10
        };

        Plotly.newPlot('trajectoryPlot', traces, layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        });
    },

    /**
     * Select all columns
     */
    selectAllColumns() {
        if (!this.metadata) return;

        // Get all columns
        const allColumns = this.metadata.structure.id_columns.concat(
            this.metadata.structure.biomarker_columns
        );

        // Add all to visible set
        allColumns.forEach(col => this.visibleColumns.add(col));

        // Update UI
        document.querySelectorAll('.biomarker-item[data-column-toggle="true"]').forEach(item => {
            item.classList.add('selected');
            const eyeIcon = item.querySelector('i.bi-eye, i.bi-eye-slash');
            if (eyeIcon) {
                eyeIcon.className = 'bi bi-eye ms-auto text-secondary';
            }
        });

        // Update table
        if (this.dataTable) {
            allColumns.forEach(col => {
                this.toggleTableColumn(col, true);
            });
        }

        Utils.showToast('All columns selected', 'success');
    },

    /**
     * Select no columns (hide all)
     */
    selectNoneColumns() {
        if (!this.metadata) return;

        // Clear visible columns set
        this.visibleColumns.clear();

        // Update UI
        document.querySelectorAll('.biomarker-item[data-column-toggle="true"]').forEach(item => {
            item.classList.remove('selected');
            const eyeIcon = item.querySelector('i.bi-eye, i.bi-eye-slash');
            if (eyeIcon) {
                eyeIcon.className = 'bi bi-eye-slash ms-auto text-secondary';
            }
        });

        // Update table
        if (this.dataTable) {
            const allColumns = this.metadata.structure.id_columns.concat(
                this.metadata.structure.biomarker_columns
            );
            allColumns.forEach(col => {
                this.toggleTableColumn(col, false);
            });
        }

        Utils.showToast('All columns hidden', 'info');
    },

    /**
     * Filter biomarkers by search term
     */
    filterBiomarkers(searchTerm) {
        const items = document.querySelectorAll('.biomarker-item');
        const term = searchTerm.toLowerCase();

        items.forEach(item => {
            const biomarker = item.dataset.biomarker.toLowerCase();
            if (biomarker.includes(term)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    },

    /**
     * Enable features after data load
     */
    enableFeatures() {
        // Enable tabs by removing disabled from both the tab and its button
        const tabs = [
            'preview-tab',
            'distributions-tab',
            'correlations-tab',
            'missing-tab',
            'compare-tab',
            'stats-tests-tab',
            'advanced-tab',
            'multimodal-tab'
        ];
        
        tabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) {
                tab.classList.remove('disabled');
                tab.removeAttribute('disabled');
                
                const button = tab.querySelector('.nav-link');
                if (button) {
                    button.classList.remove('disabled');
                    button.removeAttribute('disabled');
                    button.setAttribute('data-bs-toggle', 'tab');
                }
            }
        });

        const btnSummaryStats = document.getElementById('btnSummaryStats');
        if (btnSummaryStats) {
            btnSummaryStats.disabled = false;
        }

        this.populateBiomarkerSelects();
        this.populateCategoryFilter();
        this.populateAdvancedSelects();
        this.populateMultimodalSelects();

        const previewTab = document.getElementById('preview-tab');
        if (previewTab) {
            bootstrap.Tab.getOrCreateInstance(previewTab).show();
        }

        this.renderDataPreview();
    },

    /**
     * Populate biomarker select dropdowns
     */
    populateBiomarkerSelects() {
        const biomarkers = this.metadata.structure.biomarker_columns;

        const selects = [
            'distBiomarkerSelect',
            'compareBiomarkerSelect',
            'testBiomarkerSelect'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Choose biomarker...</option>';

            biomarkers.forEach(biomarker => {
                const option = document.createElement('option');
                option.value = biomarker;
                option.textContent = biomarker;
                select.appendChild(option);
            });
        });
    },

    /**
     * Populate category filter for correlations
     */
    populateCategoryFilter() {
        const categories = this.metadata.structure.biomarker_categories;

        // Correlation filter
        const corrSelect = document.getElementById('corrCategoryFilter');
        corrSelect.innerHTML = '<option value="">All Biomarkers</option>';

        for (const category in categories) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `${category} (${categories[category].length})`;
            corrSelect.appendChild(option);
        }

        // Batch test filter
        const batchSelect = document.getElementById('batchCategoryFilter');
        batchSelect.innerHTML = '<option value="">All Biomarkers</option>';

        for (const category in categories) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `${category} (${categories[category].length})`;
            batchSelect.appendChild(option);
        }
    },

    /**
     * Render data preview table
     */
    renderDataPreview() {
        const table = document.getElementById('dataPreviewTable');

        if (!this.currentData || this.currentData.length === 0) {
            // Destroy DataTable if exists
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }
            table.innerHTML = `
                <thead></thead>
                <tbody><tr><td class="text-center py-5">No data available</td></tr></tbody>
            `;
            return;
        }

        // Get columns
        const columns = Object.keys(this.currentData[0]);

        // Initialize visible columns if not set
        if (!this.visibleColumns) {
            this.visibleColumns = new Set(columns);
        }

        // Destroy existing DataTable completely
        if (this.dataTable) {
            try {
                this.dataTable.destroy(true);  // true = remove all events and data
                this.dataTable = null;
            } catch (error) {
                console.warn('Error destroying DataTable:', error);
            }
        }

        // Clear and rebuild table structure
        $(table).empty();
        table.innerHTML = `
            <thead></thead>
            <tbody></tbody>
        `;
        
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // Build header
        let headerHtml = '<tr>';
        columns.forEach(col => {
            const isVisible = this.visibleColumns.has(col);
            headerHtml += `<th class="${isVisible ? '' : 'd-none'}" data-column="${col}">${col}</th>`;
        });
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;

        // Build body
        let bodyHtml = '';
        this.currentData.forEach(row => {
            bodyHtml += '<tr>';
            columns.forEach(col => {
                const value = row[col];
                const displayValue = typeof value === 'number' ? Utils.formatNumber(value) : value;
                const isVisible = this.visibleColumns.has(col);
                bodyHtml += `<td class="${isVisible ? '' : 'd-none'}" data-column="${col}">${displayValue !== null ? displayValue : ''}</td>`;
            });
            bodyHtml += '</tr>';
        });
        tbody.innerHTML = bodyHtml;

        // Initialize fresh DataTable
        this.dataTable = $(table).DataTable({
            pageLength: 25,
            scrollX: true,
            scrollY: 'calc(100vh - 300px)',
            scrollCollapse: true,
            dom: '<"row"<"col-sm-6"l><"col-sm-6"f>>rtip',
            columnDefs: columns.map((col, index) => ({
                targets: index,
                visible: this.visibleColumns.has(col)
            }))
        });
    },

    /**
     * Show summary statistics
     */
    async showSummaryStats() {
        const modal = new bootstrap.Modal(document.getElementById('statsModal'));
        modal.show();

        try {
            const result = await API.getDataSummary();

            if (result.success) {
                this.renderSummaryStats(result.summary);
                this.loadHistory();
            }
        } catch (error) {
            document.getElementById('statsModalContent').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${error.message}
                </div>
            `;
        }
    },

    /**
     * Render summary statistics
     */
    renderSummaryStats(summary) {
        const content = document.getElementById('statsModalContent');

        let html = `
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead>
                        <tr>
                            <th>Biomarker</th>
                            <th class="text-end">Count</th>
                            <th class="text-end">Mean</th>
                            <th class="text-end">Std Dev</th>
                            <th class="text-end">Min</th>
                            <th class="text-end">Q25</th>
                            <th class="text-end">Median</th>
                            <th class="text-end">Q75</th>
                            <th class="text-end">Max</th>
                            <th class="text-end">Missing</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const [biomarker, stats] of Object.entries(summary)) {
            html += `
                <tr>
                    <td><strong>${biomarker}</strong></td>
                    <td class="text-end">${stats.count}</td>
                    <td class="text-end">${Utils.formatNumber(stats.mean)}</td>
                    <td class="text-end">${Utils.formatNumber(stats.std)}</td>
                    <td class="text-end">${Utils.formatNumber(stats.min)}</td>
                    <td class="text-end">${Utils.formatNumber(stats.q25)}</td>
                    <td class="text-end">${Utils.formatNumber(stats.median)}</td>
                    <td class="text-end">${Utils.formatNumber(stats.q75)}</td>
                    <td class="text-end">${Utils.formatNumber(stats.max)}</td>
                    <td class="text-end">${stats.missing} (${Utils.formatNumber(stats.missing_pct, 1)}%)</td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        content.innerHTML = html;
    },

    /**
     * Load and display history
     */
    async loadHistory() {
        try {
            const result = await API.getHistory();

            if (result.success) {
                this.renderHistory(result.history);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    },

    /**
     * Render history list
     */
    renderHistory(history) {
        const container = document.getElementById('historyListContainer');

        if (!history || history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-journal-text"></i>
                    <h6>No History</h6>
                    <p class="small text-center">Your analysis steps will appear here</p>
                </div>
            `;
            return;
        }

        let html = '<div class="list-group list-group-flush">';

        // Reverse to show most recent first
        const reversed = [...history].reverse();

        reversed.forEach((entry, index) => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="history-step">
                                <i class="bi bi-arrow-right-circle me-2"></i>
                                <strong>${entry.action}</strong>
                            </div>
                            ${entry.result_summary ? `
                                <div class="history-params mt-1">
                                    ${entry.result_summary}
                                </div>
                            ` : ''}
                            ${Object.keys(entry.details).length > 0 ? `
                                <div class="history-params mt-1">
                                    ${this.formatDetails(entry.details)}
                                </div>
                            ` : ''}
                        </div>
                        <div class="history-time ms-2">
                            ${Utils.timeAgo(entry.timestamp)}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    /**
     * Format history details
     */
    formatDetails(details) {
        return Object.entries(details)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    },

    /**
     * Download history
     */
    async downloadHistory() {
        try {
            const data = await API.downloadHistory();
            const filename = `adw_history_${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadJSON(data, filename);
            Utils.showToast('History downloaded', 'success');
        } catch (error) {
            Utils.showToast('Failed to download history: ' + error.message, 'danger');
        }
    },

    /**
     * Clear history
     */
    clearHistory() {
        Utils.showConfirm(
            'Clear History',
            'Are you sure you want to clear all analysis history? This cannot be undone.',
            async () => {
                try {
                    await API.clearHistory();
                    this.loadHistory();
                    Utils.showToast('History cleared', 'success');
                } catch (error) {
                    Utils.showToast('Failed to clear history: ' + error.message, 'danger');
                }
            }
        );
    },

    /**
     * Generate distribution visualization
     */
    async generateDistribution() {
        try {
            const biomarker = document.getElementById('distBiomarkerSelect').value;
            const plotType = document.getElementById('distPlotType').value;
            const groupBy = document.getElementById('distGroupBy').value || null;

            if (!biomarker) {
                Utils.showToast('Please select a biomarker', 'warning');
                return;
            }

            const result = await API.generateDistribution(biomarker, plotType, groupBy);

            if (result.success) {
                const container = 'distributionChart';

                if (plotType === 'histogram') {
                    Visualizations.plotHistogram(container, result.data, biomarker, groupBy);
                } else if (plotType === 'box') {
                    Visualizations.plotBoxPlot(container, result.data, biomarker, groupBy);
                } else if (plotType === 'violin') {
                    Visualizations.plotViolinPlot(container, result.data, biomarker, groupBy);
                } else if (plotType === 'qq') {
                    Visualizations.plotQQPlot(container, result.data, biomarker);
                }

                this.loadHistory();
                Utils.showToast('Distribution generated', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to generate distribution: ' + error.message, 'danger');
        }
    },

    /**
     * Generate correlation matrix
     */
    async generateCorrelation() {
        try {
            const method = document.getElementById('corrMethod').value;
            const categoryFilter = document.getElementById('corrCategoryFilter').value || null;
            const minValue = parseFloat(document.getElementById('corrMinValue').value);

            const result = await API.generateCorrelation(method, categoryFilter, minValue);

            if (result.success) {
                Visualizations.plotCorrelationHeatmap('correlationChart', result.data);
                this.loadHistory();
                Utils.showToast('Correlation matrix generated', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to generate correlation: ' + error.message, 'danger');
        }
    },

    /**
     * Analyze missing data
     */
    async analyzeMissingData() {
        try {
            const viewType = document.getElementById('missingViewType').value;
            const threshold = parseFloat(document.getElementById('missingThreshold').value);

            const result = await API.analyzeMissing(viewType, threshold);

            if (result.success) {
                const container = 'missingDataChart';

                if (viewType === 'heatmap') {
                    Visualizations.plotMissingHeatmap(container, result.data);
                } else if (viewType === 'bars') {
                    Visualizations.plotMissingBars(container, result.data);
                } else if (viewType === 'summary') {
                    this.renderMissingSummary(result.data.summary);
                }

                this.loadHistory();
                Utils.showToast('Missing data analysis complete', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to analyze missing data: ' + error.message, 'danger');
        }
    },

    /**
     * Render missing data summary table
     */
    renderMissingSummary(summary) {
        const container = document.getElementById('missingDataChart');

        let html = `
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead>
                        <tr>
                            <th>Biomarker</th>
                            <th class="text-end">Missing</th>
                            <th class="text-end">Present</th>
                            <th class="text-end">% Missing</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        summary.forEach(item => {
            const colorClass = item.percentage > 50 ? 'text-danger' :
                item.percentage > 20 ? 'text-warning' :
                    'text-success';

            html += `
                <tr>
                    <td><strong>${item.biomarker}</strong></td>
                    <td class="text-end">${item.missing}</td>
                    <td class="text-end">${item.present}</td>
                    <td class="text-end ${colorClass}">${Utils.formatNumber(item.percentage, 1)}%</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Compare groups
     */
    async compareGroups() {
        try {
            const biomarker = document.getElementById('compareBiomarkerSelect').value;
            const groupBy = document.getElementById('compareGroupBy').value;
            const plotType = document.getElementById('comparePlotType').value;

            if (!biomarker) {
                Utils.showToast('Please select a biomarker', 'warning');
                return;
            }

            const result = await API.compareGroups(biomarker, groupBy, plotType);

            if (result.success) {
                const container = 'comparisonChart';

                if (plotType === 'box') {
                    Visualizations.plotBoxPlot(container, result.data, biomarker, groupBy);
                } else if (plotType === 'violin') {
                    Visualizations.plotViolinPlot(container, result.data, biomarker, groupBy);
                } else if (plotType === 'bar') {
                    Visualizations.plotComparisonBar(container, result.data, biomarker);
                }

                this.loadHistory();
                Utils.showToast('Group comparison generated', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to compare groups: ' + error.message, 'danger');
        }
    },

    /**
     * Run statistical test
     */
    async runStatisticalTest() {
        try {
            const biomarker = document.getElementById('testBiomarkerSelect').value;
            const testType = document.getElementById('testTypeSelect').value;
            const groupBy = document.getElementById('testGroupBy').value;
            const correction = document.getElementById('testCorrection').value;

            if (!biomarker) {
                Utils.showToast('Please select a biomarker', 'warning');
                return;
            }

            const result = await API.runStatisticalTest(biomarker, testType, groupBy, correction);

            if (result.success) {
                this.renderTestResults(result.results, false);
                this.loadHistory();
                Utils.showToast('Statistical test complete', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to run test: ' + error.message, 'danger');
        }
    },

    /**
     * Run batch statistical tests
     */
    async runBatchTests() {
        try {
            const categoryFilter = document.getElementById('batchCategoryFilter').value;
            const testType = document.getElementById('batchTestType').value;
            const groupBy = document.getElementById('batchGroupBy').value;
            const correction = document.getElementById('batchCorrection').value;

            // Get biomarkers to test
            let biomarkers = [];
            if (categoryFilter) {
                const categories = this.metadata.structure.biomarker_categories;
                biomarkers = categories[categoryFilter] || [];
            }

            const result = await API.runBatchTests(biomarkers, testType, groupBy, correction);

            if (result.success) {
                this.renderBatchTestResults(result);
                this.loadHistory();
                Utils.showToast(`Batch tests complete: ${result.n_significant}/${result.n_tests} significant`, 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to run batch tests: ' + error.message, 'danger');
        }
    },

    /**
     * Render single test results
     */
    renderTestResults(results, isBatch = false) {
        const container = document.getElementById('testResultsContainer');

        let html = `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">
                    <i class="bi bi-clipboard-data me-2"></i>
                    ${results.test_name}: ${results.biomarker}
                </h6>
                <span class="badge ${results.significant ? 'bg-success' : 'bg-secondary'}">
                    ${results.significance}
                </span>
            </div>
            <div class="card-body">
                <!-- Test Statistics -->
                <div class="row g-3 mb-3">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Test Statistic</div>
                            <div class="stat-value">${Utils.formatNumber(results.statistic, 4)}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">P-value</div>
                            <div class="stat-value ${results.pvalue < 0.05 ? 'text-success' : ''}">${Utils.formatNumber(results.pvalue, 4)}</div>
                        </div>
                    </div>
                    ${results.cohens_d !== undefined ? `
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Cohen's d</div>
                            <div class="stat-value">${Utils.formatNumber(results.cohens_d, 3)}</div>
                            <div class="text-micro text-secondary">${results.effect_size_interpretation}</div>
                        </div>
                    </div>
                    ` : ''}
                    ${results.hedges_g !== undefined ? `
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Hedge's g</div>
                            <div class="stat-value">${Utils.formatNumber(results.hedges_g, 3)}</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Group Statistics -->
                <h6 class="mb-2">Group Statistics</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Group</th>
                                <th class="text-end">N</th>
                                <th class="text-end">Mean</th>
                                <th class="text-end">SD</th>
                                <th class="text-end">Median</th>
                                <th class="text-end">Range</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

        const groupNames = Object.keys(results.groups);
        for (const [group, stats] of Object.entries(results.groups)) {
            html += `
            <tr>
                <td><strong>${group}</strong></td>
                <td class="text-end">${stats.n}</td>
                <td class="text-end">${Utils.formatNumber(stats.mean)}</td>
                <td class="text-end">${Utils.formatNumber(stats.std)}</td>
                <td class="text-end">${Utils.formatNumber(stats.median)}</td>
                <td class="text-end">${Utils.formatNumber(stats.min)} - ${Utils.formatNumber(stats.max)}</td>
            </tr>
        `;
        }

        html += `
                        </tbody>
                    </table>
                </div>
    `;

        // Post-hoc results if available
        if (results.posthoc && Array.isArray(results.posthoc)) {
            html += `
            <h6 class="mb-2 mt-3">Post-hoc Comparisons (Tukey HSD)</h6>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Comparison</th>
                            <th class="text-end">Mean Diff</th>
                            <th class="text-end">P-value</th>
                            <th class="text-end">95% CI</th>
                            <th>Significant</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

            results.posthoc.forEach(row => {
                html += `
                <tr>
                    <td>${row.group1} vs ${row.group2}</td>
                    <td class="text-end">${Utils.formatNumber(row.meandiff)}</td>
                    <td class="text-end ${row.pvalue < 0.05 ? 'text-success' : ''}">${Utils.formatNumber(row.pvalue, 4)}</td>
                    <td class="text-end">[${Utils.formatNumber(row.lower)}, ${Utils.formatNumber(row.upper)}]</td>
                    <td>${row.reject ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>'}</td>
                </tr>
            `;
            });

            html += `
                    </tbody>
                </table>
            </div>
        `;
        }

        html += `
                <!-- Interpretation -->
                <div class="alert ${results.significant ? 'alert-success' : 'alert-secondary'} mt-3 mb-0">
                    <strong>Interpretation:</strong> 
                    ${this.interpretTestResult(results)}
                </div>
                

            </div>
        </div>
    `;

        container.innerHTML = html;
    },

    /**
     * Render batch test results
     */
    renderBatchTestResults(data) {
        const container = document.getElementById('testResultsContainer');

        let html = `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="bi bi-list-check me-2"></i>
                        Batch Test Results
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-3">
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-label">Tests Run</div>
                                <div class="stat-value">${data.n_tests}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-label">Significant</div>
                                <div class="stat-value text-success">${data.n_significant}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-label">Correction</div>
                                <div class="stat-value text-micro">${data.correction.toUpperCase()}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-label">% Significant</div>
                                <div class="stat-value">${Utils.formatNumber(data.n_significant / data.n_tests * 100, 1)}%</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Biomarker</th>
                                    <th class="text-end">Statistic</th>
                                    <th class="text-end">P-value</th>
                                    <th class="text-end">P-adj</th>
                                    ${data.results[0]?.cohens_d !== undefined ? '<th class="text-end">Cohen\'s d</th>' : ''}
                                    <th class="text-center">Sig</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        data.results.forEach(result => {
            html += `
                <tr class="${result.significant ? 'table-success' : ''}">
                    <td><strong>${result.biomarker}</strong></td>
                    <td class="text-end">${Utils.formatNumber(result.statistic, 3)}</td>
                    <td class="text-end">${Utils.formatNumber(result.pvalue, 4)}</td>
                    <td class="text-end ${result.significant ? 'text-success' : ''}">${Utils.formatNumber(result.pvalue_corrected, 4)}</td>
                    ${result.cohens_d !== undefined ? `<td class="text-end">${Utils.formatNumber(result.cohens_d, 3)}</td>` : ''}
                    <td class="text-center">${result.significance}</td>
                </tr>
            `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-3">
                        <button class="btn btn-sm btn-outline-primary" id="btnExportBatchResults">
                            <i class="bi bi-download me-1"></i> Export Results
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Add export handler
        document.getElementById('btnExportBatchResults')?.addEventListener('click', () => {
            this.exportBatchResults(data);
        });
    },

    /**
     * Interpret test result
     */
    interpretTestResult(results) {
        if (results.significant) {
            let interpretation = `There is a statistically significant difference (p = ${Utils.formatNumber(results.pvalue, 4)}).`;

            if (results.effect_size_interpretation) {
                interpretation += ` The effect size is ${results.effect_size_interpretation} (d = ${Utils.formatNumber(results.cohens_d, 3)}).`;
            }

            return interpretation;
        } else {
            return `No statistically significant difference was found (p = ${Utils.formatNumber(results.pvalue, 4)}).`;
        }
    },

    /**
     * Export batch results
     */
    exportBatchResults(data) {
        // Convert to CSV
        let csv = 'Biomarker,Statistic,P-value,P-adjusted,Significant\n';

        data.results.forEach(result => {
            csv += `${result.biomarker},${result.statistic},${result.pvalue},${result.pvalue_corrected},${result.significant}\n`;
        });

        const filename = `batch_test_results_${new Date().toISOString().split('T')[0]}.csv`;
        Utils.downloadCSV(csv, filename);
        Utils.showToast('Results exported', 'success');
    },

    /**
     * Populate multimodal selects
     */
    populateMultimodalSelects() {
        const categories = this.metadata.structure.biomarker_categories;

        // Normalize category filter
        const normalizeSelect = document.getElementById('normalizeCategoryFilter');
        normalizeSelect.innerHTML = '<option value="">All Biomarkers</option>';

        // Composite category filter
        const compositeSelect = document.getElementById('compositeCategoryFilter');
        compositeSelect.innerHTML = '<option value="">Choose category...</option>';

        for (const category in categories) {
            const normalizeOption = document.createElement('option');
            normalizeOption.value = category;
            normalizeOption.textContent = `${category} (${categories[category].length})`;
            normalizeSelect.appendChild(normalizeOption);

            const compositeOption = document.createElement('option');
            compositeOption.value = category;
            compositeOption.textContent = `${category} (${categories[category].length})`;
            compositeSelect.appendChild(compositeOption);
        }
    },

    /**
     * Run cross-domain analysis
     */
    async runCrossDomain() {
        try {
            const method = document.getElementById('crossDomainMethod').value;
            const minCorr = parseFloat(document.getElementById('crossDomainMinCorr').value);

            const result = await API.runCrossDomain(method, minCorr);

            if (result.success) {
                this.renderNetworkGraph(result.results);
                this.loadHistory();
                Utils.showToast(`Found ${result.results.n_cross_domain} cross-domain connections`, 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to run cross-domain analysis: ' + error.message, 'danger');
        }
    },

    /**
     * Render network graph using D3.js
     */
    renderNetworkGraph(data) {
        const container = document.getElementById('multimodalResultsContainer');

        // Get domain list for context
        const domains = [...new Set(data.domain_pairs.flatMap(p => [p.domain1, p.domain2]))];
        const domainList = domains.join(', ');

        let html = `
        <div class="card mb-3">
            <div class="card-header">
                <h6 class="mb-0">
                    <i class="bi bi-diagram-3 me-2"></i>
                    Cross-Domain Biomarker Network
                </h6>
            </div>
            <div class="card-body">
                <div class="row g-3 mb-3">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Total Connections</div>
                            <div class="stat-value">${data.n_connections}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Cross-Domain</div>
                            <div class="stat-value text-success">${data.n_cross_domain}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Nodes</div>
                            <div class="stat-value">${data.nodes.length}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-label">Min |r|</div>
                            <div class="stat-value">${data.min_correlation}</div>
                        </div>
                    </div>
                </div>
                
                <div id="networkGraph" style="width: 100%; height: 500px; background: #2a2a2a; border-radius: 4px;"></div>
                
                <h6 class="mb-2 mt-3">Domain Pairs</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Domain 1</th>
                                <th>Domain 2</th>
                                <th class="text-end">Connections</th>
                                <th class="text-end">Mean |r|</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

        data.domain_pairs.forEach(pair => {
            html += `
            <tr>
                <td><strong>${pair.domain1}</strong></td>
                <td><strong>${pair.domain2}</strong></td>
                <td class="text-end">${pair.count}</td>
                <td class="text-end">${Utils.formatNumber(pair.mean_correlation, 2)}</td>
            </tr>
        `;
        });

        container.innerHTML = html;

        // Draw D3 network graph
        this.drawNetworkD3(data);
    },

    /**
     * Draw network graph with D3.js
     */
    drawNetworkD3(data) {
        const container = document.getElementById('networkGraph');
        const width = container.clientWidth;
        const height = 500;

        // Clear previous
        d3.select('#networkGraph').selectAll('*').remove();

        // Create SVG
        const svg = d3.select('#networkGraph')
            .append('svg')
            .attr('width', width)
            .attr('height', height);



        // Create container for zoom/pan
        const g = svg.append('g');

        // Define zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 10])  // Min and max zoom levels
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        // Apply zoom to SVG
        svg.call(zoom);

        // Category colors
        const categoryColors = {
            'EEG': '#3498db',
            'HRV': '#e74c3c',
            'Blood': '#e74c3c',
            'Saliva': '#f39c12',
            'Urine': '#9b59b6',
            'CSF': '#1abc9c',
            'Sweat': '#34495e',
            'Hair': '#95a5a6',
            'Scales': '#2ecc71',
            'Wearable': '#16a085',
            'Other': '#7f8c8d'
        };

        // Create simulation
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.connections).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(15));

        // Create links
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(data.connections)
            .enter().append('line')
            .attr('stroke', d => d.cross_domain ? '#e74c3c' : '#95a5a6')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.abs(d.correlation) * 3);

        // Create nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(data.nodes)
            .enter().append('circle')
            .attr('r', 8)
            .attr('fill', d => categoryColors[d.category] || '#95a5a6')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // Add labels
        const label = g.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(data.nodes)
            .enter().append('text')
            .text(d => d.id.length > 15 ? d.id.substring(0, 12) + '...' : d.id)
            .attr('font-size', '10px')
            .attr('fill', '#e0e0e0')
            .attr('dx', 12)
            .attr('dy', 4)
            .style('pointer-events', 'none');

        // Add tooltips
        node.append('title')
            .text(d => `${d.id} (${d.category})`);

        link.append('title')
            .text(d => `${d.source.id} ↔ ${d.target.id}\nr = ${d.correlation.toFixed(2)}`);

        // Highlight on hover
        node.on('mouseover', function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 12)
                .attr('stroke-width', 3);

            // Highlight connected links
            link.style('stroke-opacity', l =>
                (l.source === d || l.target === d) ? 1 : 0.1
            );

            // Highlight connected nodes
            node.style('opacity', n => {
                if (n === d) return 1;
                const connected = data.connections.some(l =>
                    (l.source === d && l.target === n) ||
                    (l.target === d && l.source === n)
                );
                return connected ? 1 : 0.3;
            });
        })
            .on('mouseout', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 8)
                    .attr('stroke-width', 1.5);

                link.style('stroke-opacity', 0.6);
                node.style('opacity', 1);
            });

        // Update positions on tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            label
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });

        // Drag functions
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // Initial zoom to fit
        setTimeout(() => {
            const bounds = g.node().getBBox();
            const fullWidth = bounds.width;
            const fullHeight = bounds.height;
            const midX = bounds.x + fullWidth / 2;
            const midY = bounds.y + fullHeight / 2;

            if (fullWidth > 0 && fullHeight > 0) {
                const scale = 0.8 / Math.max(fullWidth / width, fullHeight / height);
                const translate = [width / 2 - scale * midX, height / 2 - scale * midY];

                svg.call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
            }
        }, 1000);
    },

    /**
     * Normalize features
     */
    async normalizeFeatures() {
        try {
            const categoryFilter = document.getElementById('normalizeCategoryFilter').value;
            const method = document.getElementById('normalizeMethod').value;

            let columns = [];
            if (categoryFilter) {
                const categories = this.metadata.structure.biomarker_categories;
                columns = categories[categoryFilter] || [];
            } else {
                columns = this.metadata.structure.biomarker_columns;
            }

            if (columns.length === 0) {
                Utils.showToast('No columns to normalize', 'warning');
                return;
            }

            const result = await API.normalizeFeatures(columns, method);

            if (result.success) {
                this.renderNormalizeResults(result.results);
                this.loadHistory();
                Utils.showToast(`Normalized ${Object.keys(result.results).length} features`, 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to normalize features: ' + error.message, 'danger');
        }
    },

    /**
     * Render normalization results
     */
    renderNormalizeResults(results) {
        const container = document.getElementById('multimodalResultsContainer');

        let html = `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="bi bi-sliders me-2"></i>
                        Feature Normalization Results
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">Features Normalized</div>
                                <div class="stat-value">${Object.keys(results).length}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">Method</div>
                                <div class="stat-value text-micro">${Object.values(results)[0]?.method || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <h6 class="mb-2">Normalization Statistics</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>Method</th>
        `;

        // Add columns based on method
        const firstResult = Object.values(results)[0];
        if (firstResult.mean !== undefined) {
            html += '<th class="text-end">Mean</th><th class="text-end">SD</th>';
        } else if (firstResult.min !== undefined) {
            html += '<th class="text-end">Min</th><th class="text-end">Max</th>';
        } else if (firstResult.median !== undefined) {
            html += '<th class="text-end">Median</th><th class="text-end">IQR</th>';
        }

        html += `
                                </tr>
                            </thead>
                            <tbody>
        `;

        for (const [feature, stats] of Object.entries(results)) {
            html += `
                <tr>
                    <td><strong>${feature}</strong></td>
                    <td>${stats.method}</td>
            `;

            if (stats.mean !== undefined) {
                html += `
                    <td class="text-end">${Utils.formatNumber(stats.mean, 2)}</td>
                    <td class="text-end">${Utils.formatNumber(stats.std, 2)}</td>
                `;
            } else if (stats.min !== undefined) {
                html += `
                    <td class="text-end">${Utils.formatNumber(stats.min, 2)}</td>
                    <td class="text-end">${Utils.formatNumber(stats.max, 2)}</td>
                `;
            } else if (stats.median !== undefined) {
                html += `
                    <td class="text-end">${Utils.formatNumber(stats.median, 2)}</td>
                    <td class="text-end">${Utils.formatNumber(stats.iqr, 2)}</td>
                `;
            }

            html += '</tr>';
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Create composite score
     */
    async createComposite() {
        try {
            const name = document.getElementById('compositeName').value;
            const categoryFilter = document.getElementById('compositeCategoryFilter').value;
            const method = document.getElementById('compositeMethod').value;

            if (!categoryFilter) {
                Utils.showToast('Please select a category', 'warning');
                return;
            }

            if (!name) {
                Utils.showToast('Please enter a composite name', 'warning');
                return;
            }

            const categories = this.metadata.structure.biomarker_categories;
            const columns = categories[categoryFilter] || [];

            if (columns.length === 0) {
                Utils.showToast('No biomarkers in selected category', 'warning');
                return;
            }

            const result = await API.createComposite(columns, method, name);

            if (result.success) {
                this.renderCompositeResults(result.results);
                this.loadHistory();
                Utils.showToast(`Created composite score: ${name}`, 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to create composite: ' + error.message, 'danger');
        }
    },

    /**
     * Render composite score results
     */
    renderCompositeResults(results) {
        const container = document.getElementById('multimodalResultsContainer');

        let html = `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="bi bi-plus-circle me-2"></i>
                        Composite Score: ${results.name}
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row g-3 mb-3">
                        <div class="col-md-2">
                            <div class="stat-card">
                                <div class="stat-label">Method</div>
                                <div class="stat-value text-micro">${results.method.toUpperCase()}</div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="stat-card">
                                <div class="stat-label">Features</div>
                                <div class="stat-value">${results.n_features}</div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="stat-card">
                                <div class="stat-label">Mean</div>
                                <div class="stat-value">${Utils.formatNumber(results.stats.mean, 2)}</div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="stat-card">
                                <div class="stat-label">SD</div>
                                <div class="stat-value">${Utils.formatNumber(results.stats.std, 2)}</div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="stat-card">
                                <div class="stat-label">Min</div>
                                <div class="stat-value">${Utils.formatNumber(results.stats.min, 2)}</div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="stat-card">
                                <div class="stat-label">Max</div>
                                <div class="stat-value">${Utils.formatNumber(results.stats.max, 2)}</div>
                            </div>
                        </div>
                    </div>
                    
                    ${results.variance_explained ? `
                    <div class="alert alert-info mb-3">
                        <strong>PCA Info:</strong> This composite represents the first principal component, 
                        explaining ${Utils.formatNumber(results.variance_explained * 100, 1)}% of the variance.
                    </div>
                    ` : ''}
                    
                    <h6 class="mb-2">Component Features</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    ${results.weights ? '<th class="text-end">Weight</th>' : ''}
                                </tr>
                            </thead>
                            <tbody>
        `;

        results.features.forEach((feature, idx) => {
            html += `
                <tr>
                    <td>${feature}</td>
                    ${results.weights ? `<td class="text-end">${Utils.formatNumber(results.weights[idx], 3)}</td>` : ''}
                </tr>
            `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="alert alert-success mt-3">
                        <strong>Composite Created:</strong> The ${results.name} score has been calculated 
                        from ${results.n_features} features using ${results.method} method.
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Clear session
     */
    clearSession() {
        Utils.showConfirm(
            'Clear Session',
            'Are you sure you want to clear all data and start fresh? This will remove all imported data and history.',
            async () => {
                try {
                    await API.clearSession();
                    location.reload();
                } catch (error) {
                    Utils.showToast('Failed to clear session: ' + error.message, 'danger');
                }
            }
        );
    },

    // LLM Integration

    /**
     * Load document list
     */
    async loadDocuments() {
        try {
            const knowledgeSpinner = document.getElementById('knowledgeSpinner');
            if (knowledgeSpinner) knowledgeSpinner.style.display = 'block';

            const response = await fetch('/api/llm/documents/list');
            const data = await response.json();

            const list = document.getElementById('documentList');
            if (data.documents.length === 0) {
                list.innerHTML = '<li class="list-group-item text-muted">No documents uploaded</li>';
            } else {
                list.innerHTML = data.documents.map(doc => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-file-pdf text-danger me-2"></i>
                        <strong>${doc.filename}</strong>
                        <br>
                        <small class="text-muted">${(doc.size / 1024).toFixed(1)} KB</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.deleteDocument('${doc.filename}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </li>
            `).join('');
            }

            // Update count
            document.getElementById('llmDocCount').textContent = data.count;

            if (knowledgeSpinner) knowledgeSpinner.style.display = 'none';
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    },

    /**
     * Upload documents
     */
    async uploadDocuments() {
        try {
            const fileInput = document.getElementById('documentUpload');
            const files = fileInput.files;

            if (files.length === 0) {
                this.showKnowledgeAlert('Please select PDF files', 'warning');
                return;
            }

            const formData = new FormData();
            for (const file of files) {
                formData.append('files', file);
            }

            // Show spinner
            document.getElementById('uploadSpinner').style.display = 'inline-block';
            document.getElementById('uploadIcon').style.display = 'none';
            document.getElementById('btnUploadDocs').disabled = true;

            const response = await fetch('/api/llm/documents/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showKnowledgeAlert(result.message, 'success');
                fileInput.value = '';
                await this.loadDocuments();
            } else {
                this.showKnowledgeAlert(result.error, 'danger');
            }
        } catch (error) {
            this.showKnowledgeAlert('Upload failed: ' + error.message, 'danger');
        } finally {
            document.getElementById('uploadSpinner').style.display = 'none';
            document.getElementById('uploadIcon').style.display = 'inline-block';
            document.getElementById('btnUploadDocs').disabled = false;
        }
    },

    /**
     * Delete document
     */
    async deleteDocument(filename) {
        document.getElementById('deleteDocName').textContent = filename;
        const modal = new bootstrap.Modal(document.getElementById('deleteDocModal'));
        modal.show();

        // Set up confirm button
        document.getElementById('btnConfirmDelete').onclick = async () => {
            try {
                document.getElementById('deleteSpinner').style.display = 'inline-block';

                const response = await fetch(`/api/llm/documents/${filename}`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (result.success) {
                    modal.hide();
                    this.showKnowledgeAlert(result.message, 'success');
                    await this.loadDocuments();
                }
            } catch (error) {
                this.showKnowledgeAlert('Delete failed: ' + error.message, 'danger');
            } finally {
                document.getElementById('deleteSpinner').style.display = 'none';
            }
        };
    },

    /**
     * Build vector store
     */
    async buildVectorStore() {
        try {
            document.getElementById('buildSpinner').style.display = 'inline-block';
            document.getElementById('buildIcon').style.display = 'none';
            document.getElementById('buildText').textContent = 'Building...';
            document.getElementById('btnBuildKnowledge').disabled = true;

            const response = await fetch('/api/llm/vectorstore/build', {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.showKnowledgeAlert(result.message, 'success');
                await this.checkVectorStoreStatus();
            } else {
                this.showKnowledgeAlert(result.message, 'danger');
            }
        } catch (error) {
            this.showKnowledgeAlert('Build failed: ' + error.message, 'danger');
        } finally {
            document.getElementById('buildSpinner').style.display = 'none';
            document.getElementById('buildIcon').style.display = 'inline-block';
            document.getElementById('buildText').textContent = 'Build Knowledge Base';
            document.getElementById('btnBuildKnowledge').disabled = false;
        }
    },

    /**
     * Check vector store status
     */
    async checkVectorStoreStatus() {
        try {
            const response = await fetch('/api/llm/vectorstore/status');
            const data = await response.json();

            // Update UI based on status
            if (!data.api_key_configured) {
                this.showKnowledgeAlert('OpenAI API key not configured in environment', 'warning');
            }
        } catch (error) {
            console.error('Error checking status:', error);
        }
    },

    async sendLLMQuery() {
        try {
            const input = document.getElementById('llmInput');
            const question = input.value.trim();

            if (!question) return;

            // Add user message to chat
            this.addLLMMessage(question, 'user');
            input.value = '';

            // Show typing indicator
            this.addLLMMessage('Analyzing...', 'assistant', true);

            // Detect mentioned columns and fetch their stats
            const mentionedColumns = this.detectMentionedColumns(question);
            const columnStats = [];

            for (const colName of mentionedColumns) {
                const stats = await this.fetchColumnStats(colName);
                if (stats) {
                    columnStats.push(stats);
                }
            }

            // Build the request body
            const datasetSummary = this.buildDatasetSummary();


            const response = await fetch('/api/llm/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question,
                    context: this.currentAnalysisContext,
                    dataset_summary: datasetSummary,
                    column_stats: columnStats
                })
            });

            const result = await response.json();

            // Remove typing indicator
            const messages = document.getElementById('llmMessages');
            messages.lastChild.remove();

            if (result.success) {
                // Render markdown to HTML
                const htmlContent = marked.parse(result.answer);
                this.addLLMMessage(htmlContent, 'assistant', true); // true = already HTML

                // Show sources if available
                if (result.sources && result.sources.length > 0) {
                    const sourcesList = result.sources.map(s => `<code>${s}</code>`).join(', ');
                    this.addLLMMessage(
                        `<strong>Sources:</strong> ${sourcesList}`,
                        'sources',
                        true // true = already HTML
                    );
                }
            } else {
                this.addLLMMessage(result.error, 'error');
            }
        } catch (error) {
            this.addLLMMessage('Error: ' + error.message, 'error');
        }
    },

    /**
     * Add message to chat
     */
    addLLMMessage(content, type, isHtml = false) {
        const messagesDiv = document.getElementById('llmMessages');
        
        // Clear welcome message if present
        if (messagesDiv.querySelector('.text-center')) {
            messagesDiv.innerHTML = '';
        }
        
        let iconClass, header, bgClass;
        
        switch(type) {
            case 'user':
                iconClass = 'bi-person-fill';
                header = 'You';
                bgClass = 'user';
                break;
            case 'assistant':
                iconClass = 'bi-robot';
                header = 'AI Assistant';
                bgClass = 'assistant';
                break;
            case 'sources':
                iconClass = 'bi-database';
                header = 'Sources';
                bgClass = 'assistant';
                break;
            case 'error':
                iconClass = 'bi-exclamation-triangle';
                header = 'Error';
                bgClass = 'assistant';
                break;
            default:
                iconClass = 'bi-chat-dots';
                header = 'System';
                bgClass = 'assistant';
        }
        
        // For user messages, escape HTML to prevent XSS
        // For assistant messages with markdown, use as-is
        const displayContent = (type === 'user' && !isHtml) 
            ? this.escapeHtml(content) 
            : content;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${bgClass}`;
        messageDiv.innerHTML = `
            <div class="message-header">
                <i class="${iconClass} me-1"></i> ${header}
            </div>
            <div class="message-content ${type === 'error' ? 'text-danger' : ''}">
                ${displayContent}
            </div>
        `;
        
        messagesDiv.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Detect if question mentions a biomarker column
     */
    detectMentionedColumns(question) {
        if (!this.metadata || !this.metadata.structure) {
            return [];
        }

        const questionUpper = question.toUpperCase();
        const mentioned = [];

        // Check all biomarker columns
        const allBiomarkers = this.metadata.structure.biomarker_columns || [];

        for (const biomarker of allBiomarkers) {
            if (questionUpper.includes(biomarker.toUpperCase())) {
                mentioned.push(biomarker);
            }
        }

        return mentioned;
    },

    /**
     * Fetch column statistics
     */
    async fetchColumnStats(columnName) {
        try {
            const response = await fetch('/api/llm/column_stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ column_name: columnName })
            });

            const result = await response.json();

            if (result.success) {
                return result.stats;
            }
            return null;
        } catch (error) {
            console.error('Error fetching column stats:', error);
            return null;
        }
    },


    /**
     * Build dataset summary for LLM context
     */
    buildDatasetSummary() {
        if (!this.metadata || !this.metadata.structure) {
            return null;
        }

        const structure = this.metadata.structure;

        // Build category summary
        const categorySummary = {};
        const biomarkerCategories = structure.biomarker_categories || {};

        for (const [category, biomarkers] of Object.entries(biomarkerCategories)) {
            if (Array.isArray(biomarkers)) {
                categorySummary[category] = {
                    count: biomarkers.length,
                    biomarkers: biomarkers.slice(0, 5)
                };
            }
        }

        // Try different possible key names for row/column counts
        const rowCount = structure.n_rows || structure.rows || structure.num_rows ||
            structure.row_count || this.metadata.rows || 0;
        const colCount = structure.n_columns || structure.columns || structure.num_columns ||
            structure.column_count || this.metadata.columns || 0;

        // Add sample data statistics
        const sampleStats = this.calculateSampleStatistics();

        const summary = {
            filename: this.metadata.filename || 'Unknown',
            n_rows: rowCount,
            n_columns: colCount,
            biomarker_categories: categorySummary,
            group_columns: structure.group_columns || [],
            time_columns: structure.time_columns || [],
            n_biomarkers: (structure.biomarker_columns || []).length,
            n_demographics: (structure.demographic_columns || []).length,
            sample_statistics: sampleStats  // **NEW: Add sample stats**
        };

        return summary;
    },

    /**
     * Calculate sample statistics from current data preview
     */
    calculateSampleStatistics() {
        if (!this.currentData || this.currentData.length === 0) {
            return null;
        }

        const stats = {
            sample_size: this.currentData.length,
            columns_with_data: {}
        };

        // Get first row to determine column types
        const firstRow = this.currentData[0];
        const columns = Object.keys(firstRow);

        // Calculate basic stats for up to 10 numeric columns
        let numericColumnsProcessed = 0;
        const maxColumnsToProcess = 10;

        for (const col of columns) {
            if (numericColumnsProcessed >= maxColumnsToProcess) break;

            // Extract values for this column
            const values = this.currentData
                .map(row => row[col])
                .filter(val => val !== null && val !== undefined && val !== '' && !isNaN(val))
                .map(val => parseFloat(val));

            // If we have numeric values, calculate stats
            if (values.length > 0) {
                const sorted = values.slice().sort((a, b) => a - b);
                const sum = values.reduce((acc, val) => acc + val, 0);
                const mean = sum / values.length;
                
                stats.columns_with_data[col] = {
                    n_valid: values.length,
                    n_total: this.currentData.length,
                    coverage_percent: ((values.length / this.currentData.length) * 100).toFixed(1),
                    mean: mean.toFixed(2),
                    min: sorted[0].toFixed(2),
                    max: sorted[sorted.length - 1].toFixed(2),
                    median: sorted[Math.floor(sorted.length / 2)].toFixed(2)
                };
                
                numericColumnsProcessed++;
            }
        }

        return stats;
    },

    /**
     * Show knowledge alert
     */
    showKnowledgeAlert(message, type = 'danger') {
        const placeholder = document.getElementById('knowledgeAlertPlaceholder');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
        placeholder.innerHTML = '';
        placeholder.appendChild(alert);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
