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
      background:'linear-gradient(135deg,#3d5a09,#5a8012)' }}>
      <p style={{ color:'#C8DF8E', fontWeight:700, fontSize:'16px' }}>Cargando...</p>
    </div>
  )
 
  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      background:'#4a7010',
      backgroundImage:'radial-gradient(ellipse at 15% 20%,rgba(143,191,37,.5) 0%,transparent 55%),radial-gradient(ellipse at 85% 80%,rgba(0,177,90,.4) 0%,transparent 55%)',
      padding:'20px',
      fontFamily:"'Nunito',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes cardIn { from { opacity:0; transform:translateY(20px) scale(.98); } to { opacity:1; transform:none; } }
        .login-card-new { animation: cardIn .5s cubic-bezier(.22,1,.36,1) both; }
        .inp:focus { border-color:#8FBF25 !important; box-shadow:0 0 0 3px rgba(143,191,37,.2) !important; }
        .btn-ing:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(0,177,90,.55) !important; }
        .btn-reg:hover { background:#8FBF25 !important; color:#fff !important; }
      `}</style>
 
      {/* CARD BLANCA */}
      <div className="login-card-new" style={{
        background:'#fff',
        borderRadius:'28px',
        width:'100%',
        maxWidth:'400px',
        boxShadow:'0 24px 60px rgba(0,0,0,.3), 0 0 0 1px rgba(143,191,37,.15)',
        position:'relative',
        overflow:'visible',
        padding:'32px 28px 28px 28px',
      }}>
 
        {/* MASCOTA - izquierda, grande, fuera de la card */}
        <img
          src={MASCOT_SRC}
          alt="Mascota PVEM"
          style={{
            position:'absolute',
            top:'-10px',
            left:'-20px',
            width:'185px',
            filter:'drop-shadow(0 8px 20px rgba(0,0,0,.25))',
            pointerEvents:'none',
            zIndex:10,
          }}
        />
 
        {/* HEADER - logo tucán + título, alineado a la derecha de la mascota */}
        <div style={{
          display:'flex',
          alignItems:'center',
          gap:'14px',
          paddingLeft:'155px',
          marginBottom:'24px',
          minHeight:'100px',
        }}>
          {/* Logo círculo verde con V y tucán */}
          <div style={{
            width:'58px', height:'58px', borderRadius:'50%',
            border:'2.5px solid #8FBF25',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, background:'#fff',
            boxShadow:'0 2px 12px rgba(143,191,37,.3)',
          }}>
            <svg width="36" height="36" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="28" fill="#5a8012"/>
              <text x="30" y="42" textAnchor="middle" fontSize="32" fontWeight="900" fill="white" fontFamily="Arial">V</text>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:'22px', fontWeight:900, color:'#2e4a08', lineHeight:1.1, letterSpacing:'-.3px' }}>
              ECOSABANA
            </div>
            <div style={{ fontSize:'17px', fontWeight:800, color:'#5a8012', marginTop:'-1px' }}>
              Sonora 2027
            </div>
            <div style={{ fontSize:'11px', color:'#6b7a50', marginTop:'3px', fontWeight:600, lineHeight:1.3 }}>
              Sistema de gestión<br/>de estructura PVEM
            </div>
          </div>
        </div>
 
        {modo === 'login' ? (
          <>
            {/* Titulo sección */}
            <div style={{ marginBottom:'18px' }}>
              <div style={{ fontSize:'20px', fontWeight:900, color:'#2e4a08' }}>Inicio de sesión</div>
              <div style={{ fontSize:'13px', color:'#6b7a50', fontWeight:600, marginTop:'2px' }}>
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
 
            {/* Input email */}
            <div style={{ position:'relative', marginBottom:'12px' }}>
              <svg style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                color:'#8FBF25', width:'18px', height:'18px' }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input className="inp" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="USUARIO" type="email"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width:'100%', padding:'13px 16px 13px 44px', border:'2px solid #dde8bb',
                  borderRadius:'13px', fontSize:'13px', fontWeight:700, color:'#2e4a08',
                  background:'#fafff4', outline:'none', fontFamily:"'Nunito',sans-serif",
                  boxSizing:'border-box', transition:'all .15s' }}
              />
            </div>
 
            {/* Input password */}
            <div style={{ position:'relative', marginBottom:'8px' }}>
              <svg style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                color:'#8FBF25', width:'18px', height:'18px' }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input className="inp" value={pass} onChange={e => setPass(e.target.value)}
                placeholder="CONTRASEÑA" type={showPass ? 'text' : 'password'}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width:'100%', padding:'13px 44px 13px 44px', border:'2px solid #dde8bb',
                  borderRadius:'13px', fontSize:'13px', fontWeight:700, color:'#2e4a08',
                  background:'#fafff4', outline:'none', fontFamily:"'Nunito',sans-serif",
                  boxSizing:'border-box', transition:'all .15s' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'#8FBF25', fontSize:'16px', padding:0 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
 
            {error && <p style={{ color:'#EF4135', fontSize:'12px', fontWeight:700, marginBottom:'8px', marginTop:'4px' }}>{error}</p>}
 
            {/* Botón ingresar */}
            <button className="btn-ing" onClick={handleLogin} disabled={loading} style={{
              width:'100%', padding:'14px', border:'none', borderRadius:'13px',
              background:'linear-gradient(135deg,#5a8012,#00B15A)',
              color:'#fff', fontSize:'15px', fontWeight:900,
              fontFamily:"'Nunito',sans-serif", letterSpacing:'.07em',
              cursor:'pointer', marginTop:'8px',
              boxShadow:'0 6px 24px rgba(0,177,90,.4)',
              transition:'all .18s',
            }}>
              {loading ? 'Entrando...' : 'INGRESAR'}
            </button>
 
            {/* Acceso seguro */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
              gap:'6px', marginTop:'12px', fontSize:'12px', color:'#a8b88a', fontWeight:700 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Acceso seguro
            </div>
 
            {/* Divider */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'16px 0' }}>
              <div style={{ flex:1, height:'1.5px', background:'#e8f0cc' }}/>
              <span style={{ fontSize:'11px', color:'#a8b88a', fontWeight:800 }}>¿No tienes cuenta?</span>
              <div style={{ flex:1, height:'1.5px', background:'#e8f0cc' }}/>
            </div>
 
            <button className="btn-reg" onClick={() => { setModo('registro'); setError('') }} style={{
              width:'100%', padding:'13px', borderRadius:'13px',
              border:'2px solid #8FBF25', background:'#f4fbe8',
              color:'#3d5a09', fontSize:'14px', fontWeight:900,
              fontFamily:"'Nunito',sans-serif", cursor:'pointer',
              transition:'all .18s',
            }}>
              ✦ CREAR CUENTA
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize:'19px', fontWeight:900, color:'#2e4a08', marginBottom:'4px' }}>Crear Cuenta</div>
            <div style={{ fontSize:'13px', color:'#6b7a50', fontWeight:600, marginBottom:'14px' }}>Completa tus datos</div>
 
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
              <div>
                <label style={{ fontSize:'10px', fontWeight:800, color:'#5a8012', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'4px' }}>Nombre(s) *</label>
                <input type="text" placeholder="Nombre(s)" value={nombre} onChange={e => setNombre(e.target.value)}
                  style={{ width:'100%', padding:'9px 11px', border:'2px solid #dde8bb', borderRadius:'11px', fontSize:'13px', fontFamily:"'Nunito',sans-serif", fontWeight:600, color:'#2e4a08', background:'#fafff4', outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:'10px', fontWeight:800, color:'#5a8012', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'4px' }}>Apellidos *</label>
                <input type="text" placeholder="Apellido(s)" value={apellido} onChange={e => setApellido(e.target.value)}
                  style={{ width:'100%', padding:'9px 11px', border:'2px solid #dde8bb', borderRadius:'11px', fontSize:'13px', fontFamily:"'Nunito',sans-serif", fontWeight:600, color:'#2e4a08', background:'#fafff4', outline:'none', boxSizing:'border-box' }}/>
              </div>
            </div>
            <div style={{ marginBottom:'10px' }}>
              <label style={{ fontSize:'10px', fontWeight:800, color:'#5a8012', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'4px' }}>Correo *</label>
              <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width:'100%', padding:'9px 11px', border:'2px solid #dde8bb', borderRadius:'11px', fontSize:'13px', fontFamily:"'Nunito',sans-serif", fontWeight:600, color:'#2e4a08', background:'#fafff4', outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:'10px' }}>
              <label style={{ fontSize:'10px', fontWeight:800, color:'#5a8012', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'4px' }}>Contraseña * (mín. 6)</label>
              <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)}
                style={{ width:'100%', padding:'9px 11px', border:'2px solid #dde8bb', borderRadius:'11px', fontSize:'13px', fontFamily:"'Nunito',sans-serif", fontWeight:600, color:'#2e4a08', background:'#fafff4', outline:'none', boxSizing:'border-box' }}/>
            </div>
 
            {error && <p style={{ color:'#EF4135', fontSize:'12px', fontWeight:700, marginBottom:'8px' }}>{error}</p>}
 
            <button onClick={handleRegister} disabled={loading} style={{
              width:'100%', padding:'13px', border:'none', borderRadius:'13px',
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
  )
}
