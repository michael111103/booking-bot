import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws from 'ws'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws
  }
})