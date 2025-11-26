'use server'

import { createClient } from '@supabase/supabase-js'

export async function adminUpdatePassword(userId: string, newPassword: string) {
  // Note: This requires SUPABASE_SERVICE_ROLE_KEY in .env.local
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}