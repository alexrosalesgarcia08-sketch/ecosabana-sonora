'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { initials, badgeClass, statusBadgeClass, getCatorcena, getWeekNum, RC_LABELS, MASCOT_SRC } from '@/lib/constants'
import * as XLSX from 'xlsx'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [personas, setPersonas] = useState<any[]>([])
  const [ecos, setEcos] = useState<any[]>([])
  const [rcsData, setRcsData] = useState<any[]>([])
  const [obsData, setObsData] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterRol, setFilterRol] = useState('')
  const [filterMun, setFilterMun] = useState('')
  const [stats, setStats] = useState({ eco: 0, rg: 0, rc: 0, obs: 0, total: 0, casillas: 0 })
  const [userName, setUserName] = useState('Admin')
 
  // Modal states
  const [payModal, setPayModal] = useState<any>(null)
  const [statsModal, setStatsModal] = useState(false)
  const [modal1x20, setModal1x20] = useState(false)
  const [formatos1x20, setFormatos1x20] = useState<any[]>([])  
  const [notifs, setNotifs] = useState<any[]>([])
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
 
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/'; return }
      const { data: u } = await supabase.from('usuarios').select('nombre,rol').eq('id', data.user.id).single()
      if (u?.rol !== 'admin') { router.replace('/usuario'); return }
      setUserName(u?.nombre || data.user.email || 'Admin')
      loadAll()
    })
  }, [])
 
  async function loadAll() {
    const [
      { data: p }, { data: e }, { data: r }, { data: o }, { data: pg },
      { data: fmts }, { data: notifsData }
    ] = await Promise.all([
      supabase.from('personas').select('*').order('created_at', { ascending: false }),
      supabase.from('ecoperadores').select('*'),
      supabase.from('rcs_eco').select('*'),
      supabase.from('observadores_rc').select('*'),
      supabase.from('pagos').select('*'),
      supabase.from('formato_1x20').select('*, usuarios(nombre,id)').order('created_at', { ascending: false }),
      supabase.from('notificaciones').select('*').eq('leida', false).order('created_at', { ascending: false }),
    ])
    const ps = p ?? [], es = e ?? [], rs = r ?? [], os = o ?? [], pgs = pg ?? []
    setFormatos1x20(fmts ?? [])
    setNotifs(notifsData ?? [])
    setPersonas(ps); setEcos(es); setRcsData(rs); setObsData(os); setPagos(pgs)
 
    const ecoCount = ps.filter((x:any) => x.rol === 'Ecoperador').length
    const rgS = ps.filter((x:any) => x.rol === 'RG').length
    const rgE = es.filter((e:any) => e.rg_nombre || e.rg_tel).length
    const rcS = ps.filter((x:any) => x.rol === 'RC').length
    const obsS = ps.filter((x:any) => x.rol === 'Observador').length
    setStats({
      eco: ecoCount, rg: rgS + rgE, rc: rcS + rs.length,
      obs: obsS + os.length,
      total: ecoCount + rgS + rgE + rcS + rs.length + obsS + os.length,
      casillas: ps.reduce((s:number, x:any) => s + (x.casilla || 0), 0)
    })
    setLoading(false)
  }
 
  async function handleDelete(id: string, nombre: string) {
    setConfirmId(id); setConfirmName(nombre)
  }
 
  async function confirmDelete() {
    if (!confirmId) return
    await supabase.from('personas').delete().eq('id', confirmId)
    setConfirmId(null); loadAll()
  }
 
  async function handleLogout() {
    await supabase.auth.signOut(); window.location.href = '/'
  }
 
  // ── PAGOS ──────────────────────────────────────────────────
  function openPay(p: any) {
    const eco = ecos.find(e => e.id === p.id)
    const myRcs = rcsData.filter(r => r.eco_id === p.id)
    const hasRG = eco?.rg_nombre || eco?.rg_tel
    const ecoTotal = (hasRG ? 100 : 0) + myRcs.length * 50
    const rgTotal = hasRG ? 300 + myRcs.length * 50 : 0
    const cat = getCatorcena(); const yr = new Date().getFullYear()
 
    setPayModal({ p, eco, myRcs, hasRG, ecoTotal, rgTotal, cat, yr })
  }
 
  function openSimplePay(p: any) {
    const cat = getCatorcena(); const yr = new Date().getFullYear()
    setPayModal({ p, simple: true, cat, yr })
  }
 
  async function doRegisterPay(personaId: string, tipo: string, monto: number) {
    if (monto <= 0) return
    const cat = getCatorcena(); const yr = new Date().getFullYear()
    const already = pagos.find(r => r.persona_id === personaId && r.tipo === tipo && r.catorcena === cat && r.anio === yr)
    if (already) { alert(`⚠️ Este pago ya fue registrado en la catorcena ${cat}/${yr}`); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pagos').insert({ persona_id: personaId, tipo, monto, catorcena: cat, anio: yr, registrado_por: user?.id })
    setPayModal(null); loadAll()
    alert(`✅ Pago de $${monto} registrado — Catorcena ${cat}/${yr}`)
  }
 
  function isPaid(personaId: string, tipo: string) {
    const cat = getCatorcena(); const yr = new Date().getFullYear()
    return pagos.some(r => r.persona_id === personaId && r.tipo === tipo && r.catorcena === cat && r.anio === yr)
  }
 
  // ── EXPORT 1x20 ────────────────────────────────────────────
  function export1x20() {
    const ecos = personas.filter((p:any) => p.rol === 'Ecoperador')
    if (!ecos.length) { alert('No hay Ecoperadores'); return }
    const wb = XLSX.utils.book_new()
    ecos.forEach((eco:any) => {
      const myRcs = rcsData.filter((r:any) => r.eco_id === eco.id)
      const ecoRow = ecos.find((e:any) => e.id === eco.id)
      const rows: any[][] = [
        [`FORMATO 1x20 - ${eco.nombre}`],
        [`Municipio: ${eco.municipio || '-'} | Distrito: ${eco.distrito || '-'} | Cel: ${eco.celular || '-'}`],
        [],
        ['#', 'Nombre', 'Teléfono', 'Rol', 'Banco', 'Cuenta', 'Relación']
      ]
      let idx = 1
      const eco2 = ecos.find((e:any) => e.id === eco.id)
      const ecoData = ecos.find((e:any) => e.id === eco.id)
      // RG embebido
      const ecoRow2 = ecos.find((e:any) => e.id === eco.id)
      const myEco = ecos.find((e:any) => e.id === eco.id)
      // Get ecoperador data
      const ecoEntry = ecos.find((e:any) => e.id === eco.id)
      rows.push([String(idx++).padStart(2,'0'), eco.nombre, eco.celular||'', 'Ecoperador', eco.banco||'', eco.cuenta||'', 'Titular'])
      myRcs.forEach((rc:any) => {
        rows.push([String(idx++).padStart(2,'0'), rc.nombre||'', rc.tel||'', `RC ${rc.slot}`, rc.banco||'', rc.cuenta||'', `RC del Eco`])
      })
      // Standalone personas linked
      personas.filter((p:any) => p.rol !== 'Ecoperador' && p.municipio === eco.municipio).slice(0, 20 - idx + 1).forEach((p:any) => {
        rows.push([String(idx++).padStart(2,'0'), p.nombre, p.celular||'', p.rol, p.banco||'', p.cuenta||'', p.municipio||''])
      })
      // Pad to 20
      while (idx <= 20) {
        rows.push([String(idx++).padStart(2,'0'), '', '', '', '', '', ''])
      }
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const sheetName = eco.nombre.substring(0, 31).replace(/[/\?*[\]]/g,'')
      XLSX.utils.book_append_sheet(wb, ws, sheetName || `Eco${idx}`)
    })
    XLSX.writeFile(wb, `1x20_ECOSABANA_${new Date().toLocaleDateString('es-MX').replace(/\//g,'-')}.xlsx`)
  }
 
  // ── EXCEL EXPORT ───────────────────────────────────────────
  function exportExcel() {
    if (!personas.length) { alert('No hay datos'); return }
    const wb = XLSX.utils.book_new()
 
    // Sheet 1: All personas
    const rows = personas.map(p => {
      const eco = ecos.find(e => e.id === p.id)
      const myRcs = rcsData.filter(r => r.eco_id === p.id)
      return {
        'Nombre': p.nombre, 'Celular': p.celular, 'Municipio': p.municipio,
        'Distrito': p.distrito, 'Rol': p.rol, 'Status': (p.status || []).join(', '),
        'Casilla': p.casilla, 'Banco': p.banco, 'Cuenta': p.cuenta,
        'Folio': p.folio, 'Pago': p.pago_acum || 0,
        'RG Nombre': eco?.rg_nombre || '', 'RG Tel': eco?.rg_tel || '',
        'RCs': myRcs.length,
      }
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'PERSONAS')
 
    // Sheet 2: RCs
    const rcRows = rcsData.map(r => {
      const eco = personas.find(p => p.id === r.eco_id)
      return { 'Ecoperador': eco?.nombre || '', 'Slot': r.slot, 'Nombre': r.nombre, 'Tel': r.tel, 'Banco': r.banco, 'Cuenta': r.cuenta }
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rcRows.length ? rcRows : [{}]), 'RCS')
 
    XLSX.writeFile(wb, `ECOSABANA_${new Date().toLocaleDateString('es-MX').replace(/\//g,'-')}.xlsx`)
  }
 
  // ── EXCEL IMPORT ───────────────────────────────────────────
  async function importExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        let imported = 0
        const { data: { user } } = await supabase.auth.getUser()
 
        for (const sheetName of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' }) as any[][]
          if (!rows.length) continue
          const hdr = rows[0].map((h:any) => String(h).trim().toUpperCase())
          const ci = (k: string) => hdr.findIndex((h:string) => h.includes(k.toUpperCase()))
 
          const iNom = ci('NOMBRE'), iTel = ci('TELÉFONO') > -1 ? ci('TELÉFONO') : ci('CELULAR')
          const iMun = ci('MUNICIPIO'), iBco = ci('BANCO'), iCta = ci('CUENTA')
          const iRol = ci('ROL'), iPago = ci('PAGO')
 
          for (const row of rows.slice(1)) {
            const nombre = String(row[iNom] || '').trim()
            if (!nombre) continue
            const cel = String(row[iTel] || '').trim()
            const exists = personas.find(p => p.nombre.toLowerCase() === nombre.toLowerCase() || (cel && p.celular === cel))
            if (exists) continue
 
            await supabase.from('personas').insert({
              nombre, celular: cel,
              municipio: iMun > -1 ? String(row[iMun] || '').trim() : '',
              banco: iBco > -1 ? String(row[iBco] || '').trim() : '',
              cuenta: iCta > -1 ? String(row[iCta] || '').trim() : '',
              rol: iRol > -1 ? String(row[iRol] || 'Ecoperador').trim() : 'Ecoperador',
              pago_acum: iPago > -1 ? parseFloat(String(row[iPago] || '0')) : 0,
              status: [], creado_por: user?.id
            })
            imported++
          }
        }
        alert(`✅ Importadas: ${imported} personas nuevas`)
        loadAll()
      } catch (err: any) { alert('Error al importar: ' + err.message) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }
 
  const filtered = personas.filter(p =>
    (!search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.celular?.includes(search)) &&
    (!filterRol || p.rol === filterRol) &&
    (!filterMun || p.municipio === filterMun)
  )
 
  const municipios = [...new Set(personas.map((p:any) => p.municipio).filter(Boolean))] as string[]
 
  const statsCards = [
    { label: 'TOTAL', value: stats.total },
    { label: 'ECOPERADORES', value: stats.eco },
    { label: 'RG', value: stats.rg },
    { label: 'RC', value: stats.rc },
    { label: 'OBSERVADORES', value: stats.obs },
    { label: 'CASILLAS', value: stats.casillas },
  ]
 
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f4f7ec' }}>
      <p style={{ color: '#5a8012', fontWeight: 700, fontSize: '18px' }}>Cargando ECOSABANA...</p>
    </div>
  )
 
  return (
    <div id="adminApp" style={{ minHeight: '100vh', background: '#f4f7ec' }}>
 
      {/* ── HEADER ── */}
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div id="mascotWrap">
            <img id="mascotImg" src={MASCOT_SRC} alt="Mascota PVEM" style={{ width: '74px' }} />
          </div>
          <div className="header-title">
            <h1>ECOSABANA Sonora 2027</h1>
            <p>Sistema de gestión de estructura PVEM</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-white" onClick={handleLogout}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Salir
          </button>
          <button className="btn btn-white" onClick={() => importRef.current?.click()}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Importar Excel
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
          <div className="dropdown">
            <button className="btn btn-white" onClick={e => { const m = (e.currentTarget.nextSibling as HTMLElement); m.classList.toggle('open') }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Exportar ▾
            </button>
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={exportExcel}>📊 Exportar Excel</button>
              <button className="dropdown-item" onClick={export1x20}>📋 Exportar 1x20</button>
            </div>
          </div>
          <button className="btn btn-stats" onClick={() => setStatsModal(true)}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Estadísticas
          </button>
          <button className="btn" onClick={() => setModal1x20(true)} style={{
            background:'#1a73c8', color:'#fff', fontWeight:700, position:'relative'
          }}>
            📋 1x20
            {notifs.length > 0 && (
              <span style={{ position:'absolute', top:'-6px', right:'-6px', background:'#EF4135',
                color:'#fff', borderRadius:'50%', width:'18px', height:'18px',
                fontSize:'10px', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {notifs.length}
              </span>
            )}
          </button>
          <button className="btn btn-primary" onClick={() => router.push('/admin/nueva-persona')}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar Persona
          </button>
        </div>
      </div>
 
      {/* ── STATS ── */}
      <div className="stats">
        {statsCards.map(s => (
          <div key={s.label} className="stat-card">
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
            <div className="stat-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>
        ))}
      </div>
 
      {/* ── FILTERS ── */}
      <div className="filters">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o celular..." />
        </div>
        <select value={filterMun} onChange={e => setFilterMun(e.target.value)}>
          <option value="">Todos los municipios</option>
          {municipios.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={filterRol} onChange={e => setFilterRol(e.target.value)}>
          <option value="">Todos los roles</option>
          <option>Ecoperador</option><option>RG</option><option>RC</option><option>Observador</option>
        </select>
      </div>
 
      <div className="result-count">{filtered.length} persona{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</div>
 
      {/* ── TABLE ── */}
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
              <th className="center">Secc.</th>
              <th className="center">RG</th>
              <th className="center">RC</th>
              <th className="center">Obs</th>
              <th className="center">Pago</th>
              <th className="center">Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={13} style={{ textAlign: 'center', padding: '40px', color: '#a8b88a' }}>
                🌱 No hay personas registradas.
              </td></tr>
            ) : filtered.map(p => {
              const eco = ecos.find(e => e.id === p.id)
              const myRcs = rcsData.filter(r => r.eco_id === p.id)
              const myObs = obsData.filter(o => myRcs.some(r => r.id === o.rc_id))
              const paidPerson = isPaid(p.id, 'eco') || isPaid(p.id, 'simple')
              return (
                <tr key={p.id} className={paidPerson ? 'paid-row' : ''}>
                  <td>
                    {p.foto
                      ? <img src={p.foto} className="person-photo" alt="" />
                      : <div className="person-initials">{initials(p.nombre)}</div>}
                  </td>
                  <td className="fw">{p.nombre}</td>
                  <td>{p.municipio}</td>
                  <td className="td-num">{p.distrito || ''}</td>
                  <td><span className={`badge ${badgeClass(p.rol)}`}>{p.rol}</span></td>
                  <td>{(p.status || []).map((s: string) => (
                    <span key={s} className={`badge ${statusBadgeClass(s)}`}>{s}</span>
                  ))}</td>
                  <td className="td-num">{p.casilla || ''}</td>
                  <td className="td-num">{eco?.rg_nombre ? 1 : p.rol === 'RG' ? 1 : 0}</td>
                  <td className="td-num">{p.rol === 'Ecoperador' ? myRcs.length : p.rol === 'RC' ? 1 : 0}</td>
                  <td className="td-num">{myObs.length + (p.rol === 'Observador' ? 1 : 0)}</td>
                  <td className="td-num green">${p.pago_acum || 0}</td>
                  <td className="td-num">{1 + (eco?.rg_nombre ? 1 : 0) + myRcs.length + myObs.length}</td>
                  <td>
                    <div className="actions">
                      <button className="btn-edit" title="Editar" onClick={() => router.push(`/admin/editar/${p.id}`)}>✏️</button>
                      <button className="btn-pay" title="Pagos" onClick={() => p.rol === 'Ecoperador' ? openPay(p) : openSimplePay(p)}>💰</button>
                      <button className="btn-danger" title="Eliminar" onClick={() => handleDelete(p.id, p.nombre)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="tfoot">
                <td colSpan={10} style={{ textAlign: 'right', paddingRight: '12px', fontSize: '10px' }}>TOTALES GENERALES</td>
                <td className="td-num">${filtered.reduce((s, p) => s + (p.pago_acum || 0), 0)}</td>
                <td className="td-num">{filtered.length}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
 
      <div className="page-footer">ECOSABANA Sonora 2027 · Partido Verde Ecologista de México · Sistema PVEM</div>
 
      {/* ── MODAL 1x20 ADMIN ── */}
      {modal1x20 && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth:'700px' }}>
            <div className="modal-header">
              <h2>📋 Formato 1x20 — Seguimiento</h2>
              <button className="modal-close" onClick={() => setModal1x20(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Notificaciones pendientes */}
              {notifs.length > 0 && (
                <div style={{ background:'rgba(239,65,53,.08)', border:'1.5px solid #EF4135',
                  borderRadius:'12px', padding:'12px 16px', marginBottom:'16px' }}>
                  <div style={{ fontWeight:700, color:'#c0392b', marginBottom:'8px', fontSize:'13px' }}>
                    🔔 {notifs.length} notificación(es) pendiente(s)
                  </div>
                  {notifs.map((n:any) => (
                    <div key={n.id} style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(239,65,53,.15)' }}>
                      <span style={{ fontSize:'13px', color:'#333' }}>✅ {n.mensaje}</span>
                      <button onClick={async () => {
                        await supabase.from('notificaciones').update({ leida:true }).eq('id', n.id)
                        loadAll()
                      }} style={{ background:'none', border:'1px solid #ccc', borderRadius:'7px',
                        padding:'3px 10px', fontSize:'11px', cursor:'pointer', color:'#666' }}>
                        Marcar leída
                      </button>
                    </div>
                  ))}
                </div>
              )}
 
              {/* Stats rápidas */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
                {[
                  { label:'Total registros', value: formatos1x20.length },
                  { label:'Completos (20/20)', value: formatos1x20.filter((f:any)=>f.completo).length },
                  { label:'En progreso', value: formatos1x20.filter((f:any)=>!f.completo).length },
                ].map(s => (
                  <div key={s.label} className="stats-box">
                    <div className="val">{s.value}</div>
                    <div className="lbl">{s.label}</div>
                  </div>
                ))}
              </div>
 
              {/* Tabla de formatos */}
              {formatos1x20.length === 0 ? (
                <p style={{ textAlign:'center', color:'#aaa', padding:'30px' }}>
                  Ningún usuario ha iniciado el Formato 1x20 aún.
                </p>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                  <thead>
                    <tr>
                      {['Líder','Municipio','Progreso','Estado','Pago','Fecha'].map(h => (
                        <th key={h} style={{ padding:'9px 10px', background:'linear-gradient(135deg,#eef6d0,#f7fbe8)',
                          borderBottom:'2px solid #C8DF8E', color:'#3d5a09', fontWeight:700,
                          fontSize:'10px', textTransform:'uppercase', textAlign:'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formatos1x20.map((f:any) => (
                      <tr key={f.id} style={{ borderBottom:'1px solid #eef3e0',
                        background: f.completo ? 'rgba(0,177,90,.05)' : '#fff' }}>
                        <td style={{ padding:'9px 10px', fontWeight:700 }}>{f.nombre || f.usuarios?.nombre || '—'}</td>
                        <td style={{ padding:'9px 10px' }}>{f.municipio||'—'}</td>
                        <td style={{ padding:'9px 10px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                            <div style={{ flex:1, background:'#e8f5e9', borderRadius:'6px', height:'8px', overflow:'hidden', minWidth:'60px' }}>
                              <div style={{ background:'linear-gradient(90deg,#5a8012,#00B15A)',
                                width: f.completo ? '100%' : '50%', height:'100%' }}/>
                            </div>
                            <span style={{ fontSize:'11px', fontWeight:700, color: f.completo ? '#2a8540' : '#7a8060' }}>
                              {f.completo ? '20/20' : '—/20'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding:'9px 10px' }}>
                          {f.completo
                            ? <span className="badge badge-val">✓ Completo</span>
                            : <span className="badge badge-pend">En progreso</span>}
                        </td>
                        <td style={{ padding:'9px 10px', fontWeight:700, color:'#0a5c3e' }}>
                          {f.completo ? '$300' : '—'}
                        </td>
                        <td style={{ padding:'9px 10px', fontSize:'11px', color:'#7a8060' }}>
                          {new Date(f.created_at).toLocaleDateString('es-MX')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" style={{ background:'#F2F4EE', border:'1px solid #D4D8C8' }}
                onClick={() => setModal1x20(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
 
      {/* ── MODAL ESTADÍSTICAS ── */}
      {statsModal && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth:'600px' }}>
            <div className="modal-header">
              <h2>📊 Estadísticas de Pagos</h2>
              <button className="modal-close" onClick={() => setStatsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {(() => {
                const cat = getCatorcena()
                const yr = new Date().getFullYear()
                const catData: any = {}
                pagos.forEach((r:any) => {
                  const key = `Cat. ${r.catorcena} / ${r.anio}`
                  if (!catData[key]) catData[key] = { total:0, ops:0, eco:0, rg:0, rc:0 }
                  catData[key].total += r.monto
                  catData[key].ops++
                  if (r.tipo === 'eco') catData[key].eco++
                  if (r.tipo === 'rg') catData[key].rg++
                  if (r.tipo?.startsWith('rc')) catData[key].rc++
                })
                const totalPagado = pagos.reduce((a:number,r:any) => a + (r.monto||0), 0)
                const catActual = `Cat. ${cat} / ${yr}`
                return (
                  <>
                    <div style={{ background:'#fff9e6', border:'1.5px solid #FFEE00', borderRadius:'12px',
                      padding:'10px 16px', marginBottom:'16px', fontSize:'13px', fontWeight:700, color:'#5a4a00' }}>
                      📅 Catorcena actual: <strong>{catActual}</strong>
                    </div>
                    <div className="stats-grid">
                      <div className="stats-box"><div className="val">${totalPagado.toLocaleString()}</div><div className="lbl">Total Pagado</div></div>
                      <div className="stats-box"><div className="val">{pagos.length}</div><div className="lbl">Operaciones</div></div>
                      <div className="stats-box"><div className="val">{new Set(pagos.filter((r:any)=>r.tipo==='eco').map((r:any)=>r.persona_id)).size}</div><div className="lbl">Eco Pagados</div></div>
                      <div className="stats-box"><div className="val">{Object.keys(catData).length}</div><div className="lbl">Catorcenas</div></div>
                    </div>
                    <table className="cat-table" style={{ marginTop:'16px' }}>
                      <thead>
                        <tr>
                          <th>Catorcena</th><th>Eco</th><th>RG</th><th>RC</th><th>Operaciones</th><th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(catData).length === 0
                          ? <tr><td colSpan={6} style={{ textAlign:'center', color:'#aaa', padding:'20px' }}>Sin pagos registrados aún</td></tr>
                          : Object.entries(catData).map(([k,v]:any) => (
                            <tr key={k} style={{ background: k===catActual ? 'rgba(255,238,0,.1)' : '' }}>
                              <td>{k} {k===catActual ? '⬅ actual' : ''}</td>
                              <td>{v.eco}</td><td>{v.rg}</td><td>{v.rc}</td>
                              <td>{v.ops}</td>
                              <td style={{ fontWeight:700, color:'#0a5c3e' }}>${v.total.toLocaleString()}</td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </>
                )
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn" style={{ background:'#F2F4EE', border:'1px solid #D4D8C8' }} onClick={() => setStatsModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
 
      {/* ── MODAL PAGOS ── */}
      {payModal && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>💳 Detalle de Pago</h2>
              <button className="modal-close" onClick={() => setPayModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {payModal.simple ? (
                // Simple pay for RG/RC/Obs
                <div className="pay-section">
                  <h4>{payModal.p.rol === 'RG' ? '👤' : payModal.p.rol === 'RC' ? '📋' : '👁️'} {payModal.p.rol} — ${payModal.p.pago_acum || 0}</h4>
                  <div className="pay-person-row">
                    <div>
                      <div className="pay-name">{payModal.p.nombre}
                        {isPaid(payModal.p.id, 'simple') && <span className="already-paid-badge" style={{ marginLeft: '8px' }}>✓ Pagado Cat.{payModal.cat}</span>}
                      </div>
                      <div className="pay-account">{payModal.p.banco || 'Sin banco'}{payModal.p.cuenta ? ' · ' + payModal.p.cuenta : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#0a5c3e' }}>${payModal.p.pago_acum || 0}</strong>
                      <button className={`btn-pay-action${isPaid(payModal.p.id, 'simple') ? ' paid' : ''}`}
                        onClick={() => doRegisterPay(payModal.p.id, 'simple', payModal.p.pago_acum || 0)}>
                        {isPaid(payModal.p.id, 'simple') ? '✓ Pagado' : '💳 Pagar'}
                      </button>
                    </div>
                  </div>
                  <div className="pay-total">
                    <span>Total (Cat. {payModal.cat}/{payModal.yr})</span>
                    <span>${payModal.p.pago_acum || 0}</span>
                  </div>
                </div>
              ) : (
                // Full ecoperador pay
                <>
                  <div className="pay-section">
                    <h4>🌱 Ecoperador — ${payModal.ecoTotal} ({payModal.hasRG ? '$100 por RG + ' : ''}$50 × {payModal.myRcs.length} RC)</h4>
                    <div className="pay-person-row">
                      <div>
                        <div className="pay-name">{payModal.p.nombre}
                          {isPaid(payModal.p.id, 'eco') && <span className="already-paid-badge" style={{ marginLeft: '8px' }}>✓ Pagado Cat.{payModal.cat}</span>}
                        </div>
                        <div className="pay-account">{payModal.p.banco || 'Sin banco'}{payModal.p.cuenta ? ' · Cuenta: ' + payModal.p.cuenta : ''}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#0a5c3e' }}>${payModal.ecoTotal}</strong>
                        <button className={`btn-pay-action${isPaid(payModal.p.id, 'eco') ? ' paid' : ''}`}
                          onClick={() => doRegisterPay(payModal.p.id, 'eco', payModal.ecoTotal)}>
                          {isPaid(payModal.p.id, 'eco') ? '✓ Pagado' : '💳 Pagar'}
                        </button>
                      </div>
                    </div>
                  </div>
 
                  {payModal.hasRG && (
                    <div className="pay-section" style={{ marginTop: '10px' }}>
                      <h4>👤 RG — ${payModal.rgTotal} ($300 base + $50 × {payModal.myRcs.length} RC)</h4>
                      <div className="pay-person-row">
                        <div>
                          <div className="pay-name">{payModal.eco?.rg_nombre || '(sin nombre)'}
                            {isPaid(payModal.p.id, 'rg') && <span className="already-paid-badge" style={{ marginLeft: '8px' }}>✓ Pagado</span>}
                          </div>
                          <div className="pay-account">{payModal.eco?.rg_banco || 'Sin banco'}{payModal.eco?.rg_cuenta ? ' · Cuenta: ' + payModal.eco.rg_cuenta : ''}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: '#185FA5' }}>${payModal.rgTotal}</strong>
                          <button className={`btn-pay-action${isPaid(payModal.p.id, 'rg') ? ' paid' : ''}`}
                            style={{ background: isPaid(payModal.p.id, 'rg') ? '' : '#185FA5' }}
                            onClick={() => doRegisterPay(payModal.p.id, 'rg', payModal.rgTotal)}>
                            {isPaid(payModal.p.id, 'rg') ? '✓ Pagado' : '💳 Pagar RG'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
 
                  {payModal.myRcs.length > 0 && (
                    <div className="pay-section" style={{ marginTop: '10px' }}>
                      <h4>📋 RCs — $200 c/u</h4>
                      {payModal.myRcs.map((rc: any) => (
                        <div key={rc.id} className="pay-person-row">
                          <div>
                            <div className="pay-name">RC {rc.slot}: {rc.nombre || '(sin nombre)'}
                              {isPaid(payModal.p.id, 'rc_' + rc.slot) && <span className="already-paid-badge" style={{ marginLeft: '8px' }}>✓ Pagado</span>}
                            </div>
                            <div className="pay-account">{rc.banco || 'Sin banco'}{rc.cuenta ? ' · Cuenta: ' + rc.cuenta : ''}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: '#5a8012' }}>$200</strong>
                            <button className={`btn-pay-action${isPaid(payModal.p.id, 'rc_' + rc.slot) ? ' paid' : ''}`}
                              style={{ background: isPaid(payModal.p.id, 'rc_' + rc.slot) ? '' : '#5a8012' }}
                              onClick={() => doRegisterPay(payModal.p.id, 'rc_' + rc.slot, 200)}>
                              {isPaid(payModal.p.id, 'rc_' + rc.slot) ? '✓ Pagado' : '💳 Pagar RC'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
 
                  <div className="pay-total">
                    <span>Total a distribuir (Cat. {payModal.cat}/{payModal.yr})</span>
                    <span>${payModal.ecoTotal + payModal.rgTotal + payModal.myRcs.length * 200}</span>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" style={{ background: '#F2F4EE', border: '1px solid #D4D8C8' }} onClick={() => setPayModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
 
      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      {confirmId && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>⚠️ Confirmar eliminación</h2>
              <button className="modal-close" onClick={() => setConfirmId(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '15px', color: '#333' }}>¿Estás seguro de eliminar a <strong>{confirmName}</strong>? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn" style={{ background: '#F2F4EE', border: '1px solid #D4D8C8' }} onClick={() => setConfirmId(null)}>Cancelar</button>
              <button className="btn" style={{ background: '#EF4135', color: '#fff', fontWeight: 700 }} onClick={confirmDelete}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}