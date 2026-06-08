<div align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TypeScript.svg" width="60" alt="TypeScript Logo">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/ExpressJS-Dark.svg" width="60" alt="ExpressJS Logo">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/PostgreSQL-Dark.svg" width="60" alt="PostgreSQL Logo">
  <h1 align="center">Scenio Backend API</h1>
  
  <p align="center">
    <strong>Every scene. A new voice.</strong><br>
    The core RESTful API powering the Scenio Language Learning Platform.
  </p>

  <p align="center">
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#api-reference">API Reference</a>
  </p>
</div>

---

## 📖 About The Project

**Scenio** is an AI-powered language learning application that immerses users in real-world conversational scenarios (e.g., job interviews, restaurant ordering, airport check-ins). 

This repository contains the **Express.js Backend** for Scenio. It serves as the bridge between the client applications (Flutter Mobile, React Admin), the PostgreSQL relational database, the Chroma vector database, and the LLM providers (Claude/OpenAI).

### ✨ Key Features

- **Dual-LLM Roleplay Engine:** Processes real-time conversations utilizing parallel LLM calls for both character roleplaying and instant grammatical/vocabulary evaluation.
- **Semantic Scene Search:** Integrates **Chroma Vector DB** and OpenAI's Embeddings to suggest related learning scenarios based on contextual similarity and user proficiency levels.
- **Smart Progress Tracking:** Robust system for scoring (grammar, vocabulary, naturalness), XP accumulation, streak tracking, and daily mission completion.
- **Clean Architecture:** Domain-driven directory structure with decoupled routes, controllers, and services ensuring high scalability and maintainability.
- **Stateless Authentication:** Secure JWT-based access and refresh token mechanisms, complete with external Google OAuth integration.

---

## 🛠 Tech Stack

### Core
- **Runtime:** [Node.js](https://nodejs.org/) (v20.x LTS)
- **Framework:** [Express.js](https://expressjs.com/) (v4.x)
- **Language:** [TypeScript](https://www.typescriptlang.org/)

### Database & ORM
- **Relational Object Store:** [PostgreSQL](https://www.postgresql.org/) (v15.x)
- **Vector Database:** Pgvector (PostgreSQL) for semantic search
- **ORM:** [Prisma](https://www.prisma.io/) (v5.x) for type-safe database interactions

### AI & NLP
- **LLM Integration:** [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) (Claude 3.5 Sonnet) & [OpenAI SDK](https://platform.openai.com/docs/libraries)
- **Embeddings:** `gemini-embedding-2` for vectorizing context

### Security & Utilities
- **Auth:** `jsonwebtoken`, `bcryptjs`, `google-auth-library`
- **Validation:** `zod` for strictly typed schema validation
- **Middleware:** `helmet` for HTTP headers, `cors`

---

## 🏗 High-Level Architecture

Scenio adopts a robust 3-layer architecture separating the Client Experience, the internal **Scenio Learning Brain** (Backend), and the external AI capability providers. This ensures our business logic (scoring, missions, scene orchestrating) is fully decoupled from the raw audio processing capabilities of third-party vendors.

```mermaid
flowchart LR
    U[Learner] --> M[Mobile App]

    subgraph Client["Client Experience Layer"]
      M --> UI[Voice UI / Captions / Transcript]
      M --> VP[Voice Picker]
    end

    subgraph Brain["Scenio Learning Brain"]
      API[Express Backend API]
      SC[Scene Engine]
      SE[Session Engine]
      RE[Role Engine]
      CO[Coaching & Hint Engine]
      GP[XP / Mission / Badge Engine]
      DB[(PostgreSQL / Prisma)]

      API --> SC
      API --> SE
      API --> RE
      API --> CO
      API --> GP
      SC --> DB
      SE --> DB
      RE --> DB
      CO --> DB
      GP --> DB
    end

    subgraph Provider["Voice / AI Capability Layer"]
      RT[Realtime Conversation Provider]
      STT[Speech-to-Text]
      TTS[Text-to-Speech]
      PAS[Pronunciation Assessment]
    end

    M --> API
    M <-->|WebRTC/Sockets| RT
    RT --> STT
    RT --> TTS
    M --> PAS
    API -->|Token/Auth| RT
    API --> PAS
```

### The Separation of Concerns
1. **Client Experience Layer:** Flutter Mobile App responsible for displaying scene details, realtime captions, Voice UI, and acting as the direct line to the realtime audio endpoint.
2. **Scenio Learning Brain (This Repo):** The central nervous system. Responsible for tracking sessions, orchestrating AI roles with contextual system prompts, tracking mission goals, scoring outputs, and persisting transcripts.
3. **Voice/AI Capability Layer:** Realtime integration with vendors (such as OpenAI Realtime API or ElevenLabs) meant solely to execute STT, TTS, and raw character inference, keeping the backend free of expensive audio streams.

### Directory Structure

```text
src/
├── config/           # Initialization for Prisma, Chroma, and LLM clients
├── middleware/       # Authentication, Error handling, and Zod validation requests
├── modules/          # Business domains (Auth, Scenes, Sessions, Users, Missions, Admin)
├── schemas/          # Zod validation schemas
├── types/            # TypeScript interfaces & types
└── utils/            # Standardized Response wrappers and Prompt templates
```

---

## 🚀 Getting Started

Follow these instructions to set up your local development environment.

### Prerequisites

Ensure you have the following installed on your machine:
- Node.js (v20.x or higher)
- NPM or Yarn
- Docker & Docker Compose (for spinning up Postgres & Chroma local instances)
- Valid API Keys for Claude (Anthropic) and OpenAI.

### 1. Installation & Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/scenio.git
cd scenio/scenio_be
npm install
```

### 2. Environment Configuration

Create a `.env` file by duplicating the provided example:

```bash
cp .env.example .env
```

Populate the `.env` file with your specific credentials:

```env
PORT=3000
NODE_ENV=development

# Database & Vector DB (Optional)
<!-- DATABASE_URL=postgresql://postgres:password@localhost:5432/scenio_db
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION=scenio_scenes -->

# Authentication
JWT_SECRET=your_super_secret_jwt_key
REFRESH_SECRET=your_super_secret_refresh_key

# LLM Providers
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
LLM_PROVIDER=claude 
```

### 3. Spin Up Infrastructure (Docker)

Use Docker containers for local DB setups:

```bash
# PostgreSQL
docker run -d --name scenio-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=scenio_db -p 5432:5432 postgres:15

# Chroma Vector Database
docker run -d --name scenio-chroma -p 8000:8000 chromadb/chroma
```

### 4. Database Migration & Seeding

Sync the Prisma schema to the database and seed it with starter scenarios:

```bash
npm run db:migrate
npm run db:seed
```

### 5. Running the Application

In a development environment (featuring hot-reloads):

```bash
npm run dev
```

The standard REST API will be available at `http://localhost:3000/api`.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the server in watch mode using `nodemon` and `ts-node` |
| `npm run build` | Compiles the TypeScript source down to plain JavaScript in `/dist` |
| `npm start` | Runs the compiled application for production |
| `npm run db:studio` | Opens Prisma Studio UI to view and interact with local database records |
| `npm run generate` | Generates the strongly-typed Prisma Client models |

---

## 🌐 API Reference

*(See full documentation and Postman Collection for detailed payloads)*

| Domain | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| **Auth** | `POST` | `/api/auth/login` | Authenticate and retrieve JWT / Refresh tokens. |
| **Scenes** | `GET` | `/api/scenes/search` | Semantic vector search for conversational scenarios. |
| **Sessions** | `POST` | `/api/sessions/start` | Initialize a guided conversational act with an AI. |
| **Sessions** | `POST` | `/api/sessions/:id/message` | Submit a chat line; receive AI reply & grammatical breakdown. |
| **Users** | `GET` | `/api/users/progress` | Retrieve XP tracking logs, streaks, and metric history. |

---

<div align="center">
  <i>Built with ❤️ by Thanh Khang.</i>
</div>
