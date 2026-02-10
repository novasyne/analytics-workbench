from flask import Flask, render_template, request, jsonify, session
import pandas as pd
import numpy as np
import os
import pickle
from datetime import datetime
from werkzeug.utils import secure_filename
import hashlib
from scipy import stats as scipy_stats
from scipy.stats import ttest_ind, ttest_rel, mannwhitneyu, wilcoxon, f_oneway, kruskal
from scipy.signal import welch, find_peaks
from statsmodels.stats.multitest import multipletests
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from dotenv import load_dotenv
from openai import OpenAI
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

import warnings
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = 'adw-secret-key-change-in-production'
app.config['UPLOAD_FOLDER'] = 'data'
app.config['SESSION_FOLDER'] = 'sessions'
app.config['DOCUMENTS_FOLDER'] = 'documents'
app.config['VECTORSTORE_FOLDER'] = 'vectorstore'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# Ensure folders exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['SESSION_FOLDER'], exist_ok=True)
os.makedirs(app.config['DOCUMENTS_FOLDER'], exist_ok=True)
os.makedirs(app.config['VECTORSTORE_FOLDER'], exist_ok=True)

# LLM Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
LLM_MODEL = os.getenv('LLM_MODEL', 'gpt-4o')
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')

# Initialize OpenAI client
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# LLM Settings
LLM_CONFIG = {
    'model': LLM_MODEL,
    'temperature': 0.7,
    'max_tokens': 1500,
    'chunk_size': 1000,
    'chunk_overlap': 200,
    'top_k': 5
}

# System prompt for biomarker analysis
SYSTEM_PROMPT = """You are an expert biomarker research assistant for clinical trials. Your role is to help researchers interpret statistical results in biological and mechanistic context.

CRITICAL RULES:
1. NEVER provide medical diagnoses or treatment recommendations
2. ALWAYS cite specific sources when making claims using [Source: title/description]
3. Distinguish between statistical findings and biological interpretation
4. Use phrases like "the data suggests" not "the patient has"
5. When uncertain, explicitly state limitations
6. Focus on biomarker mechanisms, not clinical decisions

Your expertise includes:
- Explaining statistical results in biological context
- Suggesting mechanistic hypotheses for observed patterns
- Identifying relevant research and literature
- Critiquing study design and methodology
- Biomarker interpretation across domains (EEG, blood, HRV, etc.)

Format your responses with:
- Clear, concise explanations
- Citations in [Source: ...] format
- Separate statistical vs biological interpretation
- Confidence levels when making claims
"""

# Allowed extensions
ALLOWED_EXTENSIONS = {'csv', 'txt'}
ALLOWED_DOC_EXTENSIONS = {'pdf', 'txt'}


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_doc_file(filename):
    """Check if document file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_DOC_EXTENSIONS


# LLM Helper Functions

def process_pdf(filepath):
    """Load and chunk PDF document"""
    try:
        loader = PyPDFLoader(filepath)
        documents = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=LLM_CONFIG['chunk_size'],
            chunk_overlap=LLM_CONFIG['chunk_overlap']
        )
        
        chunks = text_splitter.split_documents(documents)
        
        # Add source metadata
        for chunk in chunks:
            chunk.metadata['source'] = os.path.basename(filepath)
        
        return chunks
    except Exception as e:
        print(f"Error processing PDF {filepath}: {e}")
        return []


def build_faiss_index():
    """Build FAISS vector store from all documents"""
    try:
        all_chunks = []
        doc_count = 0
        
        # Process all PDFs in documents folder
        for filename in os.listdir(app.config['DOCUMENTS_FOLDER']):
            if filename.endswith('.pdf'):
                filepath = os.path.join(app.config['DOCUMENTS_FOLDER'], filename)
                chunks = process_pdf(filepath)
                all_chunks.extend(chunks)
                doc_count += 1
        
        if not all_chunks:
            return {'success': False, 'message': 'No documents to process'}
        
        # Create embeddings and vector store
        embeddings = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            openai_api_key=OPENAI_API_KEY
        )
        
        vectorstore = FAISS.from_documents(all_chunks, embeddings)
        
        # Save to disk
        vectorstore.save_local(app.config['VECTORSTORE_FOLDER'])
        
        return {
            'success': True,
            'chunks': len(all_chunks),
            'documents': doc_count,
            'message': f'Built knowledge base with {len(all_chunks)} chunks from {doc_count} documents'
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'success': False, 'message': str(e)}


def load_vectorstore():
    """Load existing FAISS vector store"""
    try:
        embeddings = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            openai_api_key=OPENAI_API_KEY
        )
        
        vectorstore = FAISS.load_local(
            app.config['VECTORSTORE_FOLDER'],
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        return vectorstore
    except Exception as e:
        print(f"Error loading vectorstore: {e}")
        return None


def validate_response(response):
    """Check response for forbidden medical content"""
    forbidden_phrases = [
        'diagnose', 'diagnosis', 'patient has', 'you have',
        'prescribe', 'treatment for', 'recommend taking',
        'cure for', 'medical advice', 'see a doctor'
    ]
    
    response_lower = response.lower()
    
    for phrase in forbidden_phrases:
        if phrase in response_lower:
            return False, f"Response filtered: contains medical advice"
    
    return True, "OK"

def query_with_rag(question, context=None, dataset_summary=None, column_stats=None):
    """Query LLM with RAG context"""
    try:
        if not OPENAI_API_KEY:
            return {'error': 'OpenAI API key not configured'}
        
        vectorstore = None
        
        try:
            vectorstore = load_vectorstore()
        except:
            pass
        
        if vectorstore is None:
            # No RAG, use LLM only
            retrieved_text = "No knowledge base available. Provide general guidance based on statistical principles only."
            sources = []
        else:
            # Retrieve relevant documents
            docs = vectorstore.similarity_search(question, k=LLM_CONFIG['top_k'])
            
            # Build retrieved context
            retrieved_text = "\n\n".join([
                f"[Source: {doc.metadata.get('source', 'Unknown')}]\n{doc.page_content}"
                for doc in docs
            ])
            
            sources = list(set([doc.metadata.get('source', 'Unknown') for doc in docs]))
        
        # Build dataset context
        dataset_context = ""
        if dataset_summary:
            dataset_context = f"""
CURRENT DATASET:
- File: {dataset_summary.get('filename', 'Unknown')}
- Size: {dataset_summary.get('n_rows', 0)} rows × {dataset_summary.get('n_columns', 0)} columns
- Biomarkers: {dataset_summary.get('n_biomarkers', 0)} across {len(dataset_summary.get('biomarker_categories', {}))} categories
- Categories: {', '.join(dataset_summary.get('biomarker_categories', {}).keys())}
- Group columns: {', '.join(dataset_summary.get('group_columns', []))}
- Time columns: {', '.join(dataset_summary.get('time_columns', []))}

Category Details:
"""
            for category, info in dataset_summary.get('biomarker_categories', {}).items():
                examples = ', '.join(info.get('biomarkers', []))
                dataset_context += f"- {category}: {info.get('count', 0)} biomarkers (e.g., {examples})\n"
        
        # Build column-specific statistics context
        column_context = ""
        if column_stats and len(column_stats) > 0:
            column_context = "\n\nCOLUMN-SPECIFIC DATA:\n"
            for stats in column_stats:
                column_context += f"""
Column: {stats['column_name']}
- Valid observations: {stats['n_valid']} (Missing: {stats['n_missing']})
- Mean: {stats['mean']:.2f}, Median: {stats['median']:.2f}, SD: {stats['std']:.2f}
- Range: [{stats['min']:.2f}, {stats['max']:.2f}]
- Quartiles: Q1={stats['q25']:.2f}, Q3={stats['q75']:.2f}, IQR={stats['iqr']:.2f}
- Outliers detected: {stats['n_outliers']} values
- Sample values: {', '.join([f"{v:.2f}" for v in stats['sample_values'][:5]])}
"""
                if stats['n_outliers'] > 0:
                    outlier_vals = ', '.join([f'{v:.2f}' for v in stats['outlier_values'][:5]])
                    column_context += f"- Outlier values (first 5): {outlier_vals}\n"
        
        # Build complete user prompt
        user_prompt = f"""{dataset_context}{column_context}

ANALYSIS CONTEXT:
{context if context else 'No specific analysis context provided'}

RETRIEVED EVIDENCE:
{retrieved_text}

USER QUESTION:
{question}

When answering:
1. Use the ACTUAL DATA from the column statistics provided above
2. Reference specific values, means, ranges, and outliers shown in the data
3. Provide interpretation with citations in [Source: ...] format when using external knowledge
4. Separate statistical findings from biological interpretation
5. State confidence level and limitations
6. If anomalies are requested, explicitly identify them using the outlier detection results"""
        
        # Query OpenAI
        response = openai_client.chat.completions.create(
            model=LLM_CONFIG['model'],
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=LLM_CONFIG['temperature'],
            max_tokens=LLM_CONFIG['max_tokens']
        )
        
        answer = response.choices[0].message.content
        
        # Validate response
        is_safe, message = validate_response(answer)
        if not is_safe:
            answer = "I cannot provide that type of medical interpretation. I can only discuss statistical patterns and biomarker mechanisms in research context."
        
        return {
            'answer': answer,
            'sources': sources,
            'tokens_used': response.usage.total_tokens
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'error': str(e)}


def get_session_id():
    """Get or create session ID"""
    if 'session_id' not in session:
        session['session_id'] = hashlib.md5(
            f"{datetime.now().isoformat()}".encode()
        ).hexdigest()
    return session['session_id']


def save_session_data(data_key, data):
    """Save data to session file"""
    session_id = get_session_id()
    session_file = os.path.join(
        app.config['SESSION_FOLDER'], 
        f"{session_id}_{data_key}.pkl"
    )
    with open(session_file, 'wb') as f:
        pickle.dump(data, f)


def load_session_data(data_key):
    """Load data from session file"""
    session_id = get_session_id()
    session_file = os.path.join(
        app.config['SESSION_FOLDER'], 
        f"{session_id}_{data_key}.pkl"
    )
    if os.path.exists(session_file):
        with open(session_file, 'rb') as f:
            return pickle.load(f)
    return None


def get_analysis_history():
    """Get analysis history for current session"""
    history = load_session_data('history')
    return history if history else []


def add_to_history(action, details, result_summary=None):
    """Add an action to the analysis history"""
    history = get_analysis_history()
    
    entry = {
        'timestamp': datetime.now().isoformat(),
        'action': action,
        'details': details,
        'result_summary': result_summary
    }
    
    history.append(entry)
    save_session_data('history', history)
    return entry


@app.route('/')
def index():
    """Main application page"""
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle CSV file upload"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only CSV files allowed'}), 400
        
        # Save file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Load and analyze CSV
        df = pd.read_csv(filepath)
        
        # Extract metadata
        metadata = {
            'filename': filename,
            'filepath': filepath,
            'rows': len(df),
            'columns': len(df.columns),
            'upload_time': datetime.now().isoformat(),
            'column_names': df.columns.tolist(),
            'dtypes': df.dtypes.astype(str).to_dict()
        }
        
        # Identify structure
        structure = identify_data_structure(df)
        metadata['structure'] = structure
        
        # Save to session
        save_session_data('current_data', df)
        save_session_data('metadata', metadata)
        
        # Add to history
        add_to_history(
            'Data Import',
            {
                'filename': filename,
                'rows': len(df),
                'columns': len(df.columns)
            },
            f"Imported {len(df)} rows × {len(df.columns)} columns"
        )
        
        return jsonify({
            'success': True,
            'metadata': metadata,
            'preview': df.replace({pd.NA: None, float('nan'): None}).to_dict('records')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def identify_data_structure(df):
    """Identify the structure of the imported data"""
    structure = {
        'has_arm': 'Arm' in df.columns,
        'has_subject': 'Subject' in df.columns,
        'has_datetime': 'DateTime' in df.columns,
        'id_columns': [],
        'biomarker_columns': [],
        'metadata_columns': []
    }
    
    # Identify ID columns (typically first few non-numeric columns)
    id_candidates = ['Arm', 'Subject', 'DateTime', 'Visit', 'Timepoint', 'StudyID']
    for col in df.columns:
        if col in id_candidates or col.lower() in [x.lower() for x in id_candidates]:
            structure['id_columns'].append(col)
    
    # All other numeric columns are biomarkers
    for col in df.columns:
        if col not in structure['id_columns']:
            structure['biomarker_columns'].append(col)
    
    # Categorize biomarkers by domain (heuristic based on name patterns)
    structure['biomarker_categories'] = categorize_biomarkers(
        structure['biomarker_columns']
    )
    
    return structure


def categorize_biomarkers(biomarkers):
    """Categorize biomarkers by clinical domain based on naming patterns"""
    categories = {
        'EEG': [],
        'HRV': [],
        'Blood': [],
        'Saliva': [],
        'Urine': [],
        'CSF': [],
        'Sweat': [],
        'Hair': [],
        'Scales': [],
        'Wearable': [],
        'Other': []
    }
    
    # Categorization patterns
    patterns = {
        'EEG': ['EEG_', 'P300', 'Alpha', 'Beta', 'Theta', 'Delta', 'Gamma'],
        'HRV': ['HRV_', 'HeartRate', 'RestingHR'],
        'Blood': ['Blood_', 'Serum', 'Ferritin', 'Hemoglobin', 'HbA1c', 'Glucose', 
                  'Insulin', 'Cortisol', 'Testosterone', 'HDL', 'Triglycerides',
                  'Cholesterol', 'CRP', 'IL', 'TNF'],
        'Saliva': ['Saliva_'],
        'Urine': ['Urine_'],
        'CSF': ['CSF_'],
        'Sweat': ['Sweat_'],
        'Hair': ['Hair_'],
        'Scales': ['GAD', 'BDI', 'MADRS', 'HAMD', 'PSS', 'DASS', 'STAI', 'BAI',
                   'PANSS', 'BPRS', 'CAPS', 'PCL', 'IESR', 'SF', 'WHOQOL', 'CISS',
                   'CERQ', 'DERS', 'FFMQ', 'SCL', 'SDS', 'K10', 'QIDS'],
        'Wearable': ['Activity', 'Sleep', 'Step', 'EDA', 'SCR', 'Skin', 'Pulse',
                     'Respiratory', 'WASO', 'Circadian']
    }
    
    for biomarker in biomarkers:
        categorized = False
        for category, keywords in patterns.items():
            if any(keyword in biomarker for keyword in keywords):
                categories[category].append(biomarker)
                categorized = True
                break
        
        if not categorized:
            categories['Other'].append(biomarker)
    
    # Remove empty categories
    return {k: v for k, v in categories.items() if v}


def calculate_cohens_d(group1, group2):
    """Calculate Cohen's d effect size"""
    n1, n2 = len(group1), len(group2)
    var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
    pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
    
    if pooled_std == 0:
        return 0.0
    
    return (np.mean(group1) - np.mean(group2)) / pooled_std


def calculate_hedges_g(group1, group2):
    """Calculate Hedge's g effect size (bias-corrected Cohen's d)"""
    d = calculate_cohens_d(group1, group2)
    n1, n2 = len(group1), len(group2)
    n = n1 + n2
    
    # Correction factor
    correction = 1 - (3 / (4 * n - 9))
    
    return d * correction


def interpret_effect_size(value):
    """Interpret effect size magnitude"""
    abs_value = abs(value)
    if abs_value < 0.2:
        return "negligible"
    elif abs_value < 0.5:
        return "small"
    elif abs_value < 0.8:
        return "medium"
    else:
        return "large"


def interpret_pvalue(p):
    """Interpret p-value significance"""
    if p < 0.001:
        return "***"
    elif p < 0.01:
        return "**"
    elif p < 0.05:
        return "*"
    else:
        return "ns"


@app.route('/api/data/preview')
def get_data_preview():
    """Get preview of current data"""
    try:
        df = load_session_data('current_data')
        metadata = load_session_data('metadata')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        return jsonify({
            'success': True,
            'metadata': metadata,
            'preview': df.head(20).replace({pd.NA: None, float('nan'): None}).to_dict('records'),
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/data/summary')
def get_data_summary():
    """Get statistical summary of current data"""
    try:
        df = load_session_data('current_data')
        metadata = load_session_data('metadata')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        # Get numeric columns only
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        # Calculate summary statistics
        summary = {}
        for col in numeric_cols:
            summary[col] = {
                'count': int(df[col].count()),
                'mean': float(df[col].mean()) if not pd.isna(df[col].mean()) else None,
                'std': float(df[col].std()) if not pd.isna(df[col].std()) else None,
                'min': float(df[col].min()) if not pd.isna(df[col].min()) else None,
                'q25': float(df[col].quantile(0.25)) if not pd.isna(df[col].quantile(0.25)) else None,
                'median': float(df[col].median()) if not pd.isna(df[col].median()) else None,
                'q75': float(df[col].quantile(0.75)) if not pd.isna(df[col].quantile(0.75)) else None,
                'max': float(df[col].max()) if not pd.isna(df[col].max()) else None,
                'missing': int(df[col].isna().sum()),
                'missing_pct': float(df[col].isna().sum() / len(df) * 100)
            }
        
        # Add to history
        add_to_history(
            'Generate Summary Statistics',
            {'columns_analyzed': len(numeric_cols)},
            f"Summary statistics for {len(numeric_cols)} biomarkers"
        )
        
        return jsonify({
            'success': True,
            'summary': summary,
            'metadata': metadata
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/history')
def get_history():
    """Get analysis history"""
    try:
        history = get_analysis_history()
        return jsonify({
            'success': True,
            'history': history
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/history/download')
def download_history():
    """Download analysis history as JSON"""
    try:
        history = get_analysis_history()
        metadata = load_session_data('metadata')
        
        export_data = {
            'export_time': datetime.now().isoformat(),
            'session_id': get_session_id(),
            'data_file': metadata.get('filename') if metadata else None,
            'history': history
        }
        
        return jsonify(export_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    """Clear analysis history"""
    try:
        save_session_data('history', [])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/session/clear', methods=['POST'])
def clear_session():
    """Clear all session data"""
    try:
        session_id = get_session_id()
        
        # Remove all session files
        for filename in os.listdir(app.config['SESSION_FOLDER']):
            if filename.startswith(session_id):
                os.remove(os.path.join(app.config['SESSION_FOLDER'], filename))
        
        # Clear session
        session.clear()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/visualize/distribution', methods=['POST'])
def generate_distribution():
    """Generate distribution visualization"""
    try:
        df = load_session_data('current_data')
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        biomarker = data.get('biomarker')
        plot_type = data.get('plot_type', 'histogram')
        group_by = data.get('group_by')
        
        if not biomarker or biomarker not in df.columns:
            return jsonify({'error': 'Invalid biomarker'}), 400
        
        # Get data
        values = df[biomarker].dropna()
        
        if len(values) == 0:
            return jsonify({'error': 'No valid data for this biomarker'}), 400
        
        result = {
            'biomarker': biomarker,
            'plot_type': plot_type,
            'n': len(values),
            'mean': float(values.mean()),
            'std': float(values.std()),
            'min': float(values.min()),
            'max': float(values.max())
        }
        
        if plot_type == 'histogram':
            if group_by and group_by in df.columns:
                # Grouped histogram data
                result['groups'] = {}
                for group in df[group_by].unique():
                    group_data = df[df[group_by] == group][biomarker].dropna()
                    result['groups'][str(group)] = group_data.tolist()
            else:
                result['values'] = values.tolist()
        
        elif plot_type in ['box', 'violin']:
            if group_by and group_by in df.columns:
                result['groups'] = {}
                for group in df[group_by].unique():
                    group_data = df[df[group_by] == group][biomarker].dropna()
                    result['groups'][str(group)] = group_data.tolist()
            else:
                result['values'] = values.tolist()
        
        elif plot_type == 'qq':
            # Q-Q plot data
            sorted_values = np.sort(values)
            theoretical_quantiles = scipy_stats.norm.ppf(np.linspace(0.01, 0.99, len(sorted_values)))
            result['sample_quantiles'] = sorted_values.tolist()
            result['theoretical_quantiles'] = theoretical_quantiles.tolist()
        
        # Add to history
        add_to_history(
            'Generate Distribution Plot',
            {
                'biomarker': biomarker,
                'plot_type': plot_type,
                'group_by': group_by or 'None'
            },
            f"{plot_type.title()} for {biomarker}"
        )
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/visualize/correlation', methods=['POST'])
def generate_correlation():
    """Generate correlation matrix"""
    try:
        df = load_session_data('current_data')
        metadata = load_session_data('metadata')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        method = data.get('method', 'pearson')
        category_filter = data.get('category_filter')
        min_value = data.get('min_value', 0)
        
        # Get numeric columns
        biomarkers = metadata['structure']['biomarker_columns']
        
        # Filter by category if specified
        if category_filter:
            categories = metadata['structure']['biomarker_categories']
            if category_filter in categories:
                biomarkers = [b for b in biomarkers if b in categories[category_filter]]
        
        # Limit to first 50 biomarkers for performance
        biomarkers = biomarkers[:50]
        
        # Calculate correlation
        df_subset = df[biomarkers].select_dtypes(include=[np.number])
        if df_subset.dropna().shape[0] == 0:
            return jsonify({'error': 'NaN values in data'}), 400

        if method == 'pearson':
            corr_matrix = df_subset.corr(method='pearson')
        elif method == 'spearman':
            corr_matrix = df_subset.corr(method='spearman')
        elif method == 'kendall':
            corr_matrix = df_subset.corr(method='kendall')
        else:
            return jsonify({'error': 'Invalid correlation method'}), 400
        
        # Filter by minimum absolute value
        if min_value > 0:
            corr_matrix = corr_matrix.where(np.abs(corr_matrix) >= min_value, np.nan)
        
        result = {
            'method': method,
            'biomarkers': corr_matrix.columns.tolist(),
            'matrix': corr_matrix.values.tolist(),
            'n_biomarkers': len(corr_matrix)
        }
        
        # Add to history
        add_to_history(
            'Generate Correlation Matrix',
            {
                'method': method,
                'biomarkers': len(corr_matrix),
                'category': category_filter or 'All'
            },
            f"{method.title()} correlation for {len(corr_matrix)} biomarkers"
        )
        
        return jsonify({
            'success': True,
            'data': {
                'biomarkers': biomarkers,
                'correlation_matrix': corr_matrix.replace({float('nan'): None}).to_dict()
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/visualize/missing', methods=['POST'])
def analyze_missing():
    """Analyze missing data patterns"""
    try:
        df = load_session_data('current_data')
        metadata = load_session_data('metadata')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        view_type = data.get('view_type', 'heatmap')
        threshold = data.get('threshold', 0)
        
        biomarkers = metadata['structure']['biomarker_columns']
        
        if view_type == 'heatmap':
            # Missing pattern heatmap (binary: 0=present, 1=missing)
            missing_matrix = df[biomarkers].isna().astype(int)
            result = {
                'view_type': 'heatmap',
                'biomarkers': biomarkers,
                'subjects': df['Subject'].tolist() if 'Subject' in df.columns else list(range(len(df))),
                'matrix': missing_matrix.values.tolist()
            }
        
        elif view_type == 'bars':
            # Missing counts by biomarker
            missing_counts = df[biomarkers].isna().sum()
            missing_pct = (missing_counts / len(df) * 100)
            
            # Filter by threshold
            if threshold > 0:
                mask = missing_pct >= threshold
                missing_counts = missing_counts[mask]
                missing_pct = missing_pct[mask]
            
            result = {
                'view_type': 'bars',
                'biomarkers': missing_counts.index.tolist(),
                'counts': missing_counts.values.tolist(),
                'percentages': missing_pct.values.tolist()
            }
        
        elif view_type == 'summary':
            # Summary table
            missing_summary = []
            for biomarker in biomarkers:
                missing_count = df[biomarker].isna().sum()
                missing_pct = missing_count / len(df) * 100
                
                if missing_pct >= threshold:
                    missing_summary.append({
                        'biomarker': biomarker,
                        'missing': int(missing_count),
                        'percentage': float(missing_pct),
                        'present': int(len(df) - missing_count)
                    })
            
            result = {
                'view_type': 'summary',
                'summary': missing_summary
            }
        
        # Add to history
        add_to_history(
            'Analyze Missing Data',
            {
                'view_type': view_type,
                'threshold': threshold
            },
            f"Missing data analysis ({view_type})"
        )
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/visualize/compare', methods=['POST'])
def compare_groups():
    """Compare groups for a biomarker"""
    try:
        df = load_session_data('current_data')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        biomarker = data.get('biomarker')
        group_by = data.get('group_by', 'Arm')
        plot_type = data.get('plot_type', 'box')
        
        if not biomarker or biomarker not in df.columns:
            return jsonify({'error': 'Invalid biomarker'}), 400
        
        if group_by not in df.columns:
            return jsonify({'error': f'Column {group_by} not found'}), 400
        
        # Get grouped data
        groups = {}
        stats_summary = []
        
        for group in df[group_by].unique():
            group_data = df[df[group_by] == group][biomarker].dropna()
            
            if len(group_data) > 0:
                groups[str(group)] = group_data.tolist()
                
                stats_summary.append({
                    'group': str(group),
                    'n': len(group_data),
                    'mean': float(group_data.mean()),
                    'std': float(group_data.std()),
                    'median': float(group_data.median()),
                    'min': float(group_data.min()),
                    'max': float(group_data.max())
                })
        
        result = {
            'biomarker': biomarker,
            'group_by': group_by,
            'plot_type': plot_type,
            'groups': groups,
            'stats': stats_summary
        }
        
        # Add to history
        add_to_history(
            'Compare Groups',
            {
                'biomarker': biomarker,
                'group_by': group_by,
                'n_groups': len(groups)
            },
            f"Compare {biomarker} by {group_by}"
        )
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/statistics/test', methods=['POST'])
def run_statistical_test():
    """Run statistical tests"""
    try:
        df = load_session_data('current_data')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        biomarker = data.get('biomarker')
        test_type = data.get('test_type')
        group_by = data.get('group_by', 'Arm')
        correction = data.get('correction', 'none')
        paired = data.get('paired', False)
        
        if not biomarker or biomarker not in df.columns:
            return jsonify({'error': 'Invalid biomarker'}), 400
        
        if group_by not in df.columns:
            return jsonify({'error': f'Column {group_by} not found'}), 400
        
        # Get groups
        groups = df[group_by].unique()
        group_data = {}
        
        for group in groups:
            group_values = df[df[group_by] == group][biomarker].dropna()
            group_data[str(group)] = group_values.values
        
        # Run appropriate test
        results = {
            'biomarker': biomarker,
            'test_type': test_type,
            'group_by': group_by,
            'n_groups': len(groups),
            'groups': {}
        }
        
        # Add group statistics
        for group, values in group_data.items():
            results['groups'][group] = {
                'n': len(values),
                'mean': float(np.mean(values)),
                'std': float(np.std(values, ddof=1)),
                'median': float(np.median(values)),
                'min': float(np.min(values)),
                'max': float(np.max(values))
            }
        
        # Two-group tests
        if len(groups) == 2:
            group_list = list(group_data.values())
            
            if test_type == 'ttest_ind':
                # Independent t-test
                statistic, pvalue = ttest_ind(group_list[0], group_list[1])
                results['statistic'] = float(statistic)
                results['pvalue'] = float(pvalue)
                results['test_name'] = "Independent t-test"
                
                # Effect sizes
                results['cohens_d'] = float(calculate_cohens_d(group_list[0], group_list[1]))
                results['hedges_g'] = float(calculate_hedges_g(group_list[0], group_list[1]))
                results['effect_size_interpretation'] = interpret_effect_size(results['cohens_d'])
                
            elif test_type == 'ttest_rel':
                # Paired t-test
                if len(group_list[0]) != len(group_list[1]):
                    return jsonify({'error': 'Groups must have equal size for paired test'}), 400
                statistic, pvalue = ttest_rel(group_list[0], group_list[1])
                results['statistic'] = float(statistic)
                results['pvalue'] = float(pvalue)
                results['test_name'] = "Paired t-test"
                results['cohens_d'] = float(calculate_cohens_d(group_list[0], group_list[1]))
                results['effect_size_interpretation'] = interpret_effect_size(results['cohens_d'])
                
            elif test_type == 'mannwhitney':
                # Mann-Whitney U test
                statistic, pvalue = mannwhitneyu(group_list[0], group_list[1], alternative='two-sided')
                results['statistic'] = float(statistic)
                results['pvalue'] = float(pvalue)
                results['test_name'] = "Mann-Whitney U test"
                
            elif test_type == 'wilcoxon':
                # Wilcoxon signed-rank test
                if len(group_list[0]) != len(group_list[1]):
                    return jsonify({'error': 'Groups must have equal size for Wilcoxon test'}), 400
                statistic, pvalue = wilcoxon(group_list[0], group_list[1])
                results['statistic'] = float(statistic)
                results['pvalue'] = float(pvalue)
                results['test_name'] = "Wilcoxon signed-rank test"
            
            elif test_type in ['anova', 'kruskal']:
                return jsonify({'error': f'{test_type} requires 3 or more groups. You have only 2 groups.'}), 400
            
            else:
                return jsonify({'error': f'Unknown test type: {test_type}'}), 400
        
        # Multi-group tests
        elif len(groups) > 2:
            group_list = list(group_data.values())
            
            if test_type == 'anova':
                # One-way ANOVA
                statistic, pvalue = f_oneway(*group_list)
                results['statistic'] = float(statistic)
                results['pvalue'] = float(pvalue)
                results['test_name'] = "One-way ANOVA"
                
                # Post-hoc if significant
                if pvalue < 0.05:
                    results['posthoc'] = perform_posthoc_tukey(df, biomarker, group_by)
                
            elif test_type == 'kruskal':
                # Kruskal-Wallis test
                statistic, pvalue = kruskal(*group_list)
                results['statistic'] = float(statistic)
                results['pvalue'] = float(pvalue)
                results['test_name'] = "Kruskal-Wallis test"
            
            else:
                return jsonify({'error': f'{test_type} is not valid for {len(groups)} groups. Use ANOVA or Kruskal-Wallis.'}), 400
        
        else:
            return jsonify({'error': 'Need at least 2 groups for comparison'}), 400
        
        # Verify we have a pvalue before continuing
        if 'pvalue' not in results:
            return jsonify({'error': 'Test did not produce a p-value. Please check your test selection.'}), 400
        
        # Add significance interpretation
        results['significance'] = interpret_pvalue(results['pvalue'])
        results['significant'] = results['pvalue'] < 0.05
        
        # Multiple testing correction if requested
        if correction != 'none' and 'pvalue' in results:
            # For single test, just note the correction method
            results['correction'] = correction
            if correction == 'bonferroni':
                results['pvalue_corrected'] = min(results['pvalue'] * len(groups), 1.0)
            elif correction == 'fdr':
                # For single test, FDR is same as uncorrected
                results['pvalue_corrected'] = results['pvalue']
        
        # Add to history
        add_to_history(
            'Statistical Test',
            {
                'test': test_type,
                'biomarker': biomarker,
                'groups': len(groups),
                'p_value': f"{results['pvalue']:.4f}"
            },
            f"{results['test_name']} for {biomarker} (p={results['pvalue']:.4f})"
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def perform_posthoc_tukey(df, biomarker, group_by):
    """Perform Tukey HSD post-hoc test"""
    try:
        # Prepare data for Tukey
        tukey = pairwise_tukeyhsd(
            endog=df[biomarker].dropna(),
            groups=df.loc[df[biomarker].notna(), group_by],
            alpha=0.05
        )
        
        # Parse results
        results = []
        for row in tukey.summary().data[1:]:  # Skip header
            results.append({
                'group1': str(row[0]),
                'group2': str(row[1]),
                'meandiff': float(row[2]),
                'pvalue': float(row[3]),
                'lower': float(row[4]),
                'upper': float(row[5]),
                'reject': str(row[6]) == 'True'
            })
        
        return results
    except Exception as e:
        return {'error': str(e)}


@app.route('/api/statistics/batch', methods=['POST'])
def run_batch_tests():
    """Run statistical tests on multiple biomarkers"""
    try:
        df = load_session_data('current_data')
        metadata = load_session_data('metadata')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        biomarkers = data.get('biomarkers', [])
        test_type = data.get('test_type')
        group_by = data.get('group_by', 'Arm')
        correction = data.get('correction', 'none')
        
        if not biomarkers:
            biomarkers = metadata['structure']['biomarker_columns'][:50]  # Limit to 50
        
        results_list = []
        pvalues = []
        
        for biomarker in biomarkers:
            if biomarker not in df.columns:
                continue
            
            try:
                # Get groups
                groups = df[group_by].unique()
                group_data = {}
                
                for group in groups:
                    group_values = df[df[group_by] == group][biomarker].dropna()
                    if len(group_values) > 0:
                        group_data[str(group)] = group_values.values
                
                if len(group_data) < 2:
                    continue
                
                # Run test
                group_list = list(group_data.values())
                
                result = {
                    'biomarker': biomarker,
                    'test_type': test_type
                }
                
                if len(groups) == 2:
                    if test_type == 'ttest_ind':
                        statistic, pvalue = ttest_ind(group_list[0], group_list[1])
                        result['cohens_d'] = calculate_cohens_d(group_list[0], group_list[1])
                    elif test_type == 'mannwhitney':
                        statistic, pvalue = mannwhitneyu(group_list[0], group_list[1], alternative='two-sided')
                    else:
                        continue
                    
                    result['statistic'] = float(statistic)
                    result['pvalue'] = float(pvalue)
                    pvalues.append(pvalue)
                    
                elif len(groups) > 2:
                    if test_type == 'anova':
                        statistic, pvalue = f_oneway(*group_list)
                    elif test_type == 'kruskal':
                        statistic, pvalue = kruskal(*group_list)
                    else:
                        continue
                    
                    result['statistic'] = float(statistic)
                    result['pvalue'] = float(pvalue)
                    pvalues.append(pvalue)
                
                # Add group means
                result['group_means'] = {
                    group: float(np.mean(values)) 
                    for group, values in group_data.items()
                }
                
                results_list.append(result)
                
            except Exception as e:
                continue
        
        # Apply multiple testing correction
        if correction != 'none' and len(pvalues) > 0:
            pvalues_array = np.array(pvalues)
            
            if correction == 'bonferroni':
                reject, pvals_corrected, _, _ = multipletests(
                    pvalues_array, alpha=0.05, method='bonferroni'
                )
            elif correction == 'fdr':
                reject, pvals_corrected, _, _ = multipletests(
                    pvalues_array, alpha=0.05, method='fdr_bh'
                )
            elif correction == 'holm':
                reject, pvals_corrected, _, _ = multipletests(
                    pvalues_array, alpha=0.05, method='holm'
                )
            else:
                pvals_corrected = pvalues_array
                reject = pvalues_array < 0.05
            
            # Add corrected p-values to results
            for i, result in enumerate(results_list):
                result['pvalue_corrected'] = float(pvals_corrected[i])
                result['significant'] = bool(reject[i])
                result['significance'] = interpret_pvalue(result['pvalue_corrected'])
        else:
            # No correction
            for result in results_list:
                result['pvalue_corrected'] = result['pvalue']
                result['significant'] = result['pvalue'] < 0.05
                result['significance'] = interpret_pvalue(result['pvalue'])
        
        # Sort by p-value
        results_list.sort(key=lambda x: x['pvalue'])
        
        # Add to history
        add_to_history(
            'Batch Statistical Tests',
            {
                'test': test_type,
                'biomarkers': len(results_list),
                'correction': correction,
                'significant': sum(1 for r in results_list if r['significant'])
            },
            f"{test_type} on {len(results_list)} biomarkers ({correction} correction)"
        )
        
        return jsonify({
            'success': True,
            'results': results_list,
            'n_tests': len(results_list),
            'n_significant': sum(1 for r in results_list if r['significant']),
            'correction': correction
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/advanced/pca', methods=['POST'])
def run_pca():
    """Run Principal Component Analysis"""
    try:
        df = load_session_data('current_data')
        metadata = load_session_data('metadata')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        variables = data.get('variables', [])
        n_components = data.get('n_components', 3)
        
        if not variables:
            variables = metadata['structure']['biomarker_columns']
        
        # Prepare data
        X = df[variables].dropna()
        
        if len(X) < n_components:
            return jsonify({'error': 'Insufficient data for PCA'}), 400
        
        # Standardize
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Run PCA
        pca = PCA(n_components=n_components)
        components = pca.fit_transform(X_scaled)
        
        # Build results
        results = {
            'n_components': n_components,
            'n_observations': len(X),
            'variables': variables,
            'explained_variance': pca.explained_variance_.tolist(),
            'explained_variance_ratio': pca.explained_variance_ratio_.tolist(),
            'cumulative_variance': np.cumsum(pca.explained_variance_ratio_).tolist(),
            'components': components.tolist(),
            'loadings': {}
        }
        
        # Extract loadings
        for i in range(n_components):
            pc_name = f'PC{i+1}'
            results['loadings'][pc_name] = {}
            for j, var in enumerate(variables):
                results['loadings'][pc_name][var] = float(pca.components_[i, j])
        
        # Add to history
        add_to_history(
            'PCA',
            {
                'n_components': n_components,
                'variables': len(variables),
                'variance_explained': f"{pca.explained_variance_ratio_[:2].sum():.1%}"
            },
            f"PCA with {n_components} components"
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/timeseries/spectral', methods=['POST'])
def spectral_analysis():
    """Run spectral analysis on time-series data"""
    try:
        df = load_session_data('current_data')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        variable = data.get('variable')
        sampling_rate = data.get('sampling_rate', 1.0)
        
        if not variable or variable not in df.columns:
            return jsonify({'error': 'Invalid variable'}), 400
        
        # Get time-series data
        values = df[variable].dropna().values
        
        if len(values) < 10:
            return jsonify({'error': 'Insufficient data for spectral analysis'}), 400
        
        # Compute power spectral density
        frequencies, psd = welch(values, fs=sampling_rate, nperseg=min(256, len(values)))
        
        # Find peaks
        peaks, properties = find_peaks(psd, height=np.mean(psd))
        
        # Dominant frequency
        dominant_idx = np.argmax(psd)
        dominant_freq = float(frequencies[dominant_idx])
        
        results = {
            'variable': variable,
            'sampling_rate': sampling_rate,
            'n_samples': len(values),
            'frequencies': frequencies.tolist(),
            'psd': psd.tolist(),
            'dominant_frequency': dominant_freq,
            'peak_frequencies': frequencies[peaks].tolist(),
            'peak_powers': psd[peaks].tolist()
        }
        
        # Add to history
        add_to_history(
            'Spectral Analysis',
            {
                'variable': variable,
                'dominant_freq': f"{dominant_freq:.3f} Hz"
            },
            f"Power spectral density for {variable}"
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/timeseries/changepoint', methods=['POST'])
def detect_changepoints():
    """Detect change points in time-series"""
    try:
        df = load_session_data('current_data')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        variable = data.get('variable')
        threshold = data.get('threshold', 2.0)
        
        if not variable or variable not in df.columns:
            return jsonify({'error': 'Invalid variable'}), 400
        
        values = df[variable].dropna().values
        
        if len(values) < 10:
            return jsonify({'error': 'Insufficient data'}), 400
        
        # Simple change point detection using moving statistics
        window = min(10, len(values) // 5)
        
        # Calculate moving mean and std
        moving_mean = pd.Series(values).rolling(window=window, center=True).mean()
        moving_std = pd.Series(values).rolling(window=window, center=True).std()
        
        # Detect points where change exceeds threshold
        z_scores = np.abs((values - moving_mean) / (moving_std + 1e-10))
        
        # Replace NaN with 0
        z_scores = np.nan_to_num(z_scores, nan=0.0)
        
        changepoints = np.where(z_scores > threshold)[0]
        
        results = {
            'variable': variable,
            'threshold': threshold,
            'n_changepoints': int(len(changepoints)),
            'changepoint_indices': changepoints.tolist(),
            'changepoint_values': [float(values[i]) for i in changepoints],
            'z_scores': [float(z) for z in z_scores]
        }
        
        # Add to history
        add_to_history(
            'Change Point Detection',
            {
                'variable': variable,
                'n_changepoints': len(changepoints)
            },
            f"Found {len(changepoints)} change points in {variable}"
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/timeseries/longitudinal', methods=['POST'])
def longitudinal_summary():
    """Summarize longitudinal data patterns"""
    try:
        df = load_session_data('current_data')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        variable = data.get('variable')
        time_col = data.get('time_column', 'DateTime')
        group_col = data.get('group_column', 'Subject')
        
        if not variable or variable not in df.columns:
            return jsonify({'error': 'Invalid variable'}), 400
        
        if time_col not in df.columns or group_col not in df.columns:
            return jsonify({'error': 'Time or group column not found'}), 400
        
        # Group by subject and calculate trajectories
        trajectories = {}
        
        for subject in df[group_col].unique():
            subject_data = df[df[group_col] == subject][[time_col, variable]].dropna()
            
            if len(subject_data) > 1:
                # Calculate trend
                x = np.arange(len(subject_data))
                y = subject_data[variable].values
                
                # Handle potential NaN in polyfit
                if not np.any(np.isnan(y)):
                    slope, intercept = np.polyfit(x, y, 1)
                else:
                    slope, intercept = 0.0, 0.0
                
                trajectories[str(subject)] = {
                    'n_timepoints': int(len(subject_data)),
                    'baseline': float(y[0]) if len(y) > 0 else 0.0,
                    'final': float(y[-1]) if len(y) > 0 else 0.0,
                    'change': float(y[-1] - y[0]) if len(y) > 0 else 0.0,
                    'slope': float(slope),
                    'values': [float(v) for v in y]
                }
        
        # Calculate group statistics
        slopes = [t['slope'] for t in trajectories.values()]
        changes = [t['change'] for t in trajectories.values()]
        
        results = {
            'variable': variable,
            'n_subjects': int(len(trajectories)),
            'trajectories': trajectories,
            'summary': {
                'mean_slope': float(np.mean(slopes)) if slopes else 0.0,
                'std_slope': float(np.std(slopes)) if slopes else 0.0,
                'mean_change': float(np.mean(changes)) if changes else 0.0,
                'std_change': float(np.std(changes)) if changes else 0.0,
                'increasing': int(sum(1 for s in slopes if s > 0)),
                'decreasing': int(sum(1 for s in slopes if s < 0))
            }
        }
        
        # Add to history
        add_to_history(
            'Longitudinal Summary',
            {
                'variable': variable,
                'n_subjects': len(trajectories)
            },
            f"Longitudinal analysis for {variable}"
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/features/normalize', methods=['POST'])
def normalize_features():
    """Normalize/standardize features (Z-score, min-max, etc.)"""
    try:
        df = load_session_data('current_data')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        columns = data.get('columns', [])
        method = data.get('method', 'zscore')
        
        if not columns:
            return jsonify({'error': 'Must specify columns to normalize'}), 400
        
        # Validate columns exist
        for col in columns:
            if col not in df.columns:
                return jsonify({'error': f'Column {col} not found'}), 400
        
        results = {}
        
        for col in columns:
            values = df[col].dropna()
            
            if method == 'zscore':
                # Z-score normalization
                mean_val = values.mean()
                std_val = values.std()
                normalized = (values - mean_val) / std_val if std_val > 0 else values
                results[col] = {
                    'method': 'Z-score',
                    'mean': float(mean_val),
                    'std': float(std_val),
                    'normalized': [float(v) for v in normalized]
                }
            
            elif method == 'minmax':
                # Min-max normalization to [0, 1]
                min_val = values.min()
                max_val = values.max()
                normalized = (values - min_val) / (max_val - min_val) if max_val > min_val else values
                results[col] = {
                    'method': 'Min-Max',
                    'min': float(min_val),
                    'max': float(max_val),
                    'normalized': [float(v) for v in normalized]
                }
            
            elif method == 'robust':
                # Robust scaling (median and IQR)
                median_val = values.median()
                q25 = values.quantile(0.25)
                q75 = values.quantile(0.75)
                iqr = q75 - q25
                normalized = (values - median_val) / iqr if iqr > 0 else values
                results[col] = {
                    'method': 'Robust (IQR)',
                    'median': float(median_val),
                    'iqr': float(iqr),
                    'normalized': [float(v) for v in normalized]
                }
        
        # Add to history
        add_to_history(
            'Normalize Features',
            {
                'method': method,
                'columns': len(columns)
            },
            f"{method} normalization on {len(columns)} features"
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/features/composite', methods=['POST'])
def create_composite():
    """Create composite score from multiple features"""
    try:
        df = load_session_data('current_data')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        columns = data.get('columns', [])
        weights = data.get('weights', None)
        method = data.get('method', 'mean')
        name = data.get('name', 'Composite_Score')
        
        if not columns:
            return jsonify({'error': 'Must specify columns for composite'}), 400
        
        # Validate columns
        for col in columns:
            if col not in df.columns:
                return jsonify({'error': f'Column {col} not found'}), 400
        
        # Get data
        subset = df[columns].copy()
        
        # Calculate composite score
        if method == 'mean':
            if weights:
                composite = (subset * weights).sum(axis=1) / sum(weights)
            else:
                composite = subset.mean(axis=1)
        
        elif method == 'weighted_sum':
            if weights:
                composite = (subset * weights).sum(axis=1)
            else:
                composite = subset.sum(axis=1)
        
        elif method == 'pca':
            # First principal component
            from sklearn.decomposition import PCA
            pca = PCA(n_components=1)
            subset_clean = subset.dropna()
            composite_array = pca.fit_transform(subset_clean)
            composite = pd.Series(composite_array.flatten(), index=subset_clean.index)
            variance_explained = float(pca.explained_variance_ratio_[0])
        
        else:
            return jsonify({'error': 'Invalid method'}), 400
        
        results = {
            'name': name,
            'method': method,
            'n_features': len(columns),
            'features': columns,
            'weights': weights,
            'values': [float(v) for v in composite if not np.isnan(v)],
            'stats': {
                'mean': float(composite.mean()),
                'std': float(composite.std()),
                'min': float(composite.min()),
                'max': float(composite.max())
            }
        }
        
        if method == 'pca':
            results['variance_explained'] = variance_explained
        
        # Add to history
        add_to_history(
            'Create Composite Score',
            {
                'name': name,
                'method': method,
                'features': len(columns)
            },
            f"Composite '{name}' from {len(columns)} features"
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/analysis/cross_domain', methods=['POST'])
def cross_domain_analysis():
    """Analyze correlations across biomarker domains"""
    try:
        df = load_session_data('current_data')
        metadata = load_session_data('metadata')
        
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        data = request.json
        method = data.get('method', 'pearson')
        min_correlation = data.get('min_correlation', 0.3)
        
        categories = metadata['structure']['biomarker_categories']
        
        # Calculate correlations between all biomarker pairs
        biomarkers = metadata['structure']['biomarker_columns']
        df_biomarkers = df[biomarkers].select_dtypes(include=[np.number])
        
        # Compute correlation matrix
        if method == 'pearson':
            corr_matrix = df_biomarkers.corr(method='pearson')
        elif method == 'spearman':
            corr_matrix = df_biomarkers.corr(method='spearman')
        else:
            return jsonify({'error': 'Invalid method'}), 400
        
        # Build cross-domain connections
        connections = []
        nodes = set()
        
        for i, biomarker1 in enumerate(biomarkers):
            # Get category for biomarker1
            cat1 = None
            for category, markers in categories.items():
                if biomarker1 in markers:
                    cat1 = category
                    break
            
            if cat1 is None:
                continue
            
            nodes.add((biomarker1, cat1))
            
            for j, biomarker2 in enumerate(biomarkers):
                if i >= j:  # Skip duplicates and self-correlations
                    continue
                
                # Get category for biomarker2
                cat2 = None
                for category, markers in categories.items():
                    if biomarker2 in markers:
                        cat2 = category
                        break
                
                if cat2 is None:
                    continue
                
                nodes.add((biomarker2, cat2))
                
                # Get correlation (include both cross-domain and within-domain)
                try:
                    corr_val = corr_matrix.loc[biomarker1, biomarker2]
                    
                    if pd.notna(corr_val) and abs(corr_val) >= min_correlation:
                        connections.append({
                            'source': biomarker1,
                            'target': biomarker2,
                            'source_category': cat1,
                            'target_category': cat2,
                            'correlation': float(corr_val),
                            'abs_correlation': float(abs(corr_val)),
                            'cross_domain': cat1 != cat2
                        })
                except:
                    continue
        
        # Sort by absolute correlation
        connections.sort(key=lambda x: x['abs_correlation'], reverse=True)
        
        # Build node list
        node_list = [{'id': node[0], 'category': node[1]} for node in nodes]
        
        # Build summary by domain pairs
        domain_pairs = {}
        for conn in connections:
            if conn['cross_domain']:
                pair_key = '-'.join(sorted([conn['source_category'], conn['target_category']]))
                if pair_key not in domain_pairs:
                    domain_pairs[pair_key] = {
                        'domain1': conn['source_category'],
                        'domain2': conn['target_category'],
                        'count': 0,
                        'mean_correlation': 0,
                        'connections': []
                    }
                
                domain_pairs[pair_key]['count'] += 1
                domain_pairs[pair_key]['connections'].append(conn)
        
        # Calculate mean correlations
        for pair_key in domain_pairs:
            conns = domain_pairs[pair_key]['connections']
            domain_pairs[pair_key]['mean_correlation'] = float(
                np.mean([abs(c['correlation']) for c in conns])
            )
        
        # Add to history
        add_to_history(
            'Cross-Domain Analysis',
            {
                'method': method,
                'min_r': min_correlation,
                'connections': len(connections),
                'cross_domain': len([c for c in connections if c['cross_domain']])
            },
            f"Found {len(connections)} connections ({len([c for c in connections if c['cross_domain']])} cross-domain)"
        )
        
        return jsonify({
            'success': True,
            'results': {
                'method': method,
                'min_correlation': min_correlation,
                'n_connections': len(connections),
                'n_cross_domain': len([c for c in connections if c['cross_domain']]),
                'nodes': node_list,
                'connections': connections[:200],  # Limit for performance
                'domain_pairs': list(domain_pairs.values())
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm/documents/upload', methods=['POST'])
def upload_documents():
    """Upload PDF documents to knowledge base"""
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400
        
        files = request.files.getlist('files')
        uploaded = []
        
        for file in files:
            if file and allowed_doc_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['DOCUMENTS_FOLDER'], filename)
                file.save(filepath)
                uploaded.append(filename)
        
        if not uploaded:
            return jsonify({'error': 'No valid PDF files uploaded'}), 400
        
        return jsonify({
            'success': True,
            'uploaded': uploaded,
            'message': f'Uploaded {len(uploaded)} document(s)'
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm/documents/list', methods=['GET'])
def list_documents():
    """List all uploaded documents"""
    try:
        documents = []
        
        for filename in os.listdir(app.config['DOCUMENTS_FOLDER']):
            if filename.endswith('.pdf'):
                filepath = os.path.join(app.config['DOCUMENTS_FOLDER'], filename)
                stat = os.stat(filepath)
                
                documents.append({
                    'filename': filename,
                    'size': stat.st_size,
                    'uploaded': datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        return jsonify({
            'success': True,
            'documents': documents,
            'count': len(documents)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm/documents/<filename>', methods=['DELETE'])
def delete_document(filename):
    """Delete a document"""
    try:
        # Security: ensure filename is safe
        filename = secure_filename(filename)
        filepath = os.path.join(app.config['DOCUMENTS_FOLDER'], filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'Document not found'}), 404
        
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'message': f'Deleted {filename}'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm/vectorstore/build', methods=['POST'])
def build_vectorstore_endpoint():
    """Build FAISS vector store from uploaded documents"""
    try:
        if not OPENAI_API_KEY:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        result = build_faiss_index()
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm/vectorstore/status', methods=['GET'])
def vectorstore_status():
    """Check if vector store exists and get stats"""
    try:
        index_path = os.path.join(app.config['VECTORSTORE_FOLDER'], 'index.faiss')
        
        if os.path.exists(index_path):
            stat = os.stat(index_path)
            doc_count = len([f for f in os.listdir(app.config['DOCUMENTS_FOLDER']) if f.endswith('.pdf')])
            
            return jsonify({
                'exists': True,
                'document_count': doc_count,
                'last_built': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'api_key_configured': OPENAI_API_KEY is not None
            })
        else:
            return jsonify({
                'exists': False,
                'document_count': 0,
                'api_key_configured': OPENAI_API_KEY is not None
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm/column_stats', methods=['POST'])
def get_column_stats():
    """Get statistics for a specific column to enhance LLM context"""
    try:
        data = request.json
        column_name = data.get('column_name')
        
        if not column_name:
            return jsonify({'error': 'Column name required'}), 400
        
        df = load_session_data('current_data')
        if df is None:
            return jsonify({'error': 'No data loaded'}), 404
        
        # Find column (case-insensitive)
        matching_col = None
        for col in df.columns:
            if col.upper() == column_name.upper():
                matching_col = col
                break
        
        if not matching_col:
            return jsonify({'error': f'Column {column_name} not found'}), 404
        
        # Get column data
        column_data = df[matching_col]
        
        # Check if numeric
        if not pd.api.types.is_numeric_dtype(column_data):
            return jsonify({'error': f'Column {matching_col} is not numeric'}), 400
        
        # Drop NaN values
        column_data_clean = column_data.dropna()
        
        if column_data_clean.empty:
            return jsonify({'error': f'Column {matching_col} has no valid numeric data'}), 404
        
        # Calculate comprehensive statistics
        stats = {
            'column_name': matching_col,
            'n_total': int(len(column_data)),
            'n_valid': int(len(column_data_clean)),
            'n_missing': int(column_data.isna().sum()),
            'mean': float(column_data_clean.mean()),
            'median': float(column_data_clean.median()),
            'std': float(column_data_clean.std()),
            'min': float(column_data_clean.min()),
            'max': float(column_data_clean.max()),
            'q25': float(column_data_clean.quantile(0.25)),
            'q75': float(column_data_clean.quantile(0.75)),
            'iqr': float(column_data_clean.quantile(0.75) - column_data_clean.quantile(0.25))
        }
        
        # Detect outliers (IQR method)
        q1 = stats['q25']
        q3 = stats['q75']
        iqr = stats['iqr']
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = column_data_clean[(column_data_clean < lower_bound) | (column_data_clean > upper_bound)]
        stats['n_outliers'] = int(len(outliers))
        stats['outlier_indices'] = [int(idx) for idx in outliers.index.tolist()[:10]]
        stats['outlier_values'] = [float(v) for v in outliers.values[:10]]
        
        # Sample of actual values
        sample_size = min(10, len(column_data_clean))
        if sample_size > 0:
            stats['sample_values'] = [float(v) for v in column_data_clean.sample(sample_size).values]
        else:
            stats['sample_values'] = []
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm/query', methods=['POST'])
def llm_query_endpoint():
    """Query LLM with RAG context"""
    try:
        if not OPENAI_API_KEY:
            return jsonify({'error': 'OpenAI API key not configured. Please set OPENAI_API_KEY in environment.'}), 500
        
        data = request.json
        question = data.get('question')
        context = data.get('context', None)
        dataset_summary = data.get('dataset_summary', None)
        column_stats = data.get('column_stats', [])  # NEW

        if not question:
            return jsonify({'error': 'Question is required'}), 400

        result = query_with_rag(question, context, dataset_summary, column_stats)  # Pass column_stats
        
        if 'error' in result:
            return jsonify(result), 500
        
        return jsonify({
            'success': True,
            **result
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
