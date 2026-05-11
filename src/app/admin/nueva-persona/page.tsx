'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
const MUNICIPIOS = ['Aconchi','Agua Prieta','Alamos','Altar','Arivechi','Arizpe','Atil','Bacadehuachi','Bacanora','Bacerac','Bacoachi','Bacum','Banamichi','Baviacora','Bavispe','Benjamin Hill','Caborca','Cajeme','Cananea','Carbo','Colorada','Cucurpe','Cumpas','Divisaderos','Empalme','Etchojoa','Fronteras','Granados','Guaymas','Hermosillo','Huachinera','Huasabas','Huatabampo','Huepac','Imuris','Magdalena','Mazatan','Moctezuma','Naco','Nacori Chico','Nacozari de Garcia','Navojoa','Nogales','Onavas','Opodepe','Oquitoa','Pitiquito','Puerto Penasco','Quiriego','Rayon','Rosario','Sahuaripa','San Felipe de Jesus','San Javier','San Luis Rio Colorado','San Miguel de Horcasitas','San Pedro de la Cueva','Santa Ana','Santa Cruz','Saric','Soyopa','Suaqui Grande','Tepache','Trincheras','Tubutama','Ures','Villa Hidalgo','Villa Pesqueira','Yecora']
const BANCOS = ['BBVA','Banamex','Santander','HSBC','Banorte','Inbursa','Azteca','Coppel','BanBajio','Afirme','Mifel','Multiva','Scotiabank','Hey Banco','SPIN','Otro']
const RC_SLOTS = ['A','B','C','D']
 
export default function NuevaPersonaAdmin() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    nombre:'', celular:'', municipio:'', distrito:'', rol:'Ecoperador',
    banco:'', cuenta:'', folio:'', casilla:'', status:'Pendiente',
    rg_nombre:'', rg_tel:'', rg_banco:'', rg_cuenta:'',
    rcA:{nombre:'',tel:'',banco:'',cuenta:'', obs1:{nombre:'',tel:'',banco:'',cuenta:''}, obs2:{nombre:'',tel:'',banco:'',cuenta:''}},
    rcB:{nombre:'',tel:'',banco:'',cuenta:'', obs1:{nombre:'',tel:'',banco:'',cuenta:''}, obs2:{nombre:'',tel:'',banco:'',cuenta:''}},
    rcC:{nombre:'',tel:'',banco:'',cuenta:'', obs1:{nombre:'',tel:'',banco:'',cuenta:''}, obs2:{nombre:'',tel:'',banco:'',cuenta:''}},
    rcD:{nombre:'',tel:'',banco:'',cuenta:'', obs1:{nombre:'',tel:'',banco:'',cuenta:''}, obs2:{nombre:'',tel:'',banco:'',cuenta:''}},
  })
 
  const set = (k:string, v:string) => setForm((f:any)=>({...f,[k]:v}))
  const setRc = (slot:string, k:string, v:string) => setForm((f:any)=>({...f,['rc'+slot]:{...f['rc'+slot],[k]:v}}))
  const setObs = (slot:string, num:string, k:string, v:string) => setForm((f:any)=>({...f,['rc'+slot]:{...f['rc'+slot],['obs'+num]:{...f['rc'+slot]['obs'+num],[k]:v}}}))
 
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
      status: [form.status], pago_acum: pago,
      creado_por: user?.id
    }).select().single()
 
    if (error) { alert('Error: '+error.message); setSaving(false); return }
 
    if (form.rol === 'Ecoperador' && persona) {
      // Insert ecoperador row
      await supabase.from('ecoperadores').insert({
        id: persona.id,
        rg_nombre: form.rg_nombre, rg_tel: form.rg_tel,
        rg_banco: form.rg_banco, rg_cuenta: form.rg_cuenta,
      })
 
      // Insert RCs and Observadores
      for (const slot of RC_SLOTS) {
        const rc = form['rc'+slot]
        if (rc.nombre || rc.tel) {
          const { data: rcRow } = await supabase.from('rcs_eco').insert({
            eco_id: persona.id, slot,
            nombre: rc.nombre, tel: rc.tel,
            banco: rc.banco, cuenta: rc.cuenta
          }).select().single()
 
          // Insert Observadores
          if (rcRow) {
            for (const num of ['1','2']) {
              const obs = rc['obs'+num]
              if (obs.nombre || obs.tel) {
                await supabase.from('observadores_rc').insert({
                  rc_id: rcRow.id, numero: parseInt(num),
                  nombre: obs.nombre, tel: obs.tel,
                  banco: obs.banco, cuenta: obs.cuenta
                })
              }
            }
          }
        }
      }
    }
 
    router.push('/admin')
  }
 
  return (
    <div style={{minHeight:'100vh',background:'#f4f7ec',padding:'0 0 40px'}}>
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <button className="btn btn-white" onClick={()=>router.push('/admin')}>← Volver</button>
          <div className="header-title">
            <h1>Agregar Persona</h1>
            <p>Sistema de gestión de estructura PVEM</p>
          </div>
        </div>
      </div>
 
      <div style={{maxWidth:'800px',margin:'32px auto',padding:'0 24px'}}>
        <div className="modal" style={{borderRadius:'18px',overflow:'visible'}}>
          <div className="modal-header"><h2>Nueva Persona</h2></div>
          <div className="modal-body">
            <div className="form-grid">
 
              {/* ROL */}
              <div className="form-group full">
                <label>Rol <span className="req">*</span></label>
                <select className="form-select" value={form.rol} onChange={e=>set('rol',e.target.value)}>
                  <option>Ecoperador</option>
                  <option>RG</option>
                  <option>RC</option>
                  <option>Observador</option>
                </select>
              </div>
 
              {/* DATOS PRINCIPALES */}
              <div className="form-group">
                <label>Nombre completo <span className="req">*</span></label>
                <input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Nombre completo"/>
              </div>
              <div className="form-group">
                <label>Celular</label>
                <input type="tel" value={form.celular} onChange={e=>set('celular',e.target.value)} placeholder="10 dígitos"/>
              </div>
              <div className="form-group">
                <label>Municipio</label>
                <select className="form-select" value={form.municipio} onChange={e=>set('municipio',e.target.value)}>
                  <option value="">Selecciona municipio</option>
                  {MUNICIPIOS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Distrito</label>
                <input type="number" value={form.distrito} onChange={e=>set('distrito',e.target.value)} placeholder="Número"/>
              </div>
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
              <div className="form-group">
                <label>Folio</label>
                <input type="text" value={form.folio} onChange={e=>set('folio',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>Casilla</label>
                <input type="number" value={form.casilla} onChange={e=>set('casilla',e.target.value)}/>
              </div>
              <div className="form-group full">
                <label>Status</label>
                <select className="form-select" value={form.status} onChange={e=>set('status',e.target.value)}>
                  <option>Pendiente</option>
                  <option>Validado</option>
                  <option>Credencializado</option>
                  <option>Localizado</option>
                </select>
              </div>
 
              {/* ECOPERADOR: RG + RCs + Observadores */}
              {form.rol === 'Ecoperador' && <>
 
                {/* RG */}
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
 
                {/* RCs */}
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
 
                      {/* Observadores del RC */}
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
            <button className="btn" style={{background:'#F2F4EE',border:'1px solid #D4D8C8'}} onClick={()=>router.push('/admin')}>Cancelar</button>
            <button className="btn btn-green" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : '✓ Guardar Persona'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
 