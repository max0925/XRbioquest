import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getClassroomRole } from '@/lib/classroom/roles'
import { safeRoleRedirect } from '@/lib/auth/signup'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedRedirect = searchParams.get('next') ?? searchParams.get('redirect')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const role = user ? getClassroomRole(user) : null
      if (role) {
        return NextResponse.redirect(new URL(safeRoleRedirect(requestedRedirect, role), origin))
      }
      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('message', 'Classroom role required. Ask an administrator to update this account.')
      return NextResponse.redirect(loginUrl)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
