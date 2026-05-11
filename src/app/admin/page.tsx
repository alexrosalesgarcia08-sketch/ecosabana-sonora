'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/')
    })
  }, [])

  return (
    <div style={{padding:'40px',fontFamily:'Arial'}}>
      <h1 style={{color:'#3d5a09'}}>✅ Panel Admin ECOSABANA</h1>
      <p>Sesión iniciada correctamente. Aquí irá el sistema completo.</p>
    </div>
  )
}