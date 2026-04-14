# Scenio — Architecture Diagrams

> Tất cả diagram dùng Mermaid. Render trực tiếp trên GitHub, GitLab, Notion, Obsidian hoặc bất kỳ editor hỗ trợ Mermaid.

---

## 1. System Architecture — 3 tầng

```mermaid
graph TD
  subgraph CLIENT["Presentation Layer"]
    A["📱 Flutter App\n(Android / iOS)"]
    B["🌐 React Admin\n(Web Portal)"]
  end

  subgraph BACKEND["Business Logic Layer — Express.js"]
    C["Auth Module"]
    D["Scene Module"]
    E["Session Module"]
    F["User Module"]
    G["Roleplay Engine"]
    H["Language Evaluator"]
  end

  subgraph DATA["Data Layer"]
    I[("PostgreSQL\nUsers · Scenes · Sessions")]
    J[("Chroma Vector DB\nScene Embeddings")]
    K["LLM API\nClaude / OpenAI"]
  end

  A -- "REST API / JWT" --> C
  A -- "REST API / JWT" --> D
  A -- "REST API / JWT" --> E
  A -- "REST API / JWT" --> F
  B -- "REST API / JWT (admin)" --> D
  B -- "REST API / JWT (admin)" --> F

  E --> G
  E --> H
  G -- "prompt + history" --> K
  H -- "evaluate message" --> K
  D -- "semantic search" --> J
  D -- "upsert embedding" --> J
  C --> I
  D --> I
  E --> I
  F --> I
```

---

## 2. Database ERD

```mermaid
erDiagram
  users {
    uuid id PK
    string email
    string passwordHash
    string googleId
    string displayName
    string avatarUrl
    string level
    int totalXp
    int streakDays
    datetime lastActiveDate
    bool isAdmin
    datetime createdAt
    datetime updatedAt
  }
  scenes {
    uuid id PK
    string title
    string category
    string difficulty
    string description
    string missionText
    int estimatedMinutes
    string characterName
    string characterRole
    string systemPrompt
    bool isActive
    datetime createdAt
    datetime updatedAt
  }
  scene_vocabulary {
    uuid id PK
    uuid sceneId FK
    string word
    string definition
    string example
    int sortOrder
  }
  user_vocabulary {
    uuid id PK
    uuid userId FK
    uuid sceneVocabularyId FK
    string word
    string definition
    string sourceSessionId
    bool isMastered
    datetime savedAt
    datetime reviewedAt
  }
  sessions {
    uuid id PK
    uuid userId FK
    uuid sceneId FK
    string status
    float grammarScore
    float vocabularyScore
    float naturalnessScore
    int xpEarned
    int hintCount
    datetime startedAt
    datetime endedAt
  }
  messages {
    uuid id PK
    uuid sessionId FK
    string role
    string content
    int turnIndex
    bool hasError
    string errorType
    string originalPhrase
    string suggestion
    string explanation
    bool isGood
    bool isHint
    datetime createdAt
  }
  daily_missions {
    uuid id PK
    string title
    string description
    string missionType
    int targetValue
    int xpReward
    bool isActive
  }
  user_missions {
    uuid id PK
    uuid userId FK
    uuid missionId FK
    string date
    int currentValue
    bool isCompleted
    datetime completedAt
  }
  badges {
    uuid id PK
    string title
    string description
    string iconKey
    string conditionType
    int conditionValue
    int xpReward
    bool isActive
  }
  user_badges {
    uuid id PK
    uuid userId FK
    uuid badgeId FK
    datetime earnedAt
  }

  users ||--o{ sessions : "plays"
  scenes ||--o{ sessions : "used in"
  scenes ||--o{ scene_vocabulary : "has"
  sessions ||--o{ messages : "contains"
  users ||--o{ user_missions : "tracks"
  daily_missions ||--o{ user_missions : "assigned to"
  users ||--o{ user_badges : "earns"
  badges ||--o{ user_badges : "exists"
  users ||--o{ user_vocabulary : "saves"
  scene_vocabulary ||--o{ user_vocabulary : "references"
```

---

## 3. Sequence — Bắt đầu phiên học

```mermaid
sequenceDiagram
  autonumber
  participant F as Flutter
  participant BE as Backend
  participant DB as PostgreSQL
  participant LLM as LLM API

  F->>BE: POST /sessions/start { sceneId }

  BE->>DB: findScene(sceneId)
  DB-->>BE: scene data (systemPrompt, character...)

  BE->>DB: createSession({ userId, sceneId, status: active })
  DB-->>BE: sessionId

  Note over BE,LLM: buildSystemPrompt(scene)
  BE->>LLM: system: systemPrompt + messages: [start]
  LLM-->>BE: opening message (in character)

  BE->>DB: createMessage({ role: ai, content: opening })
  DB-->>BE: ok

  BE-->>F: { sessionId, openingMessage }

  F->>F: Render chat screen<br/>Show AI opening bubble<br/>Show MissionPill in header
```

---

## 4. Sequence — Gửi tin nhắn (Core Flow)

> Luồng phức tạp nhất: 2 LLM call chạy song song qua `Promise.all`.

```mermaid
sequenceDiagram
  autonumber
  participant F as Flutter
  participant BE as Backend
  participant DB as PostgreSQL
  participant LLM1 as LLM (Roleplay)
  participant LLM2 as LLM (Evaluator)

  F->>BE: POST /sessions/:id/message { content }
  BE->>DB: findSession + message history
  DB-->>BE: session & messages[]

  BE->>DB: createMessage(role: user, content)
  DB-->>BE: ok

  Note over BE,LLM2: Promise.all — 2 calls chạy song song
  par Roleplay call
    BE->>LLM1: systemPrompt + full history
    LLM1-->>BE: AI response text
  and Evaluator call
    BE->>LLM2: evaluatorPrompt + user message
    LLM2-->>BE: JSON { hasError, suggestion, isGood }
  end

  BE->>DB: createMessage(role: ai, content, feedbackData)
  DB-->>BE: ok

  alt missionComplete = true
    BE->>DB: updateSession(status: completed, scores)
    DB-->>BE: ok
    BE-->>F: { aiMessage, feedbackData, missionComplete: true }
    F->>F: delay 2s → navigate to Result
  else mission ongoing
    BE-->>F: { aiMessage, feedbackData, missionComplete: false }
    F->>F: render AI bubble + FeedbackStrip
  end
```

---

## 5. Sequence — Tìm kiếm kịch bản (Vector DB)

```mermaid
sequenceDiagram
  autonumber
  participant F as Flutter
  participant BE as Backend
  participant OAI as OpenAI Embeddings
  participant CH as Chroma DB
  participant DB as PostgreSQL

  F->>BE: GET /scenes/search?q="practice at hospital"

  BE->>OAI: embeddings.create(query text)
  OAI-->>BE: vector[1536]

  BE->>CH: collection.query(vector, nResults=5, where: difficulty)
  CH-->>BE: [ sceneId1, sceneId2, sceneId3, ... ]

  Note over CH,BE: Sorted by cosine similarity

  BE->>DB: findMany({ id: { in: sceneIds } })
  DB-->>BE: scene objects[]

  BE-->>F: { scenes[] } ordered by relevance
  F->>F: Render scene cards
```

---

## 6. Sequence — Admin tạo kịch bản

```mermaid
sequenceDiagram
  autonumber
  participant A as React Admin
  participant BE as Backend
  participant DB as PostgreSQL
  participant OAI as OpenAI Embeddings
  participant CH as Chroma DB

  A->>BE: POST /admin/scenes { title, description, systemPrompt, vocabulary... }

  BE->>BE: Zod validate()

  BE->>DB: createScene(data)
  DB-->>BE: scene { id, ... }

  Note over BE,CH: Auto-sync to Vector DB
  BE->>OAI: embeddings.create(sceneToText(scene))
  OAI-->>BE: vector[1536]

  BE->>CH: collection.upsert({ id, embedding, metadata })
  CH-->>BE: ok

  BE-->>A: 201 { scene }
  A->>A: Toast "Scene created" → redirect to list
```

---

## 7. Sequence — Đăng nhập

```mermaid
sequenceDiagram
  autonumber
  participant F as Flutter
  participant BE as Backend
  participant DB as PostgreSQL

  F->>BE: GET /auth/verify-token (Bearer token)

  alt token valid
    BE-->>F: 200 { user }
    F->>F: navigate to Home
  else token invalid / missing
    BE-->>F: 401 Unauthorized
    F->>F: navigate to Auth screen
  end

  F->>BE: POST /auth/login { email, password }
  BE->>DB: findUser(email)
  DB-->>BE: user row

  BE->>BE: bcrypt.compare(password, hash)

  alt password correct
    BE->>BE: jwt.sign({ userId, isAdmin }, SECRET, 7d)
    BE-->>F: 200 { token, user }
    F->>F: saveToken(GetStorage)<br/>navigate to Home
  else password wrong
    BE-->>F: 401 { error: INVALID_CREDENTIALS }
    F->>F: show error message
  end
```

---

## 8. Sequence — Kết thúc phiên và xem kết quả

```mermaid
sequenceDiagram
  autonumber
  participant F as Flutter
  participant BE as Backend
  participant DB as PostgreSQL

  Note over F: missionComplete = true (từ flow gửi tin nhắn)
  F->>F: Show "Mission Complete!" overlay (2s)

  F->>BE: GET /sessions/:id/result

  BE->>DB: findSession(id)
  DB-->>BE: session { grammarScore, vocabularyScore, naturalnessScore }

  BE->>DB: findMessages({ sessionId, orderBy: turnIndex })
  DB-->>BE: messages[] (with feedbackData per message)

  Note over BE: annotateTranscript(messages)<br/>map feedbackData → annotationColor<br/>hasError → amber / isGood → green

  BE-->>F: { session, messages[], newWords[] }

  F->>BE: POST /users/xp { sessionId }
  BE->>DB: updateUser(totalXp += earned, check streak)
  BE->>DB: checkMissions(userId, today)
  DB-->>BE: completedMissions[]
  BE-->>F: { totalXp, streakDays, completedMissions[] }

  F->>F: Animate score ring 0 → score<br/>Render skill bars<br/>If completedMissions → confetti + XP toast
```

---

## 9. Flutter MVVM+GetX — Layer Dependencies

```mermaid
graph LR
  subgraph VIEW["View — GetView&lt;VM&gt;"]
    V1["ChatView"]
    V2["HomeView"]
    V3["ResultView"]
  end

  subgraph VM["ViewModel — GetxController"]
    VM1["ChatViewModel\nRxList messages\nRxBool isTyping"]
    VM2["HomeViewModel\nRxList scenes\nRxList missions"]
    VM3["ResultViewModel\nRx&lt;SessionResult&gt;"]
  end

  subgraph REPO["Repository"]
    R1["SessionRepository\n(interface)"]
    R2["SceneRepository\n(interface)"]
    R1I["SessionRepositoryImpl"]
    R2I["SceneRepositoryImpl"]
  end

  subgraph SVC["Service"]
    S1["SessionService"]
    S2["SceneService"]
  end

  subgraph CORE["Core"]
    API["ApiClient (Dio)\n+ Auth Interceptor"]
    STORE["StorageService\nGetStorage"]
  end

  V1 -- "controller.sendMessage()" --> VM1
  V2 -- "controller.loadScenes()" --> VM2
  V3 -- "controller.loadResult()" --> VM3

  VM1 -- "repo.sendMessage()" --> R1
  VM2 -- "repo.getScenes()" --> R2
  VM3 -- "repo.getResult()" --> R1

  R1 -.implements.-> R1I
  R2 -.implements.-> R2I

  R1I --> S1
  R2I --> S2

  S1 --> API
  S2 --> API
  VM1 --> STORE
```

---

## 10. AI Pipeline — Roleplay Engine

```mermaid
flowchart TD
  A["Scene data\n(description, missionText,\ncharacterName, difficulty)"]
  A --> B["buildSystemPrompt(scene)"]
  B --> C["callLLM(systemPrompt, messageHistory)"]
  C --> D{"Response contains\n[MISSION_COMPLETE]?"}
  D -- Yes --> E["missionComplete = true\nStrip marker from text"]
  D -- No --> F["missionComplete = false"]
  E --> G["Save AI message to DB"]
  F --> G
  G --> H["Return to client\n{ aiMessage, missionComplete }"]

  A2["User message"] --> B2["buildEvaluatorPrompt\n(message, sceneContext, level)"]
  B2 --> C2["callLLM(evaluatorSystem, prompt)"]
  C2 --> D2["JSON.parse(response)"]
  D2 --> E2{"Parse OK?"}
  E2 -- Yes --> F2["feedbackData object\n{ hasError, suggestion, isGood }"]
  E2 -- No --> G2["feedbackData = null\n(silent fail)"]
  F2 --> H2["Save to messages.feedbackData"]
  G2 --> H2

  note1["Both pipelines run\nvia Promise.all"]
```

---

*Tất cả diagram render bằng Mermaid — compatible với GitHub, GitLab, Notion, Obsidian, VS Code (Markdown Preview Mermaid Support extension).*
