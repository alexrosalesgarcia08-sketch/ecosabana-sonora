// src/app/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, register, getRol } from '@/lib/supabase'
import '@/styles/pvem.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [nombre, setNombre] = useState('')
  const [modo, setModo]   = useState<'login'|'registro'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !pass) { setError('Ingresa usuario y contraseña'); return }
    setLoading(true)
    const { error: err } = await login(email, pass)
    if (err) { setError('Usuario o contraseña incorrectos'); setLoading(false); return }
    const rol = await getRol()
    router.push(rol === 'admin' ? '/admin' : '/usuario')
  }

  async function handleRegister() {
    if (!email || !pass || !nombre) { setError('Todos los campos son requeridos'); return }
    setLoading(true)
    const { error: err } = await register(email, pass, nombre)
    if (err) { setError(err.message); setLoading(false); return }
    setError('')
    alert('Cuenta creada. Ya puedes iniciar sesión.')
    setModo('login')
    setLoading(false)
  }

  return (
    // Pegar aquí el HTML de tu login-card del HTML actual
    // Cambiar onclick="doLogin()" por onClick={handleLogin}
    // Cambiar onclick="toggleRegister()" por onClick={()=>setModo(...)}
    // Los inputs: <input value={email} onChange={e=>setEmail(e.target.value)} />
    <div className="login-screen">
      <div className="login-card card-animate">
        <div className="card-top">
          <img src="/mascota.png" className="mascot-float" alt="Mascota PVEM" />
        </div>
        <div className="login-form">
          <input className="login-input" value={email}
            onChange={e=>setEmail(e.target.value)} placeholder="USUARIO / EMAIL" />
          <input className="login-input" type="password" value={pass}
            onChange={e=>setPass(e.target.value)} placeholder="CONTRASEÑA" />
          {error && <p className="login-error">{error}</p>}
          <button className="btn-ingresar" onClick={handleLogin} disabled={loading}>
            {loading ? 'Entrando...' : 'INGRESAR'}
          </button>
          <button className="btn-registrar" onClick={()=>setModo(m=>m==='login'?'registro':'login')}>
            {modo==='registro' ? '✕ CANCELAR' : '✦ CREAR CUENTA'}
          </button>
        </div>
      </div>
    </div>
  )
}
