import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ws = require('ws')

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws
  }
})