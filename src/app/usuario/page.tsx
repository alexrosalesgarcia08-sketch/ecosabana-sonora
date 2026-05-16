'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { initials, badgeClass, statusBadgeClass, getCatorcena } from '@/lib/constants'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
export default function UsuarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')
  const [personas, setPersonas] = useState<any[]>([])
  const [ecos, setEcos] = useState<any[]>([])
  const [rcsData, setRcsData] = useState<any[]>([])
  const [obsData, setObsData] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterRol, setFilterRol] = useState('')
  const [userName, setUserName] = useState('Usuario')
  const [stats, setStats] = useState({ eco: 0, rg: 0, rc: 0, obs: 0, total: 0 })
  const [payModal, setPayModal] = useState<any>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmName, setConfirmName] = useState('')
 
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/'); return }
      setUserId(data.user.id)
      const { data: u } = await supabase.from('usuarios').select('nombre').eq('id', data.user.id).single()
      setUserName(u?.nombre || data.user.email || 'Usuario')
      loadAll(data.user.id)
    })
  }, [])
 
  async function loadAll(userId: string) {
    const [{ data: p }, { data: e }, { data: r }, { data: o }, { data: pg }] = await Promise.all([
      supabase.from('personas').select('*').eq('creado_por', userId).order('created_at', { ascending: false }),
      supabase.from('ecoperadores').select('*'),
      supabase.from('rcs_eco').select('*'),
      supabase.from('observadores_rc').select('*'),
      supabase.from('pagos').select('*'),
    ])
    const ps = p ?? []
    setPersonas(ps); setEcos(e ?? []); setRcsData(r ?? []); setObsData(o ?? []); setPagos(pg ?? [])
 
    const ecoCount = ps.filter((x: any) => x.rol === 'Ecoperador').length
    const es = e ?? [], rs = r ?? [], os = o ?? []
    setStats({
      eco: ecoCount,
      rg: ps.filter((x: any) => x.rol === 'RG').length + es.filter((x: any) => x.rg_nombre || x.rg_tel).length,
      rc: ps.filter((x: any) => x.rol === 'RC').length + rs.length,
      obs: ps.filter((x: any) => x.rol === 'Observador').length + os.length,
      total: ps.length,
    })
    setLoading(false)
  }
 
  async function handleDelete(id: string, nombre: string) {
    setConfirmId(id); setConfirmName(nombre)
  }
 
  async function confirmDelete() {
    if (!confirmId) return
    await supabase.from('personas').delete().eq('id', confirmId).eq('creado_por', userId)
    setConfirmId(null)
    loadAll(userId)
  }
 
  function isPaid(personaId: string, tipo: string) {
    const cat = getCatorcena(); const yr = new Date().getFullYear()
    return pagos.some(r => r.persona_id === personaId && r.tipo === tipo && r.catorcena === cat && r.anio === yr)
  }
 
  async function doRegisterPay(personaId: string, tipo: string, monto: number) {
    if (monto <= 0) return
    const cat = getCatorcena(); const yr = new Date().getFullYear()
    const already = pagos.find(r => r.persona_id === personaId && r.tipo === tipo && r.catorcena === cat && r.anio === yr)
    if (already) { alert(`⚠️ Este pago ya fue registrado en la catorcena ${cat}/${yr}`); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pagos').insert({ persona_id: personaId, tipo, monto, catorcena: cat, anio: yr, registrado_por: user?.id })
    setPayModal(null)
    loadAll(userId)
    alert(`✅ Pago de $${monto} registrado — Catorcena ${cat}/${yr}`)
  }
 
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
 
  const filtered = personas.filter(p =>
    (!search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.celular?.includes(search)) &&
    (!filterRol || p.rol === filterRol)
  )
 
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f4f7ec' }}>
      <p style={{ color: '#5a8012', fontWeight: 700 }}>Cargando...</p>
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
          <button className="u-logout-btn" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Cerrar sesión
          </button>
          <button className="u-add-btn" onClick={() => router.push('/usuario/formato-1x20')}
            style={{ background:'#1a73c8', marginRight:'4px' }}>
            📋 Formato 1x20
          </button>
          <button className="u-add-btn" onClick={() => router.push('/usuario/nueva-persona')}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar Persona
          </button>
        </div>
      </div>
 
      {/* Stats */}
      <div className="user-stats-row">
        {[
          { label: 'TOTAL', value: stats.total },
          { label: 'ECOPERADORES', value: stats.eco },
          { label: 'RG', value: stats.rg },
          { label: 'RC', value: stats.rc },
          { label: 'OBSERVADORES', value: stats.obs },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ minWidth: '110px' }}>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
 
      {/* Filters */}
      <div className="filters" style={{ padding: '14px 28px' }}>
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o celular..." />
        </div>
        <select value={filterRol} onChange={e => setFilterRol(e.target.value)}>
          <option value="">Todos los roles</option>
          <option>Ecoperador</option><option>RG</option><option>RC</option><option>Observador</option>
        </select>
      </div>
 
      <div className="result-count">{filtered.length} persona{filtered.length !== 1 ? 's' : ''}</div>
 
      {/* Table */}
      <div className="table-wrap" style={{ margin: '0 28px 32px' }}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Nombre</th>
              <th>Municipio</th>
              <th>Rol</th>
              <th>Status</th>
              <th className="center">Secc.</th>
              <th className="center">RG</th>
              <th className="center">RC</th>
              <th className="center">Obs</th>
              <th className="center">Pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#a8b88a' }}>
                🌱 Aún no has registrado personas. ¡Agrega la primera!
              </td></tr>
            ) : filtered.map(p => {
              const eco = ecos.find(e => e.id === p.id)
              const myRcs = rcsData.filter(r => r.eco_id === p.id)
              const myObs = obsData.filter(o => myRcs.some(r => r.id === o.rc_id))
              return (
                <tr key={p.id}>
                  <td>
                    {p.foto
                      ? <img src={p.foto} className="person-photo" alt="" />
                      : <div className="person-initials">{initials(p.nombre)}</div>}
                  </td>
                  <td className="fw">{p.nombre}</td>
                  <td>{p.municipio}</td>
                  <td><span className={`badge ${badgeClass(p.rol)}`}>{p.rol}</span></td>
                  <td>{(p.status || []).map((s: string) => (
                    <span key={s} className={`badge ${statusBadgeClass(s)}`}>{s}</span>
                  ))}</td>
                  <td className="td-num">{p.casilla || ''}</td>
                  <td className="td-num">{eco?.rg_nombre ? 1 : p.rol === 'RG' ? 1 : 0}</td>
                  <td className="td-num">{p.rol === 'Ecoperador' ? myRcs.length : p.rol === 'RC' ? 1 : 0}</td>
                  <td className="td-num">{myObs.length + (p.rol === 'Observador' ? 1 : 0)}</td>
                  <td className="td-num green">${p.pago_acum || 0}</td>
                  <td>
                    <div className="actions">
                      <button className="btn-edit" onClick={() => router.push(`/usuario/editar/${p.id}`)}>✏️</button>
                      <button className="btn-pay" onClick={() => p.rol === 'Ecoperador' ? openPay(p) : openSimplePay(p)}>💰</button>
                      <button className="btn-danger" onClick={() => handleDelete(p.id, p.nombre)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
 
      <div className="page-footer">ECOSABANA Sonora 2027 · Partido Verde Ecologista de México</div>
 
      {/* Modal Pagos */}
      {payModal && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>💳 Detalle de Pago</h2>
              <button className="modal-close" onClick={() => setPayModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {payModal.simple ? (
                <div className="pay-section">
                  <h4>{payModal.p.rol === 'RG' ? '👤' : payModal.p.rol === 'RC' ? '📋' : '👁️'} {payModal.p.rol} — ${payModal.p.pago_acum || 0}</h4>
                  <div className="pay-person-row">
                    <div>
                      <div className="pay-name">{payModal.p.nombre}
                        {isPaid(payModal.p.id, 'simple') && <span className="already-paid-badge" style={{ marginLeft: '8px' }}>✓ Pagado Cat.{payModal.cat}</span>}
                      </div>
                      <div className="pay-account">{payModal.p.banco || 'Sin banco'}{payModal.p.cuenta ? ' · ' + payModal.p.cuenta : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <strong style={{ color: '#0a5c3e' }}>${payModal.p.pago_acum || 0}</strong>
                      <button className={`btn-pay-action${isPaid(payModal.p.id, 'simple') ? ' paid' : ''}`}
                        onClick={() => doRegisterPay(payModal.p.id, 'simple', payModal.p.pago_acum || 0)}>
                        {isPaid(payModal.p.id, 'simple') ? '✓ Pagado' : '💳 Pagar'}
                      </button>
                    </div>
                  </div>
                  <div className="pay-total"><span>Total (Cat. {payModal.cat}/{payModal.yr})</span><span>${payModal.p.pago_acum || 0}</span></div>
                </div>
              ) : (
                <>
                  <div className="pay-section">
                    <h4>🌱 Ecoperador — ${payModal.ecoTotal}</h4>
                    <div className="pay-person-row">
                      <div>
                        <div className="pay-name">{payModal.p.nombre}</div>
                        <div className="pay-account">{payModal.p.banco || 'Sin banco'}{payModal.p.cuenta ? ' · ' + payModal.p.cuenta : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <strong>${payModal.ecoTotal}</strong>
                        <button className={`btn-pay-action${isPaid(payModal.p.id, 'eco') ? ' paid' : ''}`}
                          onClick={() => doRegisterPay(payModal.p.id, 'eco', payModal.ecoTotal)}>
                          {isPaid(payModal.p.id, 'eco') ? '✓ Pagado' : '💳 Pagar'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {payModal.hasRG && (
                    <div className="pay-section" style={{ marginTop: '10px' }}>
                      <h4>👤 RG — ${payModal.rgTotal}</h4>
                      <div className="pay-person-row">
                        <div>
                          <div className="pay-name">{payModal.eco?.rg_nombre}</div>
                          <div className="pay-account">{payModal.eco?.rg_banco}{payModal.eco?.rg_cuenta ? ' · ' + payModal.eco.rg_cuenta : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <strong>${payModal.rgTotal}</strong>
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
                            <div className="pay-name">RC {rc.slot}: {rc.nombre}</div>
                            <div className="pay-account">{rc.banco}{rc.cuenta ? ' · ' + rc.cuenta : ''}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <strong>$200</strong>
                            <button className={`btn-pay-action${isPaid(payModal.p.id, 'rc_' + rc.slot) ? ' paid' : ''}`}
                              style={{ background: isPaid(payModal.p.id, 'rc_' + rc.slot) ? '' : '#5a8012' }}
                              onClick={() => doRegisterPay(payModal.p.id, 'rc_' + rc.slot, 200)}>
                              {isPaid(payModal.p.id, 'rc_' + rc.slot) ? '✓ Pagado' : '💳 Pagar'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pay-total">
                    <span>Total (Cat. {payModal.cat}/{payModal.yr})</span>
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
 
      {/* Modal Confirmar */}
      {confirmId && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header"><h2>⚠️ Confirmar eliminación</h2><button className="modal-close" onClick={() => setConfirmId(null)}>×</button></div>
            <div className="modal-body">
              <p style={{ fontSize: '15px' }}>¿Eliminar a <strong>{confirmName}</strong>?</p>
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
 