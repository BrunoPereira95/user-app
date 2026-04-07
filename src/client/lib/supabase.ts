import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://fpcqgbgpqakoepxeqdac.supabase.co"
const supabaseKey = "sb_publishable_ZxWsZaJ6B9Sn2-JTON6PSw_S7aRtIOz"

export const supabase = createClient(supabaseUrl, supabaseKey)