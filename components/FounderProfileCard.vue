<script setup lang="ts">
import type { FounderProfile } from '~/utils/workspace'

const { ws, confirmProfile, clearProfile } = useWorkspace()

interface Draft {
  company: string
  stage: string
  sectors: string
  capabilities: string
  goals: string
  exclude: string
}

const draft = reactive<Draft>({ company: '', stage: '', sectors: '', capabilities: '', goals: '', exclude: '' })

function fill(profile: FounderProfile | null) {
  draft.company = profile?.company ?? ''
  draft.stage = profile?.stage ?? ''
  draft.sectors = profile?.sectors.join(', ') ?? ''
  draft.capabilities = profile?.capabilities.join(', ') ?? ''
  draft.goals = profile?.goals.join(', ') ?? ''
  draft.exclude = profile?.exclude.join(', ') ?? ''
}

// The agent proposes; the page shows it; the founder decides. Keep the draft in step with either.
watch(() => [ws.value.profile, ws.value.profileStatus], () => fill(ws.value.profile), { immediate: true, deep: true })

function save() {
  confirmProfile({ ...draft })
}
</script>

<template>
  <form :data-status="ws.profileStatus" aria-label="Founder profile" @submit.prevent="save">
    <h2>Your profile</h2>
    <p v-if="ws.profileStatus === 'proposed'" role="status">Your agent filled this in. Check it, change what it got wrong, then keep it.</p>
    <p v-else-if="ws.profileStatus === 'empty'">Who is reading? Say it here, or let your agent fill it in from what it already knows about you.</p>
    <p v-else>The radar reads against this. Edit any line and save.</p>
    <label>Company <input v-model="draft.company" name="company" required /></label>
    <label>Stage <input v-model="draft.stage" name="stage" placeholder="seed, series-a, revenue-funded…" /></label>
    <label>Sectors <input v-model="draft.sectors" name="sectors" placeholder="NHS, defence, fintech" /></label>
    <label>Capabilities <input v-model="draft.capabilities" name="capabilities" placeholder="computer vision, LLM agents" /></label>
    <label>Goals <input v-model="draft.goals" name="goals" placeholder="find an NHS pilot, track MHRA guidance" /></label>
    <label>Leave out <input v-model="draft.exclude" name="exclude" placeholder="academic-only grants" /></label>
    <footer>
      <button type="submit">{{ ws.profileStatus === 'proposed' ? 'Keep this profile' : 'Save profile' }}</button>
      <button v-if="ws.profileStatus !== 'empty'" type="button" value="clear" @click="clearProfile">Clear</button>
    </footer>
  </form>
</template>
