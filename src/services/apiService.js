const API_URL = import.meta.env.VITE_API_URL

function toEmployeePayload(formData) {
  return {
    gpid: formData.gpid,
    full_name: formData.fullName,
    mobility_type: formData.mobilityType || null,
    original_position: formData.originalPosition || null,
    temporary_position: formData.temporaryPosition || null,
    location: formData.location || null,
    start_date: formData.startDate || null,
    end_date: formData.endDate || null,
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
