// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── PERSONAS ──────────────────────────────────────────
export async function getPersonas() {
  const { data, error } = await supabase
    .from('personas')
    .select(`*, ecoperadores(*, rcs_eco(*, observadores_rc(*)))`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function savePersona(persona: any) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('personas')
    .upsert({ ...persona, creado_por: user?.id })
    .select()
  if (error) throw error
  return data
}

export async function deletePersona(id: string) {
  const { error } = await supabase.from('personas').delete().eq('id', id)
  if (error) throw error
}

// ── PAGOS ─────────────────────────────────────────────
export async function registrarPago(
  personaId: string, tipo: string, monto: number
) {
  const cat = getCatorcena()
  const { error } = await supabase.from('pagos').insert({
    persona_id: personaId,
    tipo,
    monto,
    catorcena: cat,
    anio: new Date().getFullYear()
  })
  if (error) throw error
}

export async function getPagos() {
  const { data, error } = await supabase.from('pagos').select('*')
  if (error) throw error
  return data ?? []
}

// ── AUTH ──────────────────────────────────────────────
export async function login(email: string, pass: string) {
  return supabase.auth.signInWithPassword({ email, password: pass })
}

export async function register(email: string, pass: string, nombre: string) {
  return supabase.auth.signUp({
    email, password: pass,
    options: { data: { nombre } }
  })
}

export async function logout() {
  return supabase.auth.signOut()
}

export async function getRol(): Promise<'admin'|'usuario'> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'usuario'
  const { data } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()
  return (data?.rol ?? 'usuario') as 'admin'|'usuario'
}

function getCatorcena() {
  const d = new Date()
  return Math.ceil(d.getDate() / 14) + d.getMonth() * 2
}
