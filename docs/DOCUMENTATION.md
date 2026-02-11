# Functional Mobility Form - Documentation

> Vue 3 form application for registering employee functional mobility records. Connects to the SmartTable FastAPI backend deployed on Railway.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [How the Form Works](#how-the-form-works)
5. [Backend Connection](#backend-connection)
6. [Field Mapping: Form to API](#field-mapping-form-to-api)
7. [POST Request Lifecycle](#post-request-lifecycle)
8. [Environment Configuration](#environment-configuration)
9. [CORS Setup](#cors-setup)
10. [CSV Import Feature](#csv-import-feature)
11. [Running Locally](#running-locally)
12. [Deploying to GitHub Pages](#deploying-to-github-pages)

---

## Overview

This is a single-page Vue 3 application that provides an HR form for registering employee functional mobility (temporary position changes). When submitted, the form data is sent as a POST request to the SmartTable backend API, which stores the employee record in a PostgreSQL database hosted on Railway.

### Key capabilities

- Fill out employee mobility data manually through a structured form
- Import form data from a CSV file (with fuzzy matching and date normalization)
- Submit to the backend API with client-side validation and server error feedback
- Pre-fill test data for demo purposes

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue | 3.5 | UI framework (Composition API + `<script setup>`) |
| Pinia | 3.0 | State management (single store for form state, validation, actions) |
| Vite | 7.3 | Build tool and dev server |
| Native Fetch API | — | HTTP requests (no external HTTP library) |
| CSS Custom Properties | — | Design system and theming |

No router — all form state lives in a single Pinia store.

---

## Project Structure

```
functional-mobility/
├── src/
│   ├── main.js                          # App entry point
│   ├── App.vue                          # Root component (renders the form)
│   ├── components/
│   │   ├── FunctionalMobilityForm.vue   # Main form UI, submission handling, toast feedback
│   │   └── DateInput.vue                # Reusable date picker (v-model compatible)
│   ├── stores/
│   │   └── mobilityForm.js             # Pinia store — form state, validation, constants, CSV import logic
│   ├── services/
│   │   ├── apiService.js                # HTTP client — sends POST to backend
│   │   └── csvService.js                # CSV parsing and field matching utilities
│   └── styles/
│       └── styles.css                   # Global design system (colors, typography, components)
├── .env.development                     # API URL for local dev (http://localhost:8000)
├── .env.production                      # API URL for production (Railway)
├── vite.config.js                       # Vite config (base path for GitHub Pages)
└── package.json
```

---

## How the Form Works

### Form sections

The form is divided into 4 sections:

| Section | Fields | Notes |
|---------|--------|-------|
| **Signatory (HRBP)** | `hrbp` (select) | HR Business Partner who signs the document |
| **Datos del Documento** | `startDate`, `endDate`, `location` | `startDate` shown for start/fixed-period; `endDate` shown for end/fixed-period |
| **Datos del Empleado** | `fullName`, `gpid` | Employee name and ID |
| **Posiciones** | `temporaryPosition`, `originalPosition` | Both are select dropdowns with 10 predefined position options |

### Mobility type selector

A segmented control at the top determines the type of mobility letter:

| Value | Label | Effect on form |
|-------|-------|----------------|
| `start` | Inicio de Movilidad | Shows `startDate` ("Fecha Inicio") only |
| `end` | Fin de Movilidad | Shows `endDate` ("Fecha Fin") only |
| `fixed-period` | Periodo Fijo | Shows both `startDate` ("Fecha Inicio") and `endDate` ("Fecha Fin") |

Switching between mobility types resets all date fields to prevent stale values from leaking into the wrong payload.

### Validation rules

All validation runs client-side before any API call is made:

- **Always required:** `location`, `fullName`, `gpid`, `temporaryPosition`, `originalPosition`, `hrbp`
- **Type-dependent dates:**
  - `start` → `startDate` required
  - `end` → `endDate` required
  - `fixed-period` → both `startDate` and `endDate` required
- **Cross-field:** For `fixed-period`, `endDate` must be after `startDate`
- **Error messages** are displayed inline below each field in Spanish

### Form data shape (internal)

```js
{
  mobilityType: 'start',       // 'start' | 'end' | 'fixed-period'
  startDate: '2026-02-10',    // ISO date string (YYYY-MM-DD), for start/fixed-period
  endDate: '',                 // ISO date string, for end/fixed-period
  location: 'Barcelona',
  fullName: 'Juan García',
  gpid: '12345678',
  temporaryPosition: 'Delivery Driver (Conductor)',
  originalPosition: 'Sales Delivery Driver (Repartidor Preventa)',
  hrbp: 'Jesus Tejado'
}
```

---

## Backend Connection

The form connects to the **SmartTable** FastAPI backend, which provides a REST API for employee management.

| Detail | Value |
|--------|-------|
| **Backend repo** | SmartTable |
| **Hosting** | Railway |
| **Production URL** | `https://smarttable-production.up.railway.app` |
| **Endpoint used** | `POST /employees` |
| **Database** | PostgreSQL 18 (hosted on Railway) |

The connection is configured through the `VITE_API_URL` environment variable, which Vite injects at build time.

---

## Field Mapping: Form to API

The form uses camelCase field names internally, but the backend expects snake_case. The `toEmployeePayload()` function in `src/services/apiService.js` handles this transformation before every request.

| Form Field (camelCase) | API Field (snake_case) | Type | Required | Notes |
|------------------------|------------------------|------|----------|-------|
| `gpid` | `gpid` | string | Yes | Employee ID — must be unique in the database |
| `fullName` | `full_name` | string | Yes | |
| `mobilityType` | `mobility_type` | string | No | `'start'`, `'end'`, or `'fixed-period'` |
| `originalPosition` | `original_position` | string | No | Current job title |
| `temporaryPosition` | `temporary_position` | string | No | New temporary job title |
| `location` | `location` | string | No | Office / delegation |
| `startDate` | `start_date` | date | No | Mobility start date (start and fixed-period types) |
| `endDate` | `end_date` | date | No | Mobility end date (end and fixed-period types) |
| `hrbp` | `hrbp` | string | No | HR Business Partner name |
| *(not in form)* | `cost_center` | string | No | Not collected by this form; stored as `null` |

### Empty string handling

The backend uses Pydantic with `date | None` and `str | None` types. Sending an empty string `""` for a date field would cause a `422 Validation Error`. To avoid this, the payload mapper converts all empty strings to `null`:

```js
start_date: formData.startDate || null,   // "" becomes null
end_date: formData.endDate || null,       // "" becomes null
```

---

## POST Request Lifecycle

Here is the complete flow from the moment the user clicks "Enviar" (Submit) to the response being displayed:

```
User clicks "Enviar"
       │
       ▼
┌─────────────────────────────────────────┐
│  FunctionalMobilityForm.vue             │
│  handleSubmit()                         │
│  - Guards against double-submit         │
│  - Sets isSubmitting = true             │
│  - Calls submit() from Pinia store      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  mobilityForm.js (Pinia store)          │
│  submit()                               │
│  - Runs validate() on all fields        │
│  - If invalid → returns { success: false }
│  - If valid → calls submitMobilityForm()│
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  apiService.js                          │
│  submitMobilityForm(formData)           │
│  - Calls toEmployeePayload(formData)    │
│    to convert camelCase → snake_case    │
│  - Sends POST /employees to API_URL     │
│  - On success (201) → returns JSON      │
│  - On error → parses response body,     │
│    throws Error with detail message     │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  FastAPI Backend (Railway)              │
│  POST /employees                        │
│  - Validates with Pydantic              │
│  - Checks GPID uniqueness              │
│  - Inserts into PostgreSQL              │
│  - Returns 201 + created employee JSON  │
│  - Or 400 + {"detail": "GPID already   │
│    exists"}                             │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Back in FunctionalMobilityForm.vue     │
│  handleSubmit() catch/finally           │
│  - Success → green toast:              │
│    "Formulario enviado correctamente"   │
│  - Error → red toast:                  │
│    "Error: GPID already exists"         │
│  - Sets isSubmitting = false            │
└─────────────────────────────────────────┘
```

### Example request

```http
POST https://smarttable-production.up.railway.app/employees
Content-Type: application/json

{
  "gpid": "12345678",
  "full_name": "Juan García López",
  "mobility_type": "start",
  "original_position": "Delivery Driver (Conductor)",
  "temporary_position": "Sales Delivery Driver (Repartidor Preventa)",
  "location": "Barcelona",
  "start_date": "2026-02-10",
  "end_date": null,
  "hrbp": "Jesus Tejado"
}
```

### Example success response (201)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "gpid": "12345678",
  "full_name": "Juan García López",
  "mobility_type": "start",
  "original_position": "Delivery Driver (Conductor)",
  "temporary_position": "Sales Delivery Driver (Repartidor Preventa)",
  "location": "Barcelona",
  "cost_center": null,
  "start_date": "2026-02-10",
  "end_date": null,
  "hrbp": "Jesus Tejado"
}
```

### Example error response (400)

```json
{
  "detail": "GPID already exists"
}
```

This `detail` message is extracted by `apiService.js` and displayed directly in the error toast.

---

## Environment Configuration

Vite loads environment files automatically based on the current mode:

| File | Loaded when | Contains |
|------|------------|----------|
| `.env.development` | `npm run dev` | `VITE_API_URL=http://localhost:8000` |
| `.env.production` | `npm run build` | `VITE_API_URL=https://smarttable-production.up.railway.app` |

The variable is accessed at build time via `import.meta.env.VITE_API_URL` in `apiService.js`. Vite replaces this with the actual string during the build process, so the production bundle contains the hardcoded Railway URL.

### Important

- Only variables prefixed with `VITE_` are exposed to client code
- These files contain no secrets — the Railway URL is a public API endpoint
- For local secrets, use `.env.development.local` (gitignored by default via `*.local` pattern)

---

## CORS Setup

Since the frontend (GitHub Pages) and backend (Railway) are on different domains, the browser enforces CORS (Cross-Origin Resource Sharing). The backend must explicitly allow the frontend's origin.

### How it works

1. The browser sends a **preflight OPTIONS request** before the actual POST
2. The backend responds with `Access-Control-Allow-Origin` headers
3. If the frontend's origin is in the allowed list, the browser proceeds with the POST

### Configuration

CORS is configured on the backend via the `CORS_ORIGINS` environment variable in Railway:

```
CORS_ORIGINS=http://localhost:5173,https://<your-github-username>.github.io
```

**Why only the host, not the full path?** CORS matching uses the **origin** (scheme + host + port), never the path. Even though the app is served at `https://username.github.io/functional-mobility/`, the browser sends:

```
Origin: https://username.github.io
```

The `/functional-mobility/` path is not part of the origin.

---

## CSV Import Feature

The form supports importing data from a CSV file, useful for batch processing or when data comes from a spreadsheet.

### How it works

1. User clicks "Import CSV" and selects a `.csv` file
2. `csvService.js` parses the file with support for:
   - BOM stripping (common in Excel exports)
   - Quoted fields with escaped `""`
   - Both `,` and `;` delimiters
3. Headers are matched to form fields using accent-insensitive fuzzy matching
4. Dates are normalized from `DD/MM/YYYY` (common in Spanish locale) to `YYYY-MM-DD` (ISO)
5. Position and HRBP values are fuzzy-matched against the predefined option lists
6. A toast shows how many fields were imported and any warnings

### Supported CSV headers

The system recognizes multiple aliases per field (Spanish and English, with/without accents):

| Form Field | Recognized CSV Headers |
|------------|----------------------|
| `startDate` | fecha inicio, fecha, date, fecha documento |
| `endDate` | fecha fin, fecha final, end date |
| `location` | ubicacion, ubicación, delegacion, delegación |
| `fullName` | nombre y apellidos, nombre completo, nombre, full name |
| `gpid` | gpid, employee id, id empleado |
| `temporaryPosition` | titulo y codigo del puesto, puesto temporal, temporary position, puesto |
| `originalPosition` | puesto original, original position |
| `hrbp` | hrbp, hr business partner |
| `mobilityType` | tipo de movilidad, tipo movilidad, mobility type |

---

## Running Locally

### Prerequisites

- Node.js 20.19+ or 22.12+
- The SmartTable backend running at `http://localhost:8000` (with Docker Compose)

### Steps

```bash
# 1. Start the backend (from the SmartTable directory)
docker compose up -d
uvicorn main:app --reload

# 2. Start the frontend (from this directory)
npm install
npm run dev
```

The form will be available at `http://localhost:5173/functional-mobility/`.

Submitting the form will POST to `http://localhost:8000/employees` (configured in `.env.development`). You can verify the employee was created at `http://localhost:8000/docs` (Swagger UI) or via `GET http://localhost:8000/employees`.

---

## Deploying to GitHub Pages

### Build

```bash
npm run build
```

This produces a `dist/` folder with the production bundle. The `VITE_API_URL` from `.env.production` is baked into the JavaScript at build time.

### GitHub Pages configuration

- The `base` path in `vite.config.js` is set to `/functional-mobility/` to match the GitHub Pages subpath (`https://username.github.io/functional-mobility/`)
- If deploying with GitHub Actions, the `dist/` folder is the artifact to publish

### Post-deployment checklist

1. Verify the `CORS_ORIGINS` env var on Railway includes your GitHub Pages origin
2. Open the deployed form and submit a test entry
3. Check the backend at `https://smarttable-production.up.railway.app/employees` to confirm the record was created
