'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function UsuarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [personas, setPersonas] = useState<any[]>([])
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      const { data: u } = await supabase
        .from('usuarios').select('nombre').eq('id', data.user.id).single()
      setUserName(u?.nombre || data.user.email || 'Usuario')
      loadPersonas()
    })
  }, [])

  async function loadPersonas() {
    const { data } = await supabase
      .from('personas')
      .select('*')
      .order('created_at', { ascending: false })
    setPersonas(data ?? [])
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f4f7ec'}}>
      <p style={{color:'#5a8012',fontWeight:700,fontSize:'18px'}}>Cargando...</p>
    </div>
  )

  return (
    <div id="userAddPanel">
      <div id="uHeader">
        <div id="uHeaderLeft">
          <div id="uLogo">V</div>
          <div>
            <div id="uTitle">ECOSABANA Sonora 2027</div>
            <div id="uSubtitle">Sistema de gestión de estructura PVEM</div>
          </div>
        </div>
        <div id="uHeaderRight">
          <span className="u-name-badge">{userName}</span>
          <button className="u-logout-btn" onClick={handleLogout}>⏻ Cerrar sesión</button>
          <button className="u-add-btn" onClick={()=>router.push('/usuario/nueva-persona')}>
            + Agregar Persona
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="user-stats-row">
        {[
          {label:'Total', value:personas.length},
          {label:'Ecoperadores', value:personas.filter(p=>p.rol==='Ecoperador').length},
          {label:'RG', value:personas.filter(p=>p.rol==='RG').length},
          {label:'RC', value:personas.filter(p=>p.rol==='RC').length},
        ].map(s => (
          <div key={s.label} className="stat-card" style={{minWidth:'110px'}}>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap" style={{margin:'16px 28px 32px'}}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Municipio</th>
              <th>Rol</th>
              <th>Celular</th>
              <th>Status</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {personas.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'#a8b88a'}}>
                🌱 Aún no has registrado personas. ¡Agrega la primera!
              </td></tr>
            ) : personas.map(p => (
              <tr key={p.id}>
                <td className="fw">{p.nombre}</td>
                <td>{p.municipio}</td>
                <td><span className={`badge badge-${p.rol==='Ecoperador'?'eco':p.rol==='RG'?'rg':p.rol==='RC'?'rc':'obs'}`}>{p.rol}</span></td>
                <td>{p.celular}</td>
                <td>{p.status}</td>
                <td><button className="btn-edit" onClick={()=>router.push(`/usuario/editar/${p.id}`)}>✏️ Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="page-footer">ECOSABANA Sonora 2027 · Partido Verde Ecologista de México</div>
    </div>
  )
}