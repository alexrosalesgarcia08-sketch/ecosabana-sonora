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
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#3d5a09 0%,#5a8012 50%,#00B15A 100%)' }}>
      <p style={{ color:'#C8DF8E', fontWeight:700, fontSize:'16px' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#3d5a09 0%,#4a6e0a 30%,#5a8012 60%,#3d6b10 100%)',
      backgroundImage:'radial-gradient(ellipse at 10% 20%,rgba(143,191,37,.4) 0%,transparent 50%),radial-gradient(ellipse at 90% 80%,rgba(0,177,90,.35) 0%,transparent 50%)',
      padding:'20px', fontFamily:"'Nunito',sans-serif",
      position:'relative', overflow:'hidden',
    }}>
      {/* Diagonal stripes background */}
      <div style={{
        position:'absolute', inset:0, opacity:0.08,
        backgroundImage:'repeating-linear-gradient(135deg,#8FBF25 0px,#8FBF25 2px,transparent 2px,transparent 40px)',
        pointerEvents:'none',
      }}/>

      <div style={{
        background:'#fff',
        borderRadius:'32px',
        width:'100%', maxWidth:'420px',
        boxShadow:'0 32px 80px rgba(0,0,0,.35), 0 0 0 1px rgba(143,191,37,.2)',
        overflow:'visible',
        position:'relative',
        animation:'cardIn .6s cubic-bezier(.22,1,.36,1) both',
      }}>

        {/* Top green section with mascot */}
        <div style={{
          background:'linear-gradient(135deg,#3d5a09 0%,#5a8012 50%,#4a9a2a 100%)',
          borderRadius:'32px 32px 0 0',
          padding:'28px 28px 80px',
          position:'relative',
          overflow:'visible',
          minHeight:'160px',
        }}>
          {/* Yellow bottom line */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'3px',
            background:'linear-gradient(90deg,#FFEE00,#C8DF8E,transparent)' }}/>

          {/* Logo + Title row */}
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{
              width:'60px', height:'60px', borderRadius:'50%',
              background:'rgba(255,255,255,.15)', border:'2px solid rgba(255,255,255,.4)',
              display:'flex', alignItems:'center', justifyContent:'center',
              overflow:'hidden', flexShrink:0,
            }}>
              <svg width="38" height="38" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="48" fill="white" fillOpacity="0.15"/>
                <text x="50" y="68" textAnchor="middle" fontSize="56" fontWeight="900" fill="white">V</text>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:'26px', fontWeight:900, color:'#fff', lineHeight:1.1,
                textShadow:'0 2px 8px rgba(0,0,0,.25)', letterSpacing:'-.5px' }}>
                ECOSABANA
              </div>
              <div style={{ fontSize:'18px', fontWeight:700, color:'#FFEE00', marginTop:'-2px' }}>Sonora 2027</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,.8)', marginTop:'2px', fontWeight:600 }}>
                Sistema de gestión de estructura PVEM
              </div>
            </div>
          </div>

          {/* MASCOTA - grande, saliendo de la card */}
          <img
            src={MASCOT_SRC}
            alt="Mascota PVEM"
            style={{
              position:'absolute',
              bottom:'-60px',
              left:'-20px',
              width:'190px',
              filter:'drop-shadow(0 12px 24px rgba(0,0,0,.35))',
              animation:'mascotFloat 4s ease-in-out infinite',
              pointerEvents:'none',
              zIndex:10,
            }}
          />
        </div>

        {/* Card body */}
        <div style={{ padding:'28px 28px 28px 28px', marginTop:'0' }}>

          {modo === 'login' ? (
            <>
              <div style={{ paddingLeft:'140px' }}>
                <div style={{ fontSize:'22px', fontWeight:900, color:'#3d5a09', marginBottom:'4px' }}>
                  Inicio de sesión
                </div>
                <div style={{ fontSize:'13px', color:'#6b7a50', fontWeight:600, marginBottom:'20px' }}>
                  Ingresa tus credenciales para continuar
                </div>
              </div>

              {exito && (
                <div style={{ background:'rgba(0,177,90,.1)', border:'1.5px solid #00B15A',
                  borderRadius:'12px', padding:'10px 14px', marginBottom:'14px',
                  fontSize:'13px', color:'#2e4a08', fontWeight:700 }}>
                  {exito}
                </div>
              )}

              {/* Email field */}
              <div style={{ position:'relative', marginBottom:'12px' }}>
                <svg style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                  color:'#8FBF25', width:'18px', height:'18px' }}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="USUARIO / EMAIL" type="email"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{
                    width:'100%', padding:'14px 16px 14px 44px',
                    border:'2px solid #dde8bb', borderRadius:'14px',
                    fontSize:'13px', fontWeight:700, color:'#3d5a09',
                    background:'#fafff4', outline:'none',
                    fontFamily:"'Nunito',sans-serif", letterSpacing:'.04em',
                    boxSizing:'border-box',
                  }}
                />
              </div>

              {/* Password field */}
              <div style={{ position:'relative', marginBottom:'8px' }}>
                <svg style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                  color:'#8FBF25', width:'18px', height:'18px' }}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="CONTRASEÑA" type={showPass ? 'text' : 'password'}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{
                    width:'100%', padding:'14px 44px 14px 44px',
                    border:'2px solid #dde8bb', borderRadius:'14px',
                    fontSize:'13px', fontWeight:700, color:'#3d5a09',
                    background:'#fafff4', outline:'none',
                    fontFamily:"'Nunito',sans-serif",
                    boxSizing:'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'#8FBF25',
                    fontSize:'16px', padding:0 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>

              {error && <p style={{ color:'#EF4135', fontSize:'12px', fontWeight:700, marginBottom:'8px' }}>{error}</p>}

              <button onClick={handleLogin} disabled={loading} style={{
                width:'100%', padding:'15px', border:'none', borderRadius:'14px',
                background:'linear-gradient(135deg,#5a8012,#00B15A)',
                color:'#fff', fontSize:'16px', fontWeight:900,
                fontFamily:"'Nunito',sans-serif", letterSpacing:'.08em',
                cursor:'pointer', marginTop:'8px',
                boxShadow:'0 6px 24px rgba(0,177,90,.4)',
                transition:'all .18s',
              }}>
                {loading ? 'Entrando...' : 'INGRESAR'}
              </button>

              {/* Secure row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                gap:'6px', marginTop:'12px', fontSize:'12px', color:'#a8b88a', fontWeight:700 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Acceso seguro
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'18px 0 0' }}>
                <div style={{ flex:1, height:'1.5px', background:'#e8f0cc' }}/>
                <span style={{ fontSize:'11px', color:'#a8b88a', fontWeight:800 }}>¿No tienes cuenta?</span>
                <div style={{ flex:1, height:'1.5px', background:'#e8f0cc' }}/>
              </div>

              <button onClick={() => { setModo('registro'); setError('') }} style={{
                width:'100%', padding:'13px', borderRadius:'14px', marginTop:'12px',
                border:'2px solid #8FBF25', background:'#eef6d0',
                color:'#3d5a09', fontSize:'14px', fontWeight:900,
                fontFamily:"'Nunito',sans-serif", cursor:'pointer',
                transition:'all .18s',
              }}>
                ✦ CREAR CUENTA
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize:'20px', fontWeight:900, color:'#3d5a09', marginBottom:'4px' }}>Crear Cuenta</div>
              <div style={{ fontSize:'13px', color:'#6b7a50', fontWeight:600, marginBottom:'16px' }}>Completa tus datos</div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:800, color:'#5a8012', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'4px' }}>Nombre(s) *</label>
                  <input className="reg-input" type="text" placeholder="Nombre(s)" value={nombre} onChange={e => setNombre(e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:'2px solid #dde8bb', borderRadius:'11px', fontSize:'13px', fontFamily:"'Nunito',sans-serif", fontWeight:600, color:'#3d5a09', background:'#fafff4', outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:800, color:'#5a8012', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'4px' }}>Apellidos *</label>
                  <input type="text" placeholder="Apellido(s)" value={apellido} onChange={e => setApellido(e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:'2px solid #dde8bb', borderRadius:'11px', fontSize:'13px', fontFamily:"'Nunito',sans-serif", fontWeight:600, color:'#3d5a09', background:'#fafff4', outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>
              <div style={{ marginBottom:'10px' }}>
                <label style={{ fontSize:'11px', fontWeight:800, color:'#5a8012', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'4px' }}>Correo *</label>
                <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', border:'2px solid #dde8bb', borderRadius:'11px', fontSize:'13px', fontFamily:"'Nunito',sans-serif", fontWeight:600, color:'#3d5a09', background:'#fafff4', outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ marginBottom:'10px' }}>
                <label style={{ fontSize:'11px', fontWeight:800, color:'#5a8012', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'4px' }}>Contraseña * (mín. 6)</label>
                <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', border:'2px solid #dde8bb', borderRadius:'11px', fontSize:'13px', fontFamily:"'Nunito',sans-serif", fontWeight:600, color:'#3d5a09', background:'#fafff4', outline:'none', boxSizing:'border-box' }}/>
              </div>

              {error && <p style={{ color:'#EF4135', fontSize:'12px', fontWeight:700, marginBottom:'8px' }}>{error}</p>}

              <button onClick={handleRegister} disabled={loading} style={{
                width:'100%', padding:'13px', border:'none', borderRadius:'14px',
                background:'linear-gradient(135deg,#3d5a09,#5a8012)',
                color:'#fff', fontSize:'14px', fontWeight:900,
                fontFamily:"'Nunito',sans-serif", cursor:'pointer', marginTop:'4px',
                boxShadow:'0 6px 20px rgba(90,128,18,.35)',
              }}>
                {loading ? 'Creando...' : '✓ CREAR CUENTA'}
              </button>
              <button onClick={() => { setModo('login'); setError('') }} style={{
                width:'100%', padding:'10px', border:'none', borderRadius:'11px',
                background:'none', color:'#a8b88a', fontSize:'13px', fontWeight:700,
                fontFamily:"'Nunito',sans-serif", cursor:'pointer', marginTop:'6px',
              }}>
                ← Volver al inicio de sesión
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes cardIn {
          from { opacity:0; transform:translateY(28px) scale(.97); }
          to { opacity:1; transform:none; }
        }
        @keyframes mascotFloat {
          0%,100% { transform:translateY(0) rotate(-1.5deg); }
          50% { transform:translateY(-10px) rotate(1.5deg); }
        }
      `}</style>
    </div>
  )
}