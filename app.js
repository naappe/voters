// app.js - Main application logic with Supabase data + Settings
// FIXED: Removed mobile updates, modern UI with framed photos, MDP filter

// ============================================
// CHECK CONFIG FIRST
// ============================================
console.log('🔍 Checking configuration...');

if (typeof window.APP_CONFIG === 'undefined') {
    console.error('❌ APP_CONFIG not loaded! Check config.js');
}

if (typeof window.supabaseClient === 'undefined') {
    console.error('❌ supabaseClient not loaded! Check config.js');
}

// ============================================
// STATE
// ============================================
let allVoters = [];
let filteredVoters = [];
let currentPage = 1;
const PAGE_SIZE = 24;
let currentView = 'gallery';
let currentVoterType = 'all';
let chart1 = null;
let chart2 = null;
let chart3 = null;
let chart4 = null;
let currentEditingId = null;
let newsItems = [];
let isLoading = false;
let currentSlideIndex = 0;
let slideInterval = null;
let settingsAuthenticated = false;
let totalRecords = 0;
let lastAppliedFilter = 'all';

// ============================================
// DOM REFS
// ============================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const sidebar = $('#sidebar');
const menuToggle = $('#menuToggle');
const logoutBtn = $('#logoutBtn');

const sections = {
    dashboard: $('#section-dashboard'),
    voters: $('#section-voters'),
    houses: $('#section-houses'),
    analytics: $('#section-analytics'),
    news: $('#section-news'),
    settings: $('#section-settings'),
};

const navItems = $$('.nav-item');
const pageTitle = $('#pageTitle');
const dateDisplay = $('#dateDisplay');

// ============================================
// LOAD DATA FROM SUPABASE - PAGINATION LOOP
// ============================================
async function loadData() {
    if (isLoading) {
        console.log('⏳ Already loading data...');
        return false;
    }
    
    isLoading = true;
    console.log('🔄 Loading ALL data from Supabase using pagination...');
    
    try {
        if (!window.supabaseClient) {
            console.error('❌ Supabase client not initialized!');
            useSampleData();
            isLoading = false;
            return false;
        }
        
        const tableName = (window.APP_CONFIG && window.APP_CONFIG.tableName) || 'full_import';
        console.log('📋 Using table: ' + tableName);
        
        let allData = [];
        let from = 0;
        const pageSize = 1000;
        let pageCount = 0;
        
        console.log('📊 Starting paginated fetch...');
        
        while (true) {
            const { data, error } = await window.supabaseClient
                .from(tableName)
                .select('*')
                .order('id', { ascending: true })
                .range(from, from + pageSize - 1);
            
            if (error) {
                console.error('❌ Supabase error on page ' + (pageCount + 1) + ':', error);
                throw error;
            }
            
            if (!data || data.length === 0) {
                console.log('📭 No more data, breaking loop');
                break;
            }
            
            allData = allData.concat(data);
            pageCount++;
            console.log('📄 Page ' + pageCount + ': loaded ' + data.length + ' rows (total so far: ' + allData.length + ')');
            
            if (data.length < pageSize) {
                console.log('✅ Last page reached (less than ' + pageSize + ' rows)');
                break;
            }
            
            from += pageSize;
        }
        
        console.log('✅ Successfully loaded ALL ' + allData.length + ' voters from Supabase (' + pageCount + ' pages)');
        
        if (allData.length === 0) {
            console.warn('⚠️ No data returned from Supabase. Using sample data.');
            useSampleData();
            showToast('No data found. Using sample data.', 'warning');
            isLoading = false;
            return false;
        }
        
        allVoters = allData;
        filteredVoters = [...allVoters];
        totalRecords = allData.length;
        
        console.log('📊 Total records in database: ' + totalRecords);
        
        updateBadges();
        populateFilters();
        updateTypeCounts();
        isLoading = false;
        return true;
        
    } catch (err) {
        console.error('❌ Error loading data:', err);
        useSampleData();
        showToast('Error loading data: ' + err.message, 'error');
        isLoading = false;
        return false;
    }
}

// ============================================
// SAMPLE DATA (Fallback)
// ============================================
function useSampleData() {
    console.log('📊 Using sample data...');
    allVoters = [];
    var houses = ['Aa Ali', 'Aabaaru', 'Aage', 'Aahi', 'Aanam', 'Aarifaa Manzil', 'Aasmaan Manzil', 'Aavehi', 'Acuter', 'Afi', 'Ahimoo', 'Aishaa Villa', 'Akarakara', 'Alamaa villa', 'Dhelwahtha', 'Haharu', 'Vavaiy', 'Burevi', 'Maakurathu Hiyaa', 'Bodisaimaa'];
    var parties = ['MDP', null, 'MDP', null, 'MDP'];
    var statuses = ['pending', 'will-vote', 'not-vote', 'pending'];
    var reachStatuses = ['not-reached', 'reached'];
    var names = ['Hussain Zahir', 'Ali Mukhthaar', 'Adam Aslam', 'Abdulla Afeef', 'Abdul Hannan Ibrahim', 'Adam Nizar', 'Ahmed Mufeed', 'Aishath Susan Haneef', 'Aishath Fazna', 'Mariyam Suzna Haneef', 'Mohamed Simau Fuad', 'Fathimath Shuzoona Haneef', 'Shufa Haneef', 'Shafga Haneef', 'Aishath Rafa', 'Shasha Haneef', 'Umar Marzoog', 'Mohamed Mahfooz', 'Fathimath Rasha', 'Mohamed Gaihal Aslam'];
    
    for (var i = 0; i < 3351; i++) {
        var house = houses[i % houses.length];
        var party = parties[i % parties.length];
        var status = statuses[i % statuses.length];
        var reach = reachStatuses[i % reachStatuses.length];
        var name = names[i % names.length] + (i > 19 ? ' ' + (i + 1) : '');
        
        allVoters.push({
            id: i + 1,
            name: name,
            national_id: 'A' + String(100000 + i).padStart(6, '0'),
            house: house,
            phone: '7' + String(700000 + i).padStart(6, '0'),
            sex: i % 2 === 0 ? 'M' : 'F',
            age: 18 + (i % 50),
            party: party,
            vote_status: status,
            reach_status: reach,
            remarks: null,
            photo_url: ''
        });
    }
    filteredVoters = [...allVoters];
    totalRecords = allVoters.length;
    console.log('📊 Sample data created: ' + totalRecords + ' rows');
}

// ============================================
// UPDATE TYPE COUNTS
// ============================================
function updateTypeCounts() {
    var total = allVoters.length;
    var reached = allVoters.filter(function(v) { return v.reach_status === 'reached'; }).length;
    var willVote = allVoters.filter(function(v) { return v.vote_status === 'will-vote'; }).length;
    var notVote = allVoters.filter(function(v) { return v.vote_status === 'not-vote'; }).length;
    var pending = allVoters.filter(function(v) { return v.vote_status === 'pending' || !v.vote_status; }).length;

    var el = document.getElementById('allCount');
    if (el) el.textContent = total;
    el = document.getElementById('mdpCount');
    if (el) el.textContent = allVoters.filter(function(v) { return v.party === 'MDP'; }).length;
    el = document.getElementById('reachedCount');
    if (el) el.textContent = reached;
    el = document.getElementById('willVoteCount');
    if (el) el.textContent = willVote;
    el = document.getElementById('pendingCount');
    if (el) el.textContent = pending;
    
    el = document.getElementById('voterBadge');
    if (el) el.textContent = total;
}

// ============================================
// FILTER VOTER TYPE
// ============================================
function filterVoterType(type) {
    currentVoterType = type;
    lastAppliedFilter = type;
    
    document.querySelectorAll('.type-btn').forEach(function(btn) {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.stat-card').forEach(function(card) {
        card.classList.remove('active-filter');
    });
    
    navigateTo('voters');
    applyFilters();
    
    var labels = {
        'all': 'All Voters',
        'reached': '✅ Reached',
        'will-vote': '🗳️ Will Vote',
        'not-vote': '❌ Not Vote',
        'pending': '⏳ Pending',
        'mdp': '🏛️ MDP Voters'
    };
    showToast('Showing: ' + (labels[type] || type), 'info');
}

// ============================================
// FILTER BY HOUSE
// ============================================
function filterByHouse(house) {
    var houseFilter = document.getElementById('houseFilter');
    if (houseFilter) {
        houseFilter.value = house;
    }
    
    currentVoterType = 'all';
    lastAppliedFilter = 'house';
    document.querySelectorAll('.type-btn').forEach(function(btn) {
        if (btn.dataset.type === 'all') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    navigateTo('voters');
    applyFilters();
    
    showToast('🏠 Showing voters from: ' + house, 'info');
}

// ============================================
// GENERATE CLEAN NEWS FROM DATA
// ============================================
function generateNewsFromData() {
    console.log('📰 Generating clean news from voter data...');
    
    var now = new Date();
    var total = allVoters.length || 0;
    var reached = allVoters.filter(function(v) { return v.reach_status === 'reached'; }).length || 0;
    var willVote = allVoters.filter(function(v) { return v.vote_status === 'will-vote'; }).length || 0;
    var notVote = allVoters.filter(function(v) { return v.vote_status === 'not-vote'; }).length || 0;
    var pending = allVoters.filter(function(v) { return v.vote_status === 'pending' || !v.vote_status; }).length || 0;
    var mdp = allVoters.filter(function(v) { return v.party === 'MDP'; }).length || 0;
    var reachedPct = total ? Math.round((reached/total)*100) : 0;
    var willVotePct = total ? Math.round((willVote/total)*100) : 0;
    
    var houseCounts = {};
    for (var i = 0; i < allVoters.length; i++) {
        var v = allVoters[i];
        var house = v.house || 'Unassigned';
        if (!houseCounts[house]) houseCounts[house] = 0;
        houseCounts[house]++;
    }
    var sortedHouses = Object.entries(houseCounts).sort(function(a, b) { return b[1] - a[1]; });
    var topHouse = sortedHouses.length > 0 ? sortedHouses[0][0] : 'None';
    var topHouseCount = sortedHouses.length > 0 ? sortedHouses[0][1] : 0;
    
    var news = [];
    
    news.push({
        title: '📊 Total Voters: ' + total + ' registered',
        link: '#',
        source: 'System',
        type: 'system',
        icon: 'fa-users',
        date: now.toISOString(),
        new: true,
        action: 'filter',
        filterType: 'all',
        filterValue: 'all'
    });
    
    if (pending > 0) {
        news.push({
            title: '⏳ ' + pending + ' voters pending decision',
            link: '#',
            source: 'System',
            type: 'system',
            icon: 'fa-clock',
            date: new Date(now - 3600000).toISOString(),
            new: true,
            action: 'filter',
            filterType: 'pending',
            filterValue: 'pending'
        });
    }
    
    if (willVote > 0) {
        news.push({
            title: '🗳️ ' + willVote + ' voters will vote (' + willVotePct + '%)',
            link: '#',
            source: 'System',
            type: 'system',
            icon: 'fa-vote-yea',
            date: new Date(now - 7200000).toISOString(),
            new: true,
            action: 'filter',
            filterType: 'will-vote',
            filterValue: 'will-vote'
        });
    }
    
    if (notVote > 0) {
        news.push({
            title: '❌ ' + notVote + ' voters will not vote',
            link: '#',
            source: 'System',
            type: 'system',
            icon: 'fa-times-circle',
            date: new Date(now - 10800000).toISOString(),
            new: true,
            action: 'filter',
            filterType: 'not-vote',
            filterValue: 'not-vote'
        });
    }
    
    if (reached > 0) {
        news.push({
            title: '✅ ' + reached + ' voters reached (' + reachedPct + '%)',
            link: '#',
            source: 'System',
            type: 'system',
            icon: 'fa-check-circle',
            date: new Date(now - 14400000).toISOString(),
            new: true,
            action: 'filter',
            filterType: 'reached',
            filterValue: 'reached'
        });
    }
    
    if (mdp > 0) {
        news.push({
            title: '🏛️ ' + mdp + ' MDP voters in the system',
            link: '#',
            source: 'System',
            type: 'system',
            icon: 'fa-flag',
            date: new Date(now - 18000000).toISOString(),
            new: false,
            action: 'filter',
            filterType: 'mdp',
            filterValue: 'mdp'
        });
    }
    
    if (topHouse !== 'None' && topHouseCount > 0) {
        news.push({
            title: '🏠 Top house: ' + topHouse + ' (' + topHouseCount + ' voters)',
            link: '#',
            source: 'System',
            type: 'system',
            icon: 'fa-home',
            date: new Date(now - 21600000).toISOString(),
            new: false,
            action: 'house',
            filterType: 'house',
            filterValue: topHouse
        });
    }
    
    for (var h = 0; h < Math.min(sortedHouses.length, 5); h++) {
        var houseName = sortedHouses[h][0];
        var houseCount = sortedHouses[h][1];
        var houseReached = allVoters.filter(function(v) { return v.house === houseName && v.reach_status === 'reached'; }).length;
        var housePct = houseCount ? Math.round((houseReached/houseCount)*100) : 0;
        
        if (housePct < 50) {
            news.push({
                title: '⚠️ ' + houseName + ': ' + houseReached + '/' + houseCount + ' reached (' + housePct + '%)',
                link: '#',
                source: 'System',
                type: 'house',
                icon: 'fa-building',
                date: new Date(now - 25200000 - (h * 3600000)).toISOString(),
                new: false,
                action: 'house',
                filterType: 'house',
                filterValue: houseName
            });
        }
    }
    
    news.push({
        title: '📈 Overall engagement: ' + reachedPct + '% reached',
        link: '#',
        source: 'System',
        type: 'system',
        icon: 'fa-chart-line',
        date: new Date(now - 28800000).toISOString(),
        new: false,
        action: 'filter',
        filterType: 'reached',
        filterValue: 'reached'
    });
    
    return news;
}

// ============================================
// HANDLE NEWS CLICK
// ============================================
function handleNewsClick(element) {
    try {
        var newsData = element.dataset.news;
        if (!newsData) return;
        
        var item = JSON.parse(newsData);
        
        if (item.action === 'filter' && item.filterValue) {
            filterVoterType(item.filterValue);
        } else if (item.action === 'house' && item.filterValue) {
            filterByHouse(item.filterValue);
        } else {
            navigateTo('voters');
        }
    } catch (e) {
        console.error('Error handling news click:', e);
        navigateTo('voters');
    }
}

// ============================================
// FETCH NEWS
// ============================================
async function fetchNews() {
    console.log('📰 Generating clean news from data...');
    newsItems = generateNewsFromData();
    newsItems.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    newsItems = newsItems.slice(0, 15);
    updateBadges();
    console.log('✅ Generated ' + newsItems.length + ' clean news items');
    return newsItems;
}

// ============================================
// UPDATE BADGES
// ============================================
function updateBadges() {
    var voterBadge = document.getElementById('voterBadge');
    var houseBadge = document.getElementById('houseBadge');
    var newsBadge = document.getElementById('newsBadge');
    var notificationDot = document.getElementById('notificationDot');
    
    if (voterBadge) voterBadge.textContent = allVoters.length;
    
    var houses = new Set();
    for (var i = 0; i < allVoters.length; i++) {
        if (allVoters[i].house && allVoters[i].house.trim()) {
            houses.add(allVoters[i].house.trim());
        }
    }
    if (houseBadge) houseBadge.textContent = houses.size;
    
    var newNews = newsItems.filter(function(a) { return a.new; }).length;
    if (newsBadge) {
        newsBadge.textContent = newNews;
        newsBadge.style.display = newNews > 0 ? 'inline' : 'none';
    }
    if (notificationDot) {
        notificationDot.style.display = newNews > 0 ? 'block' : 'none';
    }
}

// ============================================
// POPULATE FILTERS
// ============================================
function populateFilters() {
    var houses = new Set();
    for (var i = 0; i < allVoters.length; i++) {
        if (allVoters[i].house && allVoters[i].house.trim()) {
            houses.add(allVoters[i].house.trim());
        }
    }
    var sorted = Array.from(houses).sort();

    var houseFilter = document.getElementById('houseFilter');
    if (houseFilter) {
        var options = '<option value="">All Houses</option>';
        for (var h = 0; h < sorted.length; h++) {
            options += '<option value="' + sorted[h] + '">' + sorted[h] + '</option>';
        }
        houseFilter.innerHTML = options;
    }
}

// ============================================
// INIT
// ============================================
async function init() {
    console.log('🚀 Initializing Voter Management System...');
    
    var authenticated = await auth.requireAuth();
    if (!authenticated) return;

    await loadData();
    await fetchNews();

    setupNavigation();
    setupDate();
    setupViewToggle();
    setupFilters();
    setupModal();
    setupNewsSlider();
    setupSettings();
    setupClickableCards();
    setupMDPFilter();
    
    renderDashboard();
    renderVoters();
    renderHouses();
    renderAnalytics();
    renderNews();
    renderNewsSlider();
    
    console.log('✅ App initialized successfully with ' + allVoters.length + ' voters');
}

// ============================================
// SETUP MDP FILTER
// ============================================
function setupMDPFilter() {
    // Add MDP filter button if not exists
    var typeSelector = document.querySelector('.voter-type-selector');
    if (typeSelector) {
        var existingMDP = typeSelector.querySelector('.type-btn[data-type="mdp"]');
        if (!existingMDP) {
            var mdpBtn = document.createElement('button');
            mdpBtn.className = 'type-btn';
            mdpBtn.dataset.type = 'mdp';
            mdpBtn.innerHTML = '<i class="fas fa-flag"></i> MDP Voters <span class="type-count" id="mdpCount">0</span>';
            mdpBtn.onclick = function() { filterVoterType('mdp'); };
            typeSelector.appendChild(mdpBtn);
        }
    }
}

// ============================================
// SETUP CLICKABLE CARDS
// ============================================
function setupClickableCards() {
    var statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(function(card) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
            var filter = this.dataset.filter;
            if (filter) {
                filterVoterType(filter);
            }
        });
    });
    
    var houseItems = document.querySelectorAll('.top-house-item');
    houseItems.forEach(function(item) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', function() {
            var houseName = this.querySelector('.house-name')?.textContent;
            if (houseName) {
                filterByHouse(houseName);
            }
        });
    });
}

// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }

    for (var i = 0; i < navItems.length; i++) {
        (function(index) {
            var item = navItems[index];
            item.addEventListener('click', function() {
                var section = this.dataset.section;
                navigateTo(section);
                if (sidebar) sidebar.classList.remove('open');
            });
        })(i);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                window.logout();
            }
        });
    }

    window.navigateTo = navigateTo;
}

function navigateTo(section) {
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].classList.remove('active');
    }
    var activeNav = document.querySelector('.nav-item[data-section="' + section + '"]');
    if (activeNav) activeNav.classList.add('active');

    var keys = Object.keys(sections);
    for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (sections[key]) {
            if (key === section) {
                sections[key].classList.add('active');
            } else {
                sections[key].classList.remove('active');
            }
        }
    }

    var titles = {
        dashboard: 'Dashboard',
        voters: 'Voters',
        houses: 'Houses',
        analytics: 'Analytics',
        news: 'News',
        settings: 'Settings'
    };
    pageTitle.textContent = titles[section] || 'Dashboard';
    
    if (section === 'settings') {
        checkSettingsAuth();
    }
}

// ============================================
// SETTINGS SECTION
// ============================================
function setupSettings() {
    var form = document.getElementById('settingsPasswordForm');
    var input = document.getElementById('settingsPasswordInput');
    var error = document.getElementById('settingsError');
    var overlay = document.getElementById('settingsPasswordOverlay');
    var content = document.getElementById('settingsContent');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var pwd = input.value.trim();
            
            if (pwd === 'settings123') {
                settingsAuthenticated = true;
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                content.style.display = 'block';
                renderSettings();
                showToast('✅ Settings unlocked successfully!', 'success');
            } else {
                error.classList.add('show');
                input.value = '';
                input.focus();
                setTimeout(function() {
                    error.classList.remove('show');
                }, 3000);
            }
        });
    }
    
    if (input) {
        input.addEventListener('keydown', function() {
            error.classList.remove('show');
        });
    }
}

function checkSettingsAuth() {
    var overlay = document.getElementById('settingsPasswordOverlay');
    var content = document.getElementById('settingsContent');
    
    if (settingsAuthenticated) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
        content.style.display = 'block';
        renderSettings();
    } else {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        content.style.display = 'none';
        var input = document.getElementById('settingsPasswordInput');
        if (input) {
            setTimeout(function() {
                input.focus();
            }, 300);
        }
    }
}

function renderSettings() {
    var total = allVoters.length;
    var mdp = allVoters.filter(function(v) { return v.party === 'MDP'; }).length;
    var reached = allVoters.filter(function(v) { return v.reach_status === 'reached'; }).length;
    var willVote = allVoters.filter(function(v) { return v.vote_status === 'will-vote'; }).length;
    
    document.getElementById('settingsTotalCount').textContent = total;
    document.getElementById('settingsMDPCount').textContent = mdp;
    document.getElementById('settingsReachedCount').textContent = reached;
    document.getElementById('settingsWillVoteCount').textContent = willVote;
    document.getElementById('settingsTotal').textContent = total;
    
    var tbody = document.getElementById('settingsTableBody');
    var pageVoters = allVoters.slice(0, 50);
    
    var html = '';
    for (var i = 0; i < pageVoters.length; i++) {
        var v = pageVoters[i];
        var voteStatus = v.vote_status || 'pending';
        var statusClass = voteStatus === 'will-vote' ? 'status-will-vote' : (voteStatus === 'not-vote' ? 'status-not-vote' : 'status-pending');
        var reachClass = v.reach_status === 'reached' ? 'status-reached' : 'status-not-reached';
        
        html += '<tr>';
        html += '<td>' + v.id + '</td>';
        html += '<td><strong>' + (v.name || 'Unknown') + '</strong></td>';
        html += '<td>' + (v.house || '—') + '</td>';
        html += '<td>' + (v.phone || '—') + '</td>';
        html += '<td><span class="status-badge ' + statusClass + '">' + voteStatus + '</span></td>';
        html += '<td><span class="status-badge ' + reachClass + '">' + (v.reach_status || 'not-reached') + '</span></td>';
        html += '<td><div class="settings-actions-cell">';
        html += '<button class="btn btn-outline btn-sm" onclick="openModal(' + v.id + ')"><i class="fas fa-edit"></i></button>';
        html += '<button class="btn btn-danger btn-sm" onclick="deleteVoterSettings(' + v.id + ')"><i class="fas fa-trash"></i></button>';
        html += '</div></td>';
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

async function deleteVoterSettings(id) {
    if (!settingsAuthenticated) {
        showToast('❌ Settings access required', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this voter?')) return;
    
    try {
        var tableName = (window.APP_CONFIG && window.APP_CONFIG.tableName) || 'full_import';
        var { error } = await window.supabaseClient
            .from(tableName)
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        allVoters = allVoters.filter(function(v) { return v.id !== id; });
        filteredVoters = filteredVoters.filter(function(v) { return v.id !== id; });
        
        refreshAll();
        renderSettings();
        showToast('✅ Voter deleted successfully', 'success');
    } catch (err) {
        console.error('Error deleting voter:', err);
        showToast('❌ Error: ' + err.message, 'error');
    }
}

function clearAllData() {
    if (!settingsAuthenticated) {
        showToast('❌ Settings access required', 'error');
        return;
    }
    
    if (!confirm('⚠️ Are you sure you want to clear ALL data? This cannot be undone!')) return;
    if (!confirm('⚠️ Final confirmation: Clear all voter data?')) return;
    
    allVoters = [];
    filteredVoters = [];
    refreshAll();
    renderSettings();
    showToast('🗑️ All data cleared', 'warning');
}

// ============================================
// DATE
// ============================================
function setupDate() {
    var now = new Date();
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = now.toLocaleDateString('en-US', options);
}

// ============================================
// VIEW TOGGLE
// ============================================
function setupViewToggle() {
    var viewBtns = document.querySelectorAll('.view-btn');
    for (var i = 0; i < viewBtns.length; i++) {
        (function(index) {
            var btn = viewBtns[index];
            btn.addEventListener('click', function() {
                for (var j = 0; j < viewBtns.length; j++) {
                    viewBtns[j].classList.remove('active');
                }
                this.classList.add('active');
                currentView = this.dataset.view;
                renderVoters();
            });
        })(i);
    }
}

// ============================================
// FILTERS
// ============================================
function setupFilters() {
    var applyBtn = document.getElementById('applyBtn');
    var resetBtn = document.getElementById('resetBtn');
    var searchInput = document.getElementById('searchInput');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
    if (searchInput) {
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') applyFilters();
        });
    }
}

function applyFilters() {
    var search = document.getElementById('searchInput').value.toLowerCase().trim();
    var house = document.getElementById('houseFilter').value;
    var gender = document.getElementById('genderFilter').value;

    filteredVoters = allVoters.filter(function(v) {
        if (currentVoterType === 'mdp' && v.party !== 'MDP') return false;
        if (currentVoterType === 'reached' && v.reach_status !== 'reached') return false;
        if (currentVoterType === 'will-vote' && v.vote_status !== 'will-vote') return false;
        if (currentVoterType === 'not-vote' && v.vote_status !== 'not-vote') return false;
        if (currentVoterType === 'pending' && v.vote_status !== 'pending' && v.vote_status !== null) return false;
        
        if (search) {
            var name = (v.name || '').toLowerCase();
            var id = (v.national_id || '').toLowerCase();
            var h = (v.house || '').toLowerCase();
            if (!name.includes(search) && !id.includes(search) && !h.includes(search)) {
                return false;
            }
        }

        if (house && (v.house || '').trim() !== house) return false;
        if (gender && v.sex !== gender) return false;
        
        return true;
    });

    currentPage = 1;
    renderVoters();
    updateResultCount();
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('houseFilter').value = '';
    document.getElementById('genderFilter').value = '';
    
    currentVoterType = 'all';
    lastAppliedFilter = 'all';
    var typeBtns = document.querySelectorAll('.type-btn');
    for (var i = 0; i < typeBtns.length; i++) {
        if (typeBtns[i].dataset.type === 'all') {
            typeBtns[i].classList.add('active');
        } else {
            typeBtns[i].classList.remove('active');
        }
    }
    
    applyFilters();
}

function updateResultCount() {
    document.getElementById('resultCount').textContent = filteredVoters.length + ' voters';
}

// ============================================
// RENDER DASHBOARD
// ============================================
function renderDashboard() {
    var total = allVoters.length;
    var reached = allVoters.filter(function(v) { return v.reach_status === 'reached'; }).length;
    var willVote = allVoters.filter(function(v) { return v.vote_status === 'will-vote'; }).length;
    var notVote = allVoters.filter(function(v) { return v.vote_status === 'not-vote'; }).length;
    var pending = allVoters.filter(function(v) { return v.vote_status === 'pending' || !v.vote_status; }).length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statReached').textContent = reached;
    document.getElementById('statWillVote').textContent = willVote;
    document.getElementById('statNotVote').textContent = notVote;
    document.getElementById('statPending').textContent = pending;

    renderTopHouses();
    renderCharts();
    updateTypeCounts();
}

// ============================================
// TOP 7 HOUSES
// ============================================
function renderTopHouses() {
    var counts = {};
    for (var i = 0; i < allVoters.length; i++) {
        var v = allVoters[i];
        var house = v.house || 'Unassigned';
        if (!counts[house]) counts[house] = 0;
        counts[house]++;
    }

    var sorted = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 7);

    var grid = document.getElementById('topHousesGrid');
    if (sorted.length === 0) {
        grid.innerHTML = '<div class="loading">No houses found</div>';
        document.getElementById('topHousesCount').textContent = '';
        return;
    }

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
        var name = sorted[i][0];
        var count = sorted[i][1];
        html += '<div class="top-house-item" onclick="filterByHouse(\'' + name.replace(/'/g, "\\'") + '\')">';
        html += '<span class="house-rank">#' + (i + 1) + '</span>';
        html += '<span class="house-name">' + name + '</span>';
        html += '<span class="house-count">' + count + '</span>';
        html += '</div>';
    }
    grid.innerHTML = html;

    document.getElementById('topHousesCount').textContent = 'Top ' + sorted.length + ' houses';
}

// ============================================
// CHARTS
// ============================================
function renderCharts() {
    var ctx1 = document.getElementById('voteChart');
    if (ctx1) {
        var context1 = ctx1.getContext('2d');
        if (chart1) chart1.destroy();
        
        var houses = [];
        var houseSet = new Set();
        for (var i = 0; i < allVoters.length; i++) {
            if (allVoters[i].house && allVoters[i].house.trim()) {
                houseSet.add(allVoters[i].house.trim());
            }
        }
        houses = Array.from(houseSet).slice(0, 10);
        
        var willVoteData = houses.map(function(h) {
            return allVoters.filter(function(v) { return v.house === h && v.vote_status === 'will-vote'; }).length;
        });
        var pendingData = houses.map(function(h) {
            return allVoters.filter(function(v) { return v.house === h && (v.vote_status === 'pending' || !v.vote_status); }).length;
        });
        var notVoteData = houses.map(function(h) {
            return allVoters.filter(function(v) { return v.house === h && v.vote_status === 'not-vote'; }).length;
        });

        chart1 = new Chart(context1, {
            type: 'bar',
            data: {
                labels: houses.map(function(h) { return h.length > 10 ? h.substring(0, 10) + '...' : h; }),
                datasets: [
                    { label: 'Will Vote', data: willVoteData, backgroundColor: '#3b82f6', borderRadius: 4 },
                    { label: 'Pending', data: pendingData, backgroundColor: '#f59e0b', borderRadius: 4 },
                    { label: 'Not Vote', data: notVoteData, backgroundColor: '#ef4444', borderRadius: 4 },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 12 } }
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                }
            }
        });
    }

    var ctx2 = document.getElementById('overallChart');
    if (ctx2) {
        var context2 = ctx2.getContext('2d');
        if (chart2) chart2.destroy();
        
        var willVote = allVoters.filter(function(v) { return v.vote_status === 'will-vote'; }).length;
        var notVote = allVoters.filter(function(v) { return v.vote_status === 'not-vote'; }).length;
        var pending = allVoters.filter(function(v) { return v.vote_status === 'pending' || !v.vote_status; }).length;

        chart2 = new Chart(context2, {
            type: 'doughnut',
            data: {
                labels: ['🗳️ Will Vote', '❌ Not Vote', '⏳ Pending'],
                datasets: [{
                    data: [willVote || 1, notVote || 1, pending || 1],
                    backgroundColor: ['#3b82f6', '#ef4444', '#f59e0b'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } }
                },
                cutout: '65%',
            }
        });
    }
}

// ============================================
// RENDER VOTERS - MODERN GALLERY WITH FRAMED PHOTOS
// ============================================
function renderVoters() {
    var container = document.getElementById('voterContainer');
    if (!container) return;
    
    if (currentView === 'gallery') {
        container.className = 'gallery';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
        container.style.gap = '20px';
    } else {
        container.className = 'list';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
    }

    var start = (currentPage - 1) * PAGE_SIZE;
    var end = start + PAGE_SIZE;
    var pageVoters = filteredVoters.slice(start, end);

    if (filteredVoters.length === 0) {
        container.innerHTML = '<div class="loading-state"><div style="font-size:48px;margin-bottom:12px;">🔍</div>No voters found</div>';
        updatePagination();
        return;
    }

    var html = '';
    if (currentView === 'gallery') {
        for (var i = 0; i < pageVoters.length; i++) {
            html += createModernGalleryCard(pageVoters[i]);
        }
    } else {
        for (var i = 0; i < pageVoters.length; i++) {
            html += createListItem(pageVoters[i]);
        }
    }
    container.innerHTML = html;

    updatePagination();
    updateResultCount();
}

// ============================================
// MODERN GALLERY CARD WITH FRAMED PHOTO
// ============================================
function createModernGalleryCard(v) {
    var voteStatus = v.vote_status || 'pending';
    var statusClass = voteStatus === 'will-vote' ? 'status-will-vote' : (voteStatus === 'not-vote' ? 'status-not-vote' : 'status-pending');
    var label = voteStatus === 'will-vote' ? '🗳️ Will Vote' : (voteStatus === 'not-vote' ? '❌ Not Vote' : '⏳ Pending');
    var reachStatus = v.reach_status || 'not-reached';
    var photoUrl = v.photo_url || '';
    var name = v.name || 'Unknown';
    var nationalId = v.national_id || 'N/A';
    var house = v.house || 'No house';
    var age = v.age || '—';
    var party = v.party || '';
    var isMDP = party === 'MDP';
    var remarks = v.remarks || '';
    
    var cardHtml = '<div class="voter-card modern" onclick="openModal(' + v.id + ')">';
    
    // Framed photo with shadow
    cardHtml += '<div class="card-photo-frame">';
    if (photoUrl) {
        cardHtml += '<img class="card-photo" src="' + photoUrl + '" alt="' + name + '" loading="lazy" />';
    } else {
        cardHtml += '<div class="card-photo-placeholder">👤</div>';
    }
    // MDP badge overlay
    if (isMDP) {
        cardHtml += '<div class="mdp-badge"><i class="fas fa-flag"></i> MDP</div>';
    }
    cardHtml += '</div>';
    
    cardHtml += '<div class="card-body">';
    cardHtml += '<div class="card-name">' + name + '</div>';
    cardHtml += '<div class="card-id">🆔 ' + nationalId + '</div>';
    cardHtml += '<div class="card-house">🏠 ' + house + '</div>';
    cardHtml += '<span class="card-status ' + statusClass + '">' + label + '</span>';
    cardHtml += '<div class="card-footer">';
    cardHtml += '<span>' + (reachStatus === 'reached' ? '✅ Reached' : '⏳ Not Reached') + '</span>';
    cardHtml += '<span>' + age + ' yrs</span>';
    cardHtml += '</div>';
    if (remarks) {
        cardHtml += '<div class="card-remarks">📝 ' + remarks.substring(0, 25) + (remarks.length > 25 ? '...' : '') + '</div>';
    }
    cardHtml += '</div></div>';
    
    return cardHtml;
}

// ============================================
// CREATE LIST ITEM
// ============================================
function createListItem(v) {
    var voteStatus = v.vote_status || 'pending';
    var statusClass = voteStatus === 'will-vote' ? 'status-will-vote' : (voteStatus === 'not-vote' ? 'status-not-vote' : 'status-pending');
    var label = voteStatus === 'will-vote' ? '🗳️ Will Vote' : (voteStatus === 'not-vote' ? '❌ Not Vote' : '⏳ Pending');
    var photoUrl = v.photo_url || '';
    var name = v.name || 'Unknown';
    var nationalId = v.national_id || 'N/A';
    var house = v.house || 'No house';
    var age = v.age || '—';
    var sex = v.sex || '—';
    var party = v.party || '';
    var isMDP = party === 'MDP';
    var reachStatus = v.reach_status || 'not-reached';
    var remarks = v.remarks || '';

    var html = '<div class="voter-list-item" onclick="openModal(' + v.id + ')">';
    
    if (photoUrl) {
        html += '<img class="list-photo" src="' + photoUrl + '" alt="' + name + '" loading="lazy" />';
    } else {
        html += '<div class="list-photo" style="display:flex;align-items:center;justify-content:center;font-size:20px;color:#c0c8d4;background:#f0f2f5;border-radius:50%;width:48px;height:48px;flex-shrink:0;">👤</div>';
    }
    
    html += '<div class="list-info">';
    html += '<div class="list-name">' + name;
    if (isMDP) {
        html += ' <span style="color:#f59e0b;font-size:11px;">🏛️ MDP</span>';
    }
    html += '</div>';
    html += '<div class="list-details">';
    html += '<span>🆔 ' + nationalId + '</span>';
    html += '<span>🏠 ' + house + '</span>';
    html += '<span>' + age + ' yrs</span>';
    html += '<span>' + sex + '</span>';
    if (remarks) {
        html += '<span style="color:#6b7a8f;font-style:italic;">📝 ' + remarks.substring(0, 20) + (remarks.length > 20 ? '...' : '') + '</span>';
    }
    html += '</div></div>';
    html += '<div class="list-status">';
    html += '<span class="card-status ' + statusClass + '">' + label + '</span>';
    html += '<span style="font-size:11px;color:var(--text-muted);margin-left:8px;">' + (reachStatus === 'reached' ? '✅' : '⏳') + '</span>';
    html += '</div></div>';
    
    return html;
}

// ============================================
// PAGINATION
// ============================================
function updatePagination() {
    var totalPages = Math.ceil(filteredVoters.length / PAGE_SIZE);
    var prevBtn = document.getElementById('prevPage');
    var nextBtn = document.getElementById('nextPage');
    var pageInfo = document.getElementById('pageInfo');

    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.onclick = function() {
            if (currentPage > 1) {
                currentPage--;
                renderVoters();
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
        nextBtn.onclick = function() {
            if (currentPage < totalPages) {
                currentPage++;
                renderVoters();
            }
        };
    }
    
    if (pageInfo) {
        pageInfo.textContent = 'Page ' + currentPage + ' of ' + (totalPages || 1);
    }
}

// ============================================
// RENDER HOUSES
// ============================================
function renderHouses() {
    var counts = {};
    for (var i = 0; i < allVoters.length; i++) {
        var v = allVoters[i];
        var house = v.house || 'Unassigned';
        if (!counts[house]) counts[house] = 0;
        counts[house]++;
    }

    var sorted = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; });

    var list = document.getElementById('housesList');
    if (sorted.length === 0) {
        list.innerHTML = '<div class="loading">No houses found</div>';
        document.getElementById('housesTotal').textContent = '';
        return;
    }

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
        var name = sorted[i][0];
        var count = sorted[i][1];
        html += '<div class="house-item" onclick="filterByHouse(\'' + name.replace(/'/g, "\\'") + '\')">';
        html += '<span class="house-name">' + name + '</span>';
        html += '<span class="house-count">' + count + '</span>';
        html += '</div>';
    }
    list.innerHTML = html;

    document.getElementById('housesTotal').textContent = sorted.length + ' houses';
}

// ============================================
// RENDER ANALYTICS
// ============================================
function renderAnalytics() {
    var ctx3 = document.getElementById('analyticsChart');
    if (ctx3) {
        var context3 = ctx3.getContext('2d');
        if (chart3) chart3.destroy();
        
        var houses = [];
        var houseSet = new Set();
        for (var i = 0; i < allVoters.length; i++) {
            if (allVoters[i].house && allVoters[i].house.trim()) {
                houseSet.add(allVoters[i].house.trim());
            }
        }
        houses = Array.from(houseSet).slice(0, 8);
        
        var reachedData = houses.map(function(h) {
            return allVoters.filter(function(v) { return v.house === h && v.reach_status === 'reached'; }).length;
        });
        var notReachedData = houses.map(function(h) {
            return allVoters.filter(function(v) { return v.house === h && v.reach_status === 'not-reached'; }).length;
        });

        chart3 = new Chart(context3, {
            type: 'bar',
            data: {
                labels: houses.map(function(h) { return h.length > 10 ? h.substring(0, 10) + '...' : h; }),
                datasets: [
                    { label: '✅ Reached', data: reachedData, backgroundColor: '#10b981', borderRadius: 4 },
                    { label: '❌ Not Reached', data: notReachedData, backgroundColor: '#ef4444', borderRadius: 4 },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 12 } }
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                }
            }
        });
    }

    var ctx4 = document.getElementById('genderChart');
    if (ctx4) {
        var context4 = ctx4.getContext('2d');
        if (chart4) chart4.destroy();
        
        var male = allVoters.filter(function(v) { return v.sex === 'M'; }).length;
        var female = allVoters.filter(function(v) { return v.sex === 'F'; }).length;
        var unknown = allVoters.filter(function(v) { return v.sex !== 'M' && v.sex !== 'F'; }).length;

        chart4 = new Chart(context4, {
            type: 'doughnut',
            data: {
                labels: ['👨 Male', '👩 Female', '❓ Unknown'],
                datasets: [{
                    data: [male || 1, female || 1, unknown || 1],
                    backgroundColor: ['#3b82f6', '#ec4899', '#94a3b8'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } }
                },
                cutout: '60%',
            }
        });
    }

    var tbody = document.getElementById('analyticsBody');
    if (!tbody) return;
    
    var total = allVoters.length;
    var reached = allVoters.filter(function(v) { return v.reach_status === 'reached'; }).length;
    var notReached = allVoters.filter(function(v) { return v.reach_status === 'not-reached'; }).length;
    var willVote = allVoters.filter(function(v) { return v.vote_status === 'will-vote'; }).length;
    var notVote = allVoters.filter(function(v) { return v.vote_status === 'not-vote'; }).length;
    var pending = allVoters.filter(function(v) { return v.vote_status === 'pending' || !v.vote_status; }).length;

    var metrics = [
        { name: 'Total Voters', count: total, pct: '100%' },
        { name: 'Reached', count: reached, pct: total ? Math.round((reached/total)*100) + '%' : '0%' },
        { name: 'Not Reached', count: notReached, pct: total ? Math.round((notReached/total)*100) + '%' : '0%' },
        { name: 'Will Vote', count: willVote, pct: total ? Math.round((willVote/total)*100) + '%' : '0%' },
        { name: 'Not Vote', count: notVote, pct: total ? Math.round((notVote/total)*100) + '%' : '0%' },
        { name: 'Pending', count: pending, pct: total ? Math.round((pending/total)*100) + '%' : '0%' },
    ];

    var html = '';
    for (var i = 0; i < metrics.length; i++) {
        var m = metrics[i];
        html += '<tr><td><strong>' + m.name + '</strong></td><td>' + m.count + '</td><td>' + m.pct + '</td></tr>';
    }
    tbody.innerHTML = html;
}

// ============================================
// NEWS SLIDER
// ============================================
function setupNewsSlider() {
    var prevBtn = document.getElementById('prevNewsBtn');
    var nextBtn = document.getElementById('nextNewsBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            changeSlide(-1);
            resetAutoSlide();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            changeSlide(1);
            resetAutoSlide();
        });
    }
    
    startAutoSlide();
}

function renderNewsSlider() {
    var slider = document.getElementById('newsSlider');
    var dotsContainer = document.getElementById('sliderDots');
    var countEl = document.getElementById('newsCount');
    
    var latestNews = newsItems.slice(0, 4);
    
    if (countEl) {
        countEl.textContent = latestNews.length + ' latest';
    }
    
    if (latestNews.length === 0) {
        slider.innerHTML = '<div class="loading">No news available</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < latestNews.length; i++) {
        var item = latestNews[i];
        var onclickAttr = ' onclick="handleNewsClick(this)" data-news=\'' + JSON.stringify(item).replace(/'/g, "&#39;") + '\'';
        var cursorStyle = 'cursor:pointer;';
        
        html += '<div class="news-slide"' + onclickAttr + ' style="' + cursorStyle + '">';
        html += '<div class="news-icon"><i class="fas ' + (item.icon || 'fa-newspaper') + '"></i></div>';
        html += '<div class="news-content">';
        html += '<div class="news-title">' + item.title + '</div>';
        html += '<div class="news-source">';
        html += '<i class="fas fa-source"></i> ' + (item.source || 'System');
        if (item.new) {
            html += ' <span style="background:#ef4444;color:white;padding:1px 8px;border-radius:12px;font-size:10px;margin-left:8px;">NEW</span>';
        }
        html += '</div></div></div>';
    }
    slider.innerHTML = html;
    
    var dotsHtml = '';
    for (var i = 0; i < latestNews.length; i++) {
        dotsHtml += '<div class="slider-dot' + (i === currentSlideIndex ? ' active' : '') + '" onclick="goToSlide(' + i + ')"></div>';
    }
    dotsContainer.innerHTML = dotsHtml;
    
    updateSlidePosition();
}

function changeSlide(direction) {
    var latestNews = newsItems.slice(0, 4);
    if (latestNews.length === 0) return;
    
    currentSlideIndex = (currentSlideIndex + direction + latestNews.length) % latestNews.length;
    updateSlidePosition();
}

function goToSlide(index) {
    currentSlideIndex = index;
    updateSlidePosition();
    resetAutoSlide();
}

function updateSlidePosition() {
    var slider = document.getElementById('newsSlider');
    var dots = document.querySelectorAll('.slider-dot');
    
    if (slider) {
        slider.style.transform = 'translateX(-' + (currentSlideIndex * 100) + '%)';
    }
    
    for (var i = 0; i < dots.length; i++) {
        if (i === currentSlideIndex) {
            dots[i].classList.add('active');
        } else {
            dots[i].classList.remove('active');
        }
    }
}

function startAutoSlide() {
    stopAutoSlide();
    slideInterval = setInterval(function() {
        changeSlide(1);
    }, 5000);
}

function stopAutoSlide() {
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
}

function resetAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
}

// ============================================
// RENDER NEWS
// ============================================
function renderNews() {
    var grid = document.getElementById('newsGrid');
    var countEl = document.getElementById('newsPageCount');
    
    if (countEl) {
        countEl.textContent = newsItems.length + ' articles';
    }
    
    if (newsItems.length === 0) {
        grid.innerHTML = '<div class="loading">No news available</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < newsItems.length; i++) {
        var item = newsItems[i];
        var onclickAttr = ' onclick="handleNewsClick(this)" data-news=\'' + JSON.stringify(item).replace(/'/g, "&#39;") + '\'';
        var cursorStyle = 'cursor:pointer;';
        
        html += '<div class="news-item"' + onclickAttr + ' style="' + cursorStyle + '">';
        html += '<div class="news-title">';
        html += '<i class="fas ' + (item.icon || 'fa-newspaper') + '" style="color:#3b82f6;margin-right:8px;"></i>';
        html += item.title;
        html += '</div>';
        html += '<div class="news-meta">';
        html += '<i class="fas fa-source"></i> ' + (item.source || 'System');
        if (item.new) {
            html += ' <span style="background:#ef4444;color:white;padding:1px 10px;border-radius:12px;font-size:10px;margin-left:8px;">NEW</span>';
        }
        html += ' <span style="color:#6b7a8f;font-size:11px;margin-left:8px;">↗ Click to view</span>';
        html += '</div></div>';
    }
    grid.innerHTML = html;
}

// ============================================
// MODAL - CLEAN VIEW ONLY (NO MOBILE UPDATES)
// ============================================
function setupModal() {
    var closeBtn = document.getElementById('modalClose');
    var closeBtn2 = document.getElementById('modalCloseBtn');
    var overlay = document.getElementById('modalOverlay');
    var form = document.getElementById('modalForm');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    if (closeBtn2) {
        closeBtn2.addEventListener('click', closeModal);
    }
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });
    }
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveVoter();
        });
    }
}

function openModal(id) {
    var voter = null;
    for (var i = 0; i < allVoters.length; i++) {
        if (allVoters[i].id === id) {
            voter = allVoters[i];
            break;
        }
    }
    if (!voter) return;

    currentEditingId = id;

    var photo = document.getElementById('modalPhoto');
    var photoUrl = voter.photo_url || '';
    
    if (photoUrl) {
        photo.innerHTML = '<img src="' + photoUrl + '" alt="' + (voter.name || 'Voter') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />';
    } else {
        photo.innerHTML = '<span class="placeholder" style="font-size:44px;">👤</span>';
    }

    document.getElementById('modalName').textContent = voter.name || 'Unknown';
    document.getElementById('modalId').textContent = 'ID ' + (voter.national_id || 'N/A');

    document.getElementById('modalHouse').textContent = voter.house || '—';
    document.getElementById('modalAge').textContent = voter.age || '—';
    document.getElementById('modalParty').textContent = voter.party || '—';
    document.getElementById('modalPhone').textContent = voter.phone || '—';
    document.getElementById('modalSex').textContent = voter.sex || '—';
    
    var voteStatus = voter.vote_status || 'pending';
    var statusMap = {
        'will-vote': '🗳️ Will Vote',
        'not-vote': '❌ Not Vote',
        'pending': '⏳ Pending'
    };
    document.getElementById('modalStatus').textContent = statusMap[voteStatus] || '⏳ Pending';

    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    currentEditingId = null;
}

// ============================================
// EXPORT
// ============================================
function exportData() {
    var headers = ['ID', 'Name', 'National ID', 'House', 'Phone', 'Sex', 'Age', 'Party',
                     'Vote Status', 'Reach Status', 'Remarks'];

    var csv = headers.join(',') + '\n';
    for (var i = 0; i < allVoters.length; i++) {
        var v = allVoters[i];
        var row = [
            v.id, v.name || '', v.national_id || '', v.house || '',
            v.phone || '', v.sex || '', v.age || '', v.party || '',
            v.vote_status || 'pending', v.reach_status || 'not-reached', v.remarks || ''
        ];
        csv += row.map(function(cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',') + '\n';
    }

    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'voters_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);

    showToast('📥 Export complete!');
}

// ============================================
// REFRESH
// ============================================
async function refreshData() {
    showToast('🔄 Refreshing data...', 'info');
    await loadData();
    await fetchNews();
    refreshAll();
    showToast('✅ Data refreshed!', 'success');
}

function refreshAll() {
    renderDashboard();
    renderVoters();
    renderHouses();
    renderAnalytics();
    renderNews();
    renderNewsSlider();
    if (settingsAuthenticated) {
        renderSettings();
    }
    updateBadges();
    updateTypeCounts();
    setupClickableCards();
}

window.refreshData = refreshData;
window.openModal = openModal;
window.navigateTo = navigateTo;
window.goToSlide = goToSlide;
window.filterVoterType = filterVoterType;
window.filterByHouse = filterByHouse;
window.exportData = exportData;
window.deleteVoterSettings = deleteVoterSettings;
window.clearAllData = clearAllData;
window.handleNewsClick = handleNewsClick;

// ============================================
// TOAST
// ============================================
function showToast(message, type) {
    if (type === undefined) type = 'success';
    
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<span>' + message + '</span>';
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        padding: '14px 24px',
        background: '#0f1724',
        color: 'white',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        zIndex: '9999',
        maxWidth: '400px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderLeft: '4px solid ' + (colors[type] || colors.success),
    });

    document.body.appendChild(toast);

    setTimeout(function() {
        toast.classList.add('toast-out');
        setTimeout(function() {
            toast.remove();
        }, 300);
    }, 3000);
}

// ============================================
// START
// ============================================
document.addEventListener('DOMContentLoaded', init);

console.log('✅ App script loaded successfully');