from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import numpy as np
import json
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        df = df.replace({np.nan: None})
        preview = df.head(5).to_dict(orient="records")
        
        return {
            "columns": df.columns.tolist(),
            "numeric_columns": numeric_cols,
            "preview": preview,
            "total_rows": len(df)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cluster")
async def cluster_data(
    file: UploadFile = File(...),
    selected_columns: str = Form(...),
    k: int = Form(...)
):
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        cols = json.loads(selected_columns)
        if not cols:
            raise HTTPException(status_code=400, detail="No columns selected.")

        for col in cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"{col} not found.")

        df_cluster = df[cols].dropna()
        if df_cluster.empty:
            raise HTTPException(status_code=400, detail="No valid data.")

        # Scaling
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(df_cluster)

        # KMeans
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(X_scaled)
        
        # Silhouette Score
        sil_score = None
        if 1 < k < len(X_scaled):
            sil_score = float(silhouette_score(X_scaled, clusters))
            
        df_cluster['Cluster'] = clusters

        df['Cluster'] = None
        df.loc[df_cluster.index, 'Cluster'] = clusters

        # PCA
        if len(cols) > 2:
            pca = PCA(n_components=2)
            comp = pca.fit_transform(X_scaled)
            df_cluster['PCA1'] = comp[:, 0]
            df_cluster['PCA2'] = comp[:, 1]
        elif len(cols) == 2:
            df_cluster['PCA1'] = X_scaled[:, 0]
            df_cluster['PCA2'] = X_scaled[:, 1]
        else:
            df_cluster['PCA1'] = X_scaled[:, 0]
            df_cluster['PCA2'] = 0

        # Centroids
        centroids = []
        for i in range(k):
            cdata = df_cluster[df_cluster['Cluster'] == i]
            if not cdata.empty:
                centroids.append({
                    "cluster": int(i),
                    "x": float(cdata['PCA1'].mean()),
                    "y": float(cdata['PCA2'].mean()),
                    "size": int(len(cdata))
                })

        # Detect columns
        col1_name, col2_name = None, None
        for col in cols:
            c = col.lower()
            if ('incom' in c or 'salary' in c) and not col1_name:
                col1_name = col
            elif ('spend' in c or 'score' in c) and not col2_name:
                col2_name = col

        if not col1_name:
            col1_name = cols[0]
        if not col2_name and len(cols) > 1:
            col2_name = [c for c in cols if c != col1_name][0]

        global_mean1 = df_cluster[col1_name].mean()
        global_mean2 = df_cluster[col2_name].mean()

        # 🔥 GROUP INTO 4 FIXED CATEGORIES
        category_groups = {}

        def get_label(c_m1, c_m2):
            v1 = c_m1 >= global_mean1
            v2 = c_m2 >= global_mean2

            if v1 and v2:
                return "Premium Customers 💎", "High income with high spending."
            elif v1 and not v2:
                return "Careful Customers 🧠", "High income but low spending."
            elif not v1 and v2:
                return "Impulse Buyers 🎯", "Low income but high spending."
            else:
                return "Low Value Customers 📉", "Low income and low spending."

        # Group clusters
        for i in range(k):
            cdata = df_cluster[df_cluster['Cluster'] == i]
            if cdata.empty:
                continue

            mean_vals = cdata[cols].mean().to_dict()
            c_m1 = cdata[col1_name].mean()
            c_m2 = cdata[col2_name].mean()

            label, desc = get_label(c_m1, c_m2)

            if label not in category_groups:
                category_groups[label] = {
                    "label": label,
                    "description": desc,
                    "count": 0,
                    "means": {col: 0 for col in cols}
                }

            count = len(cdata)
            category_groups[label]["count"] += count

            for col in cols:
                category_groups[label]["means"][col] += mean_vals[col] * count

        # Normalize means
        insights = []
        for cat in category_groups.values():
            total = cat["count"]
            cat["means"] = {k: float(v / total) for k, v in cat["means"].items()}
            insights.append(cat)

        # Points
        points = []
        for idx, row in df_cluster.iterrows():
            points.append({
                "x": float(row['PCA1']),
                "y": float(row['PCA2']),
                "cluster": int(row['Cluster']),
                "index": int(idx)
            })

        # Cluster label mapping
        cluster_label_map = {}
        for i in range(k):
            cdata = df_cluster[df_cluster['Cluster'] == i]
            if cdata.empty:
                continue
            c_m1 = cdata[col1_name].mean()
            c_m2 = cdata[col2_name].mean()
            label, _ = get_label(c_m1, c_m2)
            cluster_label_map[i] = label

        df["Cluster_Label"] = df["Cluster"].map(cluster_label_map)

        df_export = df.replace({np.nan: None})

        # Cluster data
        clusterData = {}
        for i in range(k):
            subset = df_export[df_export['Cluster'] == i]
            rows = subset.head(100).to_dict(orient="records")
            csv_str = subset.to_csv(index=False)
            b64 = base64.b64encode(csv_str.encode()).decode()

            clusterData[str(i)] = {
                "rows": rows,
                "csv": b64
            }

        response_payload = {
            "points": points,
            "centroids": centroids,
            "insights": insights,
            "axis_labels": {
                "x": "PCA Component 1" if len(cols)>2 else cols[0],
                "y": "PCA Component 2" if len(cols)>2 else cols[1] if len(cols)==2 else "0"
            },
            "result_data": df_export.to_dict(orient="records"),
            "clusterData": clusterData
        }
        
        if sil_score is not None:
            response_payload["silhouette_score"] = sil_score
            
        return response_payload

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/elbow")
async def elbow_method(
    file: UploadFile = File(...),
    selected_columns: str = Form(...)
):
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        cols = json.loads(selected_columns)
        if not cols:
            raise HTTPException(status_code=400, detail="No columns selected.")

        for col in cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"{col} not found in dataset.")

        df_cluster = df[cols].dropna()
        if df_cluster.empty:
            raise HTTPException(status_code=400, detail="No valid data after cleaning.")

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(df_cluster)

        elbow_data = []
        max_k = min(10, len(X_scaled))  # Evaluate up to 10 clusters (or max samples)
        
        for i in range(1, max_k + 1):
            kmeans = KMeans(n_clusters=i, random_state=42, n_init=10)
            kmeans.fit(X_scaled)
            elbow_data.append({
                "k": int(i),
                "wcss": float(kmeans.inertia_)
            })

        return {"elbow": elbow_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))