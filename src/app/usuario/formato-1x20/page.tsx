'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { MUNICIPIOS, BANCOS, MASCOT_SRC } from '@/lib/constants'
import * as XLSX from 'xlsx'
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
 
const EMPTY_PERSON = () => ({ nombre:'', seccion:'', domicilio:'', celular:'', validado:false, notas:'' })
 
export default function Formato1x20() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')
  const [formato, setFormato] = useState<any>(null)
  const [lider, setLider] = useState({
    nombre:'', telefono:'', direccion:'', banco:'', cuenta:'',
    sexo:'', edad:'', clave_elector:'', municipio:''
  })
  const [personas, setPersonas] = useState<any[]>(Array.from({length:20}, (_,i) => ({...EMPTY_PERSON(), numero: i+1})))
  const [completo, setCompleto] = useState(false)
  const [enviado, setEnviado] = useState(false)
 
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/'); return }
      setUserId(data.user.id)
      // Check if already has a formato
      const { data: fmt } = await supabase
        .from('formato_1x20').select('*').eq('usuario_id', data.user.id).single()
      if (fmt) {
        setFormato(fmt)
        setLider({
          nombre: fmt.nombre||'', telefono: fmt.telefono||'', direccion: fmt.direccion||'',
          banco: fmt.banco||'', cuenta: fmt.cuenta||'', sexo: fmt.sexo||'',
          edad: fmt.edad||'', clave_elector: fmt.clave_elector||'', municipio: fmt.municipio||''
        })
        setCompleto(fmt.completo)
        setEnviado(fmt.notificado)
        // Load personas
        const { data: ps } = await supabase
          .from('formato_1x20_personas').select('*').eq('formato_id', fmt.id).order('numero')
        if (ps && ps.length > 0) {
          const filled = Array.from({length:20}, (_,i) => {
            const p = ps.find((x:any) => x.numero === i+1)
            return p || {...EMPTY_PERSON(), numero: i+1}
          })
          setPersonas(filled)
        }
      }
      setLoading(false)
    })
  }, [])
 
  // Check if all 20 are filled
  useEffect(() => {
    const filled = personas.filter(p => p.nombre?.trim()).length
    setCompleto(filled >= 20)
  }, [personas])
 
  const setP = (idx: number, k: string, v: any) => {
    setPersonas(prev => prev.map((p,i) => i===idx ? {...p,[k]:v} : p))
  }
 
  async function handleSave() {
    if (!lider.nombre) { alert('Ingresa tu nombre como líder'); return }
    setSaving(true)
    try {
      let fmtId = formato?.id
      if (!fmtId) {
        // Create formato
        const { data: newFmt, error } = await supabase.from('formato_1x20').insert({
          usuario_id: userId, ...lider, edad: parseInt(lider.edad)||null,
          completo: false, notificado: false
        }).select().single()
        if (error) throw error
        fmtId = newFmt.id
        setFormato(newFmt)
      } else {
        // Update formato
        await supabase.from('formato_1x20').update({
          ...lider, edad: parseInt(lider.edad)||null, completo
        }).eq('id', fmtId)
      }
      // Save personas
      for (const p of personas) {
        if (!p.nombre?.trim()) continue
        const { data: existing } = await supabase
          .from('formato_1x20_personas').select('id').eq('formato_id', fmtId).eq('numero', p.numero).single()
        if (existing) {
          await supabase.from('formato_1x20_personas').update({
            nombre: p.nombre, seccion: p.seccion, domicilio: p.domicilio,
            celular: p.celular, validado: p.validado, notas: p.notas
          }).eq('id', existing.id)
        } else {
          await supabase.from('formato_1x20_personas').insert({
            formato_id: fmtId, numero: p.numero,
            nombre: p.nombre, seccion: p.seccion, domicilio: p.domicilio,
            celular: p.celular, validado: p.validado, notas: p.notas
          })
        }
      }
      alert('✅ Formato guardado correctamente')
    } catch(e:any) {
      alert('Error: ' + e.message)
    }
    setSaving(false)
  }
 
  async function handleEnviar() {
    if (!completo) { alert('Debes llenar las 20 personas para poder enviar'); return }
    if (!formato?.id) { alert('Primero guarda el formato'); return }
    setSaving(true)
    try {
      // Mark as complete and notified
      await supabase.from('formato_1x20').update({ completo: true, notificado: true }).eq('id', formato.id)
      // Create notification for admin
      await supabase.from('notificaciones').insert({
        tipo: '1x20_completo',
        mensaje: `${lider.nombre} completó su Formato 1x20 con 20 personas. Le corresponden $300.`,
        usuario_id: userId,
        leida: false
      })
      setEnviado(true)
      alert('✅ Notificación enviada al administrador. Tu pago de $300 será procesado.')
    } catch(e:any) {
      alert('Error: ' + e.message)
    }
    setSaving(false)
  }
 
  function exportarFormato() {
    const wb = XLSX.utils.book_new()
    const rows: any[][] = [
      ['FORMATO 1x20 — ECOSABANA Sonora 2027'],
      [],
      ['Líder:', lider.nombre, '', 'Teléfono:', lider.telefono],
      ['Dirección:', lider.direccion],
      ['Municipio:', lider.municipio, '', 'Banco:', lider.banco, 'Cuenta:', lider.cuenta],
      ['Clave Elector:', lider.clave_elector, '', 'Sexo:', lider.sexo, 'Edad:', lider.edad],
      [],
      ['#', 'Sección', 'Nombre completo', 'Domicilio', 'Celular', 'Firma', 'Validado SI/NO', 'Notas']
    ]
    personas.forEach(p => {
      rows.push([
        String(p.numero).padStart(2,'0'),
        p.seccion||'', p.nombre||'', p.domicilio||'', p.celular||'',
        '', p.validado ? 'SI' : '', p.notas||''
      ])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Formato 1x20')
    XLSX.writeFile(wb, `1x20_${lider.nombre||'formato'}_${new Date().toLocaleDateString('es-MX').replace(/\//g,'-')}.xlsx`)
  }
 
  const filledCount = personas.filter(p => p.nombre?.trim()).length
 
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f4f7ec' }}>
      <p style={{ color:'#5a8012', fontWeight:700 }}>Cargando...</p>
    </div>
  )
 
  return (
    <div style={{ minHeight:'100vh', background:'#f4f7ec', paddingBottom:'40px' }}>
      {/* Header */}
      <div className="header">
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <button className="btn btn-white" onClick={() => router.push('/usuario')}>← Volver</button>
          <div className="header-title">
            <h1>Formato 1x20</h1>
            <p>ECOSABANA Sonora 2027</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-white" onClick={exportarFormato}>📥 Descargar Excel</button>
          <button className="btn btn-green" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
          <button
            className="btn"
            onClick={handleEnviar}
            disabled={!completo || enviado || saving}
            style={{
              background: enviado ? '#2a8540' : completo ? '#1a73c8' : '#ccc',
              color: '#fff', fontWeight:700,
              cursor: completo && !enviado ? 'pointer' : 'not-allowed',
              opacity: completo ? 1 : 0.6,
            }}
          >
            {enviado ? '✅ Enviado' : `📤 Enviar (${filledCount}/20)`}
          </button>
        </div>
      </div>
 
      <div className="form-page-wrap">
 
        {/* Progress bar */}
        <div style={{ background:'#fff', borderRadius:'14px', padding:'16px 20px', marginBottom:'20px',
          boxShadow:'0 2px 12px rgba(90,128,18,.1)', border:'1px solid rgba(143,191,37,.2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
            <span style={{ fontWeight:700, color:'#3d5a09', fontSize:'14px' }}>
              Progreso: {filledCount}/20 personas
            </span>
            {completo && !enviado && (
              <span style={{ background:'rgba(26,115,200,.15)', color:'#1a73c8', padding:'4px 12px',
                borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>
                ✓ Completo — Ya puedes enviar
              </span>
            )}
            {enviado && (
              <span style={{ background:'rgba(42,133,64,.15)', color:'#2a8540', padding:'4px 12px',
                borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>
                ✅ Enviado al admin — Pago en proceso
              </span>
            )}
          </div>
          <div style={{ background:'#e8f5e9', borderRadius:'8px', height:'10px', overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(90deg,#5a8012,#00B15A)',
              width:`${(filledCount/20)*100}%`, height:'100%', transition:'width .3s', borderRadius:'8px' }}/>
          </div>
        </div>
 
        {/* Datos del líder */}
        <div className="modal" style={{ borderRadius:'18px', marginBottom:'20px', width:'100%', maxWidth:'100%' }}>
          <div className="modal-header">
            <h2>👤 Tus datos como Líder del Formato</h2>
          </div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre completo *</label>
                <input type="text" value={lider.nombre} onChange={e => setLider({...lider, nombre:e.target.value})} placeholder="Tu nombre completo"/>
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input type="tel" value={lider.telefono} onChange={e => setLider({...lider, telefono:e.target.value})} placeholder="10 dígitos"/>
              </div>
              <div className="form-group full">
                <label>Dirección</label>
                <input type="text" value={lider.direccion} onChange={e => setLider({...lider, direccion:e.target.value})} placeholder="Calle, número, colonia"/>
              </div>
              <div className="form-group">
                <label>Municipio</label>
                <select className="form-select" value={lider.municipio} onChange={e => setLider({...lider, municipio:e.target.value})}>
                  <option value="">Selecciona</option>
                  {MUNICIPIOS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Banco</label>
                <select className="form-select" value={lider.banco} onChange={e => setLider({...lider, banco:e.target.value})}>
                  <option value="">Selecciona</option>
                  {BANCOS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Número de cuenta</label>
                <input type="text" value={lider.cuenta} onChange={e => setLider({...lider, cuenta:e.target.value})}/>
              </div>
              <div className="form-group">
                <label>Sexo</label>
                <select className="form-select" value={lider.sexo} onChange={e => setLider({...lider, sexo:e.target.value})}>
                  <option value="">Selecciona</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div className="form-group">
                <label>Edad</label>
                <input type="number" value={lider.edad} onChange={e => setLider({...lider, edad:e.target.value})} min="18" max="99"/>
              </div>
              <div className="form-group full">
                <label>Clave de Elector</label>
                <input type="text" value={lider.clave_elector} onChange={e => setLider({...lider, clave_elector:e.target.value.toUpperCase()})} placeholder="18 caracteres" maxLength={18}/>
              </div>
            </div>
          </div>
        </div>
 
        {/* Las 20 personas */}
        <div className="modal" style={{ borderRadius:'18px', maxWidth:'100%' }}>
          <div className="modal-header">
            <h2>📋 Las 20 Personas</h2>
            <span style={{ fontSize:'13px', color:'#7a8060', fontWeight:600 }}>
              Llena las 20 para habilitar el botón de envío
            </span>
          </div>
          <div className="modal-body" style={{ padding:'12px 16px' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                <thead>
                  <tr>
                    {['#','Sección','Nombre completo','Domicilio','Celular','Validado','Notas'].map(h => (
                      <th key={h} style={{ padding:'10px 8px', background:'linear-gradient(135deg,#eef6d0,#f7fbe8)',
                        borderBottom:'2px solid #C8DF8E', color:'#3d5a09', fontWeight:700,
                        fontSize:'10px', textTransform:'uppercase', letterSpacing:'.05em', whiteSpace:'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {personas.map((p, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #eef3e0',
                      background: p.nombre?.trim() ? 'rgba(143,191,37,.05)' : '#fff' }}>
                      <td style={{ padding:'6px 8px', fontWeight:700, color:'#5a8012', textAlign:'center', width:'36px' }}>
                        {String(p.numero).padStart(2,'0')}
                      </td>
                      <td style={{ padding:'4px 4px', width:'70px' }}>
                        <input value={p.seccion||''} onChange={e => setP(i,'seccion',e.target.value)}
                          style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #dde8bb', borderRadius:'7px',
                            fontSize:'12px', fontFamily:'var(--font)', background:'#fafff4', outline:'none' }}/>
                      </td>
                      <td style={{ padding:'4px 4px', minWidth:'180px' }}>
                        <input value={p.nombre||''} onChange={e => setP(i,'nombre',e.target.value)}
                          placeholder="Nombre completo"
                          style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #dde8bb', borderRadius:'7px',
                            fontSize:'12px', fontFamily:'var(--font)', background:'#fafff4', outline:'none' }}/>
                      </td>
                      <td style={{ padding:'4px 4px', minWidth:'150px' }}>
                        <input value={p.domicilio||''} onChange={e => setP(i,'domicilio',e.target.value)}
                          placeholder="Domicilio"
                          style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #dde8bb', borderRadius:'7px',
                            fontSize:'12px', fontFamily:'var(--font)', background:'#fafff4', outline:'none' }}/>
                      </td>
                      <td style={{ padding:'4px 4px', width:'110px' }}>
                        <input value={p.celular||''} onChange={e => setP(i,'celular',e.target.value)}
                          placeholder="Celular"
                          style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #dde8bb', borderRadius:'7px',
                            fontSize:'12px', fontFamily:'var(--font)', background:'#fafff4', outline:'none' }}/>
                      </td>
                      <td style={{ padding:'4px 8px', textAlign:'center', width:'70px' }}>
                        <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', cursor:'pointer' }}>
                          <input type="checkbox" checked={p.validado||false} onChange={e => setP(i,'validado',e.target.checked)}
                            style={{ width:'14px', height:'14px', accentColor:'#00B15A' }}/>
                          <span style={{ fontSize:'11px', color:'#5a8012' }}>SI</span>
                        </label>
                      </td>
                      <td style={{ padding:'4px 4px', minWidth:'100px' }}>
                        <input value={p.notas||''} onChange={e => setP(i,'notas',e.target.value)}
                          placeholder="Notas"
                          style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #dde8bb', borderRadius:'7px',
                            fontSize:'12px', fontFamily:'var(--font)', background:'#fafff4', outline:'none' }}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" style={{ background:'#F2F4EE', border:'1px solid #D4D8C8' }}
              onClick={() => router.push('/usuario')}>Cancelar</button>
            <button className="btn btn-green" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : '💾 Guardar Formato'}
            </button>
            <button
              onClick={handleEnviar}
              disabled={!completo || enviado || saving}
              style={{
                padding:'9px 16px', borderRadius:'9px', border:'none',
                background: enviado ? '#2a8540' : completo ? '#1a73c8' : '#aaa',
                color:'#fff', fontWeight:700, fontSize:'13px', cursor: completo && !enviado ? 'pointer' : 'not-allowed',
                fontFamily:'var(--font)',
              }}
            >
              {enviado ? '✅ Notificación Enviada' : completo ? '📤 Enviar al Admin ($300)' : `📤 Enviar (${filledCount}/20 completas)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}