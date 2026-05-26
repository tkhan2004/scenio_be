# Voice Product Plan

Updated: 2026-04-14

## Muc tieu

Scenio can mot voice flow de user:

- vao app va chon "ai" se tra loi minh
- khi chon scene thi co the chon giọng nam/nu hoac persona cu the
- nghe duoc giong tra loi that nhat co the
- duoc cham phat am, cham fluency, va suy doan level tu audio that

Tai lieu nay de xuat cong nghe va plan trien khai theo huong:

- it anh huong backend hien tai
- co the ship tung phase
- giu duoc kha nang nang cap len realtime sau nay

## Ket luan nhanh

Neu uu tien "that nhat co the" cho giong noi va van phu hop voi repo hien tai:

- Conversation brain: giu backend `Express/TypeScript` hien tai
- Voice output: uu tien `ElevenLabs TTS`
- Pronunciation scoring: `Azure Speech Pronunciation Assessment`
- STT:
  - uu tien `Google Chirp 3 Transcription` neu muon transcript on dinh cho nhieu accent/ngon ngu
  - hoac dung 1 provider STT don gian hon neu muon giam so vendor
- V1 nen di theo `Push-to-Talk`, chua len full-duplex realtime ngay

Neu uu tien don gian hon va it vendor hon:

- dung `OpenAI` cho voice stack chuoi `STT -> LLM -> TTS`
- doi lai se it linh hoat hon cho bai toan "chon giong ai tra loi" va "catalog giong that phong phu"

## De xuat cong nghe

### 1. OpenAI

OpenAI co `gpt-4o-mini-tts` va tai lieu TTS chinh thuc cho biet:

- co `13 built-in voices`
- co streaming audio
- co the dieu khien accent, emotional range, intonation, speed, tone
- voice built-in hien tai duoc toi uu chu yeu cho tieng Anh

Nguon:

- OpenAI TTS guide: https://developers.openai.com/api/docs/guides/text-to-speech

OpenAI cung co `gpt-realtime`, la model realtime audio/text qua `WebRTC`, `WebSocket`, hoac `SIP`.

Nguon:

- OpenAI realtime model: https://developers.openai.com/api/docs/models/gpt-realtime

Danh gia cho Scenio:

- Uu diem:
  - stack gon
  - hop neu muon len realtime nhanh
  - chat va voice nam trong cung he sinh thai
- Nhuoc diem:
  - built-in voice catalog it da dang hon voi bai toan "cho user chon ai tra loi"
  - khong phai huong tot nhat neu muon rat nhieu persona male/female/accent theo scene

### 2. ElevenLabs

ElevenLabs phu hop nhat cho bai toan "chon giong ai tra loi" va "giong that nhu nhan vat":

- TTS voice catalog lon
- `Voice Library` co tren `10,000` voices trong tai lieu overview
- co `Voice Design` de tao voice tu mo ta nhu age, gender, accent, tone
- TTS docs ghi `Flash v2.5` co `~75ms latency`
- co model nhanh, model expressive, va mo hinh cloning khi can chat luong cao

Nguon:

- Voices overview: https://elevenlabs.io/docs/overview/capabilities/voices
- TTS overview: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- Voice Design: https://elevenlabs.io/docs/eleven-creative/voices/voice-design/

Danh gia cho Scenio:

- Uu diem:
  - tot nhat cho persona va character voice
  - de lam UX "chon nam/nu", "chon giọng banh bao", "chon giọng nghiem tuc", "chon accent"
  - hop voi scene-based app vi moi scene co the map sang 2-4 preset voice
- Nhuoc diem:
  - them 1 vendor rieng cho TTS
  - can quan ly `voice_id`, catalog, preview, va cost rieng

### 3. Google Cloud Text-to-Speech / Chirp 3 HD

Google Cloud `Chirp 3: HD voices` co mot huong rat hop neu ban muon:

- voice quality cao
- co danh sach male/female ro rang
- support rat nhieu locale, trong do co `vi-VN`
- co streaming synth

Tai lieu chinh thuc cho biet:

- Chirp 3 HD nhan manh "realism and emotional resonance"
- co nhieu locale, bao gom `en-US`, `ja-JP`, `vi-VN`
- co streaming va batch output

Nguon:

- Chirp 3 HD voices: https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd

Danh gia cho Scenio:

- Uu diem:
  - rat hop neu app can nhieu locale va co nhu cau preview bang tieng Viet
  - de map voice theo `male/female` va locale
  - official list voice names kha ro rang
- Nhuoc diem:
  - catalog character voice khong "creative marketplace" manh nhu ElevenLabs
  - bai toan persona/game voice se kem linh hoat hon ElevenLabs

### 4. Google Cloud Speech-to-Text / Chirp 3

Neu can STT on dinh cho audio user:

- `Chirp 3` duoc Google mo ta la ASR-specific generative model
- docs khuyen stream audio theo chunk nho gan realtime

Nguon:

- Chirp 3 transcription: https://docs.cloud.google.com/agent-assist/docs/transcription-with-chirp3

Danh gia cho Scenio:

- tot cho transcript va phan tich noi dung
- nhung khong thay the duoc pronunciation scoring chuyen dung

### 5. Azure Speech Pronunciation Assessment

Cho bai toan cham phat am, day la lua chon manh nhat trong cac phuong an da xem.

Tai lieu chinh thuc cho biet:

- co `accuracy`, `fluency`, `completeness`, `prosody`
- speaking mode co them `vocabulary`, `grammar`, `topic`
- co word-level, syllable-level, phoneme-level detail
- quality phu thuoc vao chat luong audio va STT accuracy

Nguon:

- Pronunciation assessment tool: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/pronunciation-assessment-tool
- Characteristics and limitations: https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/pronunciation-assessment/characteristics-and-limitations-pronunciation-assessment

Danh gia cho Scenio:

- gan nhu bat buoc neu muon "cham phat am that"
- khong nen bat LLM tu cham phat am chi dua tren transcript

## Chon cong nghe de xuat

### Phuong an de xuat nhat cho Scenio

- `Backend orchestration`: Express/TypeScript hien tai
- `LLM conversation`: tiep tuc provider abstraction hien co
- `STT`: Google Chirp 3 Transcription
- `TTS`: ElevenLabs
- `Pronunciation scoring`: Azure Speech Pronunciation Assessment
- `Transport`: Push-to-Talk cho V1

Ly do:

- bai toan "chon ai tra loi" can TTS catalog/phong cach manh
- bai toan "cham phat am" can engine speech chuyen dung
- bai toan "noi chuyen va logic game hoa" van nen nam o backend hien tai

### Phuong an de xuat neu muon it vendor hon

- `Backend orchestration`: Express/TypeScript
- `LLM + TTS + STT`: OpenAI chained voice flow
- `Pronunciation scoring`: Azure

Ly do:

- de ship hon
- nhung UX voice selector se kem phong phu hon

## Quy tac UX cho viec chon giong

### Tang 1: Chon nhanh

Moi scene co san:

- `Default Female`
- `Default Male`

Vi du:

- Scene receptionist:
  - female: warm, helpful, front-desk style
  - male: calm, professional, polite
- Scene coworker:
  - female: upbeat, friendly
  - male: casual, collaborative

### Tang 2: Chon nang cao

Cho user chon:

- Gender
- Accent
- Tone
- Energy
- Age vibe
- Speaking speed

### Tang 3: Preview truoc khi vao scene

Moi voice profile can co:

- ten hien thi
- sample 3-5 giay
- tags
- scene fit

Vi du:

- `Anna - warm receptionist`
- `Ken - polite airport staff`
- `Mika - cheerful cafe clerk`

## Data model de xuat

### VoiceProfile

- `id`
- `provider`
- `providerVoiceId`
- `displayName`
- `description`
- `gender`
- `locale`
- `accent`
- `styleTags`
- `sampleUrl`
- `latencyTier`
- `isActive`

### SceneVoicePreset

- `id`
- `sceneId`
- `defaultVoiceId`
- `defaultFemaleVoiceId`
- `defaultMaleVoiceId`

### Session

Them vao session:

- `voiceProfileId`
- `voiceProvider`
- `voiceSnapshotName`

### UserSettings

Neu can:

- `preferredVoiceProfileId`
- `preferredVoiceGender`
- `preferredLocale`

## API de xuat

### Voice catalog

- `GET /api/voices`
- `GET /api/voices/:id`
- `POST /api/voices/preview`
- `GET /api/scenes/:id/voices`

### Session flow

Mo rong `POST /api/sessions/start` nhan them:

- `voiceProfileId`

Them:

- `POST /api/sessions/:id/message`
- `POST /api/sessions/:id/audio-turn`
- `GET /api/sessions/:id/transcript`

### Pronunciation

Them:

- `POST /api/sessions/:id/pronunciation-assess`

Hoac gom chung vao `audio-turn` va backend tu ghi:

- transcript
- pronunciation score
- content score
- feedback cho turn

## Plan trien khai

### Phase 1: Voice catalog va preview

Muc tieu:

- user thay duoc danh sach voices
- chon duoc nam/nu khi vao scene
- nghe preview truoc khi bat dau

Viec can lam:

- tao `VoiceProfile`, `SceneVoicePreset`
- seed 8-12 voice profiles dau tien
- tao page/section chon voice trong client
- tao `POST /api/voices/preview`

Do anh huong code hien tai:

- thap
- chu yeu them module moi `voices`

### Phase 2: Push-to-Talk production flow

Muc tieu:

- user bam giu de noi
- server nhan audio, transcript, tra text + audio reply

Flow:

1. client ghi am 1 turn
2. gui audio len backend
3. backend goi STT
4. backend goi LLM
5. backend goi TTS theo `voiceProfileId`
6. client phat audio

API:

- `POST /api/sessions/:id/audio-turn`

Ket qua tra ve:

- transcript user
- assistant text
- assistant audio url hoac binary stream
- metadata turn

### Phase 3: Pronunciation scoring

Muc tieu:

- cham phat am that
- luu diem theo tung turn va tong hop theo session

Viec can lam:

- gui audio user sang Azure Pronunciation Assessment
- luu:
  - pronunciation score
  - accuracy
  - fluency
  - completeness
  - prosody
  - word/phoneme diagnostics neu can

Output cho client:

- feedback ngan sau moi turn
- chart tong hop sau session

### Phase 4: Level diagnosis

Muc tieu:

- suy doan level tu nhieu session va nhieu tin hieu

Khong nen dua level chi theo transcript.

Nen tong hop:

- transcript
- do dai cau
- vocabulary richness
- grammar errors
- hesitation
- pronunciation metrics
- fluency/prosody trend

LLM o phase nay chi nen dong vai:

- summarizer
- level rationale generator

Khong nen la nguon duy nhat de cham phat am.

### Phase 5: Realtime voice

Chi lam sau khi Push-to-Talk da on.

Muc tieu:

- hoi thoai tu nhien hon
- co the doi sang WebRTC hoac Realtime API

Luu y:

- realtime la phase nang
- kho giu transcript va scoring chat che hon PTT
- voi app hoc ngoai ngu, PTT thuong de kiem soat chat luong hon

## Luong san pham de xuat

### Luong vao scene

1. User chon scene
2. App hien 2 nut nhanh:
   - `Male voice`
   - `Female voice`
3. User co the bam `Advanced voices`
4. User nghe sample
5. User bat dau session

### Luong trong session

1. Character noi opening line bang voice da chon
2. User Push-to-Talk
3. App hien transcript cua user
4. Character tra loi bang text + audio
5. Neu can, app hien feedback nhe:
   - "you sounded hesitant"
   - "good clarity"
   - "watch the th sound"

### Luong ket thuc session

Hien:

- pronunciation summary
- vocabulary summary
- grammar summary
- estimated level trend
- scene recommendations tiep theo

## De xuat UX "that nhat co the"

De cam giac "that" hon, nen them:

- opening delay nho 300-700ms truoc khi character noi
- waveform animation khi audio dang phat
- avatar/persona card cho tung character
- moi scene co 2-4 voice preset phu hop, khong nen de 100 voice cho user tu chon ngay tu dau
- cho user favorite 1-2 voice yeu thich

## Rui ro va trade-off

### Dung nhieu vendor

Uu diem:

- chat luong tung bai toan tot hon

Nhuoc diem:

- tang chi phi
- tang complexity
- can fallback strategy

### Chi dung 1 vendor

Uu diem:

- de van hanh

Nhuoc diem:

- co the khong dat muc "that nhat co the" cho ca voice va pronunciation cung luc

## De xuat rollout thuc te cho repo nay

### Muc uu tien 1

- tao `voices` module
- mo rong `sessions/start` nhan `voiceProfileId`
- lam preview voice
- cap nhat lab page de chon voice

### Muc uu tien 2

- lam `POST /sessions/:id/message` ban text first
- sau do lam `audio-turn`

### Muc uu tien 3

- tich hop pronunciation assessment
- cap nhat session result de co pronunciation summary

### Muc uu tien 4

- nghien cuu realtime

## Recommendation cuoi cung

Neu dung 1 cau de chot cho Scenio:

- V1 nen la `Push-to-Talk + ElevenLabs TTS + Azure Pronunciation Assessment + backend Express hien tai`

Neu muon giam vendor:

- V1 nen la `Push-to-Talk + OpenAI voice chain + Azure Pronunciation Assessment`

Neu muon uu tien locale da dang, male/female ro rang, va support `vi-VN` tot hon:

- can nhac `Google Chirp 3 HD` cho TTS catalog thay cho ElevenLabs

## Sources

- OpenAI Text-to-Speech: https://developers.openai.com/api/docs/guides/text-to-speech
- OpenAI Realtime model: https://developers.openai.com/api/docs/models/gpt-realtime
- ElevenLabs Voices overview: https://elevenlabs.io/docs/overview/capabilities/voices
- ElevenLabs Text to Speech: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- ElevenLabs Voice Design: https://elevenlabs.io/docs/eleven-creative/voices/voice-design/
- Google Chirp 3 HD voices: https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd
- Google Chirp 3 transcription: https://docs.cloud.google.com/agent-assist/docs/transcription-with-chirp3
- Azure Pronunciation Assessment tool: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/pronunciation-assessment-tool
- Azure Pronunciation Assessment limitations: https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/pronunciation-assessment/characteristics-and-limitations-pronunciation-assessment
