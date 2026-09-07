const apiUrl = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/+$/, '')

export async function sendRequest(path: string, options?: RequestInit): Promise<Response> {
  let response: Response

  try {
    response = await fetch(`${apiUrl}${path}`, options)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
      throw error
    }
    throw new Error('Unable to reach the API. Check that the backend is running and try again.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = Array.isArray(body?.message)
      ? body.message.join(' ')
      : body?.message

    throw new Error(
      typeof message === 'string' && message
        ? message
        : `Request failed (${response.status}). Please try again.`,
    )
  }

  return response
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await sendRequest(path, options)
  return response.json() as Promise<T>
}
