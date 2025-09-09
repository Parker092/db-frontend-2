# db-frontend-2

Node.js + Express + PostgreSQL demo app deployed on **Google Cloud Run** with a **CI/CD pipeline** powered by **GitHub, Cloud Build, and Artifact Registry**.

---

## 📦 Project Structure

db-frontend-2/ \
├── cloudbuild.yaml   # Cloud Build pipeline definition \
├── Dockerfile        # Container build definition \
├── index.mjs         # Express.js app \
├── package.json \
├── package-lock.json \
└── README.md

---

## ⚙️ Prerequisites

- A Google Cloud Project (with billing enabled)
- `gcloud` CLI installed and authenticated (`gcloud init`)
- Docker installed locally (for local testing)
- GitHub repo: [db-frontend-2](https://github.com/Parker092/db-frontend-2.git)
- A **GitHub Personal Access Token (PAT)** for pushing code from remote environments
- PostgreSQL instance running on **Cloud SQL**

---

## 🚀 Deployment Steps

### 1. Clone the repository

```bash
git clone https://github.com/Parker092/db-frontend-2.git
cd db-frontend-2
```

---

### 2. Set required environment variables

```bash
# --- REQUIRED: change these ---
export PROJECT_ID="my-gcp-project"
export REGION="us-central1"                 # Cloud Run + trigger region
export REPO_NAME="app-repo"                 # GAR repository name
export SERVICE_NAME="db-frontend-2"         # Cloud Run service name
export GITHUB_OWNER="Parker092"             # your GitHub username
export GITHUB_REPO="db-frontend-2"          # repo name
export BRANCH_PATTERN="^main$"              # trigger on pushes to main

# Convenience
export AR_HOST="${REGION}-docker.pkg.dev"
export IMAGE_URI="${AR_HOST}/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
```

---

### 3. Enable required Google Cloud APIs

```bash
gcloud config set project "${PROJECT_ID}"

gcloud services enable   run.googleapis.com   cloudbuild.googleapis.com   artifactregistry.googleapis.com   iam.googleapis.com
```

---

### 4. Create Artifact Registry repository

```bash
gcloud artifacts repositories create "${REPO_NAME}"   --repository-format=docker   --location="${REGION}"   --description="Containers for ${SERVICE_NAME}"

# Docker auth to AR
gcloud auth configure-docker "${AR_HOST}" --quiet
```

---

### 5. Create Service Accounts and IAM Bindings

```bash
# Runtime SA for Cloud Run
export RUNTIME_SA_ID="cr-runtime-sa"
export RUNTIME_SA="${RUNTIME_SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create "${RUNTIME_SA_ID}"   --display-name="Cloud Run runtime for ${SERVICE_NAME}"

# Cloud Build default SA (2nd-gen)
export PROJECT_NUMBER="$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')"
export BUILDER_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Permissions for Cloud Build SA
gcloud projects add-iam-policy-binding "${PROJECT_ID}"   --member="serviceAccount:${BUILDER_SA}"   --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}"   --member="serviceAccount:${BUILDER_SA}"   --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding "${PROJECT_ID}"   --member="serviceAccount:${BUILDER_SA}"   --role="roles/artifactregistry.writer"
```

---

### 6. Configure Cloud Build Trigger

```bash
gcloud builds triggers create github   --name="${SERVICE_NAME}-on-main"   --repo-owner="${GITHUB_OWNER}"   --repo-name="${GITHUB_REPO}"   --branch-pattern="${BRANCH_PATTERN}"   --build-config="cloudbuild.yaml"   --location="${REGION}"
```

---

### 7. Push Code to GitHub

```bash
git init
git branch -M main
git remote add origin https://github.com/Parker092/db-frontend-2.git
git add .
git commit -m "Initial commit for CI/CD pipeline"
git push origin main
```

---

### 8. CI/CD Flow

1. Developer pushes code → GitHub
2. Cloud Build trigger fires
3. Cloud Build:
   - Builds Docker image
   - Runs tests
   - Pushes image to Artifact Registry
   - Deploys to Cloud Run
4. Cloud Run service URL is updated automatically

---

## ✅ Verification

After the first deployment:

```bash
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)'
```

Open the URL in a browser and confirm the app is running.

---

## 🔑 Notes

- Ensure PostgreSQL instance exists in **Cloud SQL** and environment variables `INSTANCE_CONNECTION_NAME`, `DB_USER`, and `DB_NAME` are set in **Cloud Run**.
- You can set them with:

```bash
gcloud run services update ${SERVICE_NAME}   --region=${REGION}   --update-env-vars INSTANCE_CONNECTION_NAME="your-sql-connection",DB_USER="youruser",DB_NAME="yourdb"
```
