'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
const MUNICIPIOS = ['Aconchi','Agua Prieta','Alamos','Altar','Arivechi','Arizpe','Atil','Bacadehuachi','Bacanora','Bacerac','Bacoachi','Bacum','Banamichi','Baviacora','Bavispe','Benjamin Hill','Caborca','Cajeme','Cananea','Carbo','Colorada','Cucurpe','Cumpas','Divisaderos','Empalme','Etchojoa','Fronteras','Granados','Guaymas','Hermosillo','Huachinera','Huasabas','Huatabampo','Huepac','Imuris','Magdalena','Mazatan','Moctezuma','Naco','Nacori Chico','Nacozari de Garcia','Navojoa','Nogales','Onavas','Opodepe','Oquitoa','Pitiquito','Puerto Penasco','Quiriego','Rayon','Rosario','Sahuaripa','San Felipe de Jesus','San Javier','San Luis Rio Colorado','San Miguel de Horcasitas','San Pedro de la Cueva','Santa Ana','Santa Cruz','Saric','Soyopa','Suaqui Grande','Tepache','Trincheras','Tubutama','Ures','Villa Hidalgo','Villa Pesqueira','Yecora']
const BANCOS = ['BBVA','Banamex','Santander','HSBC','Banorte','Inbursa','Azteca','Coppel','BanBajio','Afirme','Mifel','Multiva','Scotiabank','Hey Banco','SPIN','Otro']
const RC_SLOTS = ['A','B','C','D']
const STATUS_OPTS = ['Pendiente','Validado','Credencializado','Localizado']
 
export default function NuevaPersonaUsuario() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [foto, setFoto] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<any>({
    nombre:'', celular:'', municipio:'', distrito:'', rol:'',
    banco:'', cuenta:'', folio:'', casilla:'', status:[],
    rg_nombre:'', rg_tel:'', rg_banco:'', rg_cuenta:'',
    rcA:{nombre:'',tel:'',banco:'',cuenta:'', obs1:{nombre:'',tel:'',banco:'',cuenta:''}, obs2:{nombre:'',tel:'',banco:'',cuenta:''}},
    rcB:{nombre:'',tel:'',banco:'',cuenta:'', obs1:{nombre:'',tel:'',banco:'',cuenta:''}, obs2:{nombre:'',tel:'',banco:'',cuenta:''}},
    rcC:{nombre:'',tel:'',banco:'',cuenta:'', obs1:{nombre:'',tel:'',banco:'',cuenta:''}, obs2:{nombre:'',tel:'',banco:'',cuenta:''}},
    rcD:{nombre:'',tel:'',banco:'',cuenta:'', obs1:{nombre:'',tel:'',banco:'',cuenta:''}, obs2:{nombre:'',tel:'',banco:'',cuenta:''}},
  })
 
  const set = (k:string, v:any) => setForm((f:any)=>({...f,[k]:v}))
  const setRc = (slot:string, k:string, v:string) => setForm((f:any)=>({...f,['rc'+slot]:{...f['rc'+slot],[k]:v}}))
  const setObs = (slot:string, num:string, k:string, v:string) => setForm((f:any)=>({...f,['rc'+slot]:{...f['rc'+slot],['obs'+num]:{...f['rc'+slot]['obs'+num],[k]:v}}}))
 
  function toggleStatus(s:string) {
    setForm((f:any) => {
      const cur = f.status as string[]
      if (cur.includes(s)) return {...f, status: cur.filter(x=>x!==s)}
      if (cur.length >= 3) return f
      return {...f, status: [...cur, s]}
    })
  }
 
  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2*1024*1024) { alert('Máximo 2MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setFoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }
 
  async function handleSave() {
    if (!form.nombre || !form.rol) { alert('Nombre y rol son requeridos'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
 
    const hasRG = form.rg_nombre || form.rg_tel ? 1 : 0
    const rcCount = RC_SLOTS.filter(s => form['rc'+s]?.nombre || form['rc'+s]?.tel).length
    let pago = 0
    if (form.rol === 'Ecoperador') pago = hasRG * 100 + rcCount * 50
    else if (form.rol === 'RG') pago = 300
    else if (form.rol === 'RC') pago = 200
    else if (form.rol === 'Observador') pago = 200
 
    const { data: persona, error } = await supabase.from('personas').insert({
      nombre: form.nombre, celular: form.celular,
      municipio: form.municipio, distrito: parseInt(form.distrito)||0,
      rol: form.rol, banco: form.banco, cuenta: form.cuenta,
      folio: form.folio, casilla: parseInt(form.casilla)||0,
      status: form.status, pago_acum: pago,
      foto: foto||null,
      creado_por: user?.id
    }).select().single()
 
    if (error) { alert('Error: '+error.message); setSaving(false); return }
 
    if (form.rol === 'Ecoperador' && persona) {
      await supabase.from('ecoperadores').insert({
        id: persona.id,
        rg_nombre: form.rg_nombre, rg_tel: form.rg_tel,
        rg_banco: form.rg_banco, rg_cuenta: form.rg_cuenta,
      })
      for (const slot of RC_SLOTS) {
        const rc = form['rc'+slot]
        if (rc.nombre || rc.tel) {
          const { data: rcRow } = await supabase.from('rcs_eco').insert({
            eco_id: persona.id, slot,
            nombre: rc.nombre, tel: rc.tel, banco: rc.banco, cuenta: rc.cuenta
          }).select().single()
          if (rcRow) {
            for (const num of ['1','2']) {
              const obs = rc['obs'+num]
              if (obs.nombre || obs.tel) {
                await supabase.from('observadores_rc').insert({
                  rc_id: rcRow.id, numero: parseInt(num),
                  nombre: obs.nombre, tel: obs.tel, banco: obs.banco, cuenta: obs.cuenta
                })
              }
            }
          }
        }
      }
    }
    router.push('/usuario')
  }
 
  return (
    <div style={{minHeight:'100vh',background:'#f4f7ec',padding:'0 0 40px'}}>
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <button className="btn btn-white" onClick={()=>router.push('/usuario')}>← Volver</button>
          <div className="header-title"><h1>Agregar Persona</h1><p>Sistema de gestión de estructura PVEM</p></div>
        </div>
      </div>
 
      <div style={{maxWidth:'800px',margin:'32px auto',padding:'0 24px'}}>
        <div className="modal" style={{borderRadius:'18px',overflow:'visible'}}>
          <div className="modal-header"><h2>Nueva Persona</h2></div>
          <div className="modal-body">
            <div className="form-grid">
 
              {/* FOTO */}
              <div className="form-group full">
                <div className="photo-upload-wrap">
                  {foto
                    ? <img src={foto} className="photo-preview-img" style={{display:'block'}} alt="foto"/>
                    : <div className="photo-placeholder" onClick={()=>fileRef.current?.click()}>📷</div>
                  }
                  <div>
                    <button className="photo-upload-btn" onClick={()=>fileRef.current?.click()}>⬆ Subir foto</button>
                    <p style={{fontSize:'11px',color:'#7a8060',marginTop:'4px'}}>JPG, PNG · Máx 2MB</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFoto}/>
                </div>
              </div>
 
              {/* NOMBRE Y CELULAR */}
              <div className="form-group">
                <label>Nombre completo <span className="req">*</span></label>
                <input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Nombres primero"/>
              </div>
              <div className="form-group">
                <label>Celular <span className="req">*</span></label>
                <input type="tel" value={form.celular} onChange={e=>set('celular',e.target.value)} placeholder="10 dígitos"/>
              </div>
 
              {/* CASILLA Y FOLIO */}
              <div className="form-group">
                <label>Sección (No. casilla)</label>
                <input type="number" value={form.casilla} onChange={e=>set('casilla',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>No. de Folio</label>
                <input type="text" value={form.folio} onChange={e=>set('folio',e.target.value)}/>
              </div>
 
              {/* MUNICIPIO Y DISTRITO */}
              <div className="form-group">
                <label>Municipio <span className="req">*</span></label>
                <select className="form-select" value={form.municipio} onChange={e=>set('municipio',e.target.value)}>
                  <option value="">Selecciona municipio</option>
                  {MUNICIPIOS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Distrito</label>
                <input type="number" value={form.distrito} onChange={e=>set('distrito',e.target.value)}/>
              </div>
 
              {/* ROL */}
              <div className="form-group full">
                <label>Rol <span className="req">*</span></label>
                <select className="form-select" value={form.rol} onChange={e=>set('rol',e.target.value)}>
                  <option value="">Selecciona rol</option>
                  <option>Ecoperador</option>
                  <option>RG</option>
                  <option>RC</option>
                  <option>Observador</option>
                </select>
              </div>
 
              {/* STATUS */}
              <div className="form-group full">
                <label>Status (máx. 3)</label>
                <div className="status-checks">
                  {STATUS_OPTS.map(s=>(
                    <label key={s} className="status-check">
                      <input type="checkbox" checked={form.status.includes(s)} onChange={()=>toggleStatus(s)}/>
                      {s}
                    </label>
                  ))}
                </div>
              </div>
 
              {/* BANCO Y CUENTA */}
              <div className="form-group">
                <label>Banco</label>
                <select className="form-select" value={form.banco} onChange={e=>set('banco',e.target.value)}>
                  <option value="">Selecciona banco</option>
                  {BANCOS.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Número de cuenta</label>
                <input type="text" value={form.cuenta} onChange={e=>set('cuenta',e.target.value)} placeholder="Número de cuenta"/>
              </div>
 
              {/* ── ECOPERADOR: RG + RCs + Observadores ── */}
              {form.rol === 'Ecoperador' && <>
                <div className="section-title">Datos del RG</div>
                <div className="form-group">
                  <label>Nombre del RG</label>
                  <input type="text" value={form.rg_nombre} onChange={e=>set('rg_nombre',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label>Teléfono RG</label>
                  <input type="tel" value={form.rg_tel} onChange={e=>set('rg_tel',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label>Banco RG</label>
                  <select className="form-select" value={form.rg_banco} onChange={e=>set('rg_banco',e.target.value)}>
                    <option value="">Selecciona</option>
                    {BANCOS.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cuenta RG</label>
                  <input type="text" value={form.rg_cuenta} onChange={e=>set('rg_cuenta',e.target.value)}/>
                </div>
 
                <div className="section-title">RCs (A, B, C, D)</div>
                {RC_SLOTS.map(slot=>(
                  <div key={slot} className="form-group full">
                    <div className="subsection">
                      <h4>RC — {slot}</h4>
                      <div className="sub-grid">
                        <div className="form-group">
                          <label>Nombre RC {slot}</label>
                          <input type="text" value={form['rc'+slot]?.nombre||''} onChange={e=>setRc(slot,'nombre',e.target.value)}/>
                        </div>
                        <div className="form-group">
                          <label>Teléfono</label>
                          <input type="tel" value={form['rc'+slot]?.tel||''} onChange={e=>setRc(slot,'tel',e.target.value)}/>
                        </div>
                        <div className="form-group">
                          <label>Banco RC</label>
                          <select className="form-select" value={form['rc'+slot]?.banco||''} onChange={e=>setRc(slot,'banco',e.target.value)}>
                            <option value="">Selecciona</option>
                            {BANCOS.map(b=><option key={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Cuenta RC</label>
                          <input type="text" value={form['rc'+slot]?.cuenta||''} onChange={e=>setRc(slot,'cuenta',e.target.value)}/>
                        </div>
                      </div>
                      {(form['rc'+slot]?.nombre || form['rc'+slot]?.tel) && <>
                        <p style={{fontSize:'11px',fontWeight:600,color:'#7a8060',margin:'10px 0 7px'}}>Observadores de RC {slot}</p>
                        {['1','2'].map(num=>(
                          <div key={num} className="sub-grid" style={{marginBottom:'8px'}}>
                            <div className="form-group">
                              <label>Obs {num} Nombre</label>
                              <input type="text" value={form['rc'+slot]?.['obs'+num]?.nombre||''} onChange={e=>setObs(slot,num,'nombre',e.target.value)}/>
                            </div>
                            <div className="form-group">
                              <label>Obs {num} Tel</label>
                              <input type="tel" value={form['rc'+slot]?.['obs'+num]?.tel||''} onChange={e=>setObs(slot,num,'tel',e.target.value)}/>
                            </div>
                            <div className="form-group">
                              <label>Obs {num} Banco</label>
                              <select className="form-select" value={form['rc'+slot]?.['obs'+num]?.banco||''} onChange={e=>setObs(slot,num,'banco',e.target.value)}>
                                <option value="">Selecciona</option>
                                {BANCOS.map(b=><option key={b}>{b}</option>)}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Obs {num} Cuenta</label>
                              <input type="text" value={form['rc'+slot]?.['obs'+num]?.cuenta||''} onChange={e=>setObs(slot,num,'cuenta',e.target.value)}/>
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
            <button className="btn" style={{background:'#F2F4EE',border:'1px solid #D4D8C8'}} onClick={()=>router.push('/usuario')}>Cancelar</button>
            <button className="btn btn-green" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}