'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { MUNICIPIOS, BANCOS } from '@/lib/constants'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_OPTS = ['Localizado','Validado','Pagado','Credencializado']
const DIST_LOCAL = Array.from({length:21},(_,i)=>i+1)
const DIST_FED = Array.from({length:7},(_,i)=>i+1)

function FotoUpload({label,hint,fkey,form,set,inputRef}:any){
  return(
    <div className="form-group full">
      <label style={{display:'flex',alignItems:'center',gap:'6px'}}>
        {label}
        <span title={hint} style={{cursor:'help',background:'#8FBF25',color:'#fff',
          borderRadius:'50%',width:'16px',height:'16px',fontSize:'10px',fontWeight:900,
          display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>?</span>
      </label>
      <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',
        background:'#fafff4',border:'1.5px dashed rgba(143,191,37,.5)',borderRadius:'10px'}}>
        {form[fkey]
          ?<img src={form[fkey]} style={{width:'80px',height:'60px',objectFit:'cover',borderRadius:'6px',border:'2px solid #C8DF8E'}}/>
          :<div style={{width:'80px',height:'60px',borderRadius:'6px',background:'#eef6d0',
            border:'2px dashed #C8DF8E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px'}}>📷</div>
        }
        <div>
          <button type="button" onClick={()=>inputRef.current?.click()}
            style={{padding:'7px 14px',border:'1px solid #C8DF8E',borderRadius:'8px',
              background:'#fff',color:'#3d5a09',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font)'}}>
            {form[fkey]?'🔄 Cambiar':'⬆ Subir foto'}
          </button>
          <p style={{fontSize:'10px',color:'#7a8060',marginTop:'4px'}}>{hint}</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" style={{display:'none'}}
          onChange={e=>{
            const file=e.target.files?.[0]
            if(!file)return
            if(file.size>5*1024*1024){alert('Máximo 5MB');return}
            const r=new FileReader()
            r.onload=ev=>set(fkey,ev.target?.result as string)
            r.readAsDataURL(file)
          }}/>
      </div>
    </div>
  )
}

export default function EditarPersonaAdmin(){
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [ecoSearch,setEcoSearch]=useState('')
  const [ecoResults,setEcoResults]=useState<any[]>([])
  const [ecoSeleccionado,setEcoSeleccionado]=useState<any>(null)
  const [rgSearch,setRgSearch]=useState('')
  const [rgResults,setRgResults]=useState<any[]>([])
  const [rgSeleccionado,setRgSeleccionado]=useState<any>(null)
  const [dupNombre,setDupNombre]=useState('')
  const [dupClave,setDupClave]=useState('')
  const ineAnvRef=useRef<HTMLInputElement>(null)
  const ineRevRef=useRef<HTMLInputElement>(null)
  const selfieRef=useRef<HTMLInputElement>(null)

  const [form,setFormState]=useState<any>({
    nombre:'',telefono:'',sexo:'',edad:'',clave_elector:'',
    calle:'',numero_ext:'',colonia:'',cp:'',seccion_electoral:'',
    municipio:'',distrito_local:'',distrito_federal:'',
    rol:'',banco:'',cuenta:'',folio:'',
    status:[],observaciones:'',notas:'',
    fecha_registro:new Date().toISOString().split('T')[0],
    foto:'',foto_ine_anverso:'',foto_ine_reverso:'',foto_selfie:'',
    rg_nombre:'',rg_tel:'',rg_banco:'',rg_cuenta:'',
  })
  const [rcs,setRcs]=useState<any[]>([])

  useEffect(()=>{if(id)loadPersona()},[id])

  async function searchRG(q:string){
    setRgSearch(q)
    if(q.length<2){setRgResults([]);return}
    const {data}=await supabase.from('personas')
      .select('id,nombre,municipio,celular')
      .eq('rol','RG')
      .ilike('nombre',`%${q}%`)
      .limit(5)
    setRgResults(data||[])
  }

  async function searchEco(q:string){
    setEcoSearch(q)
    if(q.length<2){setEcoResults([]);return}
    const {data}=await supabase.from('personas')
      .select('id,nombre,municipio,celular')
      .eq('rol','Ecoperador')
      .ilike('nombre',`%${q}%`)
      .limit(5)
    setEcoResults(data||[])
  }

  async function loadPersona(){
    const [{data:p},{data:eco},{data:rcsData}]=await Promise.all([
      supabase.from('personas').select('*').eq('id',id).single(),
      supabase.from('ecoperadores').select('*').eq('id',id).single(),
      supabase.from('rcs_eco').select('*').eq('eco_id',id).order('slot'),
    ])
    if(!p){router.push('/admin');return}
    setFormState({
      nombre:p.nombre||'',
      telefono:p.celular||'',
      sexo:p.sexo||'',
      edad:p.edad||'',
      clave_elector:p.clave_elector||'',
      calle:p.calle||'',
      numero_ext:p.numero_ext||'',
      colonia:p.colonia||'',
      cp:p.cp||'',
      seccion_electoral:p.seccion||'',
      municipio:p.municipio||'',
      distrito_local:p.distrito_local||'',
      distrito_federal:p.distrito_federal||'',
      rol:p.rol||'',
      banco:p.banco||'',
      cuenta:p.cuenta||'',
      folio:p.folio||'',
      status:p.status||[],
      observaciones:p.observaciones||'',
      notas:p.notas||'',
      fecha_registro:p.fecha_registro||new Date().toISOString().split('T')[0],
      foto:p.foto||'',
      foto_ine_anverso:p.foto_ine_anverso||'',
      foto_ine_reverso:p.foto_ine_reverso||'',
      foto_selfie:p.foto_selfie||'',
      rg_nombre:eco?.rg_nombre||'',
      rg_tel:eco?.rg_tel||'',
      rg_banco:eco?.rg_banco||'',
      rg_cuenta:eco?.rg_cuenta||'',
    })
    if(rcsData&&rcsData.length>0){
      setRcs(rcsData.map((r:any,i:number)=>({num:i+1,id:r.id,nombre:r.nombre||'',tel:r.tel||'',banco:r.banco||'',cuenta:r.cuenta||''})))
    } else {
      setRcs([{num:1,nombre:'',tel:'',banco:'',cuenta:''}])
    }
    // Check if already linked to an eco
    if(p.notas && p.notas.includes('Enlazado con Eco:')) {
      const ecoNombre = p.notas.replace('Enlazado con Eco:','').trim()
      setEcoSearch(ecoNombre)
    }
    setLoading(false)
  }

  const set=(k:string,v:any)=>setFormState((f:any)=>({...f,[k]:v}))

  async function checkDupNombre(val:string){
    if(val.length<4)return
    const {data}=await supabase.from('personas').select('nombre').ilike('nombre',`%${val.trim()}%`).neq('id',id).limit(1)
    setDupNombre(data&&data.length>0?`⚠️ Ya existe: "${data[0].nombre}"`:'')
  }

  async function checkDupClave(val:string){
    if(val.length<6)return
    const {data}=await supabase.from('personas').select('nombre').eq('clave_elector',val.trim()).neq('id',id).limit(1)
    setDupClave(data&&data.length>0?`⚠️ Clave ya registrada para: "${data[0].nombre}"`:'')
  }

  function toggleStatus(s:string){
    setFormState((f:any)=>{
      const cur=f.status as string[]
      if(cur.includes(s))return{...f,status:cur.filter((x:string)=>x!==s)}
      return{...f,status:[...cur,s]}
    })
  }

  function addRC(){setRcs(p=>[...p,{num:p.length+1,nombre:'',tel:'',banco:'',cuenta:''}])}
  function removeRC(i:number){setRcs(p=>p.filter((_,j)=>j!==i).map((r,j)=>({...r,num:j+1})))}
  function setRC(i:number,k:string,v:string){setRcs(p=>p.map((r,j)=>j===i?{...r,[k]:v}:r))}

  async function handleSave(){
    if(!form.nombre){alert('El nombre es requerido');return}
    if(dupNombre||dupClave){
      if(!confirm('Hay posibles duplicados. ¿Continuar?'))return
    }
    setSaving(true)

    const hasRG=!!(form.rg_nombre||form.rg_tel)
    const rcCount=rcs.filter(r=>r.nombre||r.tel).length
    let pago=0
    if(form.rol==='Ecoperador')pago=(hasRG?100:0)+rcCount*50
    else if(form.rol==='RG')pago=300
    else if(form.rol==='RC'||form.rol==='Observador')pago=200

    const {error}=await supabase.from('personas').update({
      nombre:form.nombre,
      celular:form.telefono,
      municipio:form.municipio,
      distrito:parseInt(form.distrito_local)||0,
      rol:form.rol,banco:form.banco,cuenta:form.cuenta,
      folio:form.folio,
      casilla:parseInt(form.seccion_electoral)||0,
      status:form.status,pago_acum:pago,
      foto:form.foto||null,
      clave_elector:form.clave_elector,
      sexo:form.sexo,
      edad:parseInt(form.edad)||null,
      calle:form.calle,numero_ext:form.numero_ext,
      colonia:form.colonia,cp:form.cp,
      seccion:form.seccion_electoral,
      distrito_local:parseInt(form.distrito_local)||null,
      distrito_federal:parseInt(form.distrito_federal)||null,
      observaciones:form.observaciones,notas: [ecoSeleccionado?`Enlazado con Eco: ${ecoSeleccionado.nombre}`:'', rgSeleccionado?`Enlazado con RG: ${rgSeleccionado.nombre}`:'', form.notas||''].filter(Boolean).join(' | '),
      foto_ine_anverso:form.foto_ine_anverso||null,
      foto_ine_reverso:form.foto_ine_reverso||null,
      foto_selfie:form.foto_selfie||null,
      fecha_registro:form.fecha_registro,
    }).eq('id',id)

    if(error){alert('Error: '+error.message);setSaving(false);return}

    if(form.rol==='Ecoperador'){
      const {data:existingEco}=await supabase.from('ecoperadores').select('id').eq('id',id).single()
      const ecoData={rg_nombre:form.rg_nombre,rg_tel:form.rg_tel,rg_banco:form.rg_banco,rg_cuenta:form.rg_cuenta}
      if(existingEco){
        await supabase.from('ecoperadores').update(ecoData).eq('id',id)
      } else {
        await supabase.from('ecoperadores').insert({id,...ecoData})
      }
      for(const rc of rcs){
        if(!rc.nombre&&!rc.tel)continue
        if(rc.id){
          await supabase.from('rcs_eco').update({nombre:rc.nombre,tel:rc.tel,banco:rc.banco,cuenta:rc.cuenta}).eq('id',rc.id)
        } else {
          await supabase.from('rcs_eco').insert({eco_id:id,slot:String(rc.num),nombre:rc.nombre,tel:rc.tel,banco:rc.banco,cuenta:rc.cuenta})
        }
      }
    }
    router.push('/admin')
  }

  const ST=({children}:{children:any})=>(
    <div className="section-title" style={{gridColumn:'1/-1',marginTop:'8px'}}>{children}</div>
  )
  const Sub=({children}:{children:any})=>(
    <div style={{gridColumn:'1/-1',marginTop:'12px',marginBottom:'2px',
      fontSize:'13px',fontWeight:700,color:'#5a7a20',
      borderBottom:'1px solid #dde8bb',paddingBottom:'5px'}}>{children}</div>
  )

  if(loading)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f4f7ec'}}>
      <p style={{color:'#5a8012',fontWeight:700}}>Cargando...</p>
    </div>
  )

  return(
    <div style={{minHeight:'100vh',background:'#f4f7ec',paddingBottom:'40px'}}>
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <button className="btn btn-white" onClick={()=>router.push('/admin')}>← Volver</button>
          <div className="header-title"><h1>Editar Persona</h1><p>Sistema de gestión PVEM</p></div>
        </div>
      </div>

      <div className="form-page-wrap">
        <div className="modal" style={{borderRadius:'18px',overflow:'visible',maxWidth:'100%'}}>
          <div className="modal-header"><h2>Editando: {form.nombre}</h2></div>
          <div className="modal-body">
            <div className="form-grid">

              <div className="form-group full">
                <label>Rol</label>
                <select className="form-select" value={form.rol} onChange={e=>set('rol',e.target.value)}>
                  <option value="">Selecciona rol</option>
                  <option>Ecoperador</option><option>RG</option>
                  <option>RC</option><option>Observador</option>
                </select>
              </div>

              <div className="form-group full">
                <label>📅 Fecha de registro</label>
                <input type="date" value={form.fecha_registro}
                  onChange={e=>set('fecha_registro',e.target.value)}
                  style={{padding:'8px 12px',border:'1.5px solid #D4D8C8',borderRadius:'9px',
                    fontSize:'13px',fontFamily:'var(--font)',width:'220px'}}/>
              </div>

              {/* ENLACE CON ECOPERADOR */}
              {(form.rol === 'RG' || form.rol === 'RC' || form.rol === 'Observador') && (
                <div className="form-group full">
                  <label>🔗 Enlazar con Ecoperador</label>
                  <div style={{position:'relative'}}>
                    <input type="text"
                      value={ecoSeleccionado ? ecoSeleccionado.nombre : ecoSearch}
                      onChange={e=>{setEcoSeleccionado(null);searchEco(e.target.value)}}
                      placeholder="Buscar Ecoperador por nombre..."/>
                    {ecoResults.length>0 && !ecoSeleccionado && (
                      <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:100,
                        background:'#fff',border:'1.5px solid #C8DF8E',borderRadius:'10px',
                        boxShadow:'0 8px 24px rgba(0,0,0,.12)',overflow:'hidden'}}>
                        {ecoResults.map((eco:any)=>(
                          <div key={eco.id}
                            onClick={()=>{setEcoSeleccionado(eco);setEcoResults([])}}
                            style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid #eef3e0',
                              fontSize:'13px',fontWeight:600,color:'#2e4a08'}}
                            onMouseEnter={e=>(e.currentTarget.style.background='#eef6d0')}
                            onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                            {eco.nombre}
                            <span style={{fontSize:'11px',color:'#7a8060',marginLeft:'8px'}}>
                              {eco.municipio}{eco.celular?' · '+eco.celular:''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {ecoSeleccionado && (
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'6px',
                      padding:'8px 12px',background:'#eef6d0',borderRadius:'8px',border:'1px solid #C8DF8E'}}>
                      <span style={{fontSize:'12px',fontWeight:700,color:'#2e4a08'}}>
                        ✓ Enlazado con: {ecoSeleccionado.nombre}
                      </span>
                      <button type="button" onClick={()=>{setEcoSeleccionado(null);setEcoSearch('')}}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#EF4135',fontSize:'16px',padding:0}}>×</button>
                    </div>
                  )}
                  <small style={{color:'#7a8060',fontSize:'11px'}}>
                    Al guardar quedará enlazado con el Ecoperador seleccionado
                  </small>
                </div>
              )}

              <ST>📋 Datos Generales</ST>

              <div className="form-group full">
                <label>Nombre completo (MAYÚSCULAS) <span className="req">*</span></label>
                <input type="text" value={form.nombre}
                  onChange={e=>{set('nombre',e.target.value.toUpperCase());checkDupNombre(e.target.value)}}
                  style={{textTransform:'uppercase',border:'1.5px solid rgba(0,0,0,.2)'}}/>
                {dupNombre&&<p style={{color:'#EF4135',fontSize:'11px',fontWeight:700,marginTop:'3px'}}>{dupNombre}</p>}
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input type="tel" value={form.telefono} onChange={e=>set('telefono',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>Sexo</label>
                <select className="form-select" value={form.sexo} onChange={e=>set('sexo',e.target.value)}>
                  <option value="">Selecciona</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div className="form-group">
                <label>Edad</label>
                <input type="number" value={form.edad} onChange={e=>set('edad',e.target.value)} min="18" max="99"/>
              </div>
              <div className="form-group">
                <label>Clave de Elector</label>
                <input type="text" value={form.clave_elector}
                  onChange={e=>{set('clave_elector',e.target.value.toUpperCase());checkDupClave(e.target.value)}}
                  maxLength={18} style={{textTransform:'uppercase'}}/>
                {dupClave&&<p style={{color:'#EF4135',fontSize:'11px',fontWeight:700,marginTop:'3px'}}>{dupClave}</p>}
              </div>

              <Sub>🏠 Dirección</Sub>
              <div className="form-group">
                <label>Calle</label>
                <input type="text" value={form.calle} onChange={e=>set('calle',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>Número</label>
                <input type="text" value={form.numero_ext} onChange={e=>set('numero_ext',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>Colonia</label>
                <input type="text" value={form.colonia} onChange={e=>set('colonia',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>Código Postal</label>
                <input type="text" value={form.cp} onChange={e=>set('cp',e.target.value)} maxLength={5}/>
              </div>
              <div className="form-group">
                <label>Sección Electoral</label>
                <input type="text" value={form.seccion_electoral} onChange={e=>set('seccion_electoral',e.target.value)}/>
              </div>

              <Sub>🗺️ Ubicación Electoral</Sub>
              <div className="form-group">
                <label>Municipio</label>
                <select className="form-select" value={form.municipio} onChange={e=>set('municipio',e.target.value)}>
                  <option value="">Selecciona municipio</option>
                  {MUNICIPIOS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Distrito Local (1-21)</label>
                <select className="form-select" value={form.distrito_local} onChange={e=>set('distrito_local',e.target.value)}>
                  <option value="">Selecciona</option>
                  {DIST_LOCAL.map(d=><option key={d} value={d}>Distrito {d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Distrito Federal (1-7)</label>
                <select className="form-select" value={form.distrito_federal} onChange={e=>set('distrito_federal',e.target.value)}>
                  <option value="">Selecciona</option>
                  {DIST_FED.map(d=><option key={d} value={d}>Distrito {d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sección Asignada <span style={{fontSize:'10px',color:'#7a8060'}}>(solo admin)</span></label>
                <input type="text" value={form.seccion_asignada||''} onChange={e=>set('seccion_asignada',e.target.value)} placeholder="Asignar sección"/>
              </div>

              <Sub>💳 Datos de Pago</Sub>
              <div className="form-group">
                <label>Banco</label>
                <select className="form-select" value={form.banco} onChange={e=>set('banco',e.target.value)}>
                  <option value="">Selecciona banco</option>
                  {BANCOS.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Número de cuenta</label>
                <input type="text" value={form.cuenta} onChange={e=>set('cuenta',e.target.value)}/>
              </div>



              <Sub>📊 Status</Sub>
              <div className="form-group full">
                <div className="status-checks">
                  {STATUS_OPTS.map((s,i)=>(
                    <label key={s} className="status-check">
                      <input type="checkbox" checked={form.status.includes(s)} onChange={()=>toggleStatus(s)}/>
                      <span style={{fontWeight:600}}>{String.fromCharCode(65+i)}) {s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Sub>📝 Observaciones y Notas</Sub>
              <div className="form-group">
                <label>Observaciones</label>
                <textarea value={form.observaciones} onChange={e=>set('observaciones',e.target.value)}
                  rows={3} style={{padding:'8px 12px',border:'1.5px solid #D4D8C8',borderRadius:'9px',
                    fontSize:'13px',width:'100%',fontFamily:'var(--font)',resize:'vertical'}}/>
              </div>
              <div className="form-group">
                <label>Notas internas</label>
                <textarea value={form.notas} onChange={e=>set('notas',e.target.value)}
                  rows={3} style={{padding:'8px 12px',border:'1.5px solid #D4D8C8',borderRadius:'9px',
                    fontSize:'13px',width:'100%',fontFamily:'var(--font)',resize:'vertical'}}/>
              </div>

              <ST>📸 Fotografías</ST>


              <FotoUpload label="INE Anverso (frente)" fkey="foto_ine_anverso" form={form} set={set} inputRef={ineAnvRef}
                hint="Foto del frente de la INE. Sin flash, sin brillos, fondo neutro."/>
              <FotoUpload label="INE Reverso (vuelta)" fkey="foto_ine_reverso" form={form} set={set} inputRef={ineRevRef}
                hint="Foto de la parte trasera de la INE. Sin flash, sin brillos, fondo neutro."/>
              <FotoUpload label="Foto Selfie" fkey="foto_selfie" form={form} set={set} inputRef={selfieRef}
                hint="Foto selfie de frente. Sin poses, sin lentes, sin gorra, buena iluminación."/>

              {form.rol==='Ecoperador'&&<>
                <Sub>👤 Datos del RG</Sub>
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

                <div className="section-title" style={{gridColumn:'1/-1',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>📋 RCs</span>
                  <button type="button" onClick={addRC}
                    style={{background:'#00B15A',color:'#fff',border:'none',borderRadius:'8px',
                      padding:'5px 14px',fontWeight:700,fontSize:'12px',cursor:'pointer',fontFamily:'var(--font)'}}>
                    + Agregar RC
                  </button>
                </div>

                {rcs.map((rc,i)=>(
                  <div key={i} className="form-group full">
                    <div className="subsection">
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                        <h4>RC #{rc.num}</h4>
                        {rcs.length>1&&(
                          <button type="button" onClick={()=>removeRC(i)}
                            style={{background:'#EF4135',color:'#fff',border:'none',borderRadius:'6px',
                              padding:'3px 10px',fontSize:'11px',cursor:'pointer',fontFamily:'var(--font)'}}>
                            ✕ Quitar
                          </button>
                        )}
                      </div>
                      <div className="sub-grid">
                        <div className="form-group">
                          <label>Nombre RC</label>
                          <input type="text" value={rc.nombre} onChange={e=>setRC(i,'nombre',e.target.value)}/>
                        </div>
                        <div className="form-group">
                          <label>Teléfono</label>
                          <input type="tel" value={rc.tel} onChange={e=>setRC(i,'tel',e.target.value)}/>
                        </div>
                        <div className="form-group">
                          <label>Banco RC</label>
                          <select className="form-select" value={rc.banco} onChange={e=>setRC(i,'banco',e.target.value)}>
                            <option value="">Selecciona</option>
                            {BANCOS.map(b=><option key={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Cuenta RC</label>
                          <input type="text" value={rc.cuenta} onChange={e=>setRC(i,'cuenta',e.target.value)}/>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>}

            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" style={{background:'#F2F4EE',border:'1px solid #D4D8C8'}} onClick={()=>router.push('/admin')}>Cancelar</button>
            <button className="btn btn-green" onClick={handleSave} disabled={saving}>
              {saving?'Guardando...':'✓ Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}