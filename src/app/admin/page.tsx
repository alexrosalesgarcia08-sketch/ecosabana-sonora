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
  const [statsFilter, setStatsFilter] = useState<'catorcena'|'fecha'>('catorcena')
  const [statsCat, setStatsCat] = useState('')
  const [statsDesde, setStatsDesde] = useState('')
  const [statsHasta, setStatsHasta] = useState('')
  const [modal1x20, setModal1x20] = useState(false)
  const [formatos1x20, setFormatos1x20] = useState<any[]>([])  
  const [notifs, setNotifs] = useState<any[]>([])
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [pagoLider, setPagoLider] = useState<any>(null)
  const [dropOpen, setDropOpen] = useState(false)
  const [listModal, setListModal] = useState<{tipo:string,items:any[]}|null>(null)
  const [credModal, setCredModal] = useState<any>(null)
  const [credFields, setCredFields] = useState<Record<string,boolean>>({ foto:true, nombre:true, celular:true, rol:true, municipio:true, folio:false, casilla:false, banco:false, cuenta:false, distrito:false, status:true })
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
      supabase.from('formato_1x20_con_conteo').select('*').order('created_at', { ascending: false }),
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
        const { data: { user } } = await supabase.auth.getUser()

        function normMun(raw: string): string {
          const m = (raw||'').toString().trim().toUpperCase()
          const map: Record<string,string> = {
            'CAJE':'Cajeme','CAJEME':'Cajeme','CSJEME':'Cajeme',
            'HERMOSILLO':'Hermosillo','NAVOJOA':'Navojoa','GUAYMAS':'Guaymas',
            'GUAYMAS SONORA':'Guaymas','EMPALME':'Empalme','NOGALES':'Nogales',
            'HUATABAMPO':'Huatabampo','ETCHOJOA':'Etchojoa',
            'SAN LUIS RIO COLORADO':'San Luis Rio Colorado',
            'SAN IGNACIO RIO MUERTO':'San Ignacio Rio Muerto',
            'ALAMOS':'Alamos','ALTAR':'Altar',
          }
          const norm = m.normalize('NFD').replace(/[̀-ͯ]/g,'')
          return map[norm] || map[m] || (raw||'').toString().trim()
        }

        function normBanco(raw: string): string {
          const b = (raw||'').toString().trim().toUpperCase()
          if (b.includes('BBVA')||b.includes('BANCOMER')) return 'BBVA'
          if (b.includes('BANAMEX')||b.includes('CITIBANAMEX')||b.includes('NACIONAL DE MEXICO')||b.includes('CITIBANK')) return 'Citibanamex'
          if (b.includes('SANTANDER')) return 'Santander'
          if (b.includes('BANORTE')) return 'Banorte'
          if (b.includes('HSBC')) return 'HSBC'
          if (b.includes('SCOTIABANK')) return 'Scotiabank'
          if (b.includes('AZTECA')) return 'Azteca'
          if (b.includes('COPPEL')||b.includes('BANCOPPEL')) return 'Coppel'
          if (b.includes('BAJIO')||b.includes('BAJIO')) return 'Banbajio'
          if (b.includes('SPIN')||b.includes('OXXO')) return 'SPIN by OXXO'
          if (b.includes('HEY')) return 'Hey Banco'
          if (b.includes('NU ') || b==='NU') return 'Hey Banco'
          if (b.includes('AFIRME')) return 'Afirme'
          return (raw||'').toString().trim()
        }

        function normDist(raw: any): number | null {
          if (!raw) return null
          const str = (raw||'').toString().trim().toUpperCase()
          const roman: Record<string,number> = {
            'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,'VIII':8,
            'IX':9,'X':10,'XI':11,'XII':12,'XIII':13,'XIV':14,'XV':15,
            'XVI':16,'XVII':17,'XVIII':18,'XIX':19,'XX':20,'XXI':21
          }
          if (roman[str] !== undefined) return roman[str]
          const n = parseInt(str)
          return isNaN(n) ? null : n
        }

        // ── Step 1: Load ALL existing names and claves at once ──
        const { data: existingAll } = await supabase.from('personas').select('nombre,clave_elector')
        const existingNames = new Set((existingAll||[]).map((p:any) => p.nombre?.toUpperCase().trim()))
        const existingClaves = new Set((existingAll||[]).map((p:any) => p.clave_elector?.toUpperCase().trim()).filter(Boolean))

        // ── Step 2: Parse all rows ──────────────────────────────
        const toInsert: any[] = []
        const dupList: string[] = []
        let skipped = 0

        for (const sheetName of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header:1, defval:'' }) as any[][]
          if (rows.length < 2) continue
          const hdr = rows[0].map((h:any) => (h||'').toString().trim().toUpperCase())

          const isRGFormat = hdr.some(h => h.includes('APELLIDO PATERNO'))
          const iApPat = hdr.findIndex(h=>h.includes('APELLIDO PATERNO'))
          const iApMat = hdr.findIndex(h=>h.includes('APELLIDO MATERNO'))
          const iNomP = hdr.findIndex(h=>h.includes('NOMBRE (ES)')||h.includes('NOMBRE(ES)')||h==='NOMBRE')
          const iNomCol = isRGFormat ? -1 : hdr.findIndex(h=>h.includes('NOMBRE'))
          const iTel = hdr.findIndex(h=>h.includes('TELEFONO')||h.includes('CELULAR'))
          const iCalle = hdr.findIndex(h=>h==='CALLE')
          const iNumExt = hdr.findIndex(h=>h.includes('NUMERO EXTERIOR')||h.includes('NUM EXT'))
          const iColonia = hdr.findIndex(h=>h==='COLONIA')
          const iCP = hdr.findIndex(h=>h.includes('CODIGO POSTAL')||h==='CP')
          const iSeccion = hdr.findIndex(h=>h.includes('SECCION')||h.includes('SECCION'))
          const iClave = hdr.findIndex(h=>h.includes('CLAVE DE ELECTOR')||h.includes('CLAVE ELECTOR'))
          const iMun = hdr.findIndex(h=>h.includes('MUNICIPIO'))
          const iDistL = hdr.findIndex(h=>h.includes('DISTRITO LOCAL'))
          const iDistF = hdr.findIndex(h=>h.includes('DISTRITO FEDERAL'))
          const iBanco = hdr.findIndex(h=>h.includes('BANCO'))
          const iCuenta = hdr.findIndex(h=>h.includes('TARJETA')||h.includes('CUENTA')||h.includes('NUMERO DE CUENTA'))
          const iNotas = hdr.findIndex(h=>h==='NOTAS')
          const iFecha = hdr.findIndex(h=>h.includes('MARCA TEMPORAL')||h.includes('FECHA'))

          for (const row of rows.slice(1)) {
            let nombre = ''
            if (isRGFormat) {
              const a1 = (row[iApPat]||'').toString().trim()
              const a2 = (row[iApMat]||'').toString().trim()
              const n1 = (row[iNomP]||'').toString().trim()
              nombre = `${n1} ${a1} ${a2}`.trim().replace(/\s+/g,' ').toUpperCase()
            } else {
              nombre = (row[iNomCol]||'').toString().trim().toUpperCase()
            }
            if (!nombre) continue

            // Check dupe in memory (fast)
            const nombreNorm = nombre.toUpperCase().trim()
            if (existingNames.has(nombreNorm)) {
              dupList.push(nombre)
              continue
            }

            const clave = iClave > -1 ? (row[iClave]||'').toString().trim().toUpperCase() : ''
            if (clave && existingClaves.has(clave)) {
              dupList.push(`${nombre} (clave duplicada)`)
              continue
            }

            let fechaReg = new Date().toISOString().split('T')[0]
            if (iFecha > -1 && row[iFecha]) {
              try {
                const fd = new Date((row[iFecha]||'').toString())
                if (!isNaN(fd.getTime())) fechaReg = fd.toISOString().split('T')[0]
              } catch {}
            }

            const record = {
              nombre,
              celular: iTel > -1 ? (row[iTel]||'').toString().replace(/\D/g,'').slice(0,10) : '',
              municipio: iMun > -1 ? normMun((row[iMun]||'').toString()) : '',
              banco: iBanco > -1 ? normBanco((row[iBanco]||'').toString()) : '',
              cuenta: iCuenta > -1 ? (row[iCuenta]||'').toString().replace(/\s/g,'') : '',
              clave_elector: clave,
              calle: iCalle > -1 ? (row[iCalle]||'').toString().trim() : '',
              numero_ext: iNumExt > -1 ? (row[iNumExt]||'').toString().trim() : '',
              colonia: iColonia > -1 ? (row[iColonia]||'').toString().trim() : '',
              cp: iCP > -1 ? (row[iCP]||'').toString().trim() : '',
              seccion: iSeccion > -1 ? (row[iSeccion]||'').toString().trim() : '',
              distrito_local: iDistL > -1 ? normDist(row[iDistL]) : null,
              distrito_federal: iDistF > -1 ? normDist(row[iDistF]) : null,
              notas: iNotas > -1 ? (row[iNotas]||'').toString().trim() : '',
              rol: 'RG',
              status: [],
              pago_acum: 300,
              fecha_registro: fechaReg,
              creado_por: user?.id,
            }

            toInsert.push(record)
            existingNames.add(nombreNorm)
            if (clave) existingClaves.add(clave)
          }
        }

        // ── Step 3: Batch insert in chunks of 50 ───────────────
        let imported = 0
        const chunkSize = 50
        for (let i = 0; i < toInsert.length; i += chunkSize) {
          const chunk = toInsert.slice(i, i + chunkSize)
          const { error } = await supabase.from('personas').insert(chunk)
          if (error) {
            console.error('Batch error:', error.message)
            skipped += chunk.length
          } else {
            imported += chunk.length
          }
        }

        let msg = `✅ Importación completada:\n\n• Importados: ${imported}\n• Duplicados omitidos: ${dupList.length}\n• Errores: ${skipped}`
        if (dupList.length > 0) {
          msg += `\n\nDuplicados (${dupList.length}):\n` + dupList.slice(0,8).map(d=>`• ${d}`).join('\n')
          if (dupList.length > 8) msg += `\n...y ${dupList.length-8} más`
        }
        alert(msg)
        loadAll()
      } catch (err: any) {
        alert('Error al importar: ' + err.message)
      }
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
          <div style={{ position:'relative' }}>
            {dropOpen && <div style={{ position:'fixed', inset:0, zIndex:499 }} onClick={() => setDropOpen(false)}/>}
            <button className="btn btn-white" onClick={() => setDropOpen(!dropOpen)}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Exportar ▾
            </button>
            {dropOpen && (
              <div style={{
                position:'absolute', top:'calc(100% + 8px)', right:0,
                background:'#fff', border:'1px solid #C8DF8E',
                borderRadius:'12px', boxShadow:'0 10px 36px rgba(90,128,18,.2)',
                minWidth:'200px', zIndex:500, overflow:'hidden',
              }}>
                <button className="dropdown-item" onClick={() => { exportExcel(); setDropOpen(false) }}>
                  📊 Exportar Excel
                </button>
                <div className="dropdown-sep"/>
                <button className="dropdown-item" onClick={() => { export1x20(); setDropOpen(false) }}>
                  📋 Exportar 1x20
                </button>
              </div>
            )}
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
        {statsCards.map(s => {
          function getItems() {
            if (s.label === 'ECOPERADORES') return personas.filter((p:any) => p.rol === 'Ecoperador')
            if (s.label === 'RG') return [
              ...personas.filter((p:any) => p.rol === 'RG'),
              ...ecos.filter((e:any) => e.rg_nombre||e.rg_tel).map((e:any) => {
                const eco = personas.find((p:any) => p.id === e.id)
                return {nombre:e.rg_nombre,celular:e.rg_tel,banco:e.rg_banco,cuenta:e.rg_cuenta,rol:'RG',municipio:eco?.municipio,_eco:eco?.nombre}
              })
            ]
            if (s.label === 'RC') return [
              ...personas.filter((p:any) => p.rol === 'RC'),
              ...rcsData.map((r:any) => {
                const eco = personas.find((p:any) => p.id === r.eco_id)
                return {nombre:r.nombre,celular:r.tel,banco:r.banco,cuenta:r.cuenta,rol:'RC',municipio:eco?.municipio,_eco:eco?.nombre}
              })
            ]
            if (s.label === 'OBSERVADORES') return [
              ...personas.filter((p:any) => p.rol === 'Observador'),
              ...obsData.map((o:any) => {
                const rc = rcsData.find((r:any) => r.id === o.rc_id)
                const eco = personas.find((p:any) => p.id === rc?.eco_id)
                return {nombre:o.nombre,celular:o.tel,banco:o.banco,cuenta:o.cuenta,rol:'Observador',municipio:eco?.municipio,_eco:eco?.nombre}
              })
            ]
            if (s.label === 'TOTAL') return personas
            if (s.label === 'CASILLAS') return personas.filter((p:any) => (p.casilla||0) > 0)
            return []
          }
          return (
            <div key={s.label} className="stat-card" style={{cursor:s.value>0?'pointer':'default'}}
              onClick={() => { const items = getItems(); if(items.length>0) setListModal({tipo:s.label,items}) }}>
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
          )
        })}
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
                      <button className="btn-dl" title="Credencial" onClick={() => { setCredModal(p); setCredFields({ foto:true, nombre:true, celular:true, rol:true, municipio:true, folio:false, casilla:false, banco:false, cuenta:false, distrito:false, status:true }) }}>🖨️</button>
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

      {/* ── MODAL PAGOS ── */}
      {payModal && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth:'520px' }}>
            <div className="modal-header">
              <h2>💳 Detalle de Pago</h2>
              <button className="modal-close" onClick={() => setPayModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {payModal.simple ? (
                <div className="pay-section">
                  <h4>{payModal.p.rol} — ${payModal.p.pago_acum || 0}</h4>
                  <div className="pay-person-row">
                    <div>
                      <div className="pay-name">{payModal.p.nombre}
                        {isPaid(payModal.p.id,'simple') && <span className="already-paid-badge" style={{marginLeft:'8px'}}>✓ Pagado Cat.{payModal.cat}</span>}
                      </div>
                      <div className="pay-account">{payModal.p.banco||'Sin banco'}{payModal.p.cuenta?' · '+payModal.p.cuenta:''}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <strong style={{color:'#0a5c3e'}}>${payModal.p.pago_acum||0}</strong>
                      <button className={`btn-pay-action${isPaid(payModal.p.id,'simple')?' paid':''}`}
                        onClick={()=>doRegisterPay(payModal.p.id,'simple',payModal.p.pago_acum||0)}>
                        {isPaid(payModal.p.id,'simple')?'✓ Pagado':'💳 Pagar'}
                      </button>
                    </div>
                  </div>
                  <div className="pay-total">
                    <span>Total (Cat. {payModal.cat}/{payModal.yr})</span>
                    <span>${payModal.p.pago_acum||0}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="pay-section">
                    <h4>🌱 Ecoperador — ${payModal.ecoTotal}</h4>
                    <div className="pay-person-row">
                      <div>
                        <div className="pay-name">{payModal.p.nombre}
                          {isPaid(payModal.p.id,'eco') && <span className="already-paid-badge" style={{marginLeft:'8px'}}>✓ Cat.{payModal.cat}</span>}
                        </div>
                        <div className="pay-account">{payModal.p.banco||'Sin banco'}{payModal.p.cuenta?' · '+payModal.p.cuenta:''}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <strong>${payModal.ecoTotal}</strong>
                        <button className={`btn-pay-action${isPaid(payModal.p.id,'eco')?' paid':''}`}
                          onClick={()=>doRegisterPay(payModal.p.id,'eco',payModal.ecoTotal)}>
                          {isPaid(payModal.p.id,'eco')?'✓ Pagado':'💳 Pagar'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {payModal.hasRG && (
                    <div className="pay-section" style={{marginTop:'10px'}}>
                      <h4>👤 RG — ${payModal.rgTotal}</h4>
                      <div className="pay-person-row">
                        <div>
                          <div className="pay-name">{payModal.eco?.rg_nombre||'(sin nombre)'}
                            {isPaid(payModal.p.id,'rg') && <span className="already-paid-badge" style={{marginLeft:'8px'}}>✓ Pagado</span>}
                          </div>
                          <div className="pay-account">{payModal.eco?.rg_banco}{payModal.eco?.rg_cuenta?' · '+payModal.eco.rg_cuenta:''}</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <strong style={{color:'#185FA5'}}>${payModal.rgTotal}</strong>
                          <button className={`btn-pay-action${isPaid(payModal.p.id,'rg')?' paid':''}`}
                            style={{background:isPaid(payModal.p.id,'rg')?'':'#185FA5'}}
                            onClick={()=>doRegisterPay(payModal.p.id,'rg',payModal.rgTotal)}>
                            {isPaid(payModal.p.id,'rg')?'✓ Pagado':'💳 Pagar RG'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {payModal.myRcs.length > 0 && (
                    <div className="pay-section" style={{marginTop:'10px'}}>
                      <h4>📋 RCs — $200 c/u</h4>
                      {payModal.myRcs.map((rc:any)=>(
                        <div key={rc.id} className="pay-person-row">
                          <div>
                            <div className="pay-name">RC {rc.slot}: {rc.nombre||'(sin nombre)'}
                              {isPaid(payModal.p.id,'rc_'+rc.slot) && <span className="already-paid-badge" style={{marginLeft:'8px'}}>✓ Pagado</span>}
                            </div>
                            <div className="pay-account">{rc.banco}{rc.cuenta?' · '+rc.cuenta:''}</div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <strong>$200</strong>
                            <button className={`btn-pay-action${isPaid(payModal.p.id,'rc_'+rc.slot)?' paid':''}`}
                              style={{background:isPaid(payModal.p.id,'rc_'+rc.slot)?'':'#5a8012'}}
                              onClick={()=>doRegisterPay(payModal.p.id,'rc_'+rc.slot,200)}>
                              {isPaid(payModal.p.id,'rc_'+rc.slot)?'✓ Pagado':'💳 Pagar RC'}
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
              <button className="btn" style={{background:'#F2F4EE',border:'1px solid #D4D8C8'}} onClick={()=>setPayModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CREDENCIAL ── */}
      {credModal && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth:'560px' }}>
            <div className="modal-header">
              <h2>🖨️ Credencial — {credModal.nombre}</h2>
              <button className="modal-close" onClick={() => setCredModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
                {[
                  ['foto','Foto'],['nombre','Nombre'],['rol','Rol'],['celular','Celular'],
                  ['municipio','Municipio'],['distrito','Distrito'],['folio','Folio'],
                  ['casilla','Sección/Casilla'],['banco','Banco'],['cuenta','Cuenta'],['status','Status'],
                ].map(([k,label]) => (
                  <label key={k} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px',
                    border:'1px solid rgba(143,191,37,.3)', borderRadius:'9px', cursor:'pointer',
                    background: credFields[k] ? '#eef6d0' : '#fff', transition:'all .12s' }}>
                    <input type="checkbox" checked={!!credFields[k]}
                      onChange={e => setCredFields((prev:any) => ({...prev, [k]: e.target.checked}))}
                      style={{ width:'14px', height:'14px', accentColor:'#00B15A' }}/>
                    <span style={{ fontSize:'13px', fontWeight:600, color:'#3d5a09' }}>{label}</span>
                  </label>
                ))}
              </div>
              <p style={{ fontSize:'11px', color:'#7a8060', marginBottom:'8px', fontWeight:600 }}>
                Vista previa — Zebra ZC300 (85.6 × 54 mm)
              </p>
              <div id="cred-preview" style={{
                width:'323px', height:'204px',
                background:'linear-gradient(135deg,#f8fef0 0%,#eef6d0 100%)',
                border:'2px solid #C8DF8E', borderRadius:'12px',
                padding:'14px', display:'flex', gap:'12px', alignItems:'flex-start',
                position:'relative', overflow:'hidden', margin:'0 auto',
              }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'5px',
                  background:'linear-gradient(90deg,#3d5a09,#00B15A)' }}/>
                <div style={{ position:'absolute', top:'10px', right:'10px',
                  width:'28px', height:'28px', borderRadius:'50%',
                  background:'linear-gradient(135deg,#5a8012,#00B15A)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ color:'#fff', fontSize:'14px', fontWeight:900 }}>V</span>
                </div>
                {credFields['foto'] && (
                  <div style={{ flexShrink:0 }}>
                    {credModal.foto
                      ? <img src={credModal.foto} style={{ width:'64px', height:'80px', objectFit:'cover', borderRadius:'8px', border:'2px solid #C8DF8E', marginTop:'6px' }}/>
                      : <div style={{ width:'64px', height:'80px', borderRadius:'8px',
                          background:'#eef6d0', border:'2px dashed #C8DF8E',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', marginTop:'6px' }}>👤</div>}
                  </div>
                )}
                <div style={{ flex:1, marginTop:'8px' }}>
                  {credFields['nombre'] && <div style={{ fontSize:'14px', fontWeight:800, color:'#2e4a08', lineHeight:1.2, marginBottom:'2px' }}>{credModal.nombre}</div>}
                  {credFields['rol'] && <div style={{ fontSize:'10px', fontWeight:700, color:'#fff', background:'linear-gradient(135deg,#5a8012,#00B15A)', display:'inline-block', padding:'2px 8px', borderRadius:'10px', marginBottom:'6px' }}>{credModal.rol}</div>}
                  <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                    {credFields['celular'] && credModal.celular && <div style={{ fontSize:'10px', color:'#4a5030' }}>📱 {credModal.celular}</div>}
                    {credFields['municipio'] && credModal.municipio && <div style={{ fontSize:'10px', color:'#4a5030' }}>📍 {credModal.municipio}</div>}
                    {credFields['distrito'] && credModal.distrito && <div style={{ fontSize:'10px', color:'#4a5030' }}>🗳️ Dist. {credModal.distrito}</div>}
                    {credFields['folio'] && credModal.folio && <div style={{ fontSize:'10px', color:'#4a5030' }}>📄 Folio: {credModal.folio}</div>}
                    {credFields['casilla'] && credModal.casilla && <div style={{ fontSize:'10px', color:'#4a5030' }}>🏛️ Secc. {credModal.casilla}</div>}
                    {credFields['banco'] && credModal.banco && <div style={{ fontSize:'10px', color:'#4a5030' }}>🏦 {credModal.banco}</div>}
                    {credFields['cuenta'] && credModal.cuenta && <div style={{ fontSize:'10px', color:'#4a5030' }}>💳 {credModal.cuenta}</div>}
                    {credFields['status'] && credModal.status?.length > 0 && <div style={{ fontSize:'10px', color:'#4a5030' }}>{(credModal.status as string[]).join(' · ')}</div>}
                  </div>
                </div>
                <div style={{ position:'absolute', bottom:'6px', left:'14px', right:'14px',
                  borderTop:'1px solid rgba(143,191,37,.3)', paddingTop:'4px',
                  display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'8px', color:'#8FBF25', fontWeight:700 }}>ECOSABANA Sonora 2027</span>
                  <span style={{ fontSize:'8px', color:'#8FBF25', fontWeight:700 }}>PVEM</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" style={{ background:'#F2F4EE', border:'1px solid #D4D8C8' }} onClick={() => setCredModal(null)}>Cerrar</button>
              <button className="btn" style={{ background:'#1a73c8', color:'#fff', fontWeight:700 }}
                onClick={() => {
                  const preview = document.getElementById('cred-preview')
                  if (!preview) return
                  const w = window.open('', '_blank', 'width=400,height=300')
                  if (!w) return
                  w.document.write(`<!DOCTYPE html><html><head>
                    <title>Credencial</title>
                    <style>@page{size:85.6mm 54mm;margin:0}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>
                  </head><body>${preview.outerHTML}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>`)
                  w.document.close()
                }}>
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1x20 ADMIN ── */}
      {modal1x20 && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth:'800px' }}>
            <div className="modal-header">
              <h2>📋 Formato 1x20 — Participantes</h2>
              <button className="modal-close" onClick={() => setModal1x20(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding:'16px 20px' }}>
              {formatos1x20.length === 0 ? (
                <p style={{ textAlign:'center', color:'#aaa', padding:'40px' }}>
                  Ningún usuario ha iniciado el Formato 1x20 todavía.
                </p>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                  <thead>
                    <tr>
                      {['Eco Coordinador','Presidente Comité','Municipio','Personas','Estado','Pago Eco','Pago Pres','Acciones'].map(h=>(
                        <th key={h} style={{ padding:'9px 10px', background:'linear-gradient(135deg,#eef6d0,#f7fbe8)',
                          borderBottom:'2px solid #C8DF8E', color:'#3d5a09', fontWeight:700,
                          fontSize:'10px', textTransform:'uppercase', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formatos1x20.map((f:any) => (
                      <tr key={f.id} style={{ borderBottom:'1px solid #eef3e0',
                        background: f.eco_pago_realizado && f.pres_pago_realizado ? 'rgba(143,191,37,.07)' : '#fff' }}>
                        <td style={{ padding:'9px 10px', fontWeight:700 }}>
                          {f.nombre||'—'}
                          {f.notificado && (!f.eco_pago_realizado) && (
                            <span style={{ marginLeft:'6px', background:'rgba(239,65,53,.15)',
                              color:'#c0392b', borderRadius:'10px', padding:'1px 7px', fontSize:'10px', fontWeight:700 }}>
                              ¡Completo!
                            </span>
                          )}
                        </td>
                        <td style={{ padding:'9px 10px' }}>{f.pres_nombre||'—'}</td>
                        <td style={{ padding:'9px 10px', color:'#555' }}>{f.municipio||'—'}</td>
                        <td style={{ padding:'9px 10px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                            <div style={{ flex:1, background:'#e8f5e9', borderRadius:'6px', height:'7px', overflow:'hidden', minWidth:'50px' }}>
                              <div style={{ background: f.completo ? 'linear-gradient(90deg,#5a8012,#00B15A)' : '#8FBF25',
                                width:`${((f.personas_count||0)/20)*100}%`, height:'100%' }}/>
                            </div>
                            <span style={{ fontSize:'11px', fontWeight:700, color: f.completo ? '#2a8540' : '#7a8060' }}>
                              {f.personas_count||0}/20
                            </span>
                          </div>
                        </td>
                        <td style={{ padding:'9px 10px' }}>
                          {f.completo
                            ? <span className="badge badge-cred">Completo</span>
                            : <span className="badge badge-pend">En progreso</span>}
                        </td>
                        <td style={{ padding:'9px 10px' }}>
                          {f.eco_pago_realizado
                            ? <span style={{ color:'#2a8540', fontSize:'11px', fontWeight:700 }}>✓ $300</span>
                            : <span style={{ color: f.completo ? '#c0392b' : '#aaa', fontSize:'11px', fontWeight:700 }}>{f.completo?'$300 pend.':'—'}</span>}
                        </td>
                        <td style={{ padding:'9px 10px' }}>
                          {f.pres_pago_realizado
                            ? <span style={{ color:'#2a8540', fontSize:'11px', fontWeight:700 }}>✓ ${(f.personas_count||0)*50}</span>
                            : <span style={{ color: f.completo ? '#c0392b' : '#aaa', fontSize:'11px', fontWeight:700 }}>{f.completo?`$${(f.personas_count||0)*50} pend.`:'—'}</span>}
                        </td>
                        <td style={{ padding:'9px 10px' }}>
                          {f.completo && (
                            <button onClick={() => setPagoLider(f)}
                              style={{ background:'#2a8540', color:'#fff', border:'none',
                                borderRadius:'8px', padding:'5px 12px', fontWeight:700,
                                fontSize:'11px', cursor:'pointer', fontFamily:'var(--font)' }}>
                              💰 Pagar
                            </button>
                          )}
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

      {/* ── MODAL PAGO LÍDER 1x20 ── */}
      {pagoLider && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth:'560px' }}>
            <div className="modal-header">
              <h2>💰 Pagos — Formato 1x20</h2>
              <button className="modal-close" onClick={() => setPagoLider(null)}>×</button>
            </div>
            <div className="modal-body">

              {/* ECO COORDINADOR */}
              <div className="pay-section" style={{ marginBottom:'16px' }}>
                <h4>🌱 Eco Coordinador — $300</h4>
                <div className="pay-person-row">
                  <div style={{ flex:1 }}>
                    <div className="pay-name">{pagoLider.nombre||'—'}</div>
                    <div className="pay-account">
                      {pagoLider.banco||'Sin banco'}{pagoLider.cuenta?' · '+pagoLider.cuenta:''}
                    </div>
                    {[['Tel',pagoLider.telefono],['Municipio',pagoLider.municipio],['Clave Elector',pagoLider.clave_elector]].filter(r=>r[1]).map(r=>(
                      <div key={String(r[0])} style={{ fontSize:'11px', color:'#7a8060' }}>{r[0]}: {r[1]}</div>
                    ))}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
                    <strong style={{ color:'#0a5c3e', fontSize:'16px' }}>$300</strong>
                    {pagoLider.eco_pago_realizado
                      ? <span style={{ color:'#2a8540', fontWeight:700, fontSize:'12px' }}>✓ Pagado</span>
                      : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'6px', alignItems:'flex-end' }}>
                          <label style={{ fontSize:'11px', fontWeight:700, color:'#3d5a09' }}>
                            📎 Foto comprobante:
                          </label>
                          {pagoLider.eco_foto_comprobante
                            ? <img src={pagoLider.eco_foto_comprobante} style={{ width:'80px', height:'60px', objectFit:'cover', borderRadius:'6px', border:'2px solid #C8DF8E' }}/>
                            : null}
                          <input type="file" accept="image/*" id="eco-comp"
                            style={{ fontSize:'11px', width:'160px' }}
                            onChange={async e => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const r = new FileReader()
                              r.onload = ev => setPagoLider((p:any) => ({...p, eco_foto_comprobante: ev.target?.result as string}))
                              r.readAsDataURL(file)
                            }}/>
                          <button
                            disabled={!pagoLider.eco_foto_comprobante}
                            onClick={async () => {
                              await supabase.from('formato_1x20').update({ eco_pago_realizado:true, eco_foto_comprobante: pagoLider.eco_foto_comprobante }).eq('id', pagoLider.id)
                              setPagoLider((p:any) => ({...p, eco_pago_realizado:true}))
                              loadAll()
                              alert('✅ Pago Eco Coordinador registrado')
                            }}
                            style={{ background: pagoLider.eco_foto_comprobante ? '#2a8540' : '#aaa', color:'#fff', border:'none',
                              borderRadius:'8px', padding:'6px 14px', fontWeight:700, fontSize:'12px',
                              cursor: pagoLider.eco_foto_comprobante ? 'pointer' : 'not-allowed', fontFamily:'var(--font)' }}>
                            ✓ Confirmar Pago $300
                          </button>
                        </div>
                      )
                    }
                  </div>
                </div>
              </div>

              {/* PRESIDENTE DE COMITÉ */}
              <div className="pay-section">
                <h4>👥 Presidente de Comité — ${(pagoLider.personas_count||0)*50} ({pagoLider.personas_count||0}×$50)</h4>
                <div className="pay-person-row">
                  <div style={{ flex:1 }}>
                    <div className="pay-name">{pagoLider.pres_nombre||'—'}</div>
                    <div className="pay-account">
                      {pagoLider.pres_banco||'Sin banco'}{pagoLider.pres_cuenta?' · '+pagoLider.pres_cuenta:''}
                    </div>
                    {[['Tel',pagoLider.pres_telefono],['Municipio',pagoLider.pres_municipio],['Clave Elector',pagoLider.pres_clave_elector]].filter(r=>r[1]).map(r=>(
                      <div key={String(r[0])} style={{ fontSize:'11px', color:'#7a8060' }}>{r[0]}: {r[1]}</div>
                    ))}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
                    <strong style={{ color:'#185FA5', fontSize:'16px' }}>${(pagoLider.personas_count||0)*50}</strong>
                    {pagoLider.pres_pago_realizado
                      ? <>
                          <span style={{ color:'#2a8540', fontWeight:700, fontSize:'12px' }}>✓ Pagado</span>
                          {pagoLider.pres_foto_comprobante && (
                            <img src={pagoLider.pres_foto_comprobante} style={{ width:'80px', height:'60px', objectFit:'cover', borderRadius:'6px', border:'2px solid #C8DF8E' }}/>
                          )}
                        </>
                      : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'6px', alignItems:'flex-end' }}>
                          <label style={{ fontSize:'11px', fontWeight:700, color:'#3d5a09' }}>
                            📎 Foto comprobante:
                          </label>
                          {pagoLider.pres_foto_comprobante
                            ? <img src={pagoLider.pres_foto_comprobante} style={{ width:'80px', height:'60px', objectFit:'cover', borderRadius:'6px', border:'2px solid #C8DF8E' }}/>
                            : null}
                          <input type="file" accept="image/*" id="pres-comp"
                            style={{ fontSize:'11px', width:'160px' }}
                            onChange={async e => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const r = new FileReader()
                              r.onload = ev => setPagoLider((p:any) => ({...p, pres_foto_comprobante: ev.target?.result as string}))
                              r.readAsDataURL(file)
                            }}/>
                          <button
                            disabled={!pagoLider.pres_foto_comprobante}
                            onClick={async () => {
                              await supabase.from('formato_1x20').update({ pres_pago_realizado:true, pres_foto_comprobante: pagoLider.pres_foto_comprobante }).eq('id', pagoLider.id)
                              setPagoLider((p:any) => ({...p, pres_pago_realizado:true}))
                              loadAll()
                              alert(`✅ Pago Presidente registrado ($${(pagoLider.personas_count||0)*50})`)
                            }}
                            style={{ background: pagoLider.pres_foto_comprobante ? '#185FA5' : '#aaa', color:'#fff', border:'none',
                              borderRadius:'8px', padding:'6px 14px', fontWeight:700, fontSize:'12px',
                              cursor: pagoLider.pres_foto_comprobante ? 'pointer' : 'not-allowed', fontFamily:'var(--font)' }}>
                            ✓ Confirmar Pago ${(pagoLider.personas_count||0)*50}
                          </button>
                        </div>
                      )
                    }
                  </div>
                </div>
              </div>

              <div className="pay-total" style={{ marginTop:'16px' }}>
                <span>Total a pagar</span>
                <span>${300 + (pagoLider.personas_count||0)*50}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" style={{ background:'#F2F4EE', border:'1px solid #D4D8C8' }}
                onClick={() => setPagoLider(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ESTADÍSTICAS ── */}
      {statsModal && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth:'700px' }}>
            <div className="modal-header">
              <h2>📊 Estadísticas de Pagos</h2>
              <button className="modal-close" onClick={() => setStatsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {(() => {
                const cat = getCatorcena()
                const yr = new Date().getFullYear()
                const catActual = `Cat. ${cat} / ${yr}`

                // Filter pagos by selected range
                const filtered = pagos.filter((r:any) => {
                  if (statsFilter === 'fecha') {
                    if (!statsDesde && !statsHasta) return true
                    const d = new Date(r.created_at)
                    const desde = statsDesde ? new Date(statsDesde) : null
                    const hasta = statsHasta ? new Date(statsHasta + 'T23:59:59') : null
                    if (desde && d < desde) return false
                    if (hasta && d > hasta) return false
                    return true
                  } else {
                    // Filter by catorcena
                    if (!statsCat) return true
                    const [c, y] = statsCat.split('/')
                    return r.catorcena === parseInt(c.trim()) && r.anio === parseInt(y.trim())
                  }
                })

                // Group by catorcena
                const catData: any = {}
                filtered.forEach((r:any) => {
                  const key = `Cat. ${r.catorcena} / ${r.anio}`
                  if (!catData[key]) catData[key] = { total:0, ops:0, eco:0, rg:0, rc:0, personas: new Set() }
                  catData[key].total += r.monto || 0
                  catData[key].ops++
                  if (r.tipo === 'eco') catData[key].eco++
                  if (r.tipo === 'rg') catData[key].rg++
                  if (r.tipo?.startsWith('rc')) catData[key].rc++
                  catData[key].personas.add(r.persona_id)
                })

                const totalPagado = filtered.reduce((a:number,r:any) => a + (r.monto||0), 0)
                const totalPersonas = new Set(filtered.map((r:any) => r.persona_id)).size

                // Get unique catorcenas for selector
                const catOptions = [...new Set(pagos.map((r:any) => `${r.catorcena} / ${r.anio}`))]
                  .sort((a,b) => {
                    const [ca,ya] = a.split('/').map(Number)
                    const [cb,yb] = b.split('/').map(Number)
                    return yb - ya || cb - ca
                  })

                return (
                  <>
                    {/* Filtros */}
                    <div style={{ background:'#f4f7ec', borderRadius:'12px', padding:'14px 16px', marginBottom:'16px' }}>
                      <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap', marginBottom:'10px' }}>
                        <span style={{ fontWeight:700, fontSize:'12px', color:'#3d5a09' }}>Filtrar por:</span>
                        <button onClick={() => setStatsFilter('catorcena')}
                          style={{ padding:'5px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontFamily:'var(--font)',
                            fontWeight:700, fontSize:'12px',
                            background: statsFilter==='catorcena' ? '#5a8012' : '#e8f0d0',
                            color: statsFilter==='catorcena' ? '#fff' : '#3d5a09' }}>
                          Catorcena
                        </button>
                        <button onClick={() => setStatsFilter('fecha')}
                          style={{ padding:'5px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontFamily:'var(--font)',
                            fontWeight:700, fontSize:'12px',
                            background: statsFilter==='fecha' ? '#5a8012' : '#e8f0d0',
                            color: statsFilter==='fecha' ? '#fff' : '#3d5a09' }}>
                          Rango de fechas
                        </button>
                        <button onClick={() => { setStatsFilter('catorcena'); setStatsCat(''); setStatsDesde(''); setStatsHasta('') }}
                          style={{ padding:'5px 10px', borderRadius:'20px', border:'1px solid #C8DF8E',
                            background:'#fff', cursor:'pointer', fontFamily:'var(--font)', fontSize:'11px', color:'#7a8060' }}>
                          Limpiar
                        </button>
                      </div>

                      {statsFilter === 'catorcena' ? (
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                          <label style={{ fontSize:'12px', fontWeight:600, color:'#3d5a09' }}>Catorcena:</label>
                          <select value={statsCat} onChange={e => setStatsCat(e.target.value)}
                            style={{ padding:'6px 10px', border:'1.5px solid #C8DF8E', borderRadius:'8px',
                              fontSize:'12px', fontFamily:'var(--font)', background:'#fff', color:'#3d5a09' }}>
                            <option value="">Todas las catorcenas</option>
                            {catOptions.map(c => (
                              <option key={c} value={c}>
                                {c === `${cat} / ${yr}` ? `Cat. ${c} ← actual` : `Cat. ${c}`}
                              </option>
                            ))}
                          </select>
                          <span style={{ fontSize:'11px', color:'#7a8060' }}>
                            Catorcena actual: <strong>Cat. {cat} / {yr}</strong>
                          </span>
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                          <label style={{ fontSize:'12px', fontWeight:600, color:'#3d5a09' }}>Desde:</label>
                          <input type="date" value={statsDesde} onChange={e => setStatsDesde(e.target.value)}
                            style={{ padding:'6px 10px', border:'1.5px solid #C8DF8E', borderRadius:'8px',
                              fontSize:'12px', fontFamily:'var(--font)' }}/>
                          <label style={{ fontSize:'12px', fontWeight:600, color:'#3d5a09' }}>Hasta:</label>
                          <input type="date" value={statsHasta} onChange={e => setStatsHasta(e.target.value)}
                            style={{ padding:'6px 10px', border:'1.5px solid #C8DF8E', borderRadius:'8px',
                              fontSize:'12px', fontFamily:'var(--font)' }}/>
                        </div>
                      )}
                    </div>

                    {/* Totales */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'16px' }}>
                      {[
                        { label:'Total Pagado', val:`$${totalPagado.toLocaleString()}`, color:'#0a5c3e' },
                        { label:'Operaciones', val:filtered.length, color:'#3d5a09' },
                        { label:'Personas Pagadas', val:totalPersonas, color:'#185FA5' },
                        { label:'Catorcenas', val:Object.keys(catData).length, color:'#5a8012' },
                      ].map(s => (
                        <div key={s.label} className="stats-box">
                          <div className="val" style={{ color:s.color }}>{s.val}</div>
                          <div className="lbl">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tabla por catorcena */}
                    {Object.keys(catData).length === 0 ? (
                      <p style={{ textAlign:'center', color:'#aaa', padding:'30px' }}>
                        Sin pagos en el período seleccionado
                      </p>
                    ) : (
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                        <thead>
                          <tr>
                            {['Catorcena','Eco','RG','RC','Operaciones','Personas','Total'].map(h=>(
                              <th key={h} style={{ padding:'9px 10px', background:'linear-gradient(135deg,#eef6d0,#f7fbe8)',
                                borderBottom:'2px solid #C8DF8E', color:'#3d5a09', fontWeight:700,
                                fontSize:'10px', textTransform:'uppercase', textAlign:'left' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(catData)
                            .sort(([a],[b]) => {
                              const [ca,ya] = a.replace('Cat. ','').split('/').map(Number)
                              const [cb,yb] = b.replace('Cat. ','').split('/').map(Number)
                              return yb - ya || cb - ca
                            })
                            .map(([k,v]:any) => (
                            <tr key={k} style={{ borderBottom:'1px solid #eef3e0',
                              background: k===catActual ? 'rgba(255,238,0,.08)' : '' }}>
                              <td style={{ padding:'9px 10px', fontWeight:700 }}>
                                {k} {k===catActual ? <span style={{ fontSize:'10px', color:'#5a8012' }}>← actual</span> : null}
                              </td>
                              <td style={{ padding:'9px 10px' }}>{v.eco}</td>
                              <td style={{ padding:'9px 10px' }}>{v.rg}</td>
                              <td style={{ padding:'9px 10px' }}>{v.rc}</td>
                              <td style={{ padding:'9px 10px' }}>{v.ops}</td>
                              <td style={{ padding:'9px 10px' }}>{v.personas.size}</td>
                              <td style={{ padding:'9px 10px', fontWeight:700, color:'#0a5c3e' }}>
                                ${v.total.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background:'#eef6d0' }}>
                            <td colSpan={4} style={{ padding:'9px 10px', fontWeight:700, fontSize:'11px', color:'#3d5a09' }}>TOTAL</td>
                            <td style={{ padding:'9px 10px', fontWeight:700 }}>{filtered.length}</td>
                            <td style={{ padding:'9px 10px', fontWeight:700 }}>{totalPersonas}</td>
                            <td style={{ padding:'9px 10px', fontWeight:800, color:'#0a5c3e', fontSize:'13px' }}>${totalPagado.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </>
                )
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn" style={{ background:'#F2F4EE', border:'1px solid #D4D8C8' }}
                onClick={() => setStatsModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL LISTA POR CATEGORÍA ── */}
      {listModal && (
        <div className="overlay open">
          <div className="modal" style={{ maxWidth:'700px' }}>
            <div className="modal-header">
              <h2>👥 {listModal.tipo} — {listModal.items.length} registro{listModal.items.length!==1?'s':''}</h2>
              <button className="modal-close" onClick={() => setListModal(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding:'0' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                  <thead>
                    <tr>
                      {['Foto','Nombre','Rol','Municipio','Celular','Banco','Cuenta','Pago'].map(h => (
                        <th key={h} style={{ padding:'10px 12px', background:'linear-gradient(135deg,#eef6d0,#f7fbe8)',
                          borderBottom:'2px solid #C8DF8E', color:'#3d5a09', fontWeight:700,
                          fontSize:'10px', textTransform:'uppercase', letterSpacing:'.05em', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listModal.items.map((p:any, i:number) => (
                      <tr key={i} style={{ borderBottom:'1px solid #eef3e0', background: i%2===0?'#fff':'#fafff4' }}>
                        <td style={{ padding:'8px 12px' }}>
                          {p.foto
                            ? <img src={p.foto} style={{ width:'30px', height:'30px', borderRadius:'50%', objectFit:'cover', border:'2px solid #C8DF8E' }}/>
                            : <div style={{ width:'30px', height:'30px', borderRadius:'50%',
                                background:'linear-gradient(135deg,#eef6d0,rgba(0,177,90,.18))',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:'10px', fontWeight:800, color:'#3d5a09' }}>
                                {p.nombre?.split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase()||'?'}
                              </div>}
                        </td>
                        <td style={{ padding:'8px 12px', fontWeight:700 }}>
                          {p.nombre||'—'}
                          {p._eco && <div style={{ fontSize:'10px', color:'#7a8060', marginTop:'1px' }}>Eco: {p._eco}</div>}
                        </td>
                        <td style={{ padding:'8px 12px' }}>
                          <span className={`badge badge-${p.rol?.includes('Eco')?'eco':p.rol?.includes('RG')?'rg':p.rol?.includes('RC')?'rc':'obs'}`}>
                            {p.rol||'—'}
                          </span>
                        </td>
                        <td style={{ padding:'8px 12px', color:'#555' }}>{p.municipio||'—'}</td>
                        <td style={{ padding:'8px 12px' }}>{p.celular||'—'}</td>
                        <td style={{ padding:'8px 12px' }}>{p.banco||'—'}</td>
                        <td style={{ padding:'8px 12px' }}>{p.cuenta||'—'}</td>
                        <td style={{ padding:'8px 12px', fontWeight:700, color:'#0a5c3e' }}>
                          {p.pago_acum!=null ? `$${p.pago_acum}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" style={{ background:'#F2F4EE', border:'1px solid #D4D8C8' }}
                onClick={() => setListModal(null)}>Cerrar</button>
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