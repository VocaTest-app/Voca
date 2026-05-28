import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://izqfpobtquxazvhoumpd.supabase.co'
const supabaseKey = 'sb_publishable_W6JIHu30N7XIAH5LXmBDqQ_P-8POlkw'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)