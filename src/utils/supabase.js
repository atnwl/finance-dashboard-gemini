import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ctyegsfcteiluknrwwxq.supabase.co'
const supabaseKey = 'sb_publishable_7YTZnNW42nMM4aguuwCV2A_7OwrtE28'

export const supabase = createClient(supabaseUrl, supabaseKey)
