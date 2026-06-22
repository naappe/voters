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
let selectedVoterId = null;

// DOM References
const tableBody = document.getElementById('voter-table-body');
const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-search');
const filterParty = document.getElementById('filter-party');
const filterGender = document.getElementById('filter-gender');
const filterAge = document.getElementById('filter-age');
const filterVisitStatus = document.getElementById('filter-visit-status');
const filterVoteIntention = document.getElementById('filter-vote-intention');
const resultCount = document.getElementById('result-count');
const showingCount = document.getElementById('showing-count');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');

// Stats elements
const totalVotersEl = document.getElementById('total-voters');
const reachedCountEl = document.getElementById('reached-count');
const notReachedCountEl = document.getElementById('not-reached-count');
const reachRateEl = document.getElementById('reach-rate');
const willVoteCountEl = document.getElementById('will-vote-count');
const winPredictionEl = document.getElementById('win-prediction');

// Progress elements
const progressReached = document.getElementById('progress-reached');
const progressTotal = document.getElementById('progress-total');
const progressPercentage = document.getElementById('progress-percentage');
const progressNeeded = document.getElementById('progress-needed');
const progressBar = document.getElementById('progress-bar');
const progressBarText = document.getElementById('progress-bar-text');
const progressMessage = document.getElementById('progress-message');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.status-dot');

// Formula elements
const formulaReached = document.getElementById('formula-reached');
const formulaTarget = document.getElementById('formula-target');
const formulaSupporters = document.getElementById('formula-supporters');
const formulaSupportRate = document.getElementById('formula-support-rate');
const formulaWinChance = document.getElementById('formula-win-chance');
const formulaStatus = document.getElementById('formula-status');

// Modal elements
const modal = document.getElementById('voter-modal');
const modalName = document.getElementById('modal-name');
const modalId = document.getElementById('modal-id');
const modalVisitStatus = document.getElementById('modal-visit-status');
const modalVoteIntention = document.getElementById('modal-vote-intention');
const modalRemarks = document.getElementById('modal-remarks');
const modalLastVisited = document.getElementById('modal-last-visited');
const modalVisitedBy = document.getElementById('modal-visited-by');
const modalClose = document.getElementById('modal-close');
const modalSave = document.getElementById('modal-save');

// -------------------- FETCH DATA (PAGINATED) --------------------
async function fetchVoters() {
    if (isLoading) return;
    isLoading = true;
    
    tableBody.innerHTML = '<tr><td colspan="10" class="loading">⏳ Loading voters...</td></tr>';

    try {
        console.log('🔄 Fetching ALL voters from Supabase (paginated)...');
        
        let allData = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            
            const { data, error } = await supabaseClient
                .from('people')
                .select('*')
                .range(from, to);
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allData = [...allData, ...data];
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

        updateAllStats();
        populateFilters();
        renderTable();
        renderAnalysis();

    } catch (error) {
        console.error('❌ Error:', error);
        tableBody.innerHTML = `<tr><td colspan="10" class="error">❌ Failed to load data: ${error.message}</td></tr>`;
    } finally {
        isLoading = false;
    }
}

// -------------------- UPDATE ALL STATS --------------------
function updateAllStats() {
    updateStats();
    updateCampaignProgress();
    updateWinPredictionFormula();
    updateHouseAnalysis();
}

function updateStats() {
    const total = allVoters.length;
    totalVotersEl.textContent = total;

    const reached = allVoters.filter(v => v.visit_status === 'Reached').length;
    const notReached = allVoters.filter(v => v.visit_status === 'Not Reached').length;
    
    reachedCountEl.textContent = reached;
    notReachedCountEl.textContent = notReached;
    
    const reachRate = total > 0 ? Math.round((reached / total) * 100) : 0;
    reachRateEl.textContent = `${reachRate}%`;

    const willVote = allVoters.filter(v => v.vote_intention === 'Will Vote').length;
    willVoteCountEl.textContent = willVote;

    // Win prediction: based on total voters who will vote
    const winPrediction = total > 0 ? Math.round((willVote / total) * 100) : 0;
    winPredictionEl.textContent = `${winPrediction}%`;
}

// -------------------- CAMPAIGN PROGRESS --------------------
function updateCampaignProgress() {
    const total = allVoters.length;
    const reached = allVoters.filter(v => v.visit_status === 'Reached').length;
    const willVote = allVoters.filter(v => v.vote_intention === 'Will Vote').length;
    
    const reachRate = total > 0 ? Math.round((reached / total) * 100) : 0;
    const neededToWin = Math.ceil(total * 0.5); // 50% of total needed to win
    const remainingNeeded = Math.max(0, neededToWin - willVote);
    
    // Update progress stats
    progressReached.textContent = reached;
    progressTotal.textContent = total;
    progressPercentage.textContent = `${reachRate}%`;
    progressNeeded.textContent = remainingNeeded;
    
    // Update progress bar
    const percentage = Math.min(reachRate, 100);
    progressBar.style.width = `${percentage}%`;
    progressBarText.textContent = `${percentage}% reached`;
    
    // Update status
    let status = '';
    let statusClass = '';
    let message = '';
    let icon = '<i class="fas fa-info-circle"></i>';
    
    if (reachRate === 0) {
        status = 'Not Started';
        statusClass = 'danger';
        message = 'Start your door-to-door campaign to reach voters!';
        icon = '<i class="fas fa-bullhorn"></i>';
    } else if (willVote >= neededToWin) {
        status = '🏆 Winning!';
        statusClass = 'active';
        message = `🎉 You have ${willVote} confirmed supporters! You're winning!`;
        icon = '<i class="fas fa-trophy"></i>';
    } else if (reachRate < 50) {
        status = 'In Progress';
        statusClass = 'warning';
        message = `📢 Reached ${reached} voters (${reachRate}%). Need ${remainingNeeded} more to win. Keep going!`;
        icon = '<i class="fas fa-bullseye"></i>';
    } else {
        status = 'Almost There!';
        statusClass = 'active';
        message = `🔥 Great progress! ${remainingNeeded} more supporters needed to win.`;
        icon = '<i class="fas fa-fire"></i>';
    }
    
    statusText.textContent = status;
    statusDot.className = `status-dot ${statusClass}`;
    progressMessage.innerHTML = `${icon} <span>${message}</span>`;
}

// -------------------- WIN PREDICTION FORMULA --------------------
function updateWinPredictionFormula() {
    const total = allVoters.length;
    const reached = allVoters.filter(v => v.visit_status === 'Reached').length;
    const willVote = allVoters.filter(v => v.vote_intention === 'Will Vote').length;
    
    const neededToWin = Math.ceil(total * 0.5);
    const reachRate = total > 0 ? Math.round((reached / total) * 100) : 0;
    const supporterRate = reached > 0 ? Math.round((willVote / reached) * 100) : 0;
    const winChance = total > 0 ? Math.round((willVote / total) * 100) : 0;
    
    // Formula steps
    formulaReached.textContent = reached;
    formulaTarget.textContent = neededToWin;
    formulaSupporters.textContent = willVote;
    formulaSupportRate.textContent = `${supporterRate}%`;
    formulaWinChance.textContent = `${winChance}%`;
    
    // Status message
    let status = '';
    if (willVote >= neededToWin) {
        status = '🏆 WINNER!';
    } else if (winChance >= 40) {
        status = '📈 Strong Chance';
    } else if (winChance >= 20) {
        status = '📊 On Track';
    } else if (winChance > 0) {
        status = '⚠️ Need More Support';
    } else {
        status = '🔄 Not Started';
    }
    formulaStatus.textContent = status;
}

// -------------------- HOUSE ANALYSIS --------------------
function updateHouseAnalysis() {
    const grid = document.getElementById('house-grid');
    if (!grid) return;
    
    const houseCounts = {};
    allVoters.forEach(v => {
        const house = v.house || 'Unknown';
        houseCounts[house] = (houseCounts[house] || 0) + 1;
    });
    
    const sortedHouses = Object.entries(houseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);
    
    if (sortedHouses.length === 0) {
        grid.innerHTML = '<div class="house-card"><span class="house-name">No house data available</span></div>';
        return;
    }
    
    grid.innerHTML = sortedHouses.map(([house, count]) => `
        <div class="house-card">
            <span class="house-name">${escapeHtml(house)}</span>
            <span class="house-count">${count} voters</span>
        </div>
    `).join('');
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

    filterVisitStatus.innerHTML = `
        <option value="">All Visit Status</option>
        <option value="Not Visited">Not Visited</option>
        <option value="Reached">✅ Reached</option>
        <option value="Not Reached">❌ Not Reached</option>
    `;

    filterVoteIntention.innerHTML = `
        <option value="">All Intentions</option>
        <option value="Unknown">Unknown</option>
        <option value="Will Vote">👍 Will Vote</option>
        <option value="Won't Vote">👎 Won't Vote</option>
        <option value="Undecided">🤔 Undecided</option>
    `;
}

// -------------------- FILTER & SEARCH --------------------
function getFilteredVoters() {
    const search = searchInput.value.toLowerCase().trim();
    const party = filterParty.value;
    const gender = filterGender.value;
    const ageRange = filterAge.value;
    const visitStatus = filterVisitStatus.value;
    const voteIntention = filterVoteIntention.value;

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
        if (visitStatus && voter.visit_status !== visitStatus) return false;
        if (voteIntention && voter.vote_intention !== voteIntention) return false;
        
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
        tableBody.innerHTML = '<tr><td colspan="10" class="no-data">😕 No voters found</td></tr>';
    } else {
        tableBody.innerHTML = pageData.map(voter => `
            <tr onclick="openModal(${voter.id})" style="cursor:pointer;">
                <td>${voter.id}</td>
                <td><strong>${escapeHtml(voter.name) || 'N/A'}</strong></td>
                <td>${escapeHtml(voter.national_id) || 'N/A'}</td>
                <td>${escapeHtml(voter.house) || 'N/A'}</td>
                <td>${escapeHtml(voter.phone) || 'N/A'}</td>
                <td>${escapeHtml(voter.sex) || 'N/A'}</td>
                <td>${escapeHtml(voter.age) || 'N/A'}</td>
                <td><span class="party-tag">${escapeHtml(voter.party) || 'N/A'}</span></td>
                <td><span class="status-tag ${(voter.visit_status || 'not-visited').toLowerCase().replace(' ', '-')}">${escapeHtml(voter.visit_status) || 'Not Visited'}</span></td>
                <td><span class="intention-tag ${(voter.vote_intention || 'unknown').toLowerCase().replace(' ', '-').replace("'", '')}">${escapeHtml(voter.vote_intention) || 'Unknown'}</span></td>
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

// -------------------- MODAL FUNCTIONS --------------------
function openModal(id) {
    const voter = allVoters.find(v => v.id === id);
    if (!voter) return;
    
    selectedVoterId = id;
    
    modalName.textContent = voter.name || 'Unnamed';
    modalId.textContent = voter.id;
    modalVisitStatus.value = voter.visit_status || 'Not Visited';
    modalVoteIntention.value = voter.vote_intention || 'Unknown';
    modalRemarks.value = voter.visit_remarks || '';
    modalLastVisited.textContent = voter.last_visited ? new Date(voter.last_visited).toLocaleString() : 'Never';
    modalVisitedBy.textContent = voter.visited_by || 'Not assigned';
    
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
    selectedVoterId = null;
}

async function saveVoter() {
    if (!selectedVoterId) return;
    
    const voter = allVoters.find(v => v.id === selectedVoterId);
    if (!voter) return;
    
    const updateData = {
        visit_status: modalVisitStatus.value,
        vote_intention: modalVoteIntention.value,
        visit_remarks: modalRemarks.value || null,
        last_visited: new Date().toISOString(),
        visited_by: 'Field Worker'
    };
    
    try {
        modalSave.textContent = 'Saving...';
        modalSave.disabled = true;
        
        const { error } = await supabaseClient
            .from('people')
            .update(updateData)
            .eq('id', selectedVoterId);
        
        if (error) throw error;
        
        Object.assign(voter, updateData);
        
        updateAllStats();
        renderTable();
        renderAnalysis();
        
        modalLastVisited.textContent = new Date().toLocaleString();
        modalVisitedBy.textContent = 'Field Worker';
        
        modalSave.textContent = '✅ Saved!';
        setTimeout(() => {
            modalSave.textContent = 'Save Changes';
        }, 1500);
        
        closeModal();
        
    } catch (error) {
        console.error('❌ Update error:', error);
        alert(`❌ Failed to update: ${error.message}`);
        modalSave.textContent = 'Save Changes';
        modalSave.disabled = false;
    }
}

// Make functions globally accessible
window.openModal = openModal;
window.closeModal = closeModal;
window.saveVoter = saveVoter;
window.sortTable = sortTable;

// -------------------- EXPORT CSV --------------------
function exportCSV() {
    if (filteredVoters.length === 0) {
        alert('No data to export!');
        return;
    }
    
    const headers = ['ID', 'Name', 'National ID', 'House', 'Phone', 'Gender', 'Age', 'Party', 'Visit Status', 'Vote Intention', 'Remarks', 'Last Visited', 'Visited By'];
    const rows = filteredVoters.map(v => [
        v.id, v.name || '', v.national_id || '', v.house || '', 
        v.phone || '', v.sex || '', v.age || '', v.party || '',
        v.visit_status || 'Not Visited',
        v.vote_intention || 'Unknown',
        v.visit_remarks || '',
        v.last_visited ? new Date(v.last_visited).toLocaleString() : '',
        v.visited_by || ''
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
filterVisitStatus.addEventListener('change', applyFiltersAndSort);
filterVoteIntention.addEventListener('change', applyFiltersAndSort);

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
});

nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredVoters.length / pageSize);
    if (currentPage < totalPages) { currentPage++; renderTable(); }
});

modalClose.addEventListener('click', closeModal);
modalSave.addEventListener('click', saveVoter);

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
    }
});

document.getElementById('export-csv')?.addEventListener('click', exportCSV);
document.getElementById('print-view')?.addEventListener('click', () => window.print());

// -------------------- INIT --------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchVoters);
} else {
    fetchVoters();
}
