# OpenSuite – Open-Access PDF Suite

A production-grade, free, ad-supported PDF processing platform with professional tools for document conversion, editing, security, and more.

## ⚡ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Java 21, Spring Boot 3.2, PostgreSQL, Redis |
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS |
| **PDF Engine** | Apache PDFBox 3.0, Apache POI 5.2 |
| **Deployment** | Docker, Docker Compose, Nginx |

## 🚀 Quick Start

### Prerequisites
- Java 21+ (for backend development)
- Node.js 20+ (for frontend development)
- Docker & Docker Compose (for production deployment)

### Development Setup

**Backend:**
```bash
cd backend
# Uses H2 in-memory database by default
./mvnw spring-boot:run
# API available at http://localhost:8080
# Swagger UI at http://localhost:8080/swagger-ui.html
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:3000
```

### Production Deployment

```bash
# Set environment variables (optional)
export DB_PASSWORD=your_secure_password
export SITE_URL=https://yourdomain.com

# Start all services
docker compose up -d

# Access at http://localhost (Nginx)
```

## 💻 Setup on a New Laptop

If you are moving this project to a new machine, follow these steps:

### 1. Clone the Repository
Open your terminal or command prompt and run:
```bash
git clone https://github.com/samisahirbaig/opensuit.git
cd opensuit
```

### 2. Backend Setup
1. **Install Java 21+**: Ensure you have Java 21 or later installed (`java -version`).
2. **Navigate to backend**:
   ```bash
   cd backend
   ```
3. **Run the server**:
   - On Windows:
     ```bash
     .\mvnw spring-boot:run
     ```
   - On Mac/Linux:
     ```bash
     ./mvnw spring-boot:run
     ```
   The backend will start on `http://localhost:8080`.

### 3. Frontend Setup
1. **Install Node.js**: Ensure you have Node.js 20+ installed (`node -v`).
2. **Open a new terminal** (keep the backend running).
3. **Navigate to frontend**:
   ```bash
   cd frontend
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Run the development server**:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.

### 4. Troubleshooting
- **Port Conflicts**: Ensure ports 8080 (backend) and 3000 (frontend) are not in use.
- **Database**: By default, the app uses an in-memory H2 database. No external database installation is required for development.

## 📁 Project Structure

```
opensuite/
├── backend/                    # Spring Boot API
│   ├── src/main/java/com/opensuite/
│   │   ├── config/             # Spring configs (Security, CORS, Async, Swagger, Rate Limiting)
│   │   ├── controller/         # REST controllers (File, Conversion, Edit, Security, Batch, Status)
│   │   ├── service/            # Business logic (Upload, Conversion, Editing, Security, Job, OCR)
│   │   ├── model/              # JPA entities (Job, DownloadToken) + Enums
│   │   ├── dto/                # Request/Response DTOs
│   │   ├── repository/         # JPA repositories
│   │   ├── scheduler/          # File cleanup scheduler
│   │   └── exception/          # Global exception handling
│   └── Dockerfile
├── frontend/                   # Next.js App
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── [slug]/         # Dynamic tool pages (22+ tools)
│   │   │   ├── blog/           # Blog section
│   │   │   ├── sitemap.ts      # Auto-generated sitemap
│   │   │   └── robots.ts       # Robots.txt
│   │   ├── components/         # Reusable components
│   │   └── lib/                # API client, tool definitions
│   └── Dockerfile
├── docker-compose.yml          # Full stack orchestration
├── nginx.conf                  # Reverse proxy config
└── README.md
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload a file |
| POST | `/api/convert/{type}` | Convert document |
| POST | `/api/edit/{type}` | Edit PDF |
| POST | `/api/edit/merge` | Merge multiple PDFs |
| POST | `/api/security/{type}` | Security operations |
| POST | `/api/batch` | Batch processing |
| GET | `/api/status/{jobId}` | Check job status |
| GET | `/api/download/{token}` | Download result |
| GET | `/api/health` | Health check |

## 🛡️ Privacy & Security

- **No user accounts** — no login, no registration
- **No permanent storage** — files auto-deleted after 1 hour
- **UUID filenames** — no original filenames stored
- **Encrypted transfer** — HTTPS enforced
- **Secure downloads** — tokens expire in 10 minutes
- **Rate limiting** — 30 requests/minute per IP
- **File validation** — MIME type + size checks

## 🌐 SEO Features

- Static generation for all tool pages
- Unique metadata per page (title, description, keywords)
- OpenGraph + Twitter cards
- Schema.org structured data (SoftwareApplication + FAQPage)
- Auto-generated sitemap.xml
- robots.txt
- 1000+ words SEO content per tool page
- Blog architecture ready

## 💰 AdSense Setup

1. Replace `ca-pub-XXXXXXXXXXXXXXXX` with your publisher ID in:
   - `frontend/src/app/layout.tsx`
   - `frontend/src/components/AdUnit.tsx`
   - `frontend/public/ads.txt`
2. Google must approve your site before ads appear

## 📋 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `opensuite_secret` | PostgreSQL password |
| `DB_HOST` | `localhost` | Database host |
| `REDIS_HOST` | `localhost` | Redis host |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend API URL |
| `NEXT_PUBLIC_SITE_URL` | `https://opensuite.io` | Production URL |
| `SITE_URL` | `https://opensuite.io` | Site URL for Docker |

## License

MIT
