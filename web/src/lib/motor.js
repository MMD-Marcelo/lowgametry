// Único ponto de contato com o motor local (127.0.0.1). Nenhum fetch ao motor
// deve existir fora daqui.
export const BASE_MOTOR = 'http://127.0.0.1:8757'

export async function pingMotor(base = BASE_MOTOR) {
  try {
    const r = await fetch(`${base}/health`, { method: 'GET' })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

// fotos: lista de { nome, blob } vinda de lib/fotos.paraEnvio. O nome prefixado
// (NNN_) precisa ir no campo do FormData: o COLMAP ordena as imagens por nome.
export async function criarJob(fotos, config, base = BASE_MOTOR) {
  const fd = new FormData()
  for (const f of fotos) fd.append('foto', f.blob, f.nome)
  fd.append('config', JSON.stringify(config))
  const r = await fetch(`${base}/jobs`, { method: 'POST', body: fd })
  if (!r.ok) {
    const err = new Error(`motor respondeu ${r.status}`)
    err.status = r.status
    throw err
  }
  return await r.json()
}

export async function statusJob(id, base = BASE_MOTOR) {
  const r = await fetch(`${base}/jobs/${id}`, { method: 'GET' })
  if (!r.ok) {
    const err = new Error(`status ${r.status}`)
    err.status = r.status
    throw err
  }
  return await r.json()
}

export function urlResultado(id, fmt, base = BASE_MOTOR) {
  return `${base}/jobs/${id}/result.${fmt}`
}

export async function apagarJob(id, base = BASE_MOTOR) {
  await fetch(`${base}/jobs/${id}`, { method: 'DELETE' })
}
