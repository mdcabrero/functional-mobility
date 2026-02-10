/**
 * CSV parsing utilities with support for BOM stripping, quoted fields,
 * accent-insensitive matching, and date format normalization.
 */

export function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ── Core CSV Parser ───────────────────────────────────────────────

function parseCSVText(text) {
  // Strip BOM (common in Excel CSV exports)
  let cleaned = text.replace(/^\uFEFF/, '')

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const rows = []
  let current = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]

    if (inQuotes) {
      if (char === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',' || char === ';') {
        current.push(field.trim())
        field = ''
      } else if (char === '\n') {
        current.push(field.trim())
        if (current.some((f) => f !== '')) {
          rows.push(current)
        }
        current = []
        field = ''
      } else {
        field += char
      }
    }
  }

  // Handle last field/row
  current.push(field.trim())
  if (current.some((f) => f !== '')) {
    rows.push(current)
  }

  if (rows.length < 2) return []

  const headers = rows[0]
  return rows.slice(1).map((row) => {
    const obj = {}
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? ''
    })
    return obj
  })
}

export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rows = parseCSVText(e.target.result)
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file, 'UTF-8')
  })
}

// ── Field Mapping ─────────────────────────────────────────────────

export function buildFieldMapping(headers, fieldMappings) {
  const mapping = {}
  for (const header of headers) {
    const normalizedHeader = removeAccents(header.toLowerCase().trim())
    for (const [alias, fieldKey] of Object.entries(fieldMappings)) {
      if (removeAccents(alias.toLowerCase()) === normalizedHeader) {
        mapping[header] = fieldKey
        break
      }
    }
  }
  return mapping
}

// ── Date Normalization ────────────────────────────────────────────

export function normalizeDate(dateStr) {
  if (!dateStr) return ''

  // Match DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const match = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

  return dateStr
}

// ── Select Option Matching ────────────────────────────────────────

export function matchSelectOption(value, options) {
  if (!value) return ''
  const normalizedValue = removeAccents(value.toLowerCase().trim())

  // Exact match first
  for (const option of options) {
    if (removeAccents(option.toLowerCase()) === normalizedValue) return option
  }

  // Partial match (value in option or option in value)
  for (const option of options) {
    const normalizedOption = removeAccents(option.toLowerCase())
    if (normalizedOption.includes(normalizedValue) || normalizedValue.includes(normalizedOption)) {
      return option
    }
  }

  return ''
}
