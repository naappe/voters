// config.js - All configuration in one place

// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://espezmdpkoixnfchomqb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1';

// ============================================
// APP CONFIGURATION
// ============================================
const APP_CONFIG = {
    password: 'student123',
    sessionKey: 'voter_auth_session',
    appName: 'Voter Management System',
    tableName: 'full_import',
    pageSize: 24,
    topHousesCount: 7,
    adminPassword: 'admin123'
};

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.APP_CONFIG = APP_CONFIG;
window.supabaseClient = supabaseClient;

console.log('✅ Config loaded successfully');