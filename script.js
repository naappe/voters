// -------------------- CONFIGURATION --------------------
const SUPABASE_URL = 'https://espezmdpkoixnfchomqb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1';

// Create Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -------------------- STATE --------------------
let allVoters = [];
let filteredVoters = [];
let currentPage = 1;
const pageSize = 50;
let sortColumn = 'id';
let sortDirection = 'asc';
let isLoading = false;

// DOM References
const tableBody = document.getElementById('voter-table-body');
const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-search');
const filterParty = document.getElementById('filter-party');
const filterGender = document.getElementById('filter-gender');
const filterAge = document.getElementById('filter-age');
const resultCount = document.getElementById('result-count');
const showingCount = document.getElementById('showing-count');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');

// Stats elements
const totalVotersEl = document.getElementById('total-voters');
const genderStatsEl = document.getElementById('gender-stats');
const partyCountEl = document.getElementById('party-count');
const ageStatsEl = document.getElementById('age-stats');

// -------------------- FETCH DATA (PAGINATED) --------------------
async function fetchVoters() {
    if (isLoading) return;
    isLoading = true;
    
    tableBody.innerHTML = '<tr><td colspan="8" class="loading">⏳ Loading voters...</td></tr>';

    try {
        console.log('🔄 Fetching ALL voters from Supabase (paginated)...');
        
        let allData = [];
        let page = 0;
        const pageSize = 1000; // Max per request
        let hasMore = true;
        
        // Loop until we have all records
        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            
            console.log(`📄 Fetching page ${page + 1} (rows ${from}-${to})...`);
            
            const { data, error } = await supabaseClient
                .from('people')
                .select('*')
                .range(from, to);
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allData = [...allData, ...data];
                console.log(`📦 Page ${page + 1}: got ${data.length} records (total: ${allData.length})`);
                
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        }

        allVoters = allData;
        filteredVoters = [...allVoters];
        
        console.log(`✅ LOADED ${allVoters.length} voters TOTAL!`);

        updateStats();
        populateFilters();
        renderTable();
        renderAnalysis();

    } catch (error) {
        console.error('❌ Error:', error);
        tableBody.innerHTML = `<tr><td colspan="8" class="error">❌ Failed to load data: ${error.message}</td></tr>`;
    } finally {
        isLoading = false;
    }
}

// -------------------- UPDATE STATS --------------------
function updateStats() {
    const total = allVoters.length;
    totalVotersEl.textContent = total;

    const males = allVoters.filter(v => v.sex?.toLowerCase() === 'male').length;
    const females = allVoters.filter(v => v.sex?.toLowerCase() === 'female').length;
    genderStatsEl.textContent = `M: ${males} | F: ${females}`;

    const parties = new Set(allVoters.map(v => v.party).filter(Boolean));
    partyCountEl.textContent = parties.size;

    const ages = allVoters.map(v => parseInt(v.age)).filter(a => !isNaN(a) && a > 0);
    const avgAge = ages.length ? Math.round(ages.reduce((a,b) => a+b, 0) / ages.length) : 0;
    ageStatsEl.textContent = `${avgAge} avg (${ages.length} reported)`;
}

// -------------------- POPULATE FILTERS --------------------
function populateFilters() {
    filterParty.innerHTML = '<option value="">All Parties</option>';
    const parties = [...new Set(allVoters.map(v => v.party).filter(Boolean))].sort();
    parties.forEach(party => {
        const opt = document.createElement('option');
        opt.value = party;
        opt.textContent = party;
        filterParty.appendChild(opt);
    });
}

// -------------------- FILTER & SEARCH --------------------
function getFilteredVoters() {
    const search = searchInput.value.toLowerCase().trim();
    const party = filterParty.value;
    const gender = filterGender.value;
    const ageRange = filterAge.value;

    return allVoters.filter(voter => {
        if (search) {
            const match = 
                (voter.name?.toLowerCase() || '').includes(search) ||
                (voter.national_id?.toLowerCase() || '').includes(search) ||
                (voter.house?.toLowerCase() || '').includes(search) ||
                (voter.phone?.toLowerCase() || '').includes(search);
            if (!match) return false;
        }
        if (party && voter.party !== party) return false;
        if (gender && voter.sex !== gender) return false;
        if (ageRange) {
            const age = parseInt(voter.age);
            if (isNaN(age)) return false;
            const [min, max] = ageRange.split('-').map(Number);
            if (max) {
                if (age < min || age > max) return false;
            } else {
                if (age < min) return false;
            }
        }
        return true;
    });
}

// -------------------- SORT --------------------
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    applyFiltersAndSort();
}

// -------------------- APPLY FILTERS & SORT --------------------
function applyFiltersAndSort() {
    filteredVoters = getFilteredVoters();
    
    filteredVoters.sort((a, b) => {
        let valA = a[sortColumn] || '';
        let valB = b[sortColumn] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (!isNaN(valA) && !isNaN(valB)) {
            valA = Number(valA);
            valB = Number(valB);
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    currentPage = 1;
    renderTable();
    updateResultCount();
    renderAnalysis();
}

// -------------------- RENDER TABLE --------------------
function renderTable() {
    const totalPages = Math.ceil(filteredVoters.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredVoters.length);
    const pageData = filteredVoters.slice(start, end);

    if (pageData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="no-data">😕 No voters found</td></tr>';
    } else {
        tableBody.innerHTML = pageData.map(voter => `
            <tr>
                <td>${voter.id}</td>
                <td><strong>${escapeHtml(voter.name) || 'N/A'}</strong></td>
                <td>${escapeHtml(voter.national_id) || 'N/A'}</td>
                <td>${escapeHtml(voter.house) || 'N/A'}</td>
                <td>${escapeHtml(voter.phone) || 'N/A'}</td>
                <td>${escapeHtml(voter.sex) || 'N/A'}</td>
                <td>${escapeHtml(voter.age) || 'N/A'}</td>
                <td><span class="party-tag">${escapeHtml(voter.party) || 'N/A'}</span></td>
            </tr>
        `).join('');
    }

    showingCount.textContent = `Showing ${start + 1}-${end} of ${filteredVoters.length} voters`;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

// -------------------- UPDATE RESULT COUNT --------------------
function updateResultCount() {
    resultCount.textContent = `Showing: ${filteredVoters.length} of ${allVoters.length} voters`;
}

// -------------------- RENDER ANALYSIS --------------------
function renderAnalysis() {
    const data = filteredVoters.length > 0 ? filteredVoters : allVoters;
    const grid = document.getElementById('analysis-grid');
    if (!grid) return;
    if (!data || data.length === 0) {
        grid.innerHTML = '<div class="analysis-item">No data available</div>';
        return;
    }

    const partyCounts = {};
    data.forEach(v => {
        const p = v.party || 'Unknown';
        partyCounts[p] = (partyCounts[p] || 0) + 1;
    });

    const sortedParties = Object.entries(partyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    grid.innerHTML = sortedParties.map(([party, count]) => `
        <div class="analysis-item">
            <div class="label">${escapeHtml(party)}</div>
            <div class="value">${count}</div>
            <div class="count">${Math.round(count / data.length * 100)}%</div>
        </div>
    `).join('') || '<div class="analysis-item">No data available</div>';
}

// -------------------- EXPORT CSV --------------------
function exportCSV() {
    if (filteredVoters.length === 0) {
        alert('No data to export!');
        return;
    }
    
    const headers = ['ID', 'Name', 'National ID', 'House', 'Phone', 'Gender', 'Age', 'Party'];
    const rows = filteredVoters.map(v => [
        v.id, v.name || '', v.national_id || '', v.house || '', 
        v.phone || '', v.sex || '', v.age || '', v.party || ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voters_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// -------------------- UTILITY --------------------
function escapeHtml(text) {
    if (!text) return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// -------------------- EVENT LISTENERS --------------------
searchInput.addEventListener('input', () => {
    clearBtn.style.display = searchInput.value ? 'block' : 'none';
    applyFiltersAndSort();
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    applyFiltersAndSort();
});

filterParty.addEventListener('change', applyFiltersAndSort);
filterGender.addEventListener('change', applyFiltersAndSort);
filterAge.addEventListener('change', applyFiltersAndSort);

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
});

nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredVoters.length / pageSize);
    if (currentPage < totalPages) { currentPage++; renderTable(); }
});

document.getElementById('export-csv')?.addEventListener('click', exportCSV);
document.getElementById('print-view')?.addEventListener('click', () => window.print());

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
    }
});

// -------------------- INIT --------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchVoters);
} else {
    fetchVoters();
}
