# Roadmap Backend Requirements

Tài liệu này mô tả phần backend cần hoàn thiện để mobile roadmap không còn dùng UI preview/local placeholder.

## 1. Mục tiêu

Backend phải biến learning plan thành một roadmap có vòng đời đầy đủ:

```text
onboarding / level test
-> generate active roadmap
-> user luyện từng step
-> session complete tự cập nhật step/progress
-> roadmap completed
-> trả completion summary, reward, và next roadmap suggestion
```

## 2. Response shape cần bổ sung

`GET /api/learning-plan/current`, `POST /api/learning-plan/generate`, `POST /api/learning-plan/refresh`, `PATCH /api/learning-plan/steps/:id/complete` nên trả thêm các field sau trong object `plan` hoặc top-level response:

```json
{
  "plan": {
    "id": "...",
    "status": "ACTIVE",
    "title": "Travel English A2 Roadmap",
    "summary": "...",
    "level": "A2",
    "learningGoal": "TRAVEL",
    "studyFrequency": "REGULAR",
    "focusSkill": "GRAMMAR",
    "weeklyTarget": 3,
    "targetOutcome": "Handle 4 everyday travel situations clearly.",
    "completionCriteria": {
      "requiredSteps": 5,
      "requiredCoreScenes": 4,
      "minimumRecentAverageScore": 70
    },
    "reward": {
      "badgeTitle": "A2 Travel Roadmap",
      "xpBonus": 120,
      "unlocks": ["Next roadmap suggestion"]
    },
    "schedule": {
      "suggestedDays": ["TUE", "THU", "SAT"],
      "nextSuggestedAt": "2026-05-26T09:00:00.000Z"
    }
  },
  "steps": [],
  "nextStep": {},
  "completionSummary": null
}
```

## 3. Step behavior

Mỗi step cần đủ dữ liệu để mobile mở đúng nội dung được bấm:

```json
{
  "id": "...",
  "type": "SCENE",
  "status": "NEXT",
  "focusSkill": "GRAMMAR",
  "sceneId": "...",
  "title": "Airport check-in",
  "description": "...",
  "reason": "Practice clearer question forms.",
  "sortOrder": 1,
  "targetCount": 1,
  "completedCount": 0,
  "metadata": {
    "openAction": "SCENE_DETAIL"
  },
  "scene": {
    "id": "...",
    "title": "...",
    "category": "TRAVEL",
    "difficulty": "A2",
    "estimatedMinutes": 7,
    "characterName": "...",
    "characterRole": "..."
  }
}
```

Rules:

- `SCENE` and `RETRY_SCENE`: must include `sceneId` or embedded `scene`.
- `VOCABULARY_REVIEW`: no scene required; mobile opens Vocabulary tab.
- `GRAMMAR_PRACTICE` and `CUSTOM_PRACTICE`: can omit scene; mobile opens Custom Practice for now.
- Only one step should be `NEXT` at a time unless product intentionally supports parallel steps.
- When a step becomes `COMPLETED`, backend should promote the next `LOCKED` step to `NEXT`.

## 4. Automatic progress after session complete

When `POST /api/sessions/:id/complete` succeeds:

- If session scene matches a non-completed step in active roadmap, mark that step completed or increment `completedCount`.
- Promote the next locked step.
- Recalculate `nextStep`.
- If all required steps are completed, set plan status or derived state to completed and generate `completionSummary`.
- Do not block session result if roadmap update fails; log warning and keep session complete response successful.

## 5. Completion summary endpoint

Add one of these options:

Option A:

```http
GET /api/learning-plan/:id/completion-summary
```

Option B:

Return `completionSummary` inside `GET /api/learning-plan/current` once roadmap is completed.

Suggested shape:

```json
{
  "completionSummary": {
    "planId": "...",
    "title": "Travel English A2 Roadmap",
    "level": "A2",
    "completedAt": "2026-05-22T10:00:00.000Z",
    "completedScenes": [
      "Airport check-in",
      "Hotel check-in"
    ],
    "scoreDelta": {
      "grammar": { "before": 62, "after": 74 },
      "vocabulary": { "before": 66, "after": 73 },
      "naturalness": { "before": 58, "after": 71 }
    },
    "reward": {
      "badgeTitle": "A2 Travel Roadmap",
      "xpBonus": 120
    },
    "nextRoadmap": {
      "title": "Travel Vocabulary Expansion",
      "level": "A2",
      "focusSkill": "VOCABULARY"
    }
  }
}
```

## 6. Notifications/reminders

Backend should create notifications for:

- Learning plan ready after onboarding/level test.
- Learning plan refreshed.
- Roadmap completed.
- Study reminder based on `weeklyTarget` and `schedule.nextSuggestedAt`.

Notification CTA:

- `LEARNING_PLAN_READY` and `LEARNING_PLAN_REFRESHED`: `ctaType = LEARNING_PLAN`
- `ROADMAP_COMPLETED`: `ctaType = LEARNING_PLAN` or a new `ROADMAP_COMPLETION`
- reminder: `ctaType = LEARNING_PLAN`

## 7. Mobile compatibility notes

Current mobile already supports:

- current/refresh/complete-step APIs
- opening scene steps by `scene` or `sceneId`
- opening vocabulary review via Vocabulary tab
- opening grammar/custom practice via Custom Practice
- preview completion screen from a `LearningPlanResponseModel`

After backend is done, mobile should only need to:

- parse new `targetOutcome`, `completionCriteria`, `reward`, `schedule`
- replace local completion preview with real `completionSummary`
- navigate to roadmap completion automatically when backend says plan is completed
