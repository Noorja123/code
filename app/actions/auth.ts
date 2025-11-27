'use server'

import { createClient } from '@supabase/supabase-js'

export async function adminUpdatePassword(userId: string, newPassword: string) {
  // This function runs on the server and uses the SERVICE_ROLE_KEY 
  // to bypass RLS and update passwords.
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