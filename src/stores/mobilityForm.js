import { defineStore } from 'pinia'
import {
  parseCSVFile,
  buildFieldMapping,
  normalizeDate,
  matchSelectOption,
  removeAccents,
} from '../services/csvService.js'
import { submitMobilityForm } from '../services/apiService.js'

// ── Static Constants ──────────────────────────────────────────────

export const MOBILITY_TYPES = [
  { value: 'start', label: 'Inicio de Movilidad' },
  { value: 'end', label: 'Fin de Movilidad' },
  { value: 'fixed-period', label: 'Periodo Fijo' },
]

export const HRBP_OPTIONS = ['Jesus Tejado', 'Marta Mengual']

export const POSITION_OPTIONS = [
  'Delivery Driver (Conductor)',
  'Sales Delivery Driver (Repartidor Preventa)',
  'Sales replenisher (Reponedor)',
  'Auto Sale Seller (Vendedor Autoventa)',
  'Pre Sale Seller (Vendedor Preventa)',
  'Sales Promoter ADR (ADR)',
  'Sales Technician DPV (DPV)',
  'Pre-Sale Representative B (Rutas Especializadas de Bebidas)',
  'Seller Replacement (Suplente)',
  'Sales Asst Operation (Asistente Operaciones Ventas Monitor)',
]

const DEFAULT_DATA = {
  mobilityType: 'start',
  startDate: '',
  endDate: '',
  location: '',
  fullName: '',
  gpid: '',
  temporaryPosition: '',
  originalPosition: '',
  hrbp: '',
}

const TEST_DATA = {
  start: {
    startDate: '2025-08-28',
    endDate: '',
    location: 'Barcelona',
    fullName: 'Juan García López',
    gpid: '12345678',
    temporaryPosition: 'Sales Delivery Driver (Repartidor Preventa)',
    originalPosition: 'Delivery Driver (Conductor)',
    hrbp: 'Jesus Tejado',
  },
  end: {
    startDate: '',
    endDate: '2025-09-15',
    location: 'Madrid',
    fullName: 'María Rodríguez Pérez',
    gpid: '87654321',
    temporaryPosition: 'Pre Sale Seller (Vendedor Preventa)',
    originalPosition: 'Auto Sale Seller (Vendedor Autoventa)',
    hrbp: 'Marta Mengual',
  },
  'fixed-period': {
    startDate: '2025-08-28',
    endDate: '2025-09-15',
    location: 'Valencia',
    fullName: 'Carlos Fernández Ruiz',
    gpid: '11223344',
    temporaryPosition: 'Sales Promoter ADR (ADR)',
    originalPosition: 'Delivery Driver (Conductor)',
    hrbp: 'Jesus Tejado',
  },
}

export const CSV_FIELD_MAPPINGS = {
  // Start Date
  'fecha inicio': 'startDate',
  fecha: 'startDate',
  date: 'startDate',
  'fecha documento': 'startDate',

  // End Date
  'fecha fin': 'endDate',
  'fecha final': 'endDate',
  'end date': 'endDate',

  // Location
  ubicacion: 'location',
  ubicación: 'location',
  delegacion: 'location',
  delegación: 'location',

  // Full Name
  'nombre y apellidos': 'fullName',
  'nombre completo': 'fullName',
  nombre: 'fullName',
  'full name': 'fullName',

  // GPID
  gpid: 'gpid',
  'employee id': 'gpid',
  'id empleado': 'gpid',

  // Temporary Position
  'titulo y codigo del puesto': 'temporaryPosition',
  'titulo y código del puesto': 'temporaryPosition',
  'puesto temporal': 'temporaryPosition',
  'temporary position': 'temporaryPosition',
  puesto: 'temporaryPosition',

  // Original Position
  'puesto original': 'originalPosition',
  'original position': 'originalPosition',

  // HRBP
  hrbp: 'hrbp',
  'hr business partner': 'hrbp',

  // Mobility Type
  'tipo de movilidad': 'mobilityType',
  'tipo movilidad': 'mobilityType',
  'mobility type': 'mobilityType',
}

const MOBILITY_TYPE_VALUES = {
  inicio: 'start',
  fin: 'end',
  'periodo fijo': 'fixed-period',
  start: 'start',
  end: 'end',
  'fixed-period': 'fixed-period',
}

// ── Store ─────────────────────────────────────────────────────────

export const useMobilityFormStore = defineStore('mobilityForm', {
  state: () => ({
    formData: { ...DEFAULT_DATA },
    errors: {},
  }),

  getters: {
    showStartDate: (state) => state.formData.mobilityType !== 'end',
    showEndDate: (state) => ['end', 'fixed-period'].includes(state.formData.mobilityType),
  },

  actions: {
    updateField(key, value) {
      this.formData[key] = value
      delete this.errors[key]
    },

    setMobilityType(type) {
      this.formData.mobilityType = type
      this.formData.startDate = ''
      this.formData.endDate = ''
      delete this.errors.startDate
      delete this.errors.endDate
    },

    fillTestData() {
      const testData = TEST_DATA[this.formData.mobilityType]
      if (testData) {
        Object.assign(this.formData, testData)
      }
      Object.keys(this.errors).forEach((k) => delete this.errors[k])
    },

    reset() {
      Object.assign(this.formData, DEFAULT_DATA)
      Object.keys(this.errors).forEach((k) => delete this.errors[k])
    },

    validate() {
      Object.keys(this.errors).forEach((k) => delete this.errors[k])

      const required = ['location', 'fullName', 'gpid', 'temporaryPosition', 'originalPosition', 'hrbp']

      if (this.formData.mobilityType === 'start') {
        required.push('startDate')
      } else if (this.formData.mobilityType === 'end') {
        required.push('endDate')
      } else if (this.formData.mobilityType === 'fixed-period') {
        required.push('startDate', 'endDate')
      }

      for (const key of required) {
        if (!this.formData[key]?.toString().trim()) {
          this.errors[key] = 'Este campo es obligatorio'
        }
      }

      if (
        !this.errors.endDate &&
        this.formData.mobilityType === 'fixed-period' &&
        this.formData.endDate &&
        this.formData.startDate &&
        this.formData.endDate <= this.formData.startDate
      ) {
        this.errors.endDate = 'La fecha fin debe ser posterior a la fecha inicio'
      }

      return Object.keys(this.errors).length === 0
    },

    async importFromCsv(file) {
      const warnings = []
      try {
        const rows = await parseCSVFile(file)
        if (!rows || rows.length === 0) {
          return { success: false, fieldsImported: 0, warnings: ['No se encontraron datos en el CSV'] }
        }

        const row = rows[0]
        const headers = Object.keys(row)
        const mapping = buildFieldMapping(headers, CSV_FIELD_MAPPINGS)

        let fieldsImported = 0

        for (const [csvHeader, fieldKey] of Object.entries(mapping)) {
          const rawValue = row[csvHeader]
          if (!rawValue) continue

          let processedValue = rawValue

          if (fieldKey === 'startDate' || fieldKey === 'endDate') {
            processedValue = normalizeDate(rawValue)
            if (!processedValue) {
              warnings.push(`No se pudo parsear la fecha: "${rawValue}"`)
              continue
            }
          }

          if (fieldKey === 'temporaryPosition' || fieldKey === 'originalPosition') {
            processedValue = matchSelectOption(rawValue, POSITION_OPTIONS)
            if (!processedValue) {
              warnings.push(`Sin coincidencia para puesto: "${rawValue}"`)
              continue
            }
          }

          if (fieldKey === 'hrbp') {
            processedValue = matchSelectOption(rawValue, HRBP_OPTIONS)
            if (!processedValue) {
              warnings.push(`Sin coincidencia para HRBP: "${rawValue}"`)
              continue
            }
          }

          if (fieldKey === 'mobilityType') {
            const normalized = removeAccents(rawValue.toLowerCase().trim())
            processedValue = MOBILITY_TYPE_VALUES[normalized] || rawValue
          }

          this.formData[fieldKey] = processedValue
          delete this.errors[fieldKey]
          fieldsImported++
        }

        return { success: true, fieldsImported, warnings }
      } catch (err) {
        return { success: false, fieldsImported: 0, warnings: [err.message] }
      }
    },

    async submit() {
      if (!this.validate()) return { success: false }
      return submitMobilityForm({ ...this.formData })
    },
  },
})
