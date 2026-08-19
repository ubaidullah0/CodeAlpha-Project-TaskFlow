<div align="center">
  <h1>🚀 TaskFlow - Full-Stack Kanban Project Manager</h1>
  <p>A modern, real-time, collaborative project management application built for the <b>CodeAlpha Internship</b>.</p>

  <p>
    <img src="https://img.shields.io/badge/Frontend-Vanilla_JS-f7df1e?style=for-the-badge&logo=javascript&logoColor=black" alt="Vanilla JS" />
    <img src="https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/API-Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/RealTime-Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  </p>
</div>

## 🌐 Live Demo
- **Frontend (Vercel):** [https://code-alpha-taskflow-app.vercel.app](https://code-alpha-taskflow-app.vercel.app)
- **Backend API (Render):** [https://codealpha-project-taskflow.onrender.com](https://codealpha-project-taskflow.onrender.com)

---

## ✨ Key Features
TaskFlow is a robust, full-stack application designed to mirror professional tools like Jira or Trello. 
- 🔐 **Secure Authentication**: JWT-based login, registration, and strict email format validation.
- 🔑 **OTP Password Reset**: Fully functional password recovery using secure OTPs sent to your email.
- 👥 **Team Collaboration**: Create projects and invite team members dynamically.
- 📋 **Kanban Boards**: Drag-and-drop tasks across dynamic columns (To Do, In Progress, Review, Done).
- ⚡ **Real-Time Sync**: Socket.io integration instantly syncs board changes across all active users.
- 💬 **Task Comments**: Real-time commenting system on individual tasks for team communication.
- 🔔 **Live Notifications**: Instant bell alerts for task assignments, project invites, and new comments.
- 📱 **Fully Responsive**: Beautiful UI that scales perfectly across desktops, tablets, and mobile devices.

---

## 🏗️ Architecture & Security
This project was built with security and scalability as top priorities:
- **Serverless SMTP Bypass**: Uses a clever Vercel Serverless Function architecture to reliably deliver emails, bypassing Render's strict free-tier SMTP blocks.
- **Rate Limiting & Helmet**: API endpoints are guarded against brute-force attacks and secured with standard HTTP headers.
- **Zero-Secret Frontend**: Sensitive API keys and database credentials are strictly isolated to the backend environment variables.
- **Automated Migrations**: PostgreSQL database schema auto-migrates securely upon server boot.

---

## 💻 Local Setup & Development (Windows)

TaskFlow includes automated `.bat` scripts to make Windows deployment seamless.

### 1. Prerequisites
- **Node.js (v18+)**
- **PostgreSQL**

### 2. Quick Install
1. Clone the repository and open the folder.
2. Double-click `windows-setup\install.bat`. This automatically installs all frontend and backend dependencies.

### 3. Environment & Database Configuration
1. Create a PostgreSQL database named `taskflow`.
2. Configure your `backend/.env` file using the provided `.env.example` as a template.
3. Add your standard PostgreSQL connection string, a strong JWT Secret, and your SMTP credentials.

### 4. Start the Servers
Double-click **`windows-setup\start_project.bat`**. This powerful script will launch the PostgreSQL database connection, boot the Express backend on port `5000`, and start the Frontend server on port `3000` simultaneously.

---

## 🚀 Deployment

- **Frontend**: Deployed to Vercel. Features a serverless API function to handle secure SMTP requests.
- **Backend**: Deployed as a Node.js Web Service on Render. 
- **Database**: Hosted on Render PostgreSQL.

<div align="center">
  <br />
  <p><i>Developed by <b>Obaidullah (Obaid Khan)</b> for the CodeAlpha Internship.</i></p>
</div>
