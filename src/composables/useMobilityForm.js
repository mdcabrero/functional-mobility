import { reactive, computed } from 'vue'
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
  date: '',
  endDate: '',
  location: '',
  fullName: '',
  gpid: '',
  temporaryPosition: '',
  originalPosition: '',
  hrbp: '',
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
  hrbp: 'Jesus Tejado',
}

export const CSV_FIELD_MAPPINGS = {
  // Date
  'fecha inicio': 'date',
  fecha: 'date',
  date: 'date',
  'fecha documento': 'date',

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

// ── Composable ────────────────────────────────────────────────────

export function useMobilityForm() {
  const formData = reactive({ ...DEFAULT_DATA })
  const errors = reactive({})

  const dateLabel = computed(() =>
    formData.mobilityType === 'end' ? 'Fecha Fin' : 'Fecha Inicio',
  )

  const showEndDate = computed(() => formData.mobilityType === 'fixed-period')

  function updateField(key, value) {
    formData[key] = value
    delete errors[key]
  }

  function fillTestData() {
    const currentType = formData.mobilityType
    Object.assign(formData, TEST_DATA)
    formData.mobilityType = currentType
  }

  function reset() {
    Object.assign(formData, DEFAULT_DATA)
    Object.keys(errors).forEach((k) => delete errors[k])
  }

  function validate() {
    Object.keys(errors).forEach((k) => delete errors[k])

    const required = ['date', 'location', 'fullName', 'gpid', 'temporaryPosition', 'originalPosition', 'hrbp']
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

        if (fieldKey === 'date' || fieldKey === 'endDate') {
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

        formData[fieldKey] = processedValue
        delete errors[fieldKey]
        fieldsImported++
      }

      return { success: true, fieldsImported, warnings }
    } catch (err) {
      return { success: false, fieldsImported: 0, warnings: [err.message] }
    }
  }

  async function submit() {
    if (!validate()) return { success: false }
    return submitMobilityForm({ ...formData })
  }

  return {
    formData,
    errors,
    dateLabel,
    showEndDate,
    updateField,
    fillTestData,
    reset,
    validate,
    importFromCsv,
    submit,
  }
}
