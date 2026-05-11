'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import '../../styles/pvem.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !pass) { setError('Ingresa usuario y contraseña'); return }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (err) { setError('Usuario o contraseña incorrectos'); setLoading(false); return }
    
    const { data: usuario } = await supabase
      .from('usuarios').select('rol').eq('id', data.user.id).single()
    
    if (usuario?.rol === 'admin') {
      router.push('/admin')
    } else {
      router.push('/usuario')
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#3d5a09'}}>
      <div className="login-card card-animate">
        <div className="card-top">
          <div className="brand-row">
            <div className="brand-logo">V</div>
            <div className="brand-text">
              <h1>ECOSABANA<br/><span>Sonora 2027</span></h1>
              <p>Sistema de gestión de estructura PVEM</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="section-title">Iniciar Sesión</div>
          <div className="section-sub">Ingresa tus credenciales para continuar</div>
          <div className="field">
            <input value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Correo electrónico" type="email"
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
          </div>
          <div className="field">
            <input value={pass} onChange={e=>setPass(e.target.value)}
              placeholder="Contraseña" type="password"
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
          </div>
          {error && <p style={{color:'#EF4135',fontSize:'12px',marginBottom:'8px'}}>{error}</p>}
          <button className="btn-ingresar" onClick={handleLogin} disabled={loading}>
            {loading ? 'Entrando...' : 'INGRESAR'}
          </button>
        </div>
      </div>
    </div>
  )
}