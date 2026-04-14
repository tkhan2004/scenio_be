# ElevenLabs Agent POC Plan

Updated: 2026-04-14

## Purpose

This document is the handoff note for the next phase after weekly quota resets.

Goal:

- move from the current `voice-lab.html` prototype
- toward an experience closer to the ElevenLabs Agent preview
- while keeping Scenio session, scene, and learning flow under our control

## Current State In Repo

We already have a working lab page and a few backend helper routes.

### Frontend

Current page:

- [static/voice-lab.html](/abs/c:/KhangNT-New/scenio_be/static/voice-lab.html:1)

What it can do now:

- login with real Scenio auth
- load dashboard
- load recommended scenes
- start a real Scenio session
- chat with LLM through `/api/lab/chat-proxy`
- save vocabulary to real backend
- abandon active session
- play reply with:
  - browser speech synthesis
  - ElevenLabs TTS preview mode

### Backend lab routes

Current helper routes:

- `POST /api/lab/chat-proxy`
- `GET /api/lab/elevenlabs-config`
- `POST /api/lab/elevenlabs-speech`

Relevant files:

- [src/modules/lab/lab.routes.ts](/abs/c:/KhangNT-New/scenio_be/src/modules/lab/lab.routes.ts:1)
- [src/modules/lab/lab.controller.ts](/abs/c:/KhangNT-New/scenio_be/src/modules/lab/lab.controller.ts:1)
- [src/modules/lab/lab.service.ts](/abs/c:/KhangNT-New/scenio_be/src/modules/lab/lab.service.ts:1)

### ElevenLabs test utility

Current script:

- [scripts/test-elevenlabs.ts](/abs/c:/KhangNT-New/scenio_be/scripts/test-elevenlabs.ts:1)

Usage:

- `npm run test:elevenlabs`
- `npm run test:elevenlabs -- list`

### Env vars already relevant

Current env support:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_BASE_URL`
- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_MALE_VOICE_ID`
- `ELEVENLABS_FEMALE_VOICE_ID`
- `ELEVENLABS_MODEL_ID`

Reference sample:

- [.env.example](/abs/c:/KhangNT-New/scenio_be/.env.example:1)

## Problem Statement

The current lab is still not the same category as the ElevenLabs preview page.

What we have now:

- text-first roleplay
- optional TTS on the reply
- browser mic support through `SpeechRecognition`

What the ElevenLabs preview feels like:

- a full voice agent
- continuous voice conversation
- turn-taking handled by the agent stack
- realtime transcript and audio loop
- much more natural voice interaction

So the next step is not "improve TTS a bit".
It is a product architecture change:

- from `LLM + TTS helper`
- to `agent-driven voice conversation`

## Recommended Direction

### Recommendation

For the next phase, use **ElevenLabs Conversational AI** for the live voice loop.

There are two ways to do that:

1. Fastest demo path: embed the ElevenLabs widget
2. Better Scenio product path: use the ElevenLabs JavaScript SDK

### Recommended for Scenio

Use the **JavaScript SDK**, not the widget, as the main long-term direction.

Reason:

- we need Scenio UI, not a generic embedded box
- we need scene-based prompts
- we need male/female voice choice per scene
- we need to attach user/session metadata
- we need to keep transcript, scoring, and business logic under Scenio backend

The widget is still useful as a short demo if we want a quick proof first.

## Product Goal For Next Phase

When a user enters a scene:

1. user chooses scene
2. user chooses voice:
   - male
   - female
   - or custom preset
3. app starts a voice conversation session
4. agent speaks first in the selected voice
5. user talks directly by mic
6. agent replies naturally
7. Scenio still knows:
   - which scene is active
   - which session is active
   - which voice was selected
   - what transcript/log belongs to the session

## Proposed Architecture

### Frontend

Use ElevenLabs JS SDK in a new lab page, for example:

- `static/voice-agent-lab.html`

Frontend responsibilities:

- login user with Scenio
- pick scene
- pick voice preset
- request a signed conversation URL or token from backend
- start ElevenLabs conversation session
- render transcript and connection state

### Backend

Scenio backend should stay responsible for:

- auth
- scene data
- session ownership
- mapping scene -> prompt/persona
- mapping user choice -> voice id
- creating signed conversation access
- storing transcript/session metadata if needed

### ElevenLabs Agent

ElevenLabs Agent should own:

- live voice turn-taking
- speech in / speech out loop
- realtime natural interaction

### Pronunciation and scoring

Do not force pronunciation scoring into the first ElevenLabs Agent POC.

For the first POC:

- prioritize natural voice conversation

After that:

- add transcript logging
- then pronunciation assessment
- then scoring/leveling

## Suggested Technical Design

### Option A - Widget POC

Use the ElevenLabs widget first if the only goal is:

- "show something close to the preview quickly"

Expected characteristics:

- lowest effort
- fastest path
- least custom Scenio styling

Best use:

- internal demo
- product validation

### Option B - JS SDK POC

Use the ElevenLabs JS SDK if the goal is:

- "make it feel like part of Scenio"

Expected characteristics:

- more control
- more setup work
- better integration with scenes and voice presets

Best use:

- actual product foundation

## Scenio-Specific Runtime Overrides

This is the key part that will make the agent feel scene-aware.

At runtime we should pass:

- selected scene title
- character name
- character role
- mission text
- selected voice id
- user display name
- user level

This should be used to drive:

- prompt override
- first message override
- voice override
- dynamic variables

## Voice Choice Design

### Baseline

Each scene should have:

- one default male voice
- one default female voice

This means we only need a small mapping table at first.

Example:

- airport staff scene:
  - male voice id
  - female voice id
- office coworker scene:
  - male voice id
  - female voice id

### Phase 2 voice expansion

Later we can add:

- energetic
- calm
- formal
- playful
- US accent
- UK accent

But first version should stay simple:

- `male`
- `female`
- `custom voice id`

## API Plan For Next Week

### Backend APIs to add

1. `GET /api/lab/elevenlabs-agent-config`

Purpose:

- return agent-ready frontend config
- return available voice presets for the selected scene

Could include:

- `agentId`
- `defaultVoiceId`
- `maleVoiceId`
- `femaleVoiceId`
- `scenePromptTemplate`

2. `POST /api/lab/elevenlabs-signed-url`

Purpose:

- backend requests signed access from ElevenLabs for a private agent
- frontend uses this to start the conversation session safely

3. Optional later:

- `POST /api/lab/elevenlabs-session-log`

Purpose:

- store transcript summary or event log after the voice session ends

## Frontend Plan For Next Week

### New page

Add a separate page instead of overloading the current lab further:

- `static/voice-agent-lab.html`

Why:

- current `voice-lab.html` is already mixing:
  - 9router text chat
  - browser speech
  - ElevenLabs TTS preview
- the next phase is a different type of prototype

### UI sections

Minimum sections:

1. Auth
2. Scene picker
3. Voice picker
4. Start conversation
5. Transcript / events
6. Stop / reset session

## What To Reuse From Current Work

Keep and reuse:

- current scene loading logic from `voice-lab.html`
- current login flow
- current session awareness
- current env setup for ElevenLabs voices

Do not throw away:

- current TTS preview route
- current `voice-lab.html`

Reason:

- it remains useful as a fallback and debugging surface

## What Not To Do In The First Agent POC

Avoid packing too much into the first iteration.

Do not do all of this in one step:

- realtime voice
- transcript persistence
- pronunciation scoring
- XP awarding
- level estimation
- vocabulary extraction

Instead:

1. get the voice agent experience working
2. confirm male/female voice switching works
3. confirm scene prompt switching works
4. then start integrating learning mechanics

## Risks

### Quota / account limits

Risk:

- weekly quota may block experimentation

Mitigation:

- document exact env and endpoints now
- continue implementation when quota resets

### Private agent auth flow

Risk:

- depending on workspace/account setup, private agent access may require signed URL/token flow

Mitigation:

- implement backend-issued access, not direct secret in browser

### Voice catalog management

Risk:

- if API key lacks `voices_read`, we cannot dynamically browse all voices

Mitigation:

- keep env-based preset mapping first
- use explicit `voice_id` values

## Recommended Execution Order

### Step 1

Create this backend route set:

- `GET /api/lab/elevenlabs-agent-config`
- `POST /api/lab/elevenlabs-signed-url`

### Step 2

Create a separate page:

- `static/voice-agent-lab.html`

### Step 3

Wire scene selection -> prompt/voice override

### Step 4

Start a real ElevenLabs Agent session from browser

### Step 5

Render transcript + status

### Step 6

Only after that:

- connect Scenio session scoring
- connect vocabulary extraction
- connect pronunciation scoring

## Suggested Definition Of Done For The Next POC

The next POC is done when:

- user can login
- user can pick a scene
- user can pick male or female voice
- app starts a live ElevenLabs conversation
- agent speaks using the selected voice
- scene prompt actually changes the conversation behavior

Everything else can come later.

## Sources

Official docs used for this direction:

- ElevenLabs Conversational AI overview: https://elevenlabs.io/docs/api-reference/conversational-ai
- ElevenLabs widget customization: https://elevenlabs.io/docs/eleven-agents/customization/widget
- ElevenLabs JavaScript SDK: https://elevenlabs.io/docs/eleven-agents/libraries/java-script
- ElevenLabs React SDK: https://elevenlabs.io/docs/eleven-agents/libraries/react
