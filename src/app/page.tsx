'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './globals.css'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
export default function LoginPage() {
  const [modo, setModo] = useState<'login'|'registro'>('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState('')
 
  async function handleLogin() {
    if (!email || !pass) { setError('Ingresa correo y contraseña'); return }
    setLoading(true); setError('')
 
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email, password: pass
    })
 
    if (err) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
      return
    }
 
    const { data: u } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', data.user.id)
      .single()
 
    if (u?.rol === 'admin') {
      window.location.href = '/admin'
    } else {
      window.location.href = '/usuario'
    }
  }
 
  async function handleRegister() {
    if (!nombre || !apellido || !email || !pass) {
      setError('Todos los campos son requeridos'); return
    }
    if (pass.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres'); return
    }
    setLoading(true); setError('')
 
    const { data, error: err } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { nombre: nombre + ' ' + apellido } }
    })
 
    if (err) { setError(err.message); setLoading(false); return }
 
    if (data.user) {
      await supabase.from('usuarios').insert({
        id: data.user.id,
        nombre: nombre + ' ' + apellido,
        rol: 'usuario'
      })
    }
 
    setExito('¡Cuenta creada! Ya puedes iniciar sesión.')
    setLoading(false)
    setModo('login')
    setNombre(''); setApellido(''); setEmail(''); setPass('')
  }
 
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#3d5a09',
      backgroundImage: 'radial-gradient(ellipse at 15% 20%,rgba(143,191,37,.55) 0%,transparent 50%),radial-gradient(ellipse at 85% 80%,rgba(0,177,90,.45) 0%,transparent 50%)',
      padding: '20px'
    }}>
      <div className="login-card card-animate">
 
        {/* Top verde */}
        <div className="card-top">
          <div className="brand-row">
            <div className="brand-logo">V</div>
            <div className="brand-text">
              <h1>ECOSABANA<br /><span>Sonora 2027</span></h1>
              <p>Sistema de gestión de estructura PVEM</p>
            </div>
          </div>
        </div>
 
        <div className="card-body">
          {modo === 'login' ? (
            <>
              <div className="section-title">Iniciar Sesión</div>
              <div className="section-sub">Ingresa tus credenciales para continuar</div>
 
              {exito && (
                <div style={{
                  background: 'rgba(0,177,90,.12)', border: '1.5px solid #00B15A',
                  borderRadius: '12px', padding: '12px', marginBottom: '14px',
                  fontSize: '13px', color: '#2e4a08', fontWeight: 700
                }}>{exito}</div>
              )}
 
              <div className="field">
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  type="email"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div className="field">
                <input
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="Contraseña"
                  type="password"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
 
              {error && (
                <p style={{ color: '#EF4135', fontSize: '12px', marginBottom: '8px', fontWeight: 700 }}>
                  {error}
                </p>
              )}
 
              <button className="btn-ingresar" onClick={handleLogin} disabled={loading}>
                {loading ? 'Entrando...' : 'INGRESAR'}
              </button>
 
              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">¿No tienes cuenta?</span>
                <div className="divider-line" />
              </div>
 
              <div className="register-wrap">
                <button className="btn-registrar" onClick={() => { setModo('registro'); setError('') }}>
                  ✦ CREAR CUENTA
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="section-title">Crear Cuenta</div>
              <div className="section-sub">Completa tus datos para solicitar acceso</div>
 
              <div className="register-panel open" style={{ padding: '0', border: 'none', marginTop: '0', animation: 'none' }}>
                <div className="reg-grid">
                  <div>
                    <label className="reg-label">Nombre(s) *</label>
                    <input
                      className="reg-input" type="text" placeholder="Nombre(s)"
                      value={nombre} onChange={e => setNombre(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="reg-label">Apellidos *</label>
                    <input
                      className="reg-input" type="text" placeholder="Apellido(s)"
                      value={apellido} onChange={e => setApellido(e.target.value)}
                    />
                  </div>
                  <div className="full">
                    <label className="reg-label">Correo electrónico *</label>
                    <input
                      className="reg-input" type="email" placeholder="correo@ejemplo.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="full">
                    <label className="reg-label">Contraseña *</label>
                    <input
                      className="reg-input" type="password" placeholder="Mínimo 6 caracteres"
                      value={pass} onChange={e => setPass(e.target.value)}
                    />
                  </div>
                </div>
 
                {error && (
                  <p style={{ color: '#EF4135', fontSize: '12px', marginTop: '8px', fontWeight: 700 }}>
                    {error}
                  </p>
                )}
 
                <button className="btn-crear-cuenta" onClick={handleRegister} disabled={loading}>
                  {loading ? 'Creando cuenta...' : '✓ CREAR CUENTA'}
                </button>
                <button className="btn-cancelar" onClick={() => { setModo('login'); setError('') }}>
                  ← Volver al inicio de sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
 