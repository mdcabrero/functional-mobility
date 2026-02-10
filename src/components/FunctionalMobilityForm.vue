<script setup>
import { ref, reactive } from 'vue'
import DateInput from './DateInput.vue'
import {
  useMobilityForm,
  MOBILITY_TYPES,
  HRBP_OPTIONS,
  POSITION_OPTIONS,
} from '../composables/useMobilityForm.js'

const {
  formData,
  errors,
  dateLabel,
  showEndDate,
  updateField,
  fillTestData,
  importFromCsv,
  submit,
} = useMobilityForm()

const isSubmitting = ref(false)
const toast = reactive({ visible: false, message: '', type: 'success' })
let toastTimer = null

function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.visible = true
  toast.message = message
  toast.type = type
  toastTimer = setTimeout(() => {
    toast.visible = false
  }, 4000)
}

async function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const result = await submit()
    if (result.success !== false) {
      showToast('Formulario enviado correctamente')
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error')
  } finally {
    isSubmitting.value = false
  }
}

async function handleCsvImport(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const result = await importFromCsv(file)

  if (result.success) {
    let msg = `${result.fieldsImported} campos importados`
    if (result.warnings.length > 0) {
      msg += ` (${result.warnings.length} advertencias)`
    }
    showToast(msg)
  } else {
    showToast(result.warnings?.[0] || 'Error al importar CSV', 'error')
  }

  event.target.value = ''
}
</script>

<template>
  <div class="page-wrapper">
    <!-- Header -->
    <h1 class="page-title">Movilidad Funcional</h1>
    <p class="page-subtitle">Completa el formulario para registrar la movilidad funcional</p>

    <!-- Segmented Control -->
    <div class="segmented-control-label">TIPO DE CARTA</div>
    <div class="segmented-control">
      <button
        v-for="type in MOBILITY_TYPES"
        :key="type.value"
        type="button"
        class="segmented-button"
        :class="{ 'is-active': formData.mobilityType === type.value }"
        @click="updateField('mobilityType', type.value)"
      >
        {{ type.label }}
      </button>
    </div>

    <!-- Form Card -->
    <form class="card form-card" @submit.prevent="handleSubmit">
      <!-- Section: Firmante (HRBP) -->
      <div class="form-section">
        <h2 class="section-title">Signatory (HRBP)</h2>
        <div class="fields-grid">
          <div class="form-group">
            <label class="form-label" for="hrbp">HRBP</label>
            <select
              id="hrbp"
              class="form-input select"
              :class="{ 'has-error': errors.hrbp }"
              :value="formData.hrbp"
              @change="updateField('hrbp', $event.target.value)"
            >
              <option value="" disabled>Select HRBP</option>
              <option v-for="opt in HRBP_OPTIONS" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
            <span v-if="errors.hrbp" class="error-message">{{ errors.hrbp }}</span>
          </div>
        </div>
      </div>

      <!-- Section: Datos del Documento -->
      <div class="form-section">
        <h2 class="section-title">Datos del Documento</h2>
        <div class="fields-grid">
          <div class="form-group">
            <label class="form-label" for="date">{{ dateLabel }}</label>
            <DateInput
              id="date"
              :model-value="formData.date"
              :has-error="!!errors.date"
              @update:model-value="updateField('date', $event)"
            />
            <span v-if="errors.date" class="error-message">{{ errors.date }}</span>
          </div>

          <div v-if="showEndDate" class="form-group">
            <label class="form-label" for="endDate">Fecha Fin</label>
            <DateInput
              id="endDate"
              :model-value="formData.endDate"
              :has-error="!!errors.endDate"
              @update:model-value="updateField('endDate', $event)"
            />
            <span v-if="errors.endDate" class="error-message">{{ errors.endDate }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="location">Ubicación / Delegación</label>
            <input
              id="location"
              type="text"
              class="form-input"
              :class="{ 'has-error': errors.location }"
              placeholder="Barcelona"
              :value="formData.location"
              @input="updateField('location', $event.target.value)"
            />
            <span v-if="errors.location" class="error-message">{{ errors.location }}</span>
          </div>
        </div>
      </div>

      <!-- Section: Datos del Empleado -->
      <div class="form-section">
        <h2 class="section-title">Datos del Empleado</h2>
        <div class="fields-grid">
          <div class="form-group">
            <label class="form-label" for="fullName">Nombre y Apellidos</label>
            <input
              id="fullName"
              type="text"
              class="form-input"
              :class="{ 'has-error': errors.fullName }"
              placeholder="Juan García López"
              :value="formData.fullName"
              @input="updateField('fullName', $event.target.value)"
            />
            <span v-if="errors.fullName" class="error-message">{{ errors.fullName }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="gpid">GPID</label>
            <input
              id="gpid"
              type="text"
              class="form-input"
              :class="{ 'has-error': errors.gpid }"
              placeholder="12345678"
              :value="formData.gpid"
              @input="updateField('gpid', $event.target.value)"
            />
            <span v-if="errors.gpid" class="error-message">{{ errors.gpid }}</span>
          </div>
        </div>
      </div>

      <!-- Section: Posiciones -->
      <div class="form-section">
        <h2 class="section-title">Posiciones</h2>
        <div class="fields-grid">
          <div class="form-group">
            <label class="form-label" for="temporaryPosition">Puesto Temporal</label>
            <select
              id="temporaryPosition"
              class="form-input select"
              :class="{ 'has-error': errors.temporaryPosition }"
              :value="formData.temporaryPosition"
              @change="updateField('temporaryPosition', $event.target.value)"
            >
              <option value="" disabled>Seleccionar puesto...</option>
              <option v-for="opt in POSITION_OPTIONS" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
            <span v-if="errors.temporaryPosition" class="error-message">{{
              errors.temporaryPosition
            }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="originalPosition">Puesto Original</label>
            <select
              id="originalPosition"
              class="form-input select"
              :class="{ 'has-error': errors.originalPosition }"
              :value="formData.originalPosition"
              @change="updateField('originalPosition', $event.target.value)"
            >
              <option value="" disabled>Seleccionar puesto...</option>
              <option v-for="opt in POSITION_OPTIONS" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
            <span v-if="errors.originalPosition" class="error-message">{{
              errors.originalPosition
            }}</span>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <button type="button" class="btn btn-ghost" @click="fillTestData">Fill Test Data</button>
        <label class="btn btn-ghost csv-import-btn">
          Import CSV
          <input type="file" accept=".csv" hidden @change="handleCsvImport" />
        </label>
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          <svg
            v-if="isSubmitting"
            class="btn-icon animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              opacity="0.25"
            />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Enviar
        </button>
      </div>
    </form>

    <!-- Toast -->
    <Transition name="slide-up">
      <div v-if="toast.visible" class="import-toast" :class="toast.type">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.page-wrapper {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px 96px;
}

.page-title {
  font-size: 36px;
  margin: 0 0 8px;
}

.page-subtitle {
  margin: 0 0 32px;
  font-size: 15px;
}

/* ── Segmented Control ─────────────────────────────── */

.segmented-control-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.segmented-control {
  display: inline-flex;
  background: var(--color-surface-hover);
  border-radius: var(--radius-md);
  padding: 4px;
  gap: 4px;
  margin-bottom: 24px;
}

.segmented-button {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  font-family: inherit;
}

.segmented-button:hover {
  color: var(--color-text-primary);
}

.segmented-button.is-active {
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* ── Form Card ─────────────────────────────────────── */

.form-card {
  padding: 32px;
}

.form-card:hover {
  box-shadow: var(--shadow-card);
  transform: none;
}

/* ── Section Title ─────────────────────────────────── */

.section-title {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
  margin: 24px 0 16px;
}

.form-section:first-child .section-title {
  margin-top: 0;
}

/* ── Fields Grid ───────────────────────────────────── */

.fields-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .fields-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ── Form Labels ───────────────────────────────────── */

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* ── Form Inputs ───────────────────────────────────── */

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-sm);
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.form-input:focus {
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 3px rgba(30, 150, 235, 0.1);
}

.form-input.has-error {
  border-color: #dc2626;
  background: #fef2f2;
}

.form-input::placeholder {
  color: var(--color-text-secondary);
}

/* ── Select Styling ────────────────────────────────── */

.form-input.select {
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23B2B2B3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

/* ── Error Messages ────────────────────────────────── */

.error-message {
  font-size: 12px;
  color: #dc2626;
}

/* ── Action Bar ────────────────────────────────────── */

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.action-bar .btn-primary {
  margin-left: auto;
}

.csv-import-btn {
  cursor: pointer;
}

/* ── Toast ─────────────────────────────────────────── */

.import-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.import-toast.success {
  background: #065f46;
  color: white;
}

.import-toast.error {
  background: #dc2626;
  color: white;
}
</style>
