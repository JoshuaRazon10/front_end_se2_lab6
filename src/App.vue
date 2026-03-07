<template>
  <div class="app">

    <!-- ── Header ── -->
    <header class="header">
      <div class="header-inner">
        <div class="logo">
          <span class="logo-icon">🌙</span>
          <span class="logo-text">Mood Journal</span>
        </div>
        <p class="tagline">Track your vibe, every day.</p>
      </div>
    </header>

    <main class="main">

      <!-- ── Mood Form Card ── -->
      <section class="glass form-card">
        <h2 class="section-title">How are you feeling?</h2>

        <!-- Mood Emoji Display -->
        <div class="mood-display">
          <span class="mood-emoji" :style="{ filter: `hue-rotate(${(form.mood_level - 1) * 20}deg)` }">
            {{ currentEmoji }}
          </span>
          <span class="mood-label">{{ moodLabel }}</span>
        </div>

        <!-- Slider -->
        <div class="slider-wrapper">
          <input
            id="moodSlider"
            type="range"
            min="1" max="10"
            v-model.number="form.mood_level"
            class="mood-slider"
          />
          <div class="slider-ticks">
            <span v-for="n in 10" :key="n" :class="{ active: n <= form.mood_level }">{{ n }}</span>
          </div>
        </div>

        <!-- Journal Entry -->
        <div class="field">
          <label for="journalEntry" class="field-label">Journal Entry</label>
          <textarea
            id="journalEntry"
            v-model="form.journal_entry"
            class="textarea"
            rows="4"
            placeholder="What's on your mind today? ✍️"
          ></textarea>
        </div>

        <!-- Submit -->
        <button
          class="btn-submit"
          :class="{ loading: submitting }"
          :disabled="submitting"
          @click="submitMood"
        >
          <span v-if="!submitting">Save Mood ✨</span>
          <span v-else class="spinner">⏳ Saving…</span>
        </button>

        <!-- Error -->
        <div v-if="submitError" class="alert alert-error">{{ submitError }}</div>

        <!-- AI Response Banner -->
        <Transition name="ai-slide">
          <div v-if="aiResponse" class="ai-banner">
            <span class="ai-icon">🤖</span>
            <p class="ai-text">{{ aiResponse }}</p>
            <button class="ai-close" @click="aiResponse = null">✕</button>
          </div>
        </Transition>
      </section>

      <!-- ── Mood History ── -->
      <section class="history-section">
        <div class="history-header">
          <h2 class="section-title">Mood History</h2>
          <button class="btn-refresh" @click="fetchMoods" :disabled="loading">
            <span :class="{ spinning: loading }">↻</span> Refresh
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading" class="skeleton-list">
          <div v-for="i in 3" :key="i" class="skeleton-card glass"></div>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="alert alert-error">{{ fetchError }}</div>

        <!-- Empty state -->
        <div v-else-if="moods.length === 0" class="empty-state glass">
          <span class="empty-icon">📭</span>
          <p>No moods recorded yet. Be the first!</p>
        </div>

        <!-- Mood cards -->
        <TransitionGroup v-else name="list" tag="div" class="mood-list">
          <div
            v-for="mood in moods"
            :key="mood.id"
            class="mood-card glass"
          >
            <div class="mood-card-left">
              <span class="card-emoji">{{ emojiForLevel(mood.mood_level) }}</span>
              <div class="card-level-bar">
                <div class="bar-fill" :style="{ width: (mood.mood_level / 10 * 100) + '%', background: levelColor(mood.mood_level) }"></div>
              </div>
              <span class="card-level-num">{{ mood.mood_level }}/10</span>
            </div>
            <div class="mood-card-body">
              <p class="card-entry">{{ mood.journal_entry || '(no entry)' }}</p>
              <time class="card-time">{{ formatDate(mood.created_at) }}</time>
            </div>
          </div>
        </TransitionGroup>
      </section>

    </main>

    <footer class="footer">
      <p>Made with 💜 · Mood Journal</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ── State ──
const moods         = ref([])
const loading       = ref(false)
const fetchError    = ref(null)
const submitting    = ref(false)
const submitError   = ref(null)
const aiResponse    = ref(null)

const form = ref({ mood_level: 5, journal_entry: '' })

// ── Emoji & Label Logic ──
const EMOJIS = ['😭','😢','😟','😕','😐','🙂','😊','😄','🤩','🔥']
const LABELS = ['Awful','Really Bad','Bad','Meh','Neutral','Okay','Good','Great','Amazing','Incredible!']

const currentEmoji = computed(() => EMOJIS[form.value.mood_level - 1])
const moodLabel    = computed(() => LABELS[form.value.mood_level - 1])

function emojiForLevel(level) {
  return EMOJIS[Math.min(Math.max(level - 1, 0), 9)]
}

function levelColor(level) {
  if (level <= 3) return '#f87171'
  if (level <= 5) return '#facc15'
  if (level <= 7) return '#4ade80'
  return '#818cf8'
}

// ── API Calls ──
async function fetchMoods() {
  loading.value    = true
  fetchError.value = null
  try {
    const res = await axios.get(`${API_URL}/moods`)
    moods.value = res.data
  } catch (err) {
    fetchError.value = `Failed to load moods: ${err.message}`
  } finally {
    loading.value = false
  }
}

async function submitMood() {
  if (submitting.value) return
  submitting.value  = true
  submitError.value = null
  aiResponse.value  = null
  try {
    const res = await axios.post(`${API_URL}/moods`, {
      mood_level:    form.value.mood_level,
      journal_entry: form.value.journal_entry
    })
    aiResponse.value     = res.data.ai_response
    form.value.journal_entry = ''
    form.value.mood_level    = 5
    await fetchMoods()
  } catch (err) {
    submitError.value = `Failed to save: ${err.response?.data?.error || err.message}`
  } finally {
    submitting.value = false
  }
}

// ── Date Format ──
function formatDate(ts) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

onMounted(fetchMoods)
</script>

<style scoped>
/* ── Layout ── */
.app     { min-height: 100vh; display: flex; flex-direction: column; }
.header  { padding: 2.5rem 1.5rem 1rem; text-align: center; }
.header-inner { max-width: 720px; margin: 0 auto; }

.logo        { display: flex; align-items: center; justify-content: center; gap: .6rem; margin-bottom: .4rem; }
.logo-icon   { font-size: 2rem; }
.logo-text   { font-size: 1.8rem; font-weight: 800; letter-spacing: -.5px;
               background: linear-gradient(135deg, #a99cf5 0%, #7c6af7 50%, #6dd5ed 100%);
               -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.tagline     { color: var(--text-muted); font-size: .92rem; }

.main        { flex: 1; max-width: 720px; margin: 0 auto; width: 100%; padding: 1.5rem 1.2rem 3rem; display: flex; flex-direction: column; gap: 2rem; }

/* ── Form Card ── */
.form-card     { padding: 2rem; }
.section-title { font-size: 1.1rem; font-weight: 700; letter-spacing: -.2px; margin-bottom: 1.4rem; color: var(--text-primary); }

/* Mood Display */
.mood-display  { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.2rem; }
.mood-emoji    { font-size: 3rem; line-height: 1; transition: all .3s ease; }
.mood-label    { font-size: 1.3rem; font-weight: 700; color: var(--accent-light); transition: color .3s; }

/* Slider */
.slider-wrapper { margin-bottom: 1.6rem; }
.mood-slider {
  width: 100%; -webkit-appearance: none; height: 6px;
  border-radius: 9px; background: rgba(255,255,255,.1); outline: none; cursor: pointer;
  background: linear-gradient(to right, var(--accent) 0%, var(--accent) calc(var(--val, 50%) ), rgba(255,255,255,.12) calc(var(--val, 50%)));
}
.mood-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
  background: var(--accent); border: 3px solid #fff; cursor: pointer;
  box-shadow: 0 0 12px var(--accent-glow); transition: transform .15s;
}
.mood-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.slider-ticks  { display: flex; justify-content: space-between; margin-top: .5rem; }
.slider-ticks span { font-size: .7rem; color: var(--text-muted); width: 20px; text-align: center; transition: color .2s; }
.slider-ticks span.active { color: var(--accent-light); font-weight: 600; }

/* Field */
.field       { margin-bottom: 1.4rem; }
.field-label { display: block; font-size: .82rem; font-weight: 600; color: var(--text-muted);
               text-transform: uppercase; letter-spacing: .06em; margin-bottom: .5rem; }
.textarea    {
  width: 100%; padding: .85rem 1rem; border-radius: 12px; resize: vertical;
  background: rgba(255,255,255,.06); border: 1px solid var(--border);
  color: var(--text-primary); font-family: var(--font); font-size: .95rem; line-height: 1.6;
  transition: border-color .2s, box-shadow .2s; outline: none;
}
.textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
.textarea::placeholder { color: var(--text-muted); }

/* Submit Button */
.btn-submit {
  width: 100%; padding: .9rem; border-radius: 12px; border: none; cursor: pointer;
  font-size: 1rem; font-weight: 700; font-family: var(--font);
  background: linear-gradient(135deg, #7c6af7, #5b9cf6);
  color: #fff; letter-spacing: .02em;
  box-shadow: 0 4px 20px rgba(124,106,247,.4);
  transition: transform .15s, box-shadow .15s, opacity .15s;
}
.btn-submit:hover:not(:disabled)  { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,106,247,.55); }
.btn-submit:active:not(:disabled) { transform: translateY(0); }
.btn-submit:disabled { opacity: .6; cursor: not-allowed; }

/* Alerts */
.alert         { margin-top: 1rem; padding: .75rem 1rem; border-radius: 10px; font-size: .88rem; }
.alert-error   { background: rgba(248,113,113,.12); border: 1px solid rgba(248,113,113,.3); color: var(--danger); }

/* AI Banner */
.ai-banner {
  margin-top: 1rem; padding: 1rem 1.2rem; border-radius: 14px;
  background: linear-gradient(135deg, rgba(124,106,247,.15), rgba(91,156,246,.1));
  border: 1px solid rgba(124,106,247,.3);
  display: flex; align-items: flex-start; gap: .8rem;
}
.ai-icon  { font-size: 1.5rem; flex-shrink: 0; }
.ai-text  { flex: 1; font-size: .95rem; line-height: 1.55; color: var(--accent-light); }
.ai-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; padding: 0 0 0 .5rem; transition: color .2s; }
.ai-close:hover { color: var(--text-primary); }

/* AI Transition */
.ai-slide-enter-active, .ai-slide-leave-active { transition: all .35s ease; }
.ai-slide-enter-from, .ai-slide-leave-to       { opacity: 0; transform: translateY(-10px); }

/* ── History ── */
.history-section { display: flex; flex-direction: column; gap: 1rem; }
.history-header  { display: flex; align-items: center; justify-content: space-between; }

.btn-refresh {
  display: flex; align-items: center; gap: .4rem;
  padding: .45rem .9rem; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg-card); color: var(--text-muted); font-size: .85rem; cursor: pointer;
  font-family: var(--font); transition: border-color .2s, color .2s;
}
.btn-refresh:hover:not(:disabled) { border-color: var(--accent); color: var(--accent-light); }
.spinning { display: inline-block; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: .9rem; }
.skeleton-card { height: 88px; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity:.4 } 50% { opacity:.8 } }

/* Empty */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: .8rem; padding: 3rem; color: var(--text-muted); }
.empty-icon  { font-size: 2.5rem; }

/* Mood cards */
.mood-list       { display: flex; flex-direction: column; gap: .9rem; }
.mood-card       { display: flex; align-items: center; gap: 1.2rem; padding: 1rem 1.2rem; transition: background .2s; }
.mood-card:hover { background: var(--bg-card-hover); }

.mood-card-left  { display: flex; flex-direction: column; align-items: center; gap: .4rem; min-width: 56px; }
.card-emoji      { font-size: 1.9rem; }
.card-level-bar  { width: 46px; height: 5px; border-radius: 99px; background: rgba(255,255,255,.1); overflow: hidden; }
.bar-fill        { height: 100%; border-radius: 99px; transition: width .4s ease; }
.card-level-num  { font-size: .72rem; color: var(--text-muted); font-weight: 600; }

.mood-card-body  { flex: 1; min-width: 0; }
.card-entry      { font-size: .95rem; color: var(--text-primary); line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-time       { display: block; font-size: .75rem; color: var(--text-muted); margin-top: .25rem; }

/* List transition */
.list-enter-active { transition: all .35s ease; }
.list-enter-from   { opacity: 0; transform: translateY(-8px); }

/* ── Footer ── */
.footer { text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: .82rem; }
</style>
