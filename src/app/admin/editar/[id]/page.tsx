'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { MUNICIPIOS, BANCOS, RC_LABELS, STATUS_OPTS, calcPago } from '@/lib/constants'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
const emptyObs = () => ({ nombre: '', tel: '', banco: '', cuenta: '' })
const emptyRc = () => ({ nombre: '', tel: '', banco: '', cuenta: '', obs1: emptyObs(), obs2: emptyObs() })
 
export default function EditarPersonaAdmin() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [foto, setFoto] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<any>({
    nombre: '', celular: '', municipio: '', distrito: '', rol: '',
    banco: '', cuenta: '', folio: '', casilla: '', status: [],
    rg_nombre: '', rg_tel: '', rg_banco: '', rg_cuenta: '',
    rcA: emptyRc(), rcB: emptyRc(), rcC: emptyRc(), rcD: emptyRc(),
  })
 
  useEffect(() => { if (id) loadPersona() }, [id])
 
  async function loadPersona() {
    const [{ data: p }, { data: eco }, { data: rcs }] = await Promise.all([
      supabase.from('personas').select('*').eq('id', id).single(),
      supabase.from('ecoperadores').select('*').eq('id', id).single(),
      supabase.from('rcs_eco').select('*, observadores_rc(*)').eq('eco_id', id),
    ])
    if (!p) { router.push('/admin'); return }
 
    const rcMap: any = { rcA: emptyRc(), rcB: emptyRc(), rcC: emptyRc(), rcD: emptyRc() }
    ;(rcs ?? []).forEach((rc: any) => {
      if (rc.slot) {
        const obs = rc.observadores_rc || []
        rcMap['rc' + rc.slot] = {
          nombre: rc.nombre || '', tel: rc.tel || '', banco: rc.banco || '', cuenta: rc.cuenta || '',
          obs1: obs.find((o: any) => o.numero === 1) ? { nombre: obs.find((o: any) => o.numero === 1).nombre || '', tel: obs.find((o: any) => o.numero === 1).tel || '', banco: obs.find((o: any) => o.numero === 1).banco || '', cuenta: obs.find((o: any) => o.numero === 1).cuenta || '' } : emptyObs(),
          obs2: obs.find((o: any) => o.numero === 2) ? { nombre: obs.find((o: any) => o.numero === 2).nombre || '', tel: obs.find((o: any) => o.numero === 2).tel || '', banco: obs.find((o: any) => o.numero === 2).banco || '', cuenta: obs.find((o: any) => o.numero === 2).cuenta || '' } : emptyObs(),
        }
      }
    })
 
    if (p.foto) setFoto(p.foto)
    setForm({
      nombre: p.nombre || '', celular: p.celular || '',
      municipio: p.municipio || '', distrito: p.distrito || '',
      rol: p.rol || '', banco: p.banco || '', cuenta: p.cuenta || '',
      folio: p.folio || '', casilla: p.casilla || '',
      status: p.status || [],
      rg_nombre: eco?.rg_nombre || '', rg_tel: eco?.rg_tel || '',
      rg_banco: eco?.rg_banco || '', rg_cuenta: eco?.rg_cuenta || '',
      ...rcMap
    })
    setLoading(false)
  }
 
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const setRc = (slot: string, k: string, v: string) => setForm((f: any) => ({ ...f, ['rc' + slot]: { ...f['rc' + slot], [k]: v } }))
  const setObs = (slot: string, num: string, k: string, v: string) => setForm((f: any) => ({ ...f, ['rc' + slot]: { ...f['rc' + slot], ['obs' + num]: { ...f['rc' + slot]['obs' + num], [k]: v } } }))
 
  function toggleStatus(s: string) {
    setForm((f: any) => {
      const cur = f.status as string[]
      if (cur.includes(s)) return { ...f, status: cur.filter((x: string) => x !== s) }
      if (cur.length >= 3) return f
      return { ...f, status: [...cur, s] }
    })
  }
 
  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setFoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }
 
  async function handleSave() {
    if (!form.nombre) { alert('El nombre es requerido'); return }
    setSaving(true)
 
    const hasRG = !!(form.rg_nombre || form.rg_tel)
    const rcCount = RC_LABELS.filter(s => form['rc' + s]?.nombre || form['rc' + s]?.tel).length
    const pago = calcPago(form.rol, hasRG, rcCount)
 
    const { error } = await supabase.from('personas').update({
      nombre: form.nombre, celular: form.celular,
      municipio: form.municipio, distrito: parseInt(form.distrito) || 0,
      rol: form.rol, banco: form.banco, cuenta: form.cuenta,
      folio: form.folio, casilla: parseInt(form.casilla) || 0,
      status: form.status, pago_acum: pago, foto: foto || null,
    }).eq('id', id)
 
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
 
    if (form.rol === 'Ecoperador') {
      const { data: existing } = await supabase.from('ecoperadores').select('id').eq('id', id).single()
      const ecoData = { rg_nombre: form.rg_nombre, rg_tel: form.rg_tel, rg_banco: form.rg_banco, rg_cuenta: form.rg_cuenta }
      if (existing) {
        await supabase.from('ecoperadores').update(ecoData).eq('id', id)
      } else {
        await supabase.from('ecoperadores').insert({ id, ...ecoData })
      }
 
      for (const slot of RC_LABELS) {
        const rc = form['rc' + slot]
        if (!rc.nombre && !rc.tel) continue
        const { data: existingRc } = await supabase.from('rcs_eco').select('id').eq('eco_id', id).eq('slot', slot).single()
        let rcId: string
 
        if (existingRc) {
          await supabase.from('rcs_eco').update({ nombre: rc.nombre, tel: rc.tel, banco: rc.banco, cuenta: rc.cuenta }).eq('id', existingRc.id)
          rcId = existingRc.id
        } else {
          const { data: newRc } = await supabase.from('rcs_eco').insert({ eco_id: id, slot, nombre: rc.nombre, tel: rc.tel, banco: rc.banco, cuenta: rc.cuenta }).select().single()
          rcId = newRc?.id
        }
 
        for (const num of ['1', '2']) {
          const obs = rc['obs' + num]
          if (!obs.nombre && !obs.tel) continue
          const { data: existingObs } = await supabase.from('observadores_rc').select('id').eq('rc_id', rcId).eq('numero', parseInt(num)).single()
          if (existingObs) {
            await supabase.from('observadores_rc').update({ nombre: obs.nombre, tel: obs.tel, banco: obs.banco, cuenta: obs.cuenta }).eq('id', existingObs.id)
          } else {
            await supabase.from('observadores_rc').insert({ rc_id: rcId, numero: parseInt(num), nombre: obs.nombre, tel: obs.tel, banco: obs.banco, cuenta: obs.cuenta })
          }
        }
      }
    }
 
    router.push('/admin')
  }
 
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f4f7ec' }}>
      <p style={{ color: '#5a8012', fontWeight: 700 }}>Cargando...</p>
    </div>
  )
 
  return (
    <div style={{ minHeight: '100vh', background: '#f4f7ec', paddingBottom: '40px' }}>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn btn-white" onClick={() => router.push('/admin')}>← Volver</button>
          <div className="header-title"><h1>Editar Persona</h1><p>Sistema de gestión PVEM</p></div>
        </div>
      </div>
 
      <div style={{ maxWidth: '800px', margin: '32px auto', padding: '0 24px' }}>
        <div className="modal" style={{ borderRadius: '18px', overflow: 'visible' }}>
          <div className="modal-header"><h2>Editando: {form.nombre}</h2></div>
          <div className="modal-body">
            <div className="form-grid">
 
              {/* FOTO */}
              <div className="form-group full">
                <div className="photo-upload-wrap">
                  {foto
                    ? <img src={foto} style={{ width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #C8DF8E' }} alt="foto" />
                    : <div className="photo-placeholder" onClick={() => fileRef.current?.click()}>📷</div>}
                  <div>
                    <button type="button" className="photo-upload-btn" onClick={() => fileRef.current?.click()}>⬆ Cambiar foto</button>
                    <p style={{ fontSize: '11px', color: '#7a8060', marginTop: '4px' }}>JPG, PNG · Máx 2MB</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFoto} />
                </div>
              </div>
 
              <div className="form-group">
                <label>Nombre completo <span className="req">*</span></label>
                <input type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Celular</label>
                <input type="tel" value={form.celular} onChange={e => set('celular', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Sección (No. casilla)</label>
                <input type="number" value={form.casilla} onChange={e => set('casilla', e.target.value)} />
              </div>
              <div className="form-group">
                <label>No. de Folio</label>
                <input type="text" value={form.folio} onChange={e => set('folio', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Municipio</label>
                <select className="form-select" value={form.municipio} onChange={e => set('municipio', e.target.value)}>
                  <option value="">Selecciona</option>
                  {MUNICIPIOS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Distrito</label>
                <input type="number" value={form.distrito} onChange={e => set('distrito', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Rol</label>
                <select className="form-select" value={form.rol} onChange={e => set('rol', e.target.value)}>
                  <option value="">Selecciona rol</option>
                  <option>Ecoperador</option><option>RG</option><option>RC</option><option>Observador</option>
                </select>
              </div>
              <div className="form-group full">
                <label>Status (máx. 3)</label>
                <div className="status-checks">
                  {STATUS_OPTS.map(s => (
                    <label key={s} className="status-check">
                      <input type="checkbox" checked={form.status.includes(s)} onChange={() => toggleStatus(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Banco</label>
                <select className="form-select" value={form.banco} onChange={e => set('banco', e.target.value)}>
                  <option value="">Selecciona</option>
                  {BANCOS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Cuenta</label>
                <input type="text" value={form.cuenta} onChange={e => set('cuenta', e.target.value)} />
              </div>
 
              {form.rol === 'Ecoperador' && <>
                <div className="section-title">Datos del RG</div>
                <div className="form-group">
                  <label>Nombre del RG</label>
                  <input type="text" value={form.rg_nombre} onChange={e => set('rg_nombre', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Teléfono RG</label>
                  <input type="tel" value={form.rg_tel} onChange={e => set('rg_tel', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Banco RG</label>
                  <select className="form-select" value={form.rg_banco} onChange={e => set('rg_banco', e.target.value)}>
                    <option value="">Selecciona</option>
                    {BANCOS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cuenta RG</label>
                  <input type="text" value={form.rg_cuenta} onChange={e => set('rg_cuenta', e.target.value)} />
                </div>
 
                <div className="section-title">RCs (A, B, C, D)</div>
                {RC_LABELS.map(slot => (
                  <div key={slot} className="form-group full">
                    <div className="subsection">
                      <h4>RC — {slot}</h4>
                      <div className="sub-grid">
                        <div className="form-group">
                          <label>Nombre RC {slot}</label>
                          <input type="text" value={form['rc' + slot]?.nombre || ''} onChange={e => setRc(slot, 'nombre', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Teléfono</label>
                          <input type="tel" value={form['rc' + slot]?.tel || ''} onChange={e => setRc(slot, 'tel', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Banco RC</label>
                          <select className="form-select" value={form['rc' + slot]?.banco || ''} onChange={e => setRc(slot, 'banco', e.target.value)}>
                            <option value="">Selecciona</option>
                            {BANCOS.map(b => <option key={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Cuenta RC</label>
                          <input type="text" value={form['rc' + slot]?.cuenta || ''} onChange={e => setRc(slot, 'cuenta', e.target.value)} />
                        </div>
                      </div>
                      {(form['rc' + slot]?.nombre || form['rc' + slot]?.tel) && <>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#7a8060', margin: '10px 0 7px' }}>Observadores de RC {slot}</p>
                        {['1', '2'].map(num => (
                          <div key={num} className="sub-grid" style={{ marginBottom: '8px' }}>
                            <div className="form-group">
                              <label>Obs {num} Nombre</label>
                              <input type="text" value={form['rc' + slot]?.['obs' + num]?.nombre || ''} onChange={e => setObs(slot, num, 'nombre', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label>Obs {num} Tel</label>
                              <input type="tel" value={form['rc' + slot]?.['obs' + num]?.tel || ''} onChange={e => setObs(slot, num, 'tel', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label>Obs {num} Banco</label>
                              <select className="form-select" value={form['rc' + slot]?.['obs' + num]?.banco || ''} onChange={e => setObs(slot, num, 'banco', e.target.value)}>
                                <option value="">Selecciona</option>
                                {BANCOS.map(b => <option key={b}>{b}</option>)}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Obs {num} Cuenta</label>
                              <input type="text" value={form['rc' + slot]?.['obs' + num]?.cuenta || ''} onChange={e => setObs(slot, num, 'cuenta', e.target.value)} />
                            </div>
                          </div>
                        ))}
                      </>}
                    </div>
                  </div>
                ))}
              </>}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" style={{ background: '#F2F4EE', border: '1px solid #D4D8C8' }} onClick={() => router.push('/admin')}>Cancelar</button>
            <button className="btn btn-green" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : '✓ Guardar Cambios'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}