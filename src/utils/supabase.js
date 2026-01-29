import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ctyegsfcteiluknrwwxq.supabase.co'
const supabaseKey = 'sb_publishable_Bjb1nc5TNSp6yYcF2tAZiQ_Q9oub7WZ'

export const supabase = createClient(supabaseUrl, supabaseKey)
