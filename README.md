# 🚀 Customer Segmentation SaaS (Nexus Segment)

A full-stack **Customer Segmentation Web Application** built using **Unsupervised Machine Learning (KMeans Clustering)**.
Upload your dataset, analyze customer behavior, and visualize meaningful segments in an interactive dashboard.

---

## 🌐 Live Demo

* 🔗 **Frontend (Vercel):** https://your-vercel-app.vercel.app
* 🔗 **Backend API Docs:** https://your-backend.onrender.com/docs

---

## 🧠 What This Project Does

This application helps businesses and analysts:

* Understand customer behavior
* Identify valuable customer segments
* Make data-driven decisions

It automatically groups customers into segments such as:

* 💎 Premium Customers
* 🎯 Impulse Buyers
* 🧠 Careful Customers
* 📊 Average Customers

---

## ⚙️ Tech Stack

### 🔹 Frontend

* React (Vite)
* Recharts (for visualization)
* Lucide Icons
* Vanilla CSS (Glassmorphism + Antigravity UI)

### 🔹 Backend

* FastAPI
* Pandas
* Scikit-learn (KMeans, PCA)
* Uvicorn

### 🔹 Deployment

* Frontend → Vercel
* Backend → Render

---

## ✨ Key Features

* 📂 Upload CSV dataset
* 🔍 Automatic numeric column detection
* ⚙️ Select features & number of clusters (K)
* 🤖 KMeans clustering implementation
* 📉 PCA-based 2D visualization
* 🧠 Intelligent cluster insights
* 🎯 Interactive segment cards
* 📥 Download full clustered dataset
* 📌 Click a segment → view & download that cluster's data

---

## 🖥️ Application Workflow

1. Upload CSV file
2. Preview dataset
3. Select features (numeric columns)
4. Choose number of clusters (K)
5. Run segmentation
6. Visualize clusters
7. Explore insights & download results

---

## 📁 Project Structure

```bash
Customer-Segmentation/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
```

---

## 🛠️ Local Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/Customer-Segmentation.git
cd Customer-Segmentation
```

---

### 2️⃣ Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

👉 Open: http://127.0.0.1:8000/docs

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🌍 Deployment Guide

### Backend (Render)

* Root Directory: `backend`
* Start Command:

```bash
uvicorn main:app --host 0.0.0.0 --port 10000
```

---

### Frontend (Vercel)

* Root Directory: `frontend`
* Build Command:

```bash
npm run build
```

* Output Directory: `dist`

---

## ⚠️ Important Configuration

### API URL (Frontend)

Make sure your frontend uses:

```js
const API_BASE_URL = "https://your-backend.onrender.com/api";
```

---

### CORS (Backend)

```python
allow_origins=["*"]
```

---

## 📊 Example Dataset

You can test using:

* Mall Customers Dataset
* Any CSV with numeric columns

---

## 🚀 Future Improvements

* 🔐 Authentication system
* 📈 Auto K selection (Elbow Method)
* 🎨 Enhanced animations & UI
* ☁️ Dataset history storage
* 🤖 More ML algorithms (DBSCAN, Hierarchical)

---

## 👨‍💻 Author

**Ruturaj Sankpal**
AIML Student | Full Stack Developer | ML Enthusiast

---

## ⭐ Support

If you found this project helpful:

👉 Give it a ⭐ on GitHub
👉 Share it with others

---

## 💬 Final Note

This project demonstrates:

* Full-stack development
* Machine Learning integration
* Real-world deployment

🚀 Built as a portfolio-level SaaS application.
