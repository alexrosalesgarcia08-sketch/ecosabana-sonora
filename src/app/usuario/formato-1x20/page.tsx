'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { MUNICIPIOS, BANCOS } from '@/lib/constants'
import * as XLSX from 'xlsx'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
const EMPTY_PERSON = () => ({ nombre:'', seccion:'', domicilio:'', celular:'', validado:false, notas:'' })
 
function DatosPersona({title, prefix, data, setData, bancos, municipios}:any){
  const set = (k:string,v:any) => setData((p:any)=>({...p,[k]:v}))
  return (
    <div className="modal" style={{borderRadius:'14px',marginBottom:'16px',maxWidth:'100%'}}>
      <div className="modal-header" style={{padding:'12px 20px 10px'}}>
        <h2 style={{fontSize:'15px'}}>👤 {title}</h2>
      </div>
      <div className="modal-body" style={{padding:'14px 20px'}}>
        <div className="form-grid">
          <div className="form-group">
            <label>Nombre completo *</label>
            <input type="text" value={data.nombre||''} onChange={e=>set('nombre',e.target.value.toUpperCase())} style={{textTransform:'uppercase'}} placeholder="NOMBRE COMPLETO"/>
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input type="tel" value={data.telefono||''} onChange={e=>set('telefono',e.target.value)} placeholder="10 dígitos"/>
          </div>
          <div className="form-group full">
            <label>Dirección</label>
            <input type="text" value={data.direccion||''} onChange={e=>set('direccion',e.target.value)} placeholder="Calle, número, colonia"/>
          </div>
          <div className="form-group">
            <label>Municipio</label>
            <select className="form-select" value={data.municipio||''} onChange={e=>set('municipio',e.target.value)}>
              <option value="">Selecciona</option>
              {municipios.map((m:string)=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Banco</label>
            <select className="form-select" value={data.banco||''} onChange={e=>set('banco',e.target.value)}>
              <option value="">Selecciona</option>
              {bancos.map((b:string)=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Número de cuenta</label>
            <input type="text" value={data.cuenta||''} onChange={e=>set('cuenta',e.target.value)}/>
          </div>
          <div className="form-group">
            <label>Sexo</label>
            <select className="form-select" value={data.sexo||''} onChange={e=>set('sexo',e.target.value)}>
              <option value="">Selecciona</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div className="form-group">
            <label>Edad</label>
            <input type="number" value={data.edad||''} onChange={e=>set('edad',e.target.value)} min="18" max="99"/>
          </div>
          <div className="form-group full">
            <label>Clave de Elector</label>
            <input type="text" value={data.clave_elector||''} onChange={e=>set('clave_elector',e.target.value.toUpperCase())} maxLength={18} style={{textTransform:'uppercase'}}/>
          </div>
        </div>
      </div>
    </div>
  )
}
 
export default function Formato1x20(){
  const router = useRouter()
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [userId,setUserId]=useState('')
  const [formato,setFormato]=useState<any>(null)
  const [completo,setCompleto]=useState(false)
  const [enviado,setEnviado]=useState(false)
 
  const [eco,setEco]=useState<any>({nombre:'',telefono:'',direccion:'',banco:'',cuenta:'',sexo:'',edad:'',clave_elector:'',municipio:''})
  const [pres,setPres]=useState<any>({nombre:'',telefono:'',direccion:'',banco:'',cuenta:'',sexo:'',edad:'',clave_elector:'',municipio:''})
  const [personas,setPersonas]=useState<any[]>(Array.from({length:20},(_,i)=>({...EMPTY_PERSON(),numero:i+1})))
 
  useEffect(()=>{
    supabase.auth.getUser().then(async({data})=>{
      if(!data.user){router.replace('/');return}
      setUserId(data.user.id)
      const {data:fmt}=await supabase.from('formato_1x20').select('*').eq('usuario_id',data.user.id).single()
      if(fmt){
        setFormato(fmt)
        setEco({nombre:fmt.nombre||'',telefono:fmt.telefono||'',direccion:fmt.direccion||'',banco:fmt.banco||'',cuenta:fmt.cuenta||'',sexo:fmt.sexo||'',edad:fmt.edad||'',clave_elector:fmt.clave_elector||'',municipio:fmt.municipio||''})
        setPres({nombre:fmt.pres_nombre||'',telefono:fmt.pres_telefono||'',direccion:fmt.pres_direccion||'',banco:fmt.pres_banco||'',cuenta:fmt.pres_cuenta||'',sexo:fmt.pres_sexo||'',edad:fmt.pres_edad||'',clave_elector:fmt.pres_clave_elector||'',municipio:fmt.pres_municipio||''})
        setCompleto(fmt.completo)
        setEnviado(fmt.notificado)
        const {data:ps}=await supabase.from('formato_1x20_personas').select('*').eq('formato_id',fmt.id).order('numero')
        if(ps&&ps.length>0){
          const filled=Array.from({length:20},(_,i)=>{
            const p=ps.find((x:any)=>x.numero===i+1)
            return p||{...EMPTY_PERSON(),numero:i+1}
          })
          setPersonas(filled)
        }
      }
      setLoading(false)
    })
  },[])
 
  useEffect(()=>{
    const filled=personas.filter(p=>p.nombre?.trim()).length
    setCompleto(filled>=20)
  },[personas])
 
  const setP=(idx:number,k:string,v:any)=>setPersonas(prev=>prev.map((p,i)=>i===idx?{...p,[k]:v}:p))
 
  async function handleSave(){
    if(!eco.nombre){alert('Ingresa el nombre del Eco Coordinador');return}
    setSaving(true)
    try{
      let fmtId=formato?.id
      const ecoData={
        nombre:eco.nombre,telefono:eco.telefono,direccion:eco.direccion,
        banco:eco.banco,cuenta:eco.cuenta,sexo:eco.sexo,
        edad:parseInt(eco.edad)||null,clave_elector:eco.clave_elector,municipio:eco.municipio,
        pres_nombre:pres.nombre,pres_telefono:pres.telefono,pres_direccion:pres.direccion,
        pres_banco:pres.banco,pres_cuenta:pres.cuenta,pres_sexo:pres.sexo,
        pres_edad:parseInt(pres.edad)||null,pres_clave_elector:pres.clave_elector,pres_municipio:pres.municipio,
        completo
      }
      if(!fmtId){
        const {data:newFmt,error}=await supabase.from('formato_1x20').insert({
          usuario_id:userId,...ecoData,notificado:false
        }).select().single()
        if(error)throw error
        fmtId=newFmt.id
        setFormato(newFmt)
      } else {
        await supabase.from('formato_1x20').update(ecoData).eq('id',fmtId)
      }
      for(const p of personas){
        if(!p.nombre?.trim())continue
        const {data:existing}=await supabase.from('formato_1x20_personas').select('id').eq('formato_id',fmtId).eq('numero',p.numero).single()
        if(existing){
          await supabase.from('formato_1x20_personas').update({nombre:p.nombre,seccion:p.seccion,domicilio:p.domicilio,celular:p.celular,validado:p.validado,notas:p.notas}).eq('id',existing.id)
        } else {
          await supabase.from('formato_1x20_personas').insert({formato_id:fmtId,numero:p.numero,nombre:p.nombre,seccion:p.seccion,domicilio:p.domicilio,celular:p.celular,validado:p.validado,notas:p.notas})
        }
      }
      alert('✅ Formato guardado')
    }catch(e:any){alert('Error: '+e.message)}
    setSaving(false)
  }
 
  async function handleEnviar(){
    if(!completo){alert('Debes llenar las 20 personas');return}
    if(!formato?.id){alert('Primero guarda el formato');return}
    setSaving(true)
    try{
      await supabase.from('formato_1x20').update({completo:true,notificado:true}).eq('id',formato.id)
      await supabase.from('notificaciones').insert({
        tipo:'1x20_completo',
        mensaje:`Formato 1x20 completado. Eco Coordinador: ${eco.nombre} | Presidente de Comité: ${pres.nombre||'(sin datos)'}. Pendiente pago $300 eco + $50×20 personas pres.`,
        usuario_id:userId,leida:false
      })
      setEnviado(true)
      alert('✅ Notificación enviada al admin. Pagos en proceso.')
    }catch(e:any){alert('Error: '+e.message)}
    setSaving(false)
  }
 
  function exportarFormato(){
    const wb=XLSX.utils.book_new()
    const rows:any[][]=[
      ['FORMATO 1x20 — ECOSABANA Sonora 2027'],
      [],
      ['ECO COORDINADOR:',eco.nombre,'','Tel:',eco.telefono],
      ['Banco:',eco.banco,'Cuenta:',eco.cuenta],
      [],
      ['PRESIDENTE DE COMITÉ:',pres.nombre,'','Tel:',pres.telefono],
      ['Banco:',pres.banco,'Cuenta:',pres.cuenta],
      [],
      ['#','Sección','Nombre completo','Domicilio','Celular','Firma','Validado SI/NO','Notas']
    ]
    personas.forEach(p=>rows.push([String(p.numero).padStart(2,'0'),p.seccion||'',p.nombre||'',p.domicilio||'',p.celular||'','',p.validado?'SI':'',p.notas||'']))
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Formato 1x20')
    XLSX.writeFile(wb,`1x20_${eco.nombre||'formato'}_${new Date().toLocaleDateString('es-MX').replace(/\//g,'-')}.xlsx`)
  }
 
  const filledCount=personas.filter(p=>p.nombre?.trim()).length
  const presPayment=filledCount*50
 
  if(loading)return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f4f7ec'}}><p style={{color:'#5a8012',fontWeight:700}}>Cargando...</p></div>)
 
  return(
    <div style={{minHeight:'100vh',background:'#f4f7ec',paddingBottom:'40px'}}>
      <div className="header">
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <button className="btn btn-white" onClick={()=>router.push('/usuario')}>← Volver</button>
          <div className="header-title"><h1>Formato 1x20</h1><p>ECOSABANA Sonora 2027</p></div>
        </div>
        <div className="header-actions">
          <button className="btn btn-white" onClick={exportarFormato}>📥 Descargar Excel</button>
          <button className="btn btn-green" onClick={handleSave} disabled={saving}>{saving?'Guardando...':'💾 Guardar'}</button>
          <button onClick={handleEnviar} disabled={!completo||enviado||saving}
            style={{padding:'9px 16px',borderRadius:'9px',border:'none',fontWeight:700,fontSize:'13px',
              background:enviado?'#2a8540':completo?'#1a73c8':'#aaa',
              color:'#fff',cursor:completo&&!enviado?'pointer':'not-allowed',fontFamily:'var(--font)'}}>
            {enviado?'✅ Enviado':`📤 Enviar (${filledCount}/20)`}
          </button>
        </div>
      </div>
 
      <div style={{margin:'24px 28px'}}>
 
        {/* Progress */}
        <div style={{background:'#fff',borderRadius:'14px',padding:'16px 20px',marginBottom:'20px',
          boxShadow:'0 2px 12px rgba(90,128,18,.1)',border:'1px solid rgba(143,191,37,.2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
            <span style={{fontWeight:700,color:'#3d5a09',fontSize:'14px'}}>Progreso: {filledCount}/20 personas</span>
            <div style={{display:'flex',gap:'12px',fontSize:'13px'}}>
              <span style={{color:'#0a5c3e',fontWeight:700}}>Eco Coordinador: $300</span>
              <span style={{color:'#185FA5',fontWeight:700}}>Presidente: ${presPayment} ({filledCount}×$50)</span>
            </div>
          </div>
          <div style={{background:'#e8f5e9',borderRadius:'8px',height:'10px',overflow:'hidden'}}>
            <div style={{background:'linear-gradient(90deg,#5a8012,#00B15A)',
              width:`${(filledCount/20)*100}%`,height:'100%',transition:'width .3s',borderRadius:'8px'}}/>
          </div>
          {enviado&&(
            <div style={{marginTop:'8px',background:'rgba(42,133,64,.1)',border:'1px solid #2a8540',
              borderRadius:'8px',padding:'8px 12px',fontSize:'12px',color:'#2a8540',fontWeight:700}}>
              ✅ Enviado al admin — Pagos en proceso ($300 eco + ${presPayment} presidente)
            </div>
          )}
          {(formato?.eco_pago_realizado || formato?.pres_pago_realizado) && (
            <div style={{marginTop:'10px',display:'flex',gap:'16px',flexWrap:'wrap'}}>
              {formato?.eco_pago_realizado && (
                <div style={{background:'rgba(42,133,64,.08)',border:'1px solid #2a8540',borderRadius:'10px',padding:'10px 14px'}}>
                  <div style={{fontWeight:700,color:'#2a8540',fontSize:'12px',marginBottom:'6px'}}>✅ Eco Coordinador — Pago confirmado $300</div>
                  {formato?.eco_foto_comprobante && (
                    <img src={formato.eco_foto_comprobante} style={{width:'120px',height:'80px',objectFit:'cover',borderRadius:'8px',border:'2px solid #2a8540'}}/>
                  )}
                </div>
              )}
              {formato?.pres_pago_realizado && (
                <div style={{background:'rgba(24,95,165,.08)',border:'1px solid #185FA5',borderRadius:'10px',padding:'10px 14px'}}>
                  <div style={{fontWeight:700,color:'#185FA5',fontSize:'12px',marginBottom:'6px'}}>✅ Presidente — Pago confirmado ${presPayment}</div>
                  {formato?.pres_foto_comprobante && (
                    <img src={formato.pres_foto_comprobante} style={{width:'120px',height:'80px',objectFit:'cover',borderRadius:'8px',border:'2px solid #185FA5'}}/>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
 
        {/* Eco Coordinador */}
        <DatosPersona title="Eco Coordinador" prefix="eco" data={eco} setData={setEco} bancos={BANCOS} municipios={MUNICIPIOS}/>
 
        {/* Presidente de Comité */}
        <DatosPersona title="Presidente de Comité" prefix="pres" data={pres} setData={setPres} bancos={BANCOS} municipios={MUNICIPIOS}/>
 
        {/* Las 20 personas */}
        <div className="modal" style={{borderRadius:'18px',maxWidth:'100%'}}>
          <div className="modal-header">
            <h2>📋 Las 20 Personas</h2>
            <span style={{fontSize:'13px',color:'#7a8060',fontWeight:600}}>Llena las 20 para habilitar el envío</span>
          </div>
          <div className="modal-body" style={{padding:'12px 16px'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                <thead>
                  <tr>
                    {['#','Sección','Nombre completo','Domicilio','Celular','Validado','Notas'].map(h=>(
                      <th key={h} style={{padding:'10px 8px',background:'linear-gradient(135deg,#eef6d0,#f7fbe8)',
                        borderBottom:'2px solid #C8DF8E',color:'#3d5a09',fontWeight:700,
                        fontSize:'10px',textTransform:'uppercase',letterSpacing:'.05em',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {personas.map((p,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid #eef3e0',background:p.nombre?.trim()?'rgba(143,191,37,.05)':'#fff'}}>
                      <td style={{padding:'6px 8px',fontWeight:700,color:'#5a8012',textAlign:'center',width:'36px'}}>{String(p.numero).padStart(2,'0')}</td>
                      <td style={{padding:'4px',width:'70px'}}><input value={p.seccion||''} onChange={e=>setP(i,'seccion',e.target.value)} style={{width:'100%',padding:'6px 8px',border:'1.5px solid #dde8bb',borderRadius:'7px',fontSize:'12px',fontFamily:'var(--font)',background:'#fafff4',outline:'none'}}/></td>
                      <td style={{padding:'4px',minWidth:'180px'}}><input value={p.nombre||''} onChange={e=>setP(i,'nombre',e.target.value)} placeholder="Nombre completo" style={{width:'100%',padding:'6px 8px',border:'1.5px solid #dde8bb',borderRadius:'7px',fontSize:'12px',fontFamily:'var(--font)',background:'#fafff4',outline:'none'}}/></td>
                      <td style={{padding:'4px',minWidth:'150px'}}><input value={p.domicilio||''} onChange={e=>setP(i,'domicilio',e.target.value)} placeholder="Domicilio" style={{width:'100%',padding:'6px 8px',border:'1.5px solid #dde8bb',borderRadius:'7px',fontSize:'12px',fontFamily:'var(--font)',background:'#fafff4',outline:'none'}}/></td>
                      <td style={{padding:'4px',width:'110px'}}><input value={p.celular||''} onChange={e=>setP(i,'celular',e.target.value)} placeholder="Celular" style={{width:'100%',padding:'6px 8px',border:'1.5px solid #dde8bb',borderRadius:'7px',fontSize:'12px',fontFamily:'var(--font)',background:'#fafff4',outline:'none'}}/></td>
                      <td style={{padding:'4px 8px',textAlign:'center',width:'70px'}}>
                        <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'4px',cursor:'pointer'}}>
                          <input type="checkbox" checked={p.validado||false} onChange={e=>setP(i,'validado',e.target.checked)} style={{width:'14px',height:'14px',accentColor:'#00B15A'}}/>
                          <span style={{fontSize:'11px',color:'#5a8012'}}>SI</span>
                        </label>
                      </td>
                      <td style={{padding:'4px',minWidth:'100px'}}><input value={p.notas||''} onChange={e=>setP(i,'notas',e.target.value)} placeholder="Notas" style={{width:'100%',padding:'6px 8px',border:'1.5px solid #dde8bb',borderRadius:'7px',fontSize:'12px',fontFamily:'var(--font)',background:'#fafff4',outline:'none'}}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" style={{background:'#F2F4EE',border:'1px solid #D4D8C8'}} onClick={()=>router.push('/usuario')}>Cancelar</button>
            <button className="btn btn-green" onClick={handleSave} disabled={saving}>{saving?'Guardando...':'💾 Guardar Formato'}</button>
            <button onClick={handleEnviar} disabled={!completo||enviado||saving}
              style={{padding:'9px 16px',borderRadius:'9px',border:'none',fontWeight:700,fontSize:'13px',
                background:enviado?'#2a8540':completo?'#1a73c8':'#aaa',color:'#fff',
                cursor:completo&&!enviado?'pointer':'not-allowed',fontFamily:'var(--font)'}}>
              {enviado?'✅ Notificación Enviada':completo?'📤 Enviar al Admin':`📤 Enviar (${filledCount}/20)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}