// ============================================
// VILLIMALE DHAIRA - CANVASSING SYSTEM
// FIXED - Export removed from main UI, filters improved
// ============================================

// STATE
let allVoters = [];
let currentFilter = 'all';
let currentView = 'list';
let currentPage = 0;
const BATCH_SIZE = 20;
let hasMore = true;
let isLoading = false;
let settingsAuthenticated = false;
let chart1 = null;
let chart2 = null;

// SUPABASE
let supabaseClient = null;

function initSupabase() {
    try {
        if (typeof supabase !== 'undefined' && window.CONFIG) {
            supabaseClient = supabase.createClient(
                window.CONFIG.SUPABASE_URL,
                window.CONFIG.SUPABASE_ANON_KEY
            );
            window.supabaseClient = supabaseClient;
            console.log('✅ Supabase ready');
            return true;
        }
    } catch (e) {}
    return false;
}

// AUTH
function requireAuth() {
    try {
        if (localStorage.getItem('voter_auth_session') === 'authenticated') return true;
    } catch (e) {}

    const pwd = prompt('Enter password:');
    if (pwd === 'student123') {
        try { localStorage.setItem('voter_auth_session', 'authenticated'); } catch (e) {}
        return true;
    }
    alert('Wrong password');
    return false;
}

function logout() {
    if (confirm('Logout?')) {
        try { localStorage.removeItem('voter_auth_session'); } catch (e) {}
        location.reload();
    }
}

// SAMPLE DATA
function useSampleData() {
    const houses = ['H. Orchid', 'H. Rose', 'H. Tulip', 'H. Lotus', 'H. Lily', 'H. Clover', 'H. Daisy', 'H. Palm', 'H. Sunset', 'H. Coral'];
    const names = ['Ahmed Rasheed', 'Fathimath Shazna', 'Mohamed Aslam', 'Aishath Rasha', 'Abdulla Saeed', 'Mariyam Shakeela'];
    const parties = ['MDP', 'PNC', 'MDP', 'Other', 'MDP', 'PNC', 'MDP', 'Other'];

    // Clear existing data to avoid duplicates
    allVoters = [];

    for (let i = 0; i < 3351; i++) {
        const statuses = ['will-vote', 'pending', 'undecided', 'will-vote', 'pending', 'not-vote'];
        const reaches = ['reached', 'not-reached', 'reached', 'not-reached', 'reached'];
        allVoters.push({
            id: i + 1,
            name: names[i % names.length] + (i > 5 ? ' ' + (i + 1) : ''),
            national_id: 'A' + String(100000 + i).padStart(6, '0'),
            house: houses[i % houses.length],
            phone: '7' + String(700000 + i).padStart(6, '0'),
            sex: i % 2 === 0 ? 'M' : 'F',
            age: 18 + (i % 50),
            party: parties[i % parties.length],
            vote_status: statuses[i % statuses.length],
            reach_status: reaches[i % reaches.length],
            remarks: i % 4 === 0 ? 'Met with family' : null,
            photo_url: ''
        });
    }
    console.log('📊 Sample data: ' + allVoters.length + ' voters');
}

// LOAD DATA
async function loadData() {
    try {
        if (!supabaseClient) initSupabase();

        if (!supabaseClient) {
            allVoters = [];
            useSampleData();
            renderAll();
            return;
        }

        const table = window.CONFIG?.APP?.tableName || 'full_import';
        let data = [];
        let from = 0;
        const size = 1000;

        while (true) {
            const { data: d, error } = await supabaseClient
                .from(table)
                .select('*')
                .order('id')
                .range(from, from + size - 1);
            if (error || !d || d.length === 0) break;
            data = data.concat(d);
            if (d.length < size) break;
            from += size;
        }

        if (data.length > 0) {
            allVoters = data;
        } else {
            allVoters = [];
            useSampleData();
        }
        renderAll();

    } catch (e) {
        console.error('Load error:', e);
        allVoters = [];
        useSampleData();
        renderAll();
    }
}

// STATUS HELPERS
const STATUS = {
    'will-vote': { label: '🗳️ Will Vote', class: 'badge-success' },
    'undecided': { label: '🤔 Undecided', class: 'badge-undecided' },
    'not-vote': { label: '❌ Not Vote', class: 'badge-danger' },
    'pending': { label: '⏳ Pending', class: 'badge-warning' },
    'reached': { label: '✅ Reached', class: 'badge-info' },
    'not-reached': { label: '🚪 Not Reached', class: 'badge-warning' }
};

function getStatus(v) {
    const key = v.vote_status || 'pending';
    return STATUS[key] || STATUS.pending;
}

// SAFE DOM HELPER
function safeEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn('Element not found:', id);
    return el;
}

function safeText(id, text) {
    const el = safeEl(id);
    if (el) el.textContent = text;
}

// RENDER ALL
function renderAll() {
    renderDashboard();
    renderCanvass(true);
    renderAnalytics();
    updateBadges();
    renderSettings();
    updateDate();
    populateHouseFilter();
}

// DASHBOARD
function renderDashboard() {
    const total = allVoters.length;
    const reached = allVoters.filter(v => v.reach_status === 'reached').length;
    const willVote = allVoters.filter(v => v.vote_status === 'will-vote').length;
    const undecided = allVoters.filter(v => v.vote_status === 'undecided').length;
    const notVote = allVoters.filter(v => v.vote_status === 'not-vote').length;
    const notReached = allVoters.filter(v => v.reach_status === 'not-reached' || !v.reach_status).length;

    safeText('statTotal', total.toLocaleString());
    safeText('statReached', reached.toLocaleString());
    safeText('statWillVote', willVote.toLocaleString());
    safeText('statUndecided', undecided.toLocaleString());
    safeText('statNotVote', notVote.toLocaleString());
    safeText('statNotReached', notReached.toLocaleString());

    const pct = (v) => total ? Math.round((v / total) * 100) : 0;
    safeText('statReachedPercent', pct(reached) + '%');
    safeText('statWillVotePercent', pct(willVote) + '%');
    safeText('statUndecidedPercent', pct(undecided) + '%');
    safeText('statNotVotePercent', pct(notVote) + '%');
    safeText('statNotReachedPercent', pct(notReached) + '%');

    // Recent Activity with Photos
    const container = safeEl('recentActivity');
    if (!container) return;

    const recent = [...allVoters].slice(-5).reverse();

    if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">No activity</div>';
        return;
    }

    container.innerHTML = recent.map(v => {
        const status = getStatus(v);
        const photo = v.photo_url ? 
            `<img src="${v.photo_url}" onerror="this.parentElement.innerHTML='👤'" />` : 
            '👤';
        return `
            <div class="activity-item" onclick="openVoterModal(${v.id})" style="cursor:pointer;">
                <div class="activity-left">
                    <div class="activity-avatar">${photo}</div>
                    <div class="activity-info">
                        <div class="activity-name">${v.name}</div>
                        <div class="activity-house"><i class="fas fa-home"></i> ${v.house || 'No house'}</div>
                    </div>
                </div>
                <div class="activity-status">
                    <span class="badge ${status.class}">${status.label}</span>
                </div>
            </div>
        `;
    }).join('');
}

// CANVASS
function renderCanvass(reset = true) {
    if (reset) { 
        currentPage = 0; 
        hasMore = true; 
        const container = safeEl('canvassContainer');
        if (container) container.innerHTML = '';
    }
    if (!hasMore || isLoading) return;

    const search = safeEl('canvassSearch')?.value?.toLowerCase() || '';
    const house = safeEl('canvassHouseFilter')?.value || '';
    const party = safeEl('canvassPartyFilter')?.value || 'all';

    let voters = allVoters;

    // Apply filter by status
    if (currentFilter !== 'all') {
        if (currentFilter === 'reached') {
            voters = voters.filter(v => v.reach_status === 'reached');
        } else if (currentFilter === 'not-reached') {
            voters = voters.filter(v => v.reach_status === 'not-reached' || !v.reach_status);
        } else if (currentFilter === 'pending') {
            voters = voters.filter(v => v.vote_status === 'pending' || !v.vote_status);
        } else {
            voters = voters.filter(v => v.vote_status === currentFilter);
        }
    }

    // Apply search
    if (search) {
        voters = voters.filter(v => 
            (v.name || '').toLowerCase().includes(search) ||
            (v.national_id || '').toLowerCase().includes(search) ||
            (v.house || '').toLowerCase().includes(search)
        );
    }
    
    // Apply house filter
    if (house) {
        voters = voters.filter(v => (v.house || '') === house);
    }
    
    // Apply party filter
    if (party !== 'all') {
        if (party === '') {
            voters = voters.filter(v => !v.party || v.party === '');
        } else {
            voters = voters.filter(v => v.party === party);
        }
    }

    const start = currentPage * BATCH_SIZE;
    const batch = voters.slice(start, start + BATCH_SIZE);

    if (batch.length === 0) {
        hasMore = false;
        const loader = safeEl('canvassLoader');
        if (loader) loader.style.display = 'none';
        if (currentPage === 0) {
            const container = safeEl('canvassContainer');
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center;padding:40px;color:var(--text-muted);">
                        <i class="fas fa-search" style="font-size:48px;display:block;margin-bottom:12px;"></i>
                        No voters found
                    </div>
                `;
            }
        }
        return;
    }

    currentPage++;
    const container = safeEl('canvassContainer');
    if (!container) return;

    if (currentPage === 1) container.innerHTML = '';

    const isGrid = currentView === 'grid';
    if (isGrid && currentPage === 1) container.innerHTML = '<div class="canvass-grid"></div>';
    const target = isGrid ? container.querySelector('.canvass-grid') : container;

    batch.forEach(v => {
        const card = createCard(v);
        if (target) target.innerHTML += card;
        else container.innerHTML += card;
    });

    hasMore = (start + BATCH_SIZE) < voters.length;
    const loader = safeEl('canvassLoader');
    if (loader) loader.style.display = hasMore ? 'block' : 'none';
    
    safeText('canvassResultCount', `${voters.length} voters`);
    if (hasMore) setupInfiniteScroll();
    updateFilterCounts();
}

function createCard(v) {
    const status = getStatus(v);
    const isVote = v.vote_status === 'will-vote';
    const isUndecided = v.vote_status === 'undecided';
    const isNotVote = v.vote_status === 'not-vote';
    const isReached = v.reach_status === 'reached';
    const isNotReached = v.reach_status === 'not-reached' || !v.reach_status;

    const partyBadge = v.party === 'MDP' ? 'badge-mdp' : v.party === 'PNC' ? 'badge-pnc' : '';
    const photo = v.photo_url ? 
        `<img src="${v.photo_url}" onerror="this.parentElement.innerHTML='👤'" />` : 
        '👤';

    return `
        <div class="voter-canvass-card" id="voter-${v.id}">
            <div class="voter-header" onclick="openVoterModal(${v.id})">
                <div class="voter-avatar">${photo}</div>
                <div class="voter-info">
                    <div class="voter-name">${v.name}</div>
                    <div class="voter-details">
                        <i class="fas fa-home"></i> ${v.house || 'No house'}
                        ${v.age ? ` · ${v.age} yrs` : ''}
                        ${v.party ? ` · ${v.party}` : ''}
                    </div>
                    <div class="voter-badges">
                        <span class="badge ${status.class}">${status.label}</span>
                        ${v.party ? `<span class="badge ${partyBadge}">${v.party}</span>` : ''}
                        <span class="badge ${isReached ? 'badge-info' : 'badge-warning'}">
                            ${isReached ? '✅ Reached' : '🚪 Not Reached'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="quick-status-btns">
                <button class="btn-vote ${isVote ? 'active' : ''}" onclick="quickUpdate(${v.id}, 'vote_status', 'will-vote')">🗳️ Vote</button>
                <button class="btn-undecided ${isUndecided ? 'active' : ''}" onclick="quickUpdate(${v.id}, 'vote_status', 'undecided')">🤔 Undecided</button>
                <button class="btn-notvote ${isNotVote ? 'active' : ''}" onclick="quickUpdate(${v.id}, 'vote_status', 'not-vote')">❌ No Vote</button>
                <button class="btn-reached ${isReached ? 'active' : ''}" onclick="quickUpdate(${v.id}, 'reach_status', 'reached')">✅ Reached</button>
                <button class="btn-notreached ${isNotReached ? 'active' : ''}" onclick="quickUpdate(${v.id}, 'reach_status', 'not-reached')">🚪 Not Reached</button>
                <button class="btn-call" onclick="event.stopPropagation();callVoter('${v.phone || ''}')"><i class="fas fa-phone"></i></button>
                <button class="btn-whatsapp" onclick="event.stopPropagation();whatsappVoter('${v.phone || ''}', '${v.name || ''}')"><i class="fab fa-whatsapp"></i></button>
            </div>
        </div>
    `;
}

function filterCanvass(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.filter === filter);
    });
    currentPage = 0;
    hasMore = true;
    const container = safeEl('canvassContainer');
    if (container) container.innerHTML = '';
    renderCanvass(true);
    
    // Show toast message
    const filterLabels = {
        'all': 'All Voters',
        'pending': '⏳ Pending',
        'reached': '✅ Reached',
        'will-vote': '🗳️ Will Vote',
        'undecided': '🤔 Undecided',
        'not-vote': '❌ Not Vote',
        'not-reached': '🚪 Not Reached'
    };
    showToast(`Showing: ${filterLabels[filter] || filter}`, 'info');
}

function applyCanvassFilters() {
    currentPage = 0;
    hasMore = true;
    const container = safeEl('canvassContainer');
    if (container) container.innerHTML = '';
    renderCanvass(true);
}

function setCanvassView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.view-btn[data-view="${view}"]`);
    if (btn) btn.classList.add('active');
    currentPage = 0;
    hasMore = true;
    const container = safeEl('canvassContainer');
    if (container) container.innerHTML = '';
    renderCanvass(true);
}

function populateHouseFilter() {
    const houses = [...new Set(allVoters.map(v => v.house || 'Unassigned'))].sort();
    const select = safeEl('canvassHouseFilter');
    if (!select) return;
    select.innerHTML = '<option value="">All Houses</option>' + houses.map(h => `<option value="${h}">${h}</option>`).join('');
}

function updateFilterCounts() {
    const counts = {
        all: allVoters.length,
        pending: allVoters.filter(v => v.vote_status === 'pending' || !v.vote_status).length,
        reached: allVoters.filter(v => v.reach_status === 'reached').length,
        willVote: allVoters.filter(v => v.vote_status === 'will-vote').length,
        undecided: allVoters.filter(v => v.vote_status === 'undecided').length,
        notVote: allVoters.filter(v => v.vote_status === 'not-vote').length,
        notReached: allVoters.filter(v => v.reach_status === 'not-reached' || !v.reach_status).length
    };

    // Update all count elements
    const countMap = {
        countAll: counts.all,
        countPending: counts.pending,
        countReached: counts.reached,
        countWillVote: counts.willVote,
        countUndecided: counts.undecided,
        countNotVote: counts.notVote,
        countNotReached: counts.notReached
    };

    Object.keys(countMap).forEach(id => {
        const el = safeEl(id);
        if (el) el.textContent = countMap[id];
    });

    // Update pending badges
    const pending = counts.pending;
    ['pendingBadge', 'pendingBadgeBottom', 'pendingQuickBadge'].forEach(id => {
        const el = safeEl(id);
        if (el) { 
            el.textContent = pending; 
            el.style.display = pending > 0 ? 'inline' : 'none'; 
        }
    });
}

// QUICK UPDATE - This is the main action for field workers
async function quickUpdate(id, field, value) {
    try {
        const voter = allVoters.find(v => v.id === id);
        if (!voter) return;

        // Update locally
        voter[field] = value;

        // Update Supabase
        if (supabaseClient) {
            const table = window.CONFIG?.APP?.tableName || 'full_import';
            const { error } = await supabaseClient
                .from(table)
                .update({ [field]: value })
                .eq('id', id);
            if (error) throw error;
        }

        // Update the card UI
        const card = document.getElementById(`voter-${id}`);
        if (card) {
            const newCard = createCard(voter);
            card.outerHTML = newCard;
        }

        // Refresh all views
        renderDashboard();
        renderAnalytics();
        updateFilterCounts();
        updateBadges();

        // Show success message
        const label = field === 'vote_status' ? 
            STATUS[value]?.label || value : 
            value === 'reached' ? '✅ Reached' : '🚪 Not Reached';
        showToast(`✅ ${voter.name} - ${label}`, 'success');

    } catch (e) {
        console.error('Update error:', e);
        showToast('❌ Error updating: ' + e.message, 'error');
    }
}

// MODAL
function openVoterModal(id) {
    const v = allVoters.find(x => x.id === id);
    if (!v) return;

    const status = getStatus(v);
    const isVote = v.vote_status === 'will-vote';
    const isUndecided = v.vote_status === 'undecided';
    const isNotVote = v.vote_status === 'not-vote';
    const isReached = v.reach_status === 'reached';

    const titleEl = safeEl('modalTitle');
    if (titleEl) titleEl.textContent = v.name || 'Voter';
    
    const bodyEl = safeEl('modalBody');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
        <div class="modal-photo">
            ${v.photo_url ? `<img src="${v.photo_url}" onerror="this.parentElement.innerHTML='<span class=\\'placeholder\\'>👤</span>'" />` : `<span class="placeholder">👤</span>`}
        </div>
        <div class="detail-row"><span>🏠 House</span><span>${v.house || '—'}</span></div>
        <div class="detail-row"><span>📞 Phone</span><span>${v.phone || '—'}</span></div>
        <div class="detail-row"><span>🎂 Age</span><span>${v.age || '—'}</span></div>
        <div class="detail-row"><span>⚤ Gender</span><span>${v.sex || '—'}</span></div>
        <div class="detail-row"><span>🏛️ Party</span><span>${v.party || '—'}</span></div>
        <div class="detail-row"><span>🗳️ Status</span><span class="badge ${status.class}">${status.label}</span></div>
        <div class="detail-row"><span>✅ Reach</span><span class="badge ${isReached ? 'badge-info' : 'badge-warning'}">${isReached ? '✅ Reached' : '🚪 Not Reached'}</span></div>
        ${v.remarks ? `<div class="detail-row"><span>📝 Remarks</span><span>${v.remarks}</span></div>` : ''}

        <div class="status-actions">
            <button class="btn-vote ${isVote ? 'active' : ''}" onclick="quickUpdate(${v.id}, 'vote_status', 'will-vote');closeVoterModal();">🗳️ Will Vote</button>
            <button class="btn-undecided ${isUndecided ? 'active' : ''}" onclick="quickUpdate(${v.id}, 'vote_status', 'undecided');closeVoterModal();">🤔 Undecided</button>
            <button class="btn-notvote ${isNotVote ? 'active' : ''}" onclick="quickUpdate(${v.id}, 'vote_status', 'not-vote');closeVoterModal();">❌ Not Vote</button>
            <button class="btn-reached ${isReached ? 'active' : ''}" onclick="quickUpdate(${v.id}, 'reach_status', 'reached');closeVoterModal();">✅ Reached</button>
        </div>
    `;
    
    const modal = safeEl('voterModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeVoterModal() {
    const modal = safeEl('voterModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// CALL & WHATSAPP
function callVoter(phone) {
    if (phone) window.location.href = `tel:${phone}`;
    else showToast('No phone number', 'warning');
}

function whatsappVoter(phone, name) {
    if (phone) {
        const msg = encodeURIComponent(`Assalaamu Alaikum, thank you for meeting with our team today.`);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    } else showToast('No phone number', 'warning');
}

// ANALYTICS
function renderAnalytics() {
    const total = allVoters.length;
    const willVote = allVoters.filter(v => v.vote_status === 'will-vote').length;
    const undecided = allVoters.filter(v => v.vote_status === 'undecided').length;
    const notVote = allVoters.filter(v => v.vote_status === 'not-vote').length;
    const pending = allVoters.filter(v => v.vote_status === 'pending' || !v.vote_status).length;
    const reached = allVoters.filter(v => v.reach_status === 'reached').length;
    const mdp = allVoters.filter(v => v.party === 'MDP').length;
    const pnc = allVoters.filter(v => v.party === 'PNC').length;

    // Progress Chart
    const ctx1 = safeEl('progressChart');
    if (ctx1 && typeof Chart !== 'undefined') {
        if (chart1) chart1.destroy();
        chart1 = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Will Vote', 'Undecided', 'Not Vote', 'Pending'],
                datasets: [{
                    data: [willVote || 1, undecided || 1, notVote || 1, pending || 1],
                    backgroundColor: ['#22C55E', '#8B5CF6', '#EF4444', '#F59E0B'],
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 8, font: { size: 11 } } } },
                cutout: '60%',
            }
        });
    }

    // House Chart
    const ctx2 = safeEl('houseChart');
    if (ctx2 && typeof Chart !== 'undefined') {
        if (chart2) chart2.destroy();

        const counts = {};
        allVoters.forEach(v => {
            const h = v.house || 'Unassigned';
            if (!counts[h]) counts[h] = { will: 0, und: 0, not: 0 };
            if (v.vote_status === 'will-vote') counts[h].will++;
            else if (v.vote_status === 'undecided') counts[h].und++;
            else if (v.vote_status === 'not-vote') counts[h].not++;
        });

        const sorted = Object.entries(counts)
            .sort((a, b) => (b[1].will + b[1].und + b[1].not) - (a[1].will + a[1].und + a[1].not))
            .slice(0, 10);

        chart2 = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: sorted.map(([h]) => h.length > 10 ? h.substring(0, 10) + '...' : h),
                datasets: [
                    { label: 'Will Vote', data: sorted.map(([, d]) => d.will), backgroundColor: '#22C55E', borderRadius: 2 },
                    { label: 'Undecided', data: sorted.map(([, d]) => d.und), backgroundColor: '#8B5CF6', borderRadius: 2 },
                    { label: 'Not Vote', data: sorted.map(([, d]) => d.not), backgroundColor: '#EF4444', borderRadius: 2 },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 8, font: { size: 10 } } } },
                scales: {
                    x: { stacked: true, ticks: { font: { size: 9 } } },
                    y: { stacked: true, beginAtZero: true, ticks: { font: { size: 9 } } }
                }
            }
        });
    }

    // Stats
    const stats = safeEl('analyticsStats');
    if (stats) {
        stats.innerHTML = `
            <div class="activity-item"><span>Total Voters</span><span>${total.toLocaleString()}</span></div>
            <div class="activity-item"><span>✅ Reached</span><span>${reached.toLocaleString()} (${total ? Math.round(reached/total*100) : 0}%)</span></div>
            <div class="activity-item"><span>🗳️ Will Vote</span><span>${willVote.toLocaleString()} (${total ? Math.round(willVote/total*100) : 0}%)</span></div>
            <div class="activity-item"><span>🤔 Undecided</span><span>${undecided.toLocaleString()} (${total ? Math.round(undecided/total*100) : 0}%)</span></div>
            <div class="activity-item"><span>❌ Not Vote</span><span>${notVote.toLocaleString()} (${total ? Math.round(notVote/total*100) : 0}%)</span></div>
            <div class="activity-item"><span>⏳ Pending</span><span>${pending.toLocaleString()} (${total ? Math.round(pending/total*100) : 0}%)</span></div>
            <div class="activity-item"><span style="color:var(--mdp-color);">🏛️ MDP</span><span style="color:var(--mdp-color);">${mdp.toLocaleString()} (${total ? Math.round(mdp/total*100) : 0}%)</span></div>
            <div class="activity-item"><span style="color:var(--pnc-color);">🏛️ PNC</span><span style="color:var(--pnc-color);">${pnc.toLocaleString()} (${total ? Math.round(pnc/total*100) : 0}%)</span></div>
        `;
    }
}

// SETTINGS - Export only available here
function unlockSettings() {
    const pwd = safeEl('settingsPassword')?.value?.trim() || '';
    const error = safeEl('settingsError');
    const settingsPwd = window.CONFIG?.APP?.settingsPassword || 'settings123';

    if (pwd === settingsPwd) {
        settingsAuthenticated = true;
        const lock = safeEl('settingsLock');
        const content = safeEl('settingsContent');
        if (lock) lock.style.display = 'none';
        if (content) content.style.display = 'block';
        renderSettings();
        showToast('✅ Settings unlocked', 'success');
    } else {
        if (error) { 
            error.classList.add('show'); 
            setTimeout(() => error.classList.remove('show'), 3000); 
        }
    }
}

function renderSettings() {
    const total = allVoters.length;
    const mdp = allVoters.filter(v => v.party === 'MDP').length;
    const pnc = allVoters.filter(v => v.party === 'PNC').length;
    const reached = allVoters.filter(v => v.reach_status === 'reached').length;

    safeText('settingsTotal', total);
    safeText('settingsMDP', mdp);
    safeText('settingsPNC', pnc);
    safeText('settingsReached', reached);

    renderSettingsTable();
}

function renderSettingsTable() {
    const container = safeEl('settingsTable');
    if (!container) return;

    const search = safeEl('settingsSearch')?.value?.toLowerCase() || '';
    const party = safeEl('settingsPartyFilter')?.value || 'all';

    let voters = allVoters;
    if (search) voters = voters.filter(v => 
        (v.name || '').toLowerCase().includes(search) ||
        (v.national_id || '').toLowerCase().includes(search) ||
        (v.house || '').toLowerCase().includes(search)
    );
    if (party !== 'all') voters = voters.filter(v => v.party === party);

    if (voters.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">No records</div>';
        return;
    }

    container.innerHTML = voters.slice(0, 50).map(v => `
        <div class="settings-record">
            <div>
                <div style="font-weight:600;">${v.name}</div>
                <div style="font-size:12px;color:var(--text-muted);">
                    🆔 ${v.national_id || '—'} · 🏠 ${v.house || '—'} · 📞 ${v.phone || '—'}
                </div>
            </div>
            <div class="record-actions">
                <button class="btn-edit" onclick="openEditVoter(${v.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" onclick="deleteVoter(${v.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function openAddVoter() { showToast('📝 Add voter form coming soon', 'info'); }
function openEditVoter(id) { openVoterModal(id); showToast('📝 Edit mode - click status buttons', 'info'); }
function deleteVoter(id) {
    if (!confirm('Delete this voter?')) return;
    allVoters = allVoters.filter(v => v.id !== id);
    renderAll();
    showToast('🗑️ Deleted', 'success');
}

function clearAllData() {
    if (!settingsAuthenticated) return;
    if (!confirm('Clear all data?')) return;
    allVoters = [];
    renderAll();
    showToast('🗑️ All data cleared', 'warning');
}

// EXPORT - Only available in Settings
function exportData() {
    if (!settingsAuthenticated) {
        showToast('❌ Please unlock settings first', 'warning');
        return;
    }
    
    const headers = ['ID', 'Name', 'National ID', 'House', 'Phone', 'Sex', 'Age', 'Party', 'Vote Status', 'Reach Status', 'Remarks'];
    let csv = headers.join(',') + '\n';
    allVoters.forEach(v => {
        csv += [v.id, v.name, v.national_id, v.house, v.phone, v.sex, v.age, v.party, v.vote_status, v.reach_status, v.remarks]
            .map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `voters_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('📥 Export complete', 'success');
}

async function refreshData() {
    showToast('🔄 Refreshing...', 'info');
    allVoters = [];
    await loadData();
    renderAll();
    showToast('✅ Refreshed', 'success');
}

function updateBadges() {
    const total = allVoters.length;
    const pending = allVoters.filter(v => v.vote_status === 'pending' || !v.vote_status).length;
    
    ['pendingBadge', 'pendingBadgeBottom'].forEach(id => {
        const el = safeEl(id);
        if (el) {
            el.textContent = pending;
            el.style.display = pending > 0 ? 'inline' : 'none';
        }
    });
}

function updateDate() {
    const now = new Date();
    const el = safeEl('dateDisplay');
    if (el) {
        el.textContent = now.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });
    }
}

// NAVIGATION
function navigateTo(section) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const target = safeEl(`section-${section}`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.section === section);
    });
    
    const titles = { dashboard: 'Dashboard', canvass: 'Canvassing', analytics: 'Analytics', settings: 'Settings' };
    const titleEl = safeEl('pageTitle');
    if (titleEl) {
        titleEl.innerHTML = `${titles[section] || 'Dashboard'} <span class="subtitle">Villimale Dhaaira</span>`;
    }
    
    const sidebar = safeEl('sidebar');
    if (sidebar) sidebar.classList.remove('open');
    
    if (section === 'analytics') renderAnalytics();
}

// INFINITE SCROLL
let observer = null;
function setupInfiniteScroll() {
    if (observer) observer.disconnect();
    const loader = safeEl('canvassLoader');
    if (!loader) return;
    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) renderCanvass(false);
    }, { rootMargin: '100px' });
    observer.observe(loader);
}

// TOAST
function showToast(message, type = 'info') {
    const container = safeEl('toastContainer');
    if (!container) return;
    const existing = container.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// EVENT LISTENERS
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = safeEl('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const sidebar = safeEl('sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        });
    }

    document.addEventListener('click', function(e) {
        const sidebar = safeEl('sidebar');
        const toggle = safeEl('menuToggle');
        if (window.innerWidth <= 768 && sidebar && !sidebar.contains(e.target) && toggle && !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    const modal = safeEl('voterModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeVoterModal();
        });
    }

    document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', function() { 
            const section = this.dataset.section;
            if (section) navigateTo(section); 
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeVoterModal();
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            const search = safeEl('canvassSearch');
            if (search) search.focus();
        }
    });

    if (requireAuth()) {
        initSupabase();
        loadData();
    }
});

// GLOBAL EXPORTS
window.navigateTo = navigateTo;
window.filterCanvass = filterCanvass;
window.applyCanvassFilters = applyCanvassFilters;
window.setCanvassView = setCanvassView;
window.quickUpdate = quickUpdate;
window.openVoterModal = openVoterModal;
window.closeVoterModal = closeVoterModal;
window.callVoter = callVoter;
window.whatsappVoter = whatsappVoter;
window.exportData = exportData;
window.refreshData = refreshData;
window.logout = logout;
window.unlockSettings = unlockSettings;
window.clearAllData = clearAllData;
window.openAddVoter = openAddVoter;
window.openEditVoter = openEditVoter;
window.deleteVoter = deleteVoter;
window.renderSettingsTable = renderSettingsTable;
window.renderAll = renderAll;

console.log('✅ Villimale Canvassing System loaded!');
console.log(`📊 ${allVoters.length} voters loaded`);