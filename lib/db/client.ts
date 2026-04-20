"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qgygwvpruscjuxfhfefd.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneWd3dnBydXNjanV4ZmhmZWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzU3NTIsImV4cCI6MjA5MTcxMTc1Mn0.Male9fY7ZJptkcH0VAzq_k_wUbLod2Kd-VNK8KIdPoA";

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
