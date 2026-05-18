<script setup lang="ts">
useSeoMeta({
  title: 'New profile — UK AI Radar',
  description: 'Create a founder profile to generate a personalised UK gov AI brief.',
})

interface FormState {
  slug: string
  company: string
  stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'later'
  geo: string
  sectors: string
  capabilities: string
  trlBand: '' | 'research' | 'prototype' | 'deployment'
  goals: string
  exclude: string
}

const form = reactive<FormState>({
  slug: '',
  company: '',
  stage: 'seed',
  geo: 'United Kingdom',
  sectors: '',
  capabilities: '',
  trlBand: '',
  goals: '',
  exclude: '',
})

const submitting = ref(false)
const generating = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)

async function save(then?: 'generate' | 'view') {
  error.value = null
  submitting.value = true
  try {
    const res = await $fetch<{ ok: true; slug: string }>('/api/profiles', {
      method: 'POST',
      body: form,
    })
    saved.value = true
    if (then === 'generate') {
      generating.value = true
      try {
        await $fetch('/api/digest', { method: 'POST', body: { slug: res.slug } })
      } finally {
        generating.value = false
      }
      await navigateTo(`/brief/${res.slug}`)
    } else if (then === 'view') {
      await navigateTo(`/brief/${res.slug}`)
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'save failed'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <article>
    <h1 class="govuk-heading-xl">Create a profile</h1>

    <p class="govuk-body-l">
      A profile tells the Strategist what to rank highly for you. The same fetched gov
      items get scored differently depending on these fields.
    </p>

    <div v-if="error" class="govuk-error-summary" role="alert">
      <h2 class="govuk-error-summary__title">There is a problem</h2>
      <p class="govuk-body">{{ error }}</p>
    </div>

    <form @submit.prevent="save('generate')" novalidate>
      <div class="govuk-form-group">
        <label class="govuk-label" for="slug">Slug</label>
        <div class="govuk-hint">URL-safe identifier. Lowercase letters, digits and hyphens only.</div>
        <input class="govuk-input govuk-input--width-20" id="slug" v-model="form.slug" required pattern="[a-z0-9-]+" />
      </div>

      <div class="govuk-form-group">
        <label class="govuk-label" for="company">Company name</label>
        <input class="govuk-input" id="company" v-model="form.company" required />
      </div>

      <div class="govuk-form-group">
        <label class="govuk-label" for="stage">Stage</label>
        <select class="govuk-select" id="stage" v-model="form.stage">
          <option value="pre-seed">Pre-seed</option>
          <option value="seed">Seed</option>
          <option value="series-a">Series A</option>
          <option value="series-b">Series B</option>
          <option value="later">Later</option>
        </select>
      </div>

      <div class="govuk-form-group">
        <label class="govuk-label" for="geo">Geography</label>
        <div class="govuk-hint">Where the company is headquartered. UK eligibility matters for most grants.</div>
        <input class="govuk-input" id="geo" v-model="form.geo" />
      </div>

      <div class="govuk-form-group">
        <label class="govuk-label" for="sectors">Sectors</label>
        <div class="govuk-hint">Domains you operate in — one per line. e.g. construction, healthcare.</div>
        <textarea class="govuk-textarea" id="sectors" rows="3" v-model="form.sectors"></textarea>
      </div>

      <div class="govuk-form-group">
        <label class="govuk-label" for="capabilities">Capabilities</label>
        <div class="govuk-hint">What the company does technically — one per line. e.g. computer vision, LLM agents.</div>
        <textarea class="govuk-textarea" id="capabilities" rows="3" v-model="form.capabilities"></textarea>
      </div>

      <fieldset class="govuk-fieldset">
        <legend class="govuk-fieldset__legend">Where are you in the journey?</legend>
        <div class="govuk-hint">
          UK gov programmes route by maturity band (the Technology Readiness Level scale).
          Higher is <strong>not</strong> better — grants subsidise the riskier stages.
          Pick the band that best fits your work today.
        </div>
        <div class="govuk-radios">
          <div class="govuk-radios__item">
            <input class="govuk-radios__input" id="trl-research" type="radio" value="research" v-model="form.trlBand" />
            <label class="govuk-label govuk-radios__label" for="trl-research">
              Research / proving the concept
              <span class="govuk-hint">TRL 1–3. Funded by UKRI Research Councils, ARIA.</span>
            </label>
          </div>
          <div class="govuk-radios__item">
            <input class="govuk-radios__input" id="trl-prototype" type="radio" value="prototype" v-model="form.trlBand" />
            <label class="govuk-label govuk-radios__label" for="trl-prototype">
              Building a working prototype
              <span class="govuk-hint">TRL 4–6. The Innovate UK Smart Grant sweet spot — most AI startup grants land here.</span>
            </label>
          </div>
          <div class="govuk-radios__item">
            <input class="govuk-radios__input" id="trl-deployment" type="radio" value="deployment" v-model="form.trlBand" />
            <label class="govuk-label govuk-radios__label" for="trl-deployment">
              Deploying with paying customers
              <span class="govuk-hint">TRL 7–9. Public sector contracts and scale-up programmes — fewer grants, more tenders.</span>
            </label>
          </div>
        </div>
      </fieldset>

      <div class="govuk-form-group">
        <label class="govuk-label" for="goals">Near-term goals</label>
        <div class="govuk-hint">One per line. e.g. "secure non-dilutive funding in the next 12 months".</div>
        <textarea class="govuk-textarea" id="goals" rows="4" v-model="form.goals"></textarea>
      </div>

      <div class="govuk-form-group">
        <label class="govuk-label" for="exclude">Exclude</label>
        <div class="govuk-hint">Disqualifiers — one per line. e.g. "academic-only programmes".</div>
        <textarea class="govuk-textarea" id="exclude" rows="3" v-model="form.exclude"></textarea>
      </div>

      <div class="form-actions">
        <button class="govuk-button" type="submit" :disabled="submitting || generating">
          {{ generating ? 'Generating brief…' : submitting ? 'Saving…' : 'Save and generate brief' }}
        </button>
        <button class="govuk-button govuk-button--secondary" type="button" :disabled="submitting" @click="save('view')">
          Save only
        </button>
      </div>

      <p v-if="generating" class="govuk-body govuk-hint">
        Fetching gov sources and ranking. This usually takes 20–60 seconds on first run.
      </p>
    </form>

    <div v-if="saved && !generating" class="govuk-inset-text">
      Saved to <code>profiles/{{ form.slug }}.json</code>.
    </div>
  </article>
</template>

<style scoped>
.form-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}
</style>
