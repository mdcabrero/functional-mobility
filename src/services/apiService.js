const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function submitMobilityForm(formData) {
  const response = await fetch(`${API_URL}/mobility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })
  if (!response.ok) throw new Error(`Submission failed: ${response.status}`)
  return response.json()
}
