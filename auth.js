// auth.js - Authentication and session management

// ============================================
// AUTHENTICATION CLASS
// ============================================
class Auth {
    constructor() {
        // Use APP_CONFIG from window with fallbacks
        const config = window.APP_CONFIG || {};
        this.password = config.password || 'student123';
        this.sessionKey = config.sessionKey || 'voter_auth_session';
        this.appName = config.appName || 'Voter Management System';
        this.isAuthenticated = false;
    }

    // Check if user is already authenticated
    checkSession() {
        const saved = localStorage.getItem(this.sessionKey);
        if (saved === 'true') {
            this.isAuthenticated = true;
            return true;
        }
        return false;
    }

    // Save session
    saveSession(remember = true) {
        if (remember) {
            localStorage.setItem(this.sessionKey, 'true');
        }
        this.isAuthenticated = true;
    }

    // Clear session (logout)
    clearSession() {
        localStorage.removeItem(this.sessionKey);
        this.isAuthenticated = false;
    }

    // Verify password
    verifyPassword(input) {
        return input === this.password;
    }

    // Show password modal
    showModal() {
        return new Promise((resolve) => {
            const overlay = this.createModal();
            document.body.appendChild(overlay);

            const form = document.getElementById('authPasswordForm');
            const input = document.getElementById('authPasswordInput');
            const error = document.getElementById('authPasswordError');
            const rememberMe = document.getElementById('authRememberMe');

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const pwd = input.value.trim();

                if (this.verifyPassword(pwd)) {
                    const remember = rememberMe.checked;
                    this.saveSession(remember);
                    overlay.remove();
                    resolve(true);
                } else {
                    error.style.display = 'block';
                    input.value = '';
                    input.focus();
                    setTimeout(() => {
                        error.classList.remove('show');
                    }, 3000);
                }
            });

            input.addEventListener('keydown', () => {
                error.classList.remove('show');
            });

            setTimeout(() => input.focus(), 100);
        });
    }

    // Create password modal HTML
    createModal() {
        const overlay = document.createElement('div');
        overlay.id = 'authModal';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 36, 0.8);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.3s ease;
        `;

        overlay.innerHTML = `
            <div style="
                background: white;
                padding: 40px 36px 32px;
                border-radius: 20px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease;
            ">
                <div style="
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    background: #eff6ff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                    font-size: 32px;
                ">
                    <i class="fas fa-vote-yea" style="color: #f59e0b;"></i>
                </div>
                <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">${this.appName}</h2>
                <p style="color: #6b7a8f; font-size: 14px; margin-bottom: 24px;">Enter password to access the system</p>
                
                <form id="authPasswordForm" style="text-align: left;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 4px;">
                            <i class="fas fa-lock" style="color: #f59e0b; margin-right: 6px;"></i> Password
                        </label>
                        <input type="password" id="authPasswordInput" placeholder="Enter your password..." style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid #e2e8f0;
                            border-radius: 12px;
                            font-size: 16px;
                            transition: border-color 0.2s;
                            background: #f8fafc;
                        " autofocus />
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                        <input type="checkbox" id="authRememberMe" checked style="
                            width: 18px;
                            height: 18px;
                            accent-color: #f59e0b;
                            cursor: pointer;
                        " />
                        <label for="authRememberMe" style="font-size: 13px; color: #475569; cursor: pointer;">
                            <i class="fas fa-check-circle" style="color: #f59e0b;"></i> Remember me
                        </label>
                    </div>
                    
                    <div id="authPasswordError" style="
                        display: none;
                        color: #ef4444;
                        font-size: 14px;
                        background: #fef2f2;
                        padding: 10px 14px;
                        border-radius: 8px;
                        margin-bottom: 16px;
                    ">
                        <i class="fas fa-exclamation-circle"></i> Incorrect password. Please try again.
                    </div>
                    
                    <button type="submit" style="
                        width: 100%;
                        padding: 14px;
                        background: linear-gradient(135deg, #f59e0b, #f97316);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-unlock"></i> Unlock Dashboard
                    </button>
                </form>
                
                <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> Contact administrator for access
                </p>
            </div>
        `;

        return overlay;
    }

    // Add animation styles
    static addStyles() {
        if (document.getElementById('authStyles')) return;
        const style = document.createElement('style');
        style.id = 'authStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    // Main authentication check
    async requireAuth() {
        Auth.addStyles();
        
        if (this.checkSession()) {
            return true;
        }
        
        return await this.showModal();
    }
}

// ============================================
// CREATE AUTH INSTANCE
// ============================================
const auth = new Auth();

// ============================================
// EXPORT AUTH FUNCTIONS
// ============================================
window.auth = auth;
window.logout = function() {
    auth.clearSession();
    location.reload();
};

console.log('✅ Auth loaded successfully');