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

### ✅ CI/CD Flow

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
