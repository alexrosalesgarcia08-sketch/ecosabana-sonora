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
  const [filterMun, setFilterMun] = useState('')
  const [stats, setStats] = useState({ eco: 0, rg: 0, rc: 0, obs: 0, total: 0 })
 
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/'); return }
      loadPersonas()
    })
  }, [])
 
  async function loadPersonas() {
    const [
      { data: p },
      { data: ecos },
      { data: rcs },
      { data: obs }
    ] = await Promise.all([
      supabase.from('personas').select('*').order('created_at', { ascending: false }),
      supabase.from('ecoperadores').select('*'),
      supabase.from('rcs_eco').select('*'),
      supabase.from('observadores_rc').select('*'),
    ])
 
    const personas_data = p ?? []
    setPersonas(personas_data)
 
    const ecoCount      = personas_data.filter((x: any) => x.rol === 'Ecoperador').length
    const rgStandalone  = personas_data.filter((x: any) => x.rol === 'RG').length
    const rgEmbebidos   = (ecos ?? []).filter((e: any) => e.rg_nombre || e.rg_tel).length
    const rcStandalone  = personas_data.filter((x: any) => x.rol === 'RC').length
    const rcEmbebidos   = (rcs ?? []).length
    const obsStandalone = personas_data.filter((x: any) => x.rol === 'Observador').length
    const obsEmbebidos  = (obs ?? []).length
 
    const rgTotal  = rgStandalone  + rgEmbebidos
    const rcTotal  = rcStandalone  + rcEmbebidos
    const obsTotal = obsStandalone + obsEmbebidos
 
    setStats({
      eco:   ecoCount,
      rg:    rgTotal,
      rc:    rcTotal,
      obs:   obsTotal,
      total: ecoCount + rgTotal + rcTotal + obsTotal
    })
 
    setLoading(false)
  }
 
  async function deletePerson(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return
    await supabase.from('personas').delete().eq('id', id)
    loadPersonas()
  }
 
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }
 
  const filtered = personas.filter(p =>
    (!search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.celular?.includes(search)) &&
    (!filterRol || p.rol === filterRol) &&
    (!filterMun || p.municipio === filterMun)
  )
 
  const municipios = [...new Set(personas.map(p => p.municipio).filter(Boolean))] as string[]
 
  const statsCards = [
    { label: 'Ecoperadores', value: stats.eco  },
    { label: 'RG',           value: stats.rg   },
    { label: 'RC',           value: stats.rc   },
    { label: 'Observadores', value: stats.obs  },
    { label: 'Total',        value: stats.total },
  ]
 
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f4f7ec' }}>
      <p style={{ color:'#5a8012', fontWeight:700, fontSize:'18px' }}>Cargando ECOSABANA...</p>
    </div>
  )
 
  return (
    <div style={{ minHeight:'100vh', background:'#f4f7ec' }}>
 
      {/* Header */}
      <div className="header">
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{
            width:'52px', height:'52px', borderRadius:'50%',
            background:'rgba(255,255,255,.2)', border:'2px solid rgba(255,255,255,.35)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'22px', fontWeight:900, color:'#fff'
          }}>V</div>
          <div className="header-title">
            <h1>ECOSABANA Sonora 2027</h1>
            <p>Sistema de gestión de estructura PVEM</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-white" onClick={() => router.push('/admin/nueva-persona')}>
            + Agregar Persona
          </button>
          <button className="btn btn-white" onClick={handleLogout}>⏻ Salir</button>
        </div>
      </div>
 
      {/* Stats */}
      <div className="stats">
        {statsCards.map(s => (
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o celular..."
          />
        </div>
        <select value={filterMun} onChange={e => setFilterMun(e.target.value)}>
          <option value="">Todos los municipios</option>
          {municipios.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={filterRol} onChange={e => setFilterRol(e.target.value)}>
          <option value="">Todos los roles</option>
          <option>Ecoperador</option>
          <option>RG</option>
          <option>RC</option>
          <option>Observador</option>
        </select>
      </div>
 
      <div className="result-count">
        {filtered.length} persona{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
      </div>
 
      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Nombre</th>
              <th>Municipio</th>
              <th>Dist.</th>
              <th>Rol</th>
              <th>Status</th>
              <th className="center">Sección</th>
              <th className="center">ECO</th>
              <th className="center">RG</th>
              <th className="center">RC</th>
              <th className="center">OBS</th>
              <th className="center">Pago</th>
              <th className="center">Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign:'center', padding:'40px', color:'#a8b88a' }}>
                  🌱 No hay personas registradas aún.
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td className="fw">{p.nombre}</td>
                <td>{p.municipio}</td>
                <td>
                  <span className={`badge badge-${
                    p.rol === 'Ecoperador' ? 'eco' :
                    p.rol === 'RG' ? 'rg' :
                    p.rol === 'RC' ? 'rc' : 'obs'
                  }`}>
                    {p.rol}
                  </span>
                </td>
                <td>{p.celular}</td>
                <td>{p.banco}</td>
                <td>{p.cuenta}</td>
                <td className="td-num green">${p.pago_acum || 0}</td>
                <td>
                  <div className="actions">
                    <button className="btn-edit" onClick={() => router.push(`/admin/editar/${p.id}`)}>✏️</button>
                    <button className="btn-danger" onClick={() => deletePerson(p.id, p.nombre)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="tfoot">
                <td colSpan={11} style={{ textAlign:'right', paddingRight:'12px', fontSize:'10px' }}>
                  TOTALES GENERALES
                </td>
                <td className="td-num">
                  ${filtered.reduce((sum, p) => sum + (p.pago_acum || 0), 0)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
 
      <div className="page-footer">
        ECOSABANA Sonora 2027 · Partido Verde Ecologista de México · Sistema PVEM
      </div>
    </div>
  )
}