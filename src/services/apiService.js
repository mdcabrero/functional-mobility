const API_URL = import.meta.env.VITE_API_URL

function toEmployeePayload(formData) {
  const { mobilityType } = formData

  let start_date = null
  let end_date = null

  if (mobilityType === 'start') {
    start_date = formData.startDate || null
  } else if (mobilityType === 'end') {
    end_date = formData.endDate || null
  } else if (mobilityType === 'fixed-period') {
    start_date = formData.startDate || null
    end_date = formData.endDate || null
  }

  return {
    gpid: formData.gpid,
    full_name: formData.fullName,
    mobility_type: mobilityType || null,
    original_position: formData.originalPosition || null,
    temporary_position: formData.temporaryPosition || null,
    location: formData.location || null,
    start_date,
    end_date,
    hrbp: formData.hrbp || null,
  }
}

export async function submitMobilityForm(formData) {
  const response = await fetch(`${API_URL}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toEmployeePayload(formData)),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = body?.detail || `Error del servidor (${response.status})`
    throw new Error(message)
  }

  return response.json()
}
