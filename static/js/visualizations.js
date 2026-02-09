/**
 * Visualization Functions
 */

const Visualizations = {
    /**
     * Plot histogram
     */
    plotHistogram(containerId, data, biomarker, groupBy = null) {
        const container = document.getElementById(containerId);
        
        let traces = [];
        
        if (groupBy && data.groups) {
            // Grouped histogram
            for (const [group, values] of Object.entries(data.groups)) {
                traces.push({
                    x: values,
                    type: 'histogram',
                    name: group,
                    opacity: 0.7,
                    nbinsx: 20
                });
            }
        } else {
            // Single histogram
            traces.push({
                x: data.values,
                type: 'histogram',
                nbinsx: 30,
                marker: {
                    color: '#00539f'
                }
            });
        }
        
        const layout = {
            title: {
                text: `Distribution of ${biomarker}`,
                font: { color: '#e0e0e0' }
            },
            xaxis: {
                title: biomarker,
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            yaxis: {
                title: 'Frequency',
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' },
            bargap: 0.05,
            showlegend: groupBy ? true : false
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot(container, traces, layout, config);
    },
    
    /**
     * Plot box plot
     */
    plotBoxPlot(containerId, data, biomarker, groupBy = null) {
        const container = document.getElementById(containerId);
        
        let traces = [];
        
        if (groupBy && data.groups) {
            for (const [group, values] of Object.entries(data.groups)) {
                traces.push({
                    y: values,
                    type: 'box',
                    name: group,
                    boxpoints: 'outliers',
                    marker: { size: 4 }
                });
            }
        } else {
            traces.push({
                y: data.values,
                type: 'box',
                name: biomarker,
                boxpoints: 'all',
                marker: {
                    color: '#00539f',
                    size: 4
                }
            });
        }
        
        const layout = {
            title: {
                text: `Box Plot: ${biomarker}`,
                font: { color: '#e0e0e0' }
            },
            yaxis: {
                title: biomarker,
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            xaxis: {
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot(container, traces, layout, config);
    },
    
    /**
     * Plot violin plot
     */
    plotViolinPlot(containerId, data, biomarker, groupBy = null) {
        const container = document.getElementById(containerId);
        
        let traces = [];
        
        if (groupBy && data.groups) {
            for (const [group, values] of Object.entries(data.groups)) {
                traces.push({
                    y: values,
                    type: 'violin',
                    name: group,
                    box: { visible: true },
                    meanline: { visible: true }
                });
            }
        } else {
            traces.push({
                y: data.values,
                type: 'violin',
                name: biomarker,
                box: { visible: true },
                meanline: { visible: true },
                marker: { color: '#00539f' }
            });
        }
        
        const layout = {
            title: {
                text: `Violin Plot: ${biomarker}`,
                font: { color: '#e0e0e0' }
            },
            yaxis: {
                title: biomarker,
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            xaxis: {
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot(container, traces, layout, config);
    },
    
    /**
     * Plot Q-Q plot
     */
    plotQQPlot(containerId, data, biomarker) {
        const container = document.getElementById(containerId);
        
        const trace = {
            x: data.theoretical_quantiles,
            y: data.sample_quantiles,
            mode: 'markers',
            type: 'scatter',
            marker: {
                color: '#00539f',
                size: 6
            },
            name: 'Sample'
        };
        
        // Reference line
        const min_val = Math.min(...data.theoretical_quantiles);
        const max_val = Math.max(...data.theoretical_quantiles);
        
        const referenceLine = {
            x: [min_val, max_val],
            y: [min_val, max_val],
            mode: 'lines',
            type: 'scatter',
            line: {
                color: '#e74c3c',
                dash: 'dash'
            },
            name: 'Normal'
        };
        
        const layout = {
            title: {
                text: `Q-Q Plot: ${biomarker}`,
                font: { color: '#e0e0e0' }
            },
            xaxis: {
                title: 'Theoretical Quantiles',
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            yaxis: {
                title: 'Sample Quantiles',
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot(container, [trace, referenceLine], layout, config);
    },
    
    /**
     * Plot correlation heatmap
     */
    plotCorrelationHeatmap(containerId, data) {
        const container = document.getElementById(containerId);
        
        const trace = {
            z: data.matrix,
            x: data.biomarkers,
            y: data.biomarkers,
            type: 'heatmap',
            colorscale: [
                [0, '#053061'],
                [0.25, '#2166ac'],
                [0.5, '#f7f7f7'],
                [0.75, '#b2182b'],
                [1, '#67001f']
            ],
            zmid: 0,
            zmin: -1,
            zmax: 1,
            colorbar: {
                title: 'Correlation',
                titleside: 'right',
                tickfont: { color: '#e0e0e0' },
                titlefont: { color: '#e0e0e0' }
            }
        };
        
        const layout = {
            title: {
                text: `${data.method.charAt(0).toUpperCase() + data.method.slice(1)} Correlation Matrix`,
                font: { color: '#e0e0e0' }
            },
            xaxis: {
                tickangle: -45,
                color: '#e0e0e0',
                tickfont: { size: 9 }
            },
            yaxis: {
                color: '#e0e0e0',
                tickfont: { size: 9 }
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' },
            margin: { l: 150, r: 50, t: 80, b: 150 }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot(container, [trace], layout, config);
    },
    
    /**
     * Plot missing data heatmap
     */
    plotMissingHeatmap(containerId, data) {
        const container = document.getElementById(containerId);
        
        const trace = {
            z: data.matrix,
            x: data.biomarkers,
            y: data.subjects,
            type: 'heatmap',
            colorscale: [
                [0, '#2ecc71'],
                [1, '#e74c3c']
            ],
            showscale: true,
            colorbar: {
                title: 'Missing',
                titleside: 'right',
                tickvals: [0, 1],
                ticktext: ['Present', 'Missing'],
                tickfont: { color: '#e0e0e0' },
                titlefont: { color: '#e0e0e0' }
            }
        };
        
        const layout = {
            title: {
                text: 'Missing Data Pattern',
                font: { color: '#e0e0e0' }
            },
            xaxis: {
                title: 'Biomarkers',
                tickangle: -45,
                color: '#e0e0e0',
                tickfont: { size: 8 }
            },
            yaxis: {
                title: 'Subjects',
                color: '#e0e0e0',
                tickfont: { size: 8 }
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' },
            margin: { l: 100, r: 50, t: 80, b: 150 }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot(container, [trace], layout, config);
    },
    
    /**
     * Plot missing data bars
     */
    plotMissingBars(containerId, data) {
        const container = document.getElementById(containerId);
        
        const trace = {
            x: data.biomarkers,
            y: data.percentages,
            type: 'bar',
            marker: {
                color: data.percentages,
                colorscale: [
                    [0, '#2ecc71'],
                    [0.5, '#f39c12'],
                    [1, '#e74c3c']
                ],
                showscale: true,
                colorbar: {
                    title: '% Missing',
                    titleside: 'right',
                    tickfont: { color: '#e0e0e0' },
                    titlefont: { color: '#e0e0e0' }
                }
            }
        };
        
        const layout = {
            title: {
                text: 'Missing Data by Biomarker',
                font: { color: '#e0e0e0' }
            },
            xaxis: {
                title: 'Biomarkers',
                tickangle: -45,
                color: '#e0e0e0'
            },
            yaxis: {
                title: 'Percentage Missing (%)',
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' },
            margin: { b: 150 }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot(container, [trace], layout, config);
    },
    
    /**
     * Plot comparison bar chart
     */
    plotComparisonBar(containerId, data, biomarker) {
        const container = document.getElementById(containerId);
        
        const groups = data.stats.map(s => s.group);
        const means = data.stats.map(s => s.mean);
        const stds = data.stats.map(s => s.std);
        
        const trace = {
            x: groups,
            y: means,
            type: 'bar',
            error_y: {
                type: 'data',
                array: stds,
                visible: true,
                color: '#e74c3c'
            },
            marker: {
                color: '#00539f'
            }
        };
        
        const layout = {
            title: {
                text: `${biomarker} by ${data.group_by} (Mean ± SD)`,
                font: { color: '#e0e0e0' }
            },
            xaxis: {
                title: data.group_by,
                color: '#e0e0e0'
            },
            yaxis: {
                title: biomarker,
                gridcolor: '#444',
                color: '#e0e0e0'
            },
            paper_bgcolor: '#1e1e1e',
            plot_bgcolor: '#1e1e1e',
            font: { color: '#e0e0e0' }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot(container, [trace], layout, config);
    }
};

// Make Visualizations available globally
window.Visualizations = Visualizations;
