# SaaS IA Platform 👋

This is a modern, microservices-based SaaS platform powered by AI (Google Gemini), built with React, Node.js, and Docker.

## 🚀 Get started

Follow these steps to get the project running on your local machine:

### 1. Prerequisites
Make sure you have **Docker** and **Docker Compose** installed.

### 2. Configuration
The project uses environment variables. Check the `.env` file in the root directory and ensure your **GEMINI_API_KEY** is correctly set.

### 3. Launch the platform
Run the following command in the root folder to build and start all services:

```powershell
docker compose up -d --build
```

### 4. Access the app
Once all containers are "Healthy", you can access the different parts of the platform:

- **Frontend Interface**: [http://localhost:5173](http://localhost:5173)
- **API Gateway**: [http://localhost:8081](http://localhost:8081)
- **MailHog (Email testing)**: [http://localhost:8025](http://localhost:8025)
- **Grafana (Monitoring)**: [http://localhost:3000](http://localhost:3000)

## 🛠 Tech Stack

- **Frontend**: React (Vite), TailwindCSS, Lucide Icons.
- **Microservices**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL with Prisma ORM.
- **Cache**: Redis.
- **AI**: Google Gemini API.
- **Monitoring**: Prometheus & Grafana.
- **Infrastructure**: Docker & Docker Compose.

## ⚠️ Important Information

- **API Port**: The Gateway is configured on port **8081** because the standard port 8080 is often used by other system processes.
- **AI Quota**: If you see a "Quota exceeded" message, wait 60 seconds (minute limit) or check your daily limit on Google AI Studio.
- **Database**: The PostgreSQL database is automatically initialized and migrated by the `db-service`.

## 📈 Monitoring

You can track the health and metrics of all services via:
- **Prometheus**: [http://localhost:9090](http://localhost:9090)
- **Grafana Dashboards**: [http://localhost:3000](http://localhost:3000) (Default login: `admin` / `admin`)

---
Happy coding! 🚀
