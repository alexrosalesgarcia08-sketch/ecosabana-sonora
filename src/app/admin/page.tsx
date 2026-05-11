'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [personas, setPersonas] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterRol, setFilterRol] = useState('')

  useEffect(() => {
  supabase.auth.getUser().then(async ({ data }) => {
    if (!data.user) return
    const { data: u } = await supabase
      .from('usuarios').select('rol').eq('id', data.user.id).single()
    window.location.href = u?.rol === 'admin' ? '/admin' : '/usuario'
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

  async function deletePerson(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return
    await supabase.from('personas').delete().eq('id', id)
    loadPersonas()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filtered = personas.filter(p =>
    (!search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.celular?.includes(search)) &&
    (!filterRol || p.rol === filterRol)
  )

  const stats = {
    eco: personas.filter(p => p.rol === 'Ecoperador').length,
    rg: personas.filter(p => p.rol === 'RG').length,
    rc: personas.filter(p => p.rol === 'RC').length,
    obs: personas.filter(p => p.rol === 'Observador').length,
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f4f7ec'}}>
      <p style={{color:'#5a8012',fontWeight:700,fontSize:'18px'}}>Cargando ECOSABANA...</p>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f4f7ec'}}>
      {/* Header */}
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(255,255,255,.2)',border:'2px solid rgba(255,255,255,.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:900,color:'#fff'}}>V</div>
          <div className="header-title">
            <h1>ECOSABANA Sonora 2027</h1>
            <p>Sistema de gestión de estructura PVEM</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-white" onClick={handleLogout}>⏻ Salir</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        {[
          {label:'Ecoperadores', value:stats.eco},
          {label:'RG', value:stats.rg},
          {label:'RC', value:stats.rc},
          {label:'Observadores', value:stats.obs},
          {label:'Total', value:personas.length},
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-wrap">
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar por nombre o celular..." />
        </div>
        <select value={filterRol} onChange={e=>setFilterRol(e.target.value)}>
          <option value="">Todos los roles</option>
          <option>Ecoperador</option>
          <option>RG</option>
          <option>RC</option>
          <option>Observador</option>
        </select>
        <button className="btn btn-primary" onClick={()=>router.push('/admin/nueva-persona')}>
          + Agregar Persona
        </button>
      </div>

      <div className="result-count">{filtered.length} persona{filtered.length!==1?'s':''} encontrada{filtered.length!==1?'s':''}</div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Municipio</th>
              <th>Rol</th>
              <th>Celular</th>
              <th>Banco</th>
              <th>Cuenta</th>
              <th>Pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td className="fw">{p.nombre}</td>
                <td>{p.municipio}</td>
                <td>
                  <span className={`badge badge-${p.rol==='Ecoperador'?'eco':p.rol==='RG'?'rg':p.rol==='RC'?'rc':'obs'}`}>
                    {p.rol}
                  </span>
                </td>
                <td>{p.celular}</td>
                <td>{p.banco}</td>
                <td>{p.cuenta}</td>
                <td className="green">${p.pago_acum||0}</td>
                <td>
                  <div className="actions">
                    <button className="btn-edit" onClick={()=>router.push(`/admin/editar/${p.id}`)}>✏️</button>
                    <button className="btn-danger" onClick={()=>deletePerson(p.id, p.nombre)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="page-footer">ECOSABANA Sonora 2027 · Partido Verde Ecologista de México · Sistema PVEM</div>
    </div>
  )
}