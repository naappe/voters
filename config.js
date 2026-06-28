// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    SUPABASE_URL: 'https://espezmdpkoixnfchomqb.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1',
    
    APP: {
        password: 'student123',
        sessionKey: 'voter_auth_session',
        appName: 'Villimale Dhaaira Canvassing',
        tableName: 'full_import',
        settingsPassword: 'settings123'
    }
};

window.CONFIG = CONFIG;
console.log('✅ Config loaded');