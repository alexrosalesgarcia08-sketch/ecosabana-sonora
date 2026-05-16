'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MASCOT_SRC } from '@/lib/constants'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
export default function LoginPage() {
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [exito, setExito] = useState('')
  const [showPass, setShowPass] = useState(false)
 
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setChecking(false); return }
      const { data: u } = await supabase.from('usuarios').select('rol').eq('id', data.user.id).single()
      window.location.href = u?.rol === 'admin' ? '/admin' : '/usuario'
    })
  }, [])
 
  async function handleLogin() {
    if (!email || !pass) { setError('Ingresa correo y contraseña'); return }
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (err) { setError('Usuario o contraseña incorrectos'); setLoading(false); return }
    const { data: u } = await supabase.from('usuarios').select('rol').eq('id', data.user.id).single()
    window.location.href = u?.rol === 'admin' ? '/admin' : '/usuario'
  }
 
  async function handleRegister() {
    if (!nombre || !apellido || !email || !pass) { setError('Todos los campos son requeridos'); return }
    if (pass.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { nombre: nombre + ' ' + apellido } }
    })
    if (err) { setError(err.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('usuarios').insert({ id: data.user.id, nombre: nombre + ' ' + apellido, rol: 'usuario' })
    }
    setExito('¡Cuenta creada! Ya puedes iniciar sesión.')
    setLoading(false); setModo('login')
    setNombre(''); setApellido(''); setEmail(''); setPass('')
  }
 
  if (checking) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#3d5a09' }}>
      <p style={{ color:'#C8DF8E', fontWeight:700 }}>Cargando...</p>
    </div>
  )
 
  return (
    <div id="authScreen">
      <div className="login-card">
 
        {/* Top green band con mascota */}
        <div className="card-top">
          <div className="brand-row">
            <div className="brand-logo">V</div>
            <div className="brand-text">
              <h1>ECOSABANA<br/><span>Sonora 2027</span></h1>
              <p>Sistema de gestión de estructura PVEM</p>
            </div>
          </div>
          <img className="mascot-float" src={MASCOT_SRC} alt="Mascota PVEM" />
        </div>
 
        {/* Card body */}
        <div className="card-body">
          {modo === 'login' ? (
            <>
              <div className="section-title">Iniciar Sesión</div>
              <div className="section-sub">Ingresa tus credenciales para continuar</div>
 
              {exito && <div className="msg-ok show">{exito}</div>}
 
              <div className="field">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="USUARIO / EMAIL" type="email"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
 
              <div className="field">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="CONTRASEÑA" type={showPass ? 'text' : 'password'}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button className="eye-btn" type="button" onClick={() => setShowPass(!showPass)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
 
              {error && <p className="msg-err show">{error}</p>}
 
              <button className="btn-ingresar" onClick={handleLogin} disabled={loading}>
                {loading ? 'Entrando...' : 'INGRESAR'}
              </button>
 
              <div className="secure-row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Acceso seguro
              </div>
 
              <div className="divider">
                <div className="divider-line"/>
                <span className="divider-text">¿No tienes cuenta?</span>
                <div className="divider-line"/>
              </div>
 
              <div className="register-wrap">
                <p className="register-label">Solicita acceso al sistema</p>
                <button className="btn-registrar" onClick={() => { setModo('registro'); setError('') }}>
                  ✦ CREAR CUENTA
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="reg-title">Crear Cuenta</div>
              <div className="reg-sub">Completa tus datos para solicitar acceso</div>
 
              <div className="reg-grid">
                <div>
                  <label className="reg-label">Nombre(s) *</label>
                  <input className="reg-input" type="text" placeholder="Nombre(s)"
                    value={nombre} onChange={e => setNombre(e.target.value)} />
                </div>
                <div>
                  <label className="reg-label">Apellidos *</label>
                  <input className="reg-input" type="text" placeholder="Apellido(s)"
                    value={apellido} onChange={e => setApellido(e.target.value)} />
                </div>
                <div className="full">
                  <label className="reg-label">Correo electrónico *</label>
                  <input className="reg-input" type="email" placeholder="correo@ejemplo.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="full">
                  <label className="reg-label">Contraseña * (mín. 6)</label>
                  <input className="reg-input" type="password" placeholder="Contraseña"
                    value={pass} onChange={e => setPass(e.target.value)} />
                </div>
              </div>
 
              {error && <p className="msg-err show">{error}</p>}
 
              <button className="btn-crear-cuenta" onClick={handleRegister} disabled={loading}>
                {loading ? 'Creando...' : '✓ CREAR CUENTA'}
              </button>
              <button className="btn-cancelar" onClick={() => { setModo('login'); setError('') }}>
                ← Volver al inicio de sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}