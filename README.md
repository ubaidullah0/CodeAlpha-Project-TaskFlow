# TaskFlow

A modern, collaborative Kanban-style project management application built as a CodeAlpha project.

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Real-Time**: Socket.IO
- **Auth**: JWT & bcrypt

## Features (Phases 1-7)
1. **Authentication**: Register, Login, JWT auth.
2. **Projects & Teams**: Create projects, add team members.
3. **Project Boards**: Dynamic Kanban columns (To Do, In Progress, Review, Done).
4. **Task Management**: Create, edit, delete tasks, assign users, drag-and-drop between columns.
5. **Comments**: Task-level communication.
6. **Notifications**: Alerts for task assignment, project invites, and new comments.
7. **Real-Time Updates**: Socket.IO integration for instant sync across clients.

# Local Development on Windows

### 1. Prerequisites
- **Node.js (v18+)**: Required to run the backend and the local frontend server.
- **PostgreSQL**: Required to store user and project data.

### 2. First-Time Setup
TaskFlow includes automated setup scripts for Windows to make getting started easy.

1. Open the project folder (`taskflow-project-manager`).
2. Double-click `scripts\windows\setup.bat`. This will:
   - Check your environment (Node.js, npm).
   - Install all required dependencies for the root and backend.
   - Create a `backend\.env` file from the template.

### 3. Database Setup
1. Create a PostgreSQL database named `taskflow`.
2. Open `backend\.env` and configure your `DATABASE_URL` with your actual credentials.
   *(Example: `postgresql://postgres:password@localhost:5432/taskflow`)*
   **Note: Never commit your `.env` file or hardcode real passwords.**
3. Run the `database\schema.sql` script against your database to build the tables.

### 4. Starting the Application

#### Option A: One-Click Startup (Recommended)
Double-click **`start.bat`** in the root directory.
This checks your environment and launches both servers concurrently.

#### Option B: VS Code Workflow
1. Open the project folder in VS Code.
2. Go to **Terminal** > **Run Task**.
3. Select **Start TaskFlow** to launch both servers.
   *(You can also use the Run and Debug panel to start "Debug Full Stack")*.

#### Option C: Terminal
From the project root:
```bash
npm run dev
```

### 5. Running Services Separately
If you prefer to run services individually:

**Backend Only:**
```bash
cd backend
npm run dev
```
Runs the Express API on `http://localhost:5000`.

**Frontend Only:**
```bash
npm run dev:frontend
```
Serves the Vanilla JS frontend on `http://localhost:3000`.

### 6. Expected URLs
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

### 7. Stopping the Application
- If you ran via terminal, simply press `Ctrl+C`.
- If you used `start.bat` and it's running in the background, you can double-click **`stop.bat`** to safely terminate the processes on ports 3000 and 5000.

---

## Deployment Preparation

### Frontend (Vercel)
- The frontend is ready to deploy directly to Vercel. Connect your GitHub repository to Vercel and it will pick up the `vercel.json` routing.
- The app automatically connects to `http://localhost:5000` in local mode and your deployed Render URL in production (configure the domain in `frontend/js/api.js` and `frontend/js/board.js`).

### Backend (Render)
- Connect your GitHub repository to Render as a Web Service.
- Set the root directory to `backend`.
- Build command: `npm install`
- Start command: `npm start`
- Set Environment Variables: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`.

## Security & Configuration

### Environment Variables
- The real .env file MUST NEVER be committed to Git.
- Use .env.example as a template for developers.
- Do NOT place any real credentials, API keys, or SMTP passwords in .env.example.

### Backend Security
- **API Keys & Secrets**: All private operations, database connections, and email services happen on the backend.
- **Rate Limiting**: Critical endpoints (like Login, Register, Forgot Password) are protected with rate limiting to prevent brute-force attacks.
- **HTTP Headers**: Helmet is used to secure Express HTTP headers against well-known web vulnerabilities.
- **Validation**: Strict regex validation prevents malicious injection and malformed requests.

### Security Best Practices
- **Rotating Compromised Keys**: If a secret is ever accidentally pushed to GitHub, revoke it immediately from the service provider (e.g., Google App Passwords) rather than just deleting the file.
- **Frontend**: The frontend contains NO secrets. Any private API calls must securely run on the backend.

