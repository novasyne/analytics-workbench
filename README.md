# Analytics Workbench

**Clinical Trial Biomarker Analysis Platform**

A comprehensive web-based analytics platform for clinical trial researchers to explore, analyze, and interpret multimodal biomarker data with integrated LLM assistance.


> **Author:** Gideon Vos, James Cook University, Australia  
> **Contact:** [LinkedIn](https://www.linkedin.com/in/gideonvos)  
> **Released:** January 2026

---


![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## 🎯 Overview

Analytics Workbench is a production-ready platform designed for clinical trial researchers and data scientists working with complex biomarker datasets. It combines traditional statistical analysis with modern AI-powered interpretation to accelerate biomarker discovery and hypothesis generation.

### Key Features

- 📊 **Multi-Phase Analytics Pipeline**: Foundation → Exploration → Statistical Tests → Advanced Analytics → Multimodal Integration → LLM Intelligence
- 🤖 **AI Assistant**: OpenAI GPT-4 integration with RAG (Retrieval Augmented Generation) for context-aware biomarker interpretation
- 🔬 **Comprehensive Statistics**: T-tests, ANOVA, PCA, spectral analysis, changepoint detection, longitudinal trajectories
- 🌐 **Cross-Domain Analysis**: Network visualization of biomarker relationships across measurement domains
- 📈 **Interactive Visualizations**: Plotly charts, D3.js network graphs, correlation heatmaps
- 🔒 **Safety Guardrails**: Built-in medical advice filtering, citation requirements, statistical vs. interpretive separation

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- OpenAI API key (for LLM features)
- Modern web browser (Chrome, Firefox, Safari)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/analytics-discovery-workbench.git
cd analytics-discovery-workbench

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Configuration

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4o
EMBEDDING_MODEL=text-embedding-3-small
```

### Run

```bash
python app.py
```

Visit `http://localhost:5000` in your browser.

---

## 📋 Features

### Foundation & Import
- CSV data import with drag-and-drop
- Automatic biomarker categorization (Blood, EEG, HRV, Saliva, etc.)
- Data preview with DataTables
- Session management
- Analysis history tracking

### Exploration & Profiling
- Distribution analysis (histograms, density plots, box plots)
- Correlation matrices with hierarchical clustering
- Missing data analysis and visualization
- Group comparisons with interactive plots
- Summary statistics

### Statistical Analysis
- **Parametric tests**: Independent t-test, Paired t-test, ANOVA
- **Non-parametric tests**: Mann-Whitney U, Wilcoxon, Kruskal-Wallis
- Effect size calculations (Cohen's d, Hedges' g)
- Post-hoc analysis (Tukey HSD)
- Batch testing with multiple comparison correction
- Automated interpretation

### Advanced Analytics & Time-Series
- **PCA**: Principal Component Analysis with variance explained
- **Spectral Analysis**: Power spectral density, peak detection, circadian rhythm identification
- **Changepoint Detection**: Regime change identification, intervention effect timing
- **Longitudinal Trajectories**: Individual trend analysis, slope calculations, responder identification

### Multimodal Integration
- **Cross-Domain Network Analysis**: D3.js force-directed graphs of biomarker relationships
- **Feature Normalization**: Z-score, Min-Max, Robust (IQR) scaling
- **Composite Scores**: Mean, weighted sum, PCA-based aggregation
- **Interactive Network Graphs**: Zoom, pan, drag nodes, highlight connections

### LLM Integration & Knowledge Layer
- **AI Assistant Modal**: Ask questions about your data in natural language
- **RAG Pipeline**: FAISS vector store with research paper ingestion
- **Context-Aware Responses**: LLM receives dataset metadata and column statistics
- **Knowledge Base Management**: Upload PDFs, build searchable knowledge base
- **Safety Guardrails**: No medical diagnosis, citation-grounded responses
- **Anomaly Detection**: Automated outlier identification with biological interpretation

---

## 🎨 User Interface

### Navigation
- **Left Sidebar**: Icon-based navigation (Import, AI Assistant, Clear Session)
- **Data Browser**: Column visibility controls, biomarker categories
- **Analysis Tabs**: Preview, Distributions, Correlations, Missing Data, Compare, Stats Tests, Advanced, Multimodal
- **AI Assistant**: Modal dialog with chat interface

### Key Components
- **Import Modal**: Drag-and-drop CSV upload
- **Knowledge Base Modal**: PDF document management for RAG
- **LLM Chat Modal**: Natural language queries with data context
- **Interactive Charts**: Plotly visualizations with hover details
- **Network Graphs**: D3.js with zoom/pan controls

---

## 📊 Supported Data Formats

### CSV Structure

```csv
Subject,Cohort,Timepoint,Age,Gender,Blood_IL6,Blood_CRP,EEG_Alpha,HRV_RMSSD,...
SUBJ001,Treatment,Baseline,45,M,2.3,4.5,0.85,42.1,...
SUBJ002,Control,Baseline,38,F,1.8,3.2,0.92,38.5,...
```

### Required Columns
- **Subject ID**: Unique participant identifier
- **Group Columns**: Cohort, Arm, Treatment (for comparisons)
- **Time Columns**: Timepoint, Visit, Week (for longitudinal)

### Biomarker Naming Convention
Prefix-based categorization:
- `Blood_*` → Blood biomarkers
- `EEG_*` → EEG measurements
- `HRV_*` → Heart rate variability
- `Saliva_*` → Saliva biomarkers
- `Urine_*`, `CSF_*`, `Sweat_*`, `Hair_*`, etc.

---

## 🤖 AI Assistant Features

### Capabilities

1. **Data Understanding**
   - "What biomarkers are in this dataset?"
   - "Summarize the blood markers"
   - "How many subjects in each cohort?"

2. **Anomaly Detection**
   - "Review BILIRUBIN for anomalies"
   - "Find outliers in inflammatory markers"
   - "Which subjects have unusual IL-6 levels?"

3. **Statistical Interpretation**
   - "Explain why p < 0.05 is significant"
   - "What does Cohen's d of 0.8 mean?"
   - "Interpret this PCA result"

4. **Biological Context** (with RAG)
   - "What mechanisms could explain IL-6 and CRP correlation?"
   - "How does stress affect HRV?"
   - "What's the relationship between inflammation and depression?"

### Knowledge Base
Upload research papers, review articles, and documentation:
- PDFs automatically chunked and embedded
- FAISS vector store for fast similarity search
- Citations included in responses
- Rebuild index as new papers are added

---

## 🔬 Statistical Methods

### Univariate Tests
- **Independent T-test**: Compare two groups (parametric)
- **Paired T-test**: Compare paired observations
- **Mann-Whitney U**: Two-group comparison (non-parametric)
- **Wilcoxon**: Paired comparison (non-parametric)

### Multivariate Tests
- **ANOVA**: Compare 3+ groups (parametric)
- **Kruskal-Wallis**: Compare 3+ groups (non-parametric)
- **Tukey HSD**: Post-hoc pairwise comparisons

### Advanced Analytics
- **PCA**: Dimensionality reduction, latent factor discovery
- **FFT/Welch**: Frequency domain analysis, periodicity detection
- **Changepoint**: CUSUM-based regime change detection
- **Linear Mixed Models**: Longitudinal trajectory analysis

### Effect Sizes
- Cohen's d (standardized mean difference)
- Hedges' g (bias-corrected)
- Eta-squared (ANOVA effect size)

---

## 📦 Dependencies

### Core
- **Flask 3.0**: Web framework
- **Pandas 2.2**: Data manipulation
- **NumPy 1.26**: Numerical computing
- **SciPy 1.13**: Statistical functions
- **scikit-learn 1.4**: Machine learning (PCA, scaling)
- **statsmodels 0.14**: Statistical models

### LLM & RAG
- **OpenAI 1.12**: GPT-4 API client
- **LangChain 0.1**: Document processing
- **FAISS 1.8+**: Vector similarity search
- **tiktoken 0.5**: Token counting
- **PyPDF 4.0**: PDF parsing

### Frontend
- **Bootstrap 5.3**: UI framework
- **Plotly.js 2.27**: Interactive charts
- **D3.js v7**: Network graphs
- **DataTables 1.13**: Data grid

See `requirements.txt` for complete list.

---

## 🔒 Security & Privacy

### Data Handling
- **Session-based storage**: Each user has isolated session data
- **No database**: Data stored in temporary pickle files
- **Local processing**: All analytics run server-side
- **Automatic cleanup**: Sessions cleared on logout

### LLM Safety
- **No medical diagnosis**: Strict prompt engineering prevents diagnostic claims
- **Citation required**: All claims must reference sources
- **Response validation**: Automated filtering of medical advice
- **Statistical separation**: Clear distinction between stats and interpretation

### API Keys
- **Environment variables**: Keys never in code
- **Server-side only**: OpenAI API called from backend
- **.env not committed**: Template provided, actual keys gitignored

---

## 🎓 Use Cases

### Clinical Trial Analysis
- Compare biomarker levels between treatment arms
- Identify responders vs. non-responders
- Track longitudinal changes over study visits
- Detect adverse event signatures

### Biomarker Discovery
- Find cross-domain correlations (e.g., inflammation ↔ brain activity)
- Identify multimodal signatures of disease states
- Generate composite scores from multiple markers
- Discover hidden patterns with PCA

### Hypothesis Generation
- Ask AI about unexpected findings
- Get mechanistic explanations for correlations
- Review literature relevant to your results
- Critique study design and statistical choices

### Research Support
- Automated anomaly detection
- Missing data pattern analysis
- Effect size interpretation
- Statistical test selection guidance

---

## 🤝 Contributing

Contributions welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint for JavaScript
- Add docstrings to all functions
- Include unit tests for new features
- Update README with new capabilities

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Technologies
- **Flask** - Web framework
- **OpenAI** - GPT-4 language models
- **LangChain** - LLM orchestration
- **FAISS** - Vector similarity search (Facebook AI Research)
- **Plotly** - Interactive visualizations
- **D3.js** - Data-driven graphics
- **Bootstrap** - UI framework

---

## 📞 Support

- **Documentation**: See inline code comments and docstrings
- **Issues**: [GitHub Issues](https://github.com/novasyne/analytics-workbench/issues)
- **Email**: admin@novasyne.com

---


**Version**: 6.0.0 | **Last Updated**: February 2026
