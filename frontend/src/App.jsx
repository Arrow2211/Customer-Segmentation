import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Settings, BarChart2, CheckCircle, Download, Activity, Play } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ZAxis, LineChart, Line } from 'recharts';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Config, 3: Results

  const [previewData, setPreviewData] = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [numericColumns, setNumericColumns] = useState([]);

  const [selectedCols, setSelectedCols] = useState([]);
  const [kValue, setKValue] = useState(3);

  const [results, setResults] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);

  const [elbowData, setElbowData] = useState([]);
  const [loadingElbow, setLoadingElbow] = useState(false);

  const fileInputRef = useRef(null);

  // Background orbs
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      document.documentElement.style.setProperty('--mouse-x', x);
      document.documentElement.style.setProperty('--mouse-y', y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = async (selectedFile) => {
    if (!selectedFile || !selectedFile.name.endsWith('.csv')) {
      alert("Please upload a valid CSV file.");
      return;
    }
    setFile(selectedFile);
    uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed. Make sure the backend is running.");

      const data = await response.json();
      setPreviewData(data.preview);
      setAllColumns(data.columns);
      setNumericColumns(data.numeric_columns);
      // Auto-select up to 3 numeric columns
      setSelectedCols(data.numeric_columns.slice(0, Math.min(3, data.numeric_columns.length)));
      setStep(2);
    } catch (err) {
      alert(err.message);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCol = (col) => {
    setSelectedCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const runClustering = async () => {
    if (selectedCols.length === 0) {
      alert("Please select at least one numeric column for clustering.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('selected_columns', JSON.stringify(selectedCols));
    formData.append('k', kValue);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/cluster', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Clustering failed.");
      }

      const data = await response.json();
      setResults(data);
      setSelectedCluster(null);
      setStep(3);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const findOptimalK = async () => {
    if (selectedCols.length === 0) {
      alert("Please select at least one numeric column.");
      return;
    }

    setLoadingElbow(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('selected_columns', JSON.stringify(selectedCols));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/elbow', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Elbow calculation failed.");
      }

      const data = await response.json();
      setElbowData(data.elbow);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingElbow(false);
    }
  };

  const downloadCSV = () => {
    if (!results || !results.result_data) return;

    // Create CSV from array of objects
    const headers = Object.keys(results.result_data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    results.result_data.forEach(row => {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) val = "";
        return `"${val}"`; // wrap quotes roughly
      });
      csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `segmented_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadClusterCSV = () => {
    if (selectedCluster === null || !results?.clusterData) return;
    const b64Data = results.clusterData[selectedCluster].csv;

    // Decode base64 
    const binary = atob(b64Data);
    // Convert binary to UTF8 arrays
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([array], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const clusterLabel = results.insights.find(i => i.cluster === selectedCluster)?.label || `cluster_${selectedCluster}`;
    // clean label format to safe file
    const safeName = clusterLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_data.csv';

    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Color palette for clusters
  const COLORS = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

  return (
    <div className="app-container" style={{ position: 'relative', width: '100vw', padding: '20px 0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Background Decor */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>

      {/* Header */}
      <header className="glass-panel" style={{ width: '90%', maxWidth: '1200px', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--accent-primary)', padding: '10px', borderRadius: '12px' }}>
            <Activity color="#fff" size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '1px' }}>Nexus Segment</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>AI-Powered Customer Intelligence</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step >= 1 ? 1 : 0.4 }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: step >= 1 ? 'var(--accent-primary)' : 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: step >= 1 ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold' }}>1</div>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Upload</span>
          </div>
          <div style={{ width: '40px', height: '2px', background: 'var(--glass-border)', alignSelf: 'center' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step >= 2 ? 1 : 0.4 }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: step >= 2 ? 'var(--accent-primary)' : 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: step >= 2 ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold' }}>2</div>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Configure</span>
          </div>
          <div style={{ width: '40px', height: '2px', background: 'var(--glass-border)', alignSelf: 'center' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step >= 3 ? 1 : 0.4 }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: step >= 3 ? 'var(--accent-primary)' : 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: step >= 3 ? '#fff' : 'var(--text-secondary)', fontWeight: 'bold' }}>3</div>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Analyze</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ width: '90%', maxWidth: '1200px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '10px' }}>Upload Dataset</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Drop your customer CSV file to start unsupervised segmentation.</p>

            <div
              className="drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={64} color="var(--accent-primary)" style={{ margin: '0 auto 20px', opacity: 0.8 }} />
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Drag & Drop your CSV here</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>or click to browse files</p>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>

            {loading && (
              <div style={{ marginTop: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--accent-primary)' }}>
                <Activity size={24} />
                <span>Processing dataset...</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', width: '100%' }}>
            {/* Left: Preview */}
            <div className="glass-panel" style={{ padding: '30px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <FileText color="var(--accent-primary)" />
                <h3 style={{ fontSize: '20px' }}>Dataset Preview</h3>
              </div>
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-gradient-1)' }}>
                      {allColumns.map((col, i) => (
                        <th key={i} style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: numericColumns.includes(col) ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                          {col} {numericColumns.includes(col) && <span style={{ fontSize: '10px', marginLeft: '5px' }}>#</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        {allColumns.map((col, j) => (
                          <td key={j} style={{ padding: '10px 15px' }}>
                            {row[col] !== null ? String(row[col]) : <span style={{ opacity: 0.3 }}>-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Settings */}
            <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                <Settings color="var(--accent-primary)" />
                <h3 style={{ fontSize: '20px' }}>Model Configuration</h3>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>Number of Clusters (K)</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '18px' }}>{kValue}</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={kValue}
                  onChange={(e) => setKValue(parseInt(e.target.value))}
                  className="custom-slider"
                />
                
                <button
                  onClick={findOptimalK}
                  disabled={loadingElbow || selectedCols.length === 0}
                  style={{ width: '100%', marginTop: '15px', background: 'transparent', border: '1px solid var(--accent-primary)', padding: '8px', borderRadius: '6px', color: 'var(--accent-primary)', cursor: 'pointer', transition: 'all 0.3s', fontSize: '13px', fontWeight: '500' }}
                  onMouseEnter={(e) => { if(!e.target.disabled) e.target.style.background = '#eff6ff' }}
                  onMouseLeave={(e) => { if(!e.target.disabled) e.target.style.background = 'transparent' }}
                >
                  {loadingElbow ? 'Calculating...' : 'Find Optimal K'}
                </button>

                {elbowData.length > 0 && (
                  <div style={{ width: '100%', height: '160px', marginTop: '20px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={elbowData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                        <XAxis dataKey="k" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={{ stroke: 'var(--glass-border)' }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={{ stroke: 'var(--glass-border)' }} width={40} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="wcss" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                <p style={{ fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '15px' }}>Feature Selection (Numeric)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {numericColumns.map(col => (
                    <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px', background: 'var(--bg-gradient-1)', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s', borderColor: selectedCols.includes(col) ? 'var(--accent-primary)' : 'var(--glass-border)' }}>
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={selectedCols.includes(col)}
                        onChange={() => handleToggleCol(col)}
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                  {numericColumns.length === 0 && (
                    <p style={{ color: 'red', fontSize: '14px' }}>No numeric columns found in the dataset!</p>
                  )}
                </div>
              </div>

              <button
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '20px' }}
                onClick={runClustering}
                disabled={loading || selectedCols.length === 0}
              >
                {loading ? <Activity size={20} /> : <Play size={20} />}
                {loading ? 'Clustering...' : 'Run Segmentation'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
            {/* Top row: Chart & Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
              <div className="glass-panel" style={{ padding: '30px', minHeight: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart2 color="var(--accent-primary)" />
                    <h3 style={{ fontSize: '20px' }}>Cluster Distribution</h3>
                  </div>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {results.axis_labels.x} vs {results.axis_labels.y}
                  </span>
                </div>

                <div style={{ height: '400px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                      <XAxis type="number" dataKey="x" name={results.axis_labels.x} tick={{ fill: 'var(--text-secondary)' }} axisLine={{ stroke: 'var(--glass-border)' }} />
                      <YAxis type="number" dataKey="y" name={results.axis_labels.y} tick={{ fill: 'var(--text-secondary)' }} axisLine={{ stroke: 'var(--glass-border)' }} />
                      <ZAxis type="number" range={[50, 400]} />

                      <RechartsTooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-primary)' }}
                      />

                      {/* Plot Data Points per Cluster */}
                      {Array.from({ length: kValue }).map((_, clusterIdx) => (
                        <Scatter
                          key={`cluster-${clusterIdx}`}
                          name={`Segment ${clusterIdx + 1}`}
                          data={results.points.filter(p => p.cluster === clusterIdx)}
                          fill={COLORS[clusterIdx % COLORS.length]}
                        />
                      ))}

                      {/* Plot Centroids */}
                      <Scatter
                        name="Centroids"
                        data={results.centroids}
                        fill="var(--text-primary)"
                        shape="star"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Action & Overview panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '30px', flex: '1' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <CheckCircle color="var(--success)" /> Success
                  </h3>
                  <div style={{ marginBottom: '30px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '5px' }}>Total Rows Processed</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{results.points.length}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '5px' }}>Number of Segments</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{kValue}</p>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', flex: 'none' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '10px', color: 'var(--text-primary)', fontWeight: '600' }}>Clustering Quality</h3>
                  {results.silhouette_score !== undefined && results.silhouette_score !== null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{results.silhouette_score.toFixed(2)}</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.2' }}>
                        {results.silhouette_score > 0.5 ? "Excellent Clustering" : results.silhouette_score > 0.3 ? "Good Clustering" : "Weak Clustering"}
                      </p>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Score not available (requires K &gt; 1)</p>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: '30px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Export Results</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Download the dataset appended with cluster segment labels.</p>
                  <button className="btn-primary" onClick={downloadCSV} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <Download size={20} />
                    Download CSV
                  </button>

                  <button
                    onClick={() => { setStep(1); setFile(null); setResults(null); setSelectedCluster(null); }}
                    style={{ width: '100%', marginTop: '15px', background: 'transparent', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '50px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.3s' }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-gradient-1)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom row: Insights */}
            <h3 style={{ fontSize: '24px', marginTop: '20px', marginLeft: '10px' }}>Segment Insights</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {results.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="glass-panel"
                  onClick={() => setSelectedCluster(idx)}
                  style={{
                    padding: '25px', position: 'relative', overflow: 'hidden', cursor: 'pointer',
                    outline: selectedCluster === idx ? `2px solid ${COLORS[idx % COLORS.length]}` : 'none',
                    boxShadow: selectedCluster === idx ? `0 15px 45px 0 ${COLORS[idx % COLORS.length]}40` : '',
                    transform: selectedCluster === idx ? 'translateY(-5px)' : ''
                  }}
                >
                  {/* Decorator strip */}
                  <div style={{ position: 'absolute', top: 0, left: 0, wight: '100%', height: '4px', width: '100%', background: COLORS[idx % COLORS.length] }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '5px' }}>{insight.label || `Segment ${idx + 1}`}</h4>
                      {insight.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', paddingRight: '10px' }}>{insight.description}</p>}
                    </div>
                    <span style={{ background: 'var(--bg-gradient-1)', border: '1px solid var(--glass-border)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', whiteSpace: 'nowrap', marginTop: '4px', color: 'var(--text-secondary)' }}>
                      {insight.count} samples ({(insight.count / results.points.length * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(insight.means).map(([col, meanStr]) => {
                      const val = Number(meanStr);
                      return (
                        <div key={col} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{col}:</span>
                          <span style={{ fontWeight: '500' }}>{Number.isInteger(val) ? val : String(val).startsWith('-') || String(val).match(/\d+\.\d+/) ? val.toFixed(2) : meanStr}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Extended Cluster Data View */}
            {selectedCluster !== null && results.clusterData && results.clusterData[selectedCluster] && (
              <div className="glass-panel" style={{ marginTop: '10px', padding: '30px', animation: 'floating 0.5s ease-out forwards', animationIterationCount: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '20px' }}>
                    <span style={{ color: COLORS[selectedCluster % COLORS.length], marginRight: '10px' }}>●</span>
                    {results.insights.find(i => i.cluster === selectedCluster)?.label || `Segment ${selectedCluster + 1}`} - Data Explorer
                  </h3>
                  <button className="btn-primary" onClick={downloadClusterCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '14px' }}>
                    <Download size={16} />
                    Download Segment CSV
                  </button>
                </div>

                <div style={{ overflowX: 'auto', maxHeight: '400px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-gradient-1)', zIndex: 1 }}>
                      <tr>
                        {Object.keys(results.clusterData[selectedCluster].rows[0] || {}).map((col, i) => (
                          <th key={i} style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.clusterData[selectedCluster].rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          {Object.values(row).map((val, j) => (
                            <td key={j} style={{ padding: '10px 15px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                              {val !== null ? String(val) : <span style={{ opacity: 0.3 }}>-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {results.clusterData[selectedCluster].rows.length === 100 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', marginTop: '15px' }}>
                    Showing first 100 records in preview. Use Download CSV for full grouped data.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
