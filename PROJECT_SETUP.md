# Functional Mobility Online Form — New Vue 3 Project Specification

A standalone Vue 3 web application that renders the Functional Mobility form, collects employee data, and POSTs it to a backend API. No PDF generation, no document factory pattern, no routing between document types.

---

## Project Structure

```
src/
├── main.js
├── App.vue
├── components/
│   ├── DateInput.vue                ← copy from current project (no changes)
│   └── FunctionalMobilityForm.vue   ← new component (see spec below)
├── styles/
    |── styles.css
├── composables/
│   └── useMobilityForm.js           ← new composable (see spec below)
└── services/
    ├── csvService.js                ← copy from current project (no changes)
    └── apiService.js                ← new, single fetch call to backend
```

---

## Dependencies

```json
{
  "dependencies": {
    "vue": "^3.x"
  },
  "devDependencies": {
    "vite": "^6.x",
    "@vitejs/plugin-vue": "^5.x",
  }
}
```

No Vue Router, no Pinia. The composable handles all state.

---

## Files to Copy Verbatim

| Source (current project) | Destination (new project) | Notes |
|---|---|---|
| `src/style.css` | `src/style.css` | Full design system, copy as-is |
| `src/components/DateInput.vue` | `src/components/DateInput.vue` | DD/MM/YYYY date picker |
| `src/services/csvService.js` | `src/services/csvService.js` | CSV parsing utilities |

Import `style.css` in `src/main.js`:
```javascript
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
```

---

## Design System Reference (`src/style.css`)

The CSS file provides everything needed to match the current app's look and feel. Key tokens:

### Colors
```css
--color-surface-base: #F8F8F7       /* page background (off-white) */
--color-surface-elevated: #FFFFFF   /* card/input background */
--color-surface-hover: #EEEEED      /* segmented control bg, hover states */
--color-accent-primary: #1E96EB     /* blue — buttons, focus rings */
--color-accent-primary-hover: #1784D4
--color-text-primary: #191919       /* headings and labels */
--color-text-secondary: #B2B2B3     /* section titles, placeholders, hints */
--color-border: #EEEEED
--color-border-input: #E0E0E0       /* input borders */
```

### Shadows & Radius
```css
--shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)
--shadow-card-hover: 0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)
--radius-sm: 6px    /* inputs */
--radius-md: 8px    /* toggles, segmented control */
--radius-xl: 16px   /* cards */
--radius-full: 9999px  /* pill buttons */
```

### Typography
- Google Fonts: `Playfair Display` (headings h1/h2) + `Source Sans 3` (all other UI text)
- Base: 14px / 1.6 line-height
- Loaded via `@import url(...)` at the top of `style.css`

### Utility Classes Available
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-lg`
- `.btn-on-light` variants for buttons inside white cards
- `.card` (white surface with shadow + hover lift)
- `.input`, `.select`
- `.animate-spin` for loading spinners
- `.fade-enter-active` / `.slide-up-enter-active` for Vue transitions


---

## Form Schema

### Mobility Type — Segmented Control

Displayed at the top of the page, **outside** the form card sections. Controls conditional field visibility and the dynamic label on the `date` field.

| Value | Label |
|---|---|
| `start` | Inicio de Movilidad |
| `end` | Fin de Movilidad |
| `fixed-period` | Periodo Fijo |

### Section: Firmante (HRBP)

| Key | Type | Required | Options |
|---|---|---|---|
| `hrbp` | select | yes | `['Jesus Tejado', 'Marta Mengual']` |

### Section: Datos del Documento

| Key | Type | Required | Notes |
|---|---|---|---|
| `date` | date | yes | Label: "Fecha Inicio" when `start`/`fixed-period`, "Fecha Fin" when `end` |
| `endDate` | date | yes* | *Only shown and required when `mobilityType === 'fixed-period'` |
| `location` | text | yes | Placeholder: `Barcelona` |

### Section: Datos del Empleado

| Key | Type | Required | Notes |
|---|---|---|---|
| `fullName` | text | yes | Placeholder: `Juan García López` |
| `gpid` | text | yes | Placeholder: `12345678` |

### Section: Posiciones

| Key | Type | Required | Options |
|---|---|---|---|
| `temporaryPosition` | select | yes | See positions list below |
| `originalPosition` | select | yes | Same positions list |

**Position options (10 entries):**
```
Delivery Driver (Conductor)
Sales Delivery Driver (Repartidor Preventa)
Sales replenisher (Reponedor)
Auto Sale Seller (Vendedor Autoventa)
Pre Sale Seller (Vendedor Preventa)
Sales Promoter ADR (ADR)
Sales Technician DPV (DPV)
Pre-Sale Representative B (Rutas Especializadas de Bebidas)
Seller Replacement (Suplente)
Sales Asst Operation (Asistente Operaciones Ventas Monitor)
```

### Default Data Object

```javascript
{
  mobilityType: 'start',
  date: '',
  endDate: '',
  location: '',
  fullName: '',
  gpid: '',
  temporaryPosition: '',
  originalPosition: '',
  hrbp: ''
}
```

---

## `useMobilityForm.js` Composable

```javascript
// src/composables/useMobilityForm.js
import { reactive, computed } from 'vue'
import { parseCSVFile, buildFieldMapping } from '../services/csvService.js'
import { submitMobilityForm } from '../services/apiService.js'

const DEFAULT_DATA = {
  mobilityType: 'start',
  date: '',
  endDate: '',
  location: '',
  fullName: '',
  gpid: '',
  temporaryPosition: '',
  originalPosition: '',
  hrbp: ''
}

const TEST_DATA = {
  mobilityType: 'start',
  date: '2025-08-28',
  endDate: '2025-09-15',
  location: 'Barcelona',
  fullName: 'Juan García López',
  gpid: '12345678',
  temporaryPosition: 'Sales Delivery Driver (Repartidor Preventa)',
  originalPosition: 'Delivery Driver (Conductor)',
  hrbp: 'Jesus Tejado'
}

export function useMobilityForm() {
  const formData = reactive({ ...DEFAULT_DATA })
  const errors = reactive({})

  // Computed helpers
  const dateLabel = computed(() =>
    formData.mobilityType === 'end' ? 'Fecha Fin' : 'Fecha Inicio'
  )
  const showEndDate = computed(() =>
    formData.mobilityType === 'fixed-period'
  )

  function updateField(key, value) {
    formData[key] = value
    delete errors[key]
  }

  function fillTestData() {
    const currentType = formData.mobilityType
    Object.assign(formData, TEST_DATA)
    formData.mobilityType = currentType  // preserve user selection
  }

  function reset() {
    Object.assign(formData, DEFAULT_DATA)
    Object.keys(errors).forEach(k => delete errors[k])
  }

  function validate() {
    Object.keys(errors).forEach(k => delete errors[k])

    const required = ['date', 'location', 'fullName', 'gpid',
                      'temporaryPosition', 'originalPosition', 'hrbp']
    if (formData.mobilityType === 'fixed-period') required.push('endDate')

    for (const key of required) {
      if (!formData[key]?.toString().trim()) {
        errors[key] = 'Este campo es obligatorio'
      }
    }

    if (!errors.endDate && formData.mobilityType === 'fixed-period') {
      if (formData.endDate && formData.date && formData.endDate <= formData.date) {
        errors.endDate = 'La fecha fin debe ser posterior a la fecha inicio'
      }
    }

    return Object.keys(errors).length === 0
  }

  async function importFromCsv(file) {
    // Use csvService + CSV_FIELD_MAPPINGS constant (see below)
    // Returns { success, fieldsImported, warnings, errors }
  }

  async function submit() {
    if (!validate()) return { success: false }
    return submitMobilityForm({ ...formData })
  }

  return { formData, errors, dateLabel, showEndDate,
           updateField, fillTestData, reset, validate,
           importFromCsv, submit }
}
```

---

## CSV Import Feature

Copy `src/services/csvService.js` verbatim. The CSV field mappings (previously in `FunctionalMobilityStrategy.getCsvFieldMappings()`) should be defined as a constant in the composable or a separate `csvMappings.js` file:

### CSV Header Aliases → Field Keys

```javascript
export const CSV_FIELD_MAPPINGS = {
  // Date (Fecha Inicio)
  'fecha inicio': 'date',
  'fecha': 'date',
  'date': 'date',
  'fecha documento': 'date',

  // End Date
  'fecha fin': 'endDate',
  'fecha final': 'endDate',
  'end date': 'endDate',

  // Location
  'ubicacion': 'location',
  'ubicación': 'location',
  'delegacion': 'location',
  'delegación': 'location',

  // Full Name
  'nombre y apellidos': 'fullName',
  'nombre completo': 'fullName',
  'nombre': 'fullName',
  'full name': 'fullName',

  // GPID
  'gpid': 'gpid',
  'employee id': 'gpid',
  'id empleado': 'gpid',

  // Temporary Position
  'titulo y codigo del puesto': 'temporaryPosition',
  'titulo y código del puesto': 'temporaryPosition',
  'puesto temporal': 'temporaryPosition',
  'temporary position': 'temporaryPosition',
  'puesto': 'temporaryPosition',

  // Original Position
  'puesto original': 'originalPosition',
  'original position': 'originalPosition',

  // HRBP
  'hrbp': 'hrbp',
  'hr business partner': 'hrbp',

  // Mobility Type (values also mapped: inicio→start, fin→end, periodo fijo→fixed-period)
  'tipo de movilidad': 'mobilityType',
  'tipo movilidad': 'mobilityType',
  'mobility type': 'mobilityType'
}
```

`csvService.js` handles:
- BOM stripping and CRLF/LF/CR normalization
- Quoted fields with escaped `""`
- Accent-insensitive matching
- Date format normalization: `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY` → ISO `YYYY-MM-DD`
- Select field partial/case-insensitive matching
- Returns `{ success, fieldsImported, warnings }` with a feedback toast

---

## `apiService.js`

```javascript
// src/services/apiService.js

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function submitMobilityForm(formData) {
  const response = await fetch(`${API_URL}/mobility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  if (!response.ok) throw new Error(`Submission failed: ${response.status}`)
  return response.json()
}
```

Set `VITE_API_URL` in `.env.local` for local development.

---

## `FunctionalMobilityForm.vue` — Component Spec

### Template Structure

```
<div class="page-wrapper">
  <!-- Page title -->
  <h1>Movilidad Funcional</h1>
  <p>Fill out the form below...</p>

  <!-- Mobility type segmented control (outside card) -->
  <div class="segmented-control">
    <button v-for="type in MOBILITY_TYPES" ...>{{ type.label }}</button>
  </div>

  <!-- Form card -->
  <form class="card form-card" @submit.prevent="handleSubmit">

    <!-- Sections loop: signatory → document → employee → positions -->
    <div v-for="section in sections" class="form-section">
      <h2 class="section-title">{{ section.title }}</h2>
      <div class="fields-grid">
        <!-- text fields, date fields, select fields -->
      </div>
    </div>

    <!-- Action bar -->
    <div class="action-bar">
      <button type="button" class="btn btn-ghost" @click="fillTestData">Fill Test Data</button>
      <button type="button" class="btn btn-ghost" @click="triggerCsvImport">Import CSV</button>
      <input ref="csvInput" type="file" accept=".csv" hidden @change="handleCsvImport" />
      <button type="submit" class="btn btn-primary btn-lg">Enviar</button>
    </div>
  </form>

  <!-- Import feedback toast (fixed bottom-right, auto-dismiss 4s) -->
  <Transition name="slide-up">
    <div v-if="toast.visible" class="import-toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </Transition>
</div>
```

### Conditional Logic

- `endDate` field: `v-if="showEndDate"` (only for `fixed-period`)
- `date` field label: bound to `dateLabel` computed ("Fecha Inicio" / "Fecha Fin")
- Fields grid: 2-column at ≥768px; `endDate` + `location` span `grid-column: 1 / -1` as needed

### Input Styling (matches current app)

All inputs reuse the same styles from `DocumentForm.vue`:
- `.form-label` — 13px, weight 500, `var(--color-text-primary)`
- `.form-input` — 40px height, `var(--color-border-input)` border, 6px radius, `var(--color-surface-elevated)` bg
- `.form-input:focus` — `var(--color-accent-primary)` border + `rgba(30,150,235,0.1)` ring
- `.form-input.has-error` — `#dc2626` border + light red bg
- `.error-message` — 12px, `#dc2626`
- `.section-title` — 11px, uppercase, letter-spacing 0.05em, `var(--color-text-secondary)`, border-bottom
- `.select-wrapper` — relative container with `.select-arrow` SVG icon (pointer-events: none)
- `.segmented-control` — `var(--color-surface-hover)` bg, 4px padding/gap, `.segmented-button.is-active` gets white bg + shadow

---

## `App.vue` — Root Shell

```vue
<template>
  <div id="app">
    <FunctionalMobilityForm />
  </div>
</template>

<script setup>
import FunctionalMobilityForm from './components/FunctionalMobilityForm.vue'
</script>
```

---

## What is NOT Included

| Excluded | Reason |
|---|---|
| `src/documents/` folder | Document strategy/factory system — not needed |
| `pdfService.js` / Gotenberg | No PDF generation |
| `DocumentView.vue`, `HomeView.vue`, `DocumentCard.vue` | No dashboard or routing |
| `DocumentForm.vue` | Replaced by `FunctionalMobilityForm.vue` |
| `useDocument.js` | Replaced by `useMobilityForm.js` |
| Vue Router | Single page, no routing needed |
| Pinia | Composable handles all state |
| `signatures.js` | Not needed for form submission |
| Promotion document type | Not relevant to this project |
