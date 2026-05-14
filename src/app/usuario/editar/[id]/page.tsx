'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
const MUNICIPIOS = ['Aconchi','Agua Prieta','Alamos','Altar','Arivechi','Arizpe','Atil','Bacadehuachi','Bacanora','Bacerac','Bacoachi','Bacum','Banamichi','Baviacora','Bavispe','Benjamin Hill','Caborca','Cajeme','Cananea','Carbo','Colorada','Cucurpe','Cumpas','Divisaderos','Empalme','Etchojoa','Fronteras','Granados','Guaymas','Hermosillo','Huachinera','Huasabas','Huatabampo','Huepac','Imuris','Magdalena','Mazatan','Moctezuma','Naco','Nacori Chico','Nacozari de Garcia','Navojoa','Nogales','Onavas','Opodepe','Oquitoa','Pitiquito','Puerto Penasco','Quiriego','Rayon','Rosario','Sahuaripa','San Felipe de Jesus','San Javier','San Luis Rio Colorado','San Miguel de Horcasitas','San Pedro de la Cueva','Santa Ana','Santa Cruz','Saric','Soyopa','Suaqui Grande','Tepache','Trincheras','Tubutama','Ures','Villa Hidalgo','Villa Pesqueira','Yecora']
const BANCOS = ['BBVA','Banamex','Santander','HSBC','Banorte','Inbursa','Azteca','Coppel','BanBajio','Afirme','Mifel','Multiva','Scotiabank','Hey Banco','SPIN','Otro']
const RC_SLOTS = ['A','B','C','D']
 
export default function EditarPersonaUsuario() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
 
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    nombre:'', celular:'', municipio:'', distrito:'', rol:'Ecoperador',
    banco:'', cuenta:'', folio:'', casilla:'', status:'Pendiente',
    rg_nombre:'', rg_tel:'', rg_banco:'', rg_cuenta:'',
    rcA:{nombre:'',tel:'',banco:'',cuenta:''},
    rcB:{nombre:'',tel:'',banco:'',cuenta:''},
    rcC:{nombre:'',tel:'',banco:'',cuenta:''},
    rcD:{nombre:'',tel:'',banco:'',cuenta:''},
  })
 
  useEffect(() => {
    loadPersona()
  }, [id])
 
  async function loadPersona() {
  // Cargar persona principal
  const { data: p } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .single()

  if (!p) { router.push('/admin'); return }

  // Cargar ecoperador por separado
  const { data: eco } = await supabase
    .from('ecoperadores')
    .select('*')
    .eq('id', id)
    .single()

  // Cargar RCs por separado
  const { data: rcs } = await supabase
    .from('rcs_eco')
    .select('*')
    .eq('eco_id', id)

  const rcMap: any = {
    rcA:{nombre:'',tel:'',banco:'',cuenta:''},
    rcB:{nombre:'',tel:'',banco:'',cuenta:''},
    rcC:{nombre:'',tel:'',banco:'',cuenta:''},
    rcD:{nombre:'',tel:'',banco:'',cuenta:''}
  }

  if (rcs) {
    rcs.forEach((rc: any) => {
      if (rc.slot) {
        rcMap['rc'+rc.slot] = {
          nombre: rc.nombre||'',
          tel: rc.tel||'',
          banco: rc.banco||'',
          cuenta: rc.cuenta||''
        }
      }
    })
  }

  setForm({
    nombre: p.nombre||'',
    celular: p.celular||'',
    municipio: p.municipio||'',
    distrito: p.distrito||'',
    rol: p.rol||'Ecoperador',
    banco: p.banco||'',
    cuenta: p.cuenta||'',
    folio: p.folio||'',
    casilla: p.casilla||'',
    status: p.status?.[0]||'Pendiente',
    rg_nombre: eco?.rg_nombre||'',
    rg_tel: eco?.rg_tel||'',
    rg_banco: eco?.rg_banco||'',
    rg_cuenta: eco?.rg_cuenta||'',
    ...rcMap
  })
  setLoading(false)
}
 
  const set = (k: string, v: string) => setForm((f: any) => ({...f, [k]: v}))
  const setRc = (slot: string, k: string, v: string) => setForm((f: any) => ({...f, ['rc'+slot]: {...f['rc'+slot], [k]: v}}))
 
  async function handleSave() {
    if (!form.nombre) { alert('El nombre es requerido'); return }
    setSaving(true)
 
    // Calculate pago
    const hasRG = form.rg_nombre || form.rg_tel ? 1 : 0
    const rcCount = RC_SLOTS.filter(s => form['rc'+s]?.nombre || form['rc'+s]?.tel).length
    let pago = 0
    if (form.rol === 'Ecoperador') pago = hasRG * 100 + rcCount * 50
    else if (form.rol === 'RG') pago = 300
    else if (form.rol === 'RC') pago = 200
    else if (form.rol === 'Observador') pago = 200
 
    // Update persona
    const { error } = await supabase.from('personas').update({
      nombre: form.nombre, celular: form.celular,
      municipio: form.municipio, distrito: parseInt(form.distrito)||0,
      rol: form.rol, banco: form.banco, cuenta: form.cuenta,
      folio: form.folio, casilla: parseInt(form.casilla)||0,
      status: [form.status], pago_acum: pago,
    }).eq('id', id)
 
    if (error) { alert('Error: '+error.message); setSaving(false); return }
 
    // Update or insert ecoperadores
    if (form.rol === 'Ecoperador') {
      const { data: existing } = await supabase.from('ecoperadores').select('id').eq('id', id).single()
      if (existing) {
        await supabase.from('ecoperadores').update({
          rg_nombre: form.rg_nombre, rg_tel: form.rg_tel,
          rg_banco: form.rg_banco, rg_cuenta: form.rg_cuenta,
        }).eq('id', id)
      } else {
        await supabase.from('ecoperadores').insert({
          id, rg_nombre: form.rg_nombre, rg_tel: form.rg_tel,
          rg_banco: form.rg_banco, rg_cuenta: form.rg_cuenta,
        })
      }
 
      // Update RCs
      for (const slot of RC_SLOTS) {
        const rc = form['rc'+slot]
        if (rc.nombre || rc.tel) {
          const { data: existingRc } = await supabase.from('rcs_eco').select('id').eq('eco_id', id).eq('slot', slot).single()
          if (existingRc) {
            await supabase.from('rcs_eco').update({
              nombre: rc.nombre, tel: rc.tel, banco: rc.banco, cuenta: rc.cuenta
            }).eq('id', existingRc.id)
          } else {
            await supabase.from('rcs_eco').insert({
              eco_id: id, slot, nombre: rc.nombre, tel: rc.tel, banco: rc.banco, cuenta: rc.cuenta
            })
          }
        }
      }
    }
 
    router.push('/usuario')
  }
 
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f4f7ec'}}>
      <p style={{color:'#5a8012',fontWeight:700,fontSize:'18px'}}>Cargando...</p>
    </div>
  )
 
  return (
    <div style={{minHeight:'100vh',background:'#f4f7ec',padding:'0 0 40px'}}>
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <button className="btn btn-white" onClick={()=>router.push('/usuario')}>← Volver</button>
          <div className="header-title">
            <h1>Editar Persona</h1>
            <p>Sistema de gestión de estructura PVEM</p>
          </div>
        </div>
      </div>
 
      <div style={{maxWidth:'800px',margin:'32px auto',padding:'0 24px'}}>
        <div className="modal" style={{borderRadius:'18px',overflow:'visible'}}>
          <div className="modal-header"><h2>Editando: {form.nombre}</h2></div>
          <div className="modal-body">
            <div className="form-grid">
 
              <div className="form-group full">
                <label>Rol</label>
                <select className="form-select" value={form.rol} onChange={e=>set('rol',e.target.value)}>
                  <option>Ecoperador</option>
                  <option>RG</option>
                  <option>RC</option>
                  <option>Observador</option>
                </select>
              </div>
 
              <div className="form-group">
                <label>Nombre completo *</label>
                <input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>Celular</label>
                <input type="tel" value={form.celular} onChange={e=>set('celular',e.target.value)}/>
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
                <input type="number" value={form.distrito} onChange={e=>set('distrito',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>Banco</label>
                <select className="form-select" value={form.banco} onChange={e=>set('banco',e.target.value)}>
                  <option value="">Selecciona banco</option>
                  {BANCOS.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Cuenta</label>
                <input type="text" value={form.cuenta} onChange={e=>set('cuenta',e.target.value)}/>
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
 
              {/* RG Section - solo para Ecoperador */}
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
                    <option value="">Selecciona banco</option>
                    {BANCOS.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cuenta RG</label>
                  <input type="text" value={form.rg_cuenta} onChange={e=>set('rg_cuenta',e.target.value)}/>
                </div>
 
                {/* RCs */}
                <div className="section-title">RCs (A, B, C, D)</div>
                {RC_SLOTS.map(slot => (
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
                          <label>Banco</label>
                          <select className="form-select" value={form['rc'+slot]?.banco||''} onChange={e=>setRc(slot,'banco',e.target.value)}>
                            <option value="">Selecciona</option>
                            {BANCOS.map(b=><option key={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Cuenta</label>
                          <input type="text" value={form['rc'+slot]?.cuenta||''} onChange={e=>setRc(slot,'cuenta',e.target.value)}/>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>}
 
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" style={{background:'#F2F4EE',border:'1px solid #D4D8C8'}} onClick={()=>router.push('/usuario')}>Cancelar</button>
            <button className="btn btn-green" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : '✓ Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}