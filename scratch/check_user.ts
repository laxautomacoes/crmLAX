import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('--- INVITATIONS ---')
    const { data: invs } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', 'leo@leoacosta.online')
    console.log(JSON.stringify(invs, null, 2))

    console.log('--- PROFILES ---')
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
    
    // Manual filter because auth.users is not directly accessible via from() without specific config usually
    // But we can check if any profile has a name like Léo Acosta
    const leoProfiles = profiles?.filter(p => p.full_name?.includes('Léo Acosta'))
    console.log(JSON.stringify(leoProfiles, null, 2))

    console.log('--- AUTH USERS ---')
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const leoUser = users.find(u => u.email === 'leo@leoacosta.online')
    console.log(JSON.stringify(leoUser, null, 2))
}

check()
