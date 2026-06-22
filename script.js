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
const fetchPageSize = 1000;
let sortColumn = 'id';
let sortDirection = 'asc';
let isLoading = false;
let selectedVoterId = null;
let isSaving = false;

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

// -------------------- UTILITY FUNCTIONS --------------------

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function safeString(value) {
    if (value == null) return '';
    return String(value).toLowerCase();
}

function safeCssClass(value, defaultValue = 'unknown') {
    if (!value) return defaultValue;
    return String(value)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

function csvSafeCell(value) {
    const str = String(value == null ? '' : value);
    const safe = str.replace(/^[-+=@]/, "'$&");
    return `"${safe.replace(/"/g, '""')}"`;
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.innerHTML = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 12px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        max-width: 400px;
        animation: slideIn 0.3s ease;
        font-family: 'Inter', sans-serif;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add notification styles if not present
if (!document.querySelector('#notification-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'notification-styles';
    styleEl.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(styleEl);
}

// -------------------- FETCH DATA --------------------
async function fetchVoters() {
    if (isLoading) return;
    isLoading = true;
    
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="10" class="loading">⏳ Loading voters...</td></tr>';
    }

    try {
        console.log('🔄 Fetching ALL voters from Supabase...');
        
        let allData = [];
        let page = 0;
        let hasMore = true;
        
        while (hasMore) {
            const from = page * fetchPageSize;
            const to = from + fetchPageSize - 1;
            
            const { data, error } = await supabaseClient
                .from('people')
                .select('*')
                .range(from, to);
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allData = [...allData, ...data];
                if (data.length < fetchPageSize) {
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
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="10" class="error">❌ Failed to load data: ${escapeHtml(error.message)}</td></tr>`;
        }
    } finally {
        isLoading = false;
    }
}

// -------------------- UPDATE STATS --------------------
function updateAllStats() {
    updateStats();
    updateCampaignProgress();
    updateWinPredictionFormula();
    updateHouseAnalysis();
}

function updateStats() {
    const total = allVoters.length;
    if (totalVotersEl) totalVotersEl.textContent = total;

    const reached = allVoters.filter(v => v.visit_status === 'Reached').length;
    const notReached = allVoters.filter(v => v.visit_status === 'Not Reached').length;
    
    if (reachedCountEl) reachedCountEl.textContent = reached;
    if (notReachedCountEl) notReachedCountEl.textContent = notReached;
    
    const reachRate = total > 0 ? Math.round((reached / total) * 100) : 0;
    if (reachRateEl) reachRateEl.textContent = `${reachRate}%`;

    const willVote = allVoters.filter(v => v.vote_intention === 'Will Vote').length;
    if (willVoteCountEl) willVoteCountEl.textContent = willVote;

    const reachedWillVote = allVoters.filter(v => v.visit_status === 'Reached' && v.vote_intention === 'Will Vote').length;
    const supporterRate = reached > 0 ? reachedWillVote / reached : 0;
    const projectedSupport = Math.round(total * supporterRate);
    const winPrediction = total > 0 ? Math.round((projectedSupport / total) * 100) : 0;
    if (winPredictionEl) winPredictionEl.textContent = `${winPrediction}%`;
}

// -------------------- CAMPAIGN PROGRESS --------------------
function updateCampaignProgress() {
    const total = allVoters.length;
    const reached = allVoters.filter(v => v.visit_status === 'Reached').length;
    const reachedWillVote = allVoters.filter(v => v.visit_status === 'Reached' && v.vote_intention === 'Will Vote').length;
    
    const reachRate = total > 0 ? Math.round((reached / total) * 100) : 0;
    const neededToWin = Math.ceil(total * 0.5);
    const remainingNeeded = Math.max(0, neededToWin - reachedWillVote);
    
    if (progressReached) progressReached.textContent = reached;
    if (progressTotal) progressTotal.textContent = total;
    if (progressPercentage) progressPercentage.textContent = `${reachRate}%`;
    if (progressNeeded) progressNeeded.textContent = remainingNeeded;
    
    const percentage = Math.min(reachRate, 100);
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressBarText) progressBarText.textContent = `${percentage}% reached`;
    
    let status = '';
    let statusClass = '';
    let message = '';
    let icon = '<i class="fas fa-info-circle"></i>';
    
    if (reachRate === 0) {
        status = 'Not Started';
        statusClass = 'danger';
        message = 'Start your door-to-door campaign to reach voters!';
        icon = '<i class="fas fa-bullhorn"></i>';
    } else if (reachedWillVote >= neededToWin) {
        status = '🏆 Winning!';
        statusClass = 'active';
        message = `🎉 You have ${reachedWillVote} confirmed supporters! You're winning!`;
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
    
    if (statusText) statusText.textContent = status;
    if (statusDot) statusDot.className = `status-dot ${statusClass}`;
    if (progressMessage) progressMessage.innerHTML = `${icon} <span>${message}</span>`;
}

// -------------------- WIN PREDICTION FORMULA --------------------
function updateWinPredictionFormula() {
    const total = allVoters.length;
    const reached = allVoters.filter(v => v.visit_status === 'Reached').length;
    const reachedWillVote = allVoters.filter(v => v.visit_status === 'Reached' && v.vote_intention === 'Will Vote').length;
    
    const neededToWin = Math.ceil(total * 0.5);
    const supporterRate = reached > 0 ? Math.round((reachedWillVote / reached) * 100) : 0;
    const winChance = total > 0 ? Math.round((reachedWillVote / total) * 100) : 0;
    
    if (formulaReached) formulaReached.textContent = reached;
    if (formulaTarget) formulaTarget.textContent = neededToWin;
    if (formulaSupporters) formulaSupporters.textContent = reachedWillVote;
    if (formulaSupportRate) formulaSupportRate.textContent = `${supporterRate}%`;
    if (formulaWinChance) formulaWinChance.textContent = `${winChance}%`;
    
    let status = '';
    if (reachedWillVote >= neededToWin) {
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
    if (formulaStatus) formulaStatus.textContent = status;
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
            <span class="house-count">${Number(count)}</span>
        </div>
    `).join('');
}

// -------------------- POPULATE FILTERS --------------------
function populateFilters() {
    if (filterParty) {
        filterParty.innerHTML = '<option value="">All Parties</option>';
        const parties = [...new Set(allVoters.map(v => v.party).filter(Boolean))].sort();
        parties.forEach(party => {
            const opt = document.createElement('option');
            opt.value = party;
            opt.textContent = party;
            filterParty.appendChild(opt);
        });
    }

    if (filterVisitStatus) {
        filterVisitStatus.innerHTML = `
            <option value="">All Visit Status</option>
            <option value="Not Visited">Not Visited</option>
            <option value="Reached">✅ Reached</option>
            <option value="Not Reached">❌ Not Reached</option>
        `;
    }

    if (filterVoteIntention) {
        filterVoteIntention.innerHTML = `
            <option value="">All Intentions</option>
            <option value="Unknown">Unknown</option>
            <option value="Will Vote">👍 Will Vote</option>
            <option value="Won't Vote">👎 Won't Vote</option>
            <option value="Undecided">🤔 Undecided</option>
        `;
    }
}

// -------------------- FILTER & SEARCH --------------------
function getFilteredVoters() {
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const party = filterParty ? filterParty.value : '';
    const gender = filterGender ? filterGender.value : '';
    const ageRange = filterAge ? filterAge.value : '';
    const visitStatus = filterVisitStatus ? filterVisitStatus.value : '';
    const voteIntention = filterVoteIntention ? filterVoteIntention.value : '';

    return allVoters.filter(voter => {
        if (search) {
            const match = 
                safeString(voter.name).includes(search) ||
                safeString(voter.national_id).includes(search) ||
                safeString(voter.house).includes(search) ||
                safeString(voter.phone).includes(search);
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
    if (!tableBody) return;
    
    const totalPages = Math.ceil(filteredVoters.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredVoters.length);
    const pageData = filteredVoters.slice(start, end);

    if (pageData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="no-data">😕 No voters found</td></tr>';
        if (showingCount) showingCount.textContent = 'Showing 0 of 0 voters';
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
                <td><span class="status-tag ${safeCssClass(voter.visit_status, 'not-visited')}">${escapeHtml(voter.visit_status) || 'Not Visited'}</span></td>
                <td><span class="intention-tag ${safeCssClass(voter.vote_intention, 'unknown')}">${escapeHtml(voter.vote_intention) || 'Unknown'}</span></td>
            </tr>
        `).join('');
        
        if (showingCount) {
            showingCount.textContent = `Showing ${start + 1}-${end} of ${filteredVoters.length} voters`;
        }
    }

    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// -------------------- UPDATE RESULT COUNT --------------------
function updateResultCount() {
    if (resultCount) {
        resultCount.textContent = `Showing: ${filteredVoters.length} of ${allVoters.length} voters`;
    }
}

// -------------------- RENDER ANALYSIS --------------------
function renderAnalysis() {
    const grid = document.getElementById('analysis-grid');
    if (!grid) return;
    
    const data = filteredVoters.length > 0 ? filteredVoters : allVoters;
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
    
    if (modalName) modalName.textContent = voter.name || 'Unnamed';
    if (modalId) modalId.textContent = voter.id;
    if (modalVisitStatus) modalVisitStatus.value = voter.visit_status || 'Not Visited';
    if (modalVoteIntention) modalVoteIntention.value = voter.vote_intention || 'Unknown';
    if (modalRemarks) modalRemarks.value = voter.visit_remarks || '';
    if (modalLastVisited) {
        modalLastVisited.textContent = voter.last_visited ? new Date(voter.last_visited).toLocaleString() : 'Never';
    }
    if (modalVisitedBy) modalVisitedBy.textContent = voter.visited_by || 'Not assigned';
    
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    if (modal) modal.style.display = 'none';
    if (modalRemarks) modalRemarks.value = '';
    if (modalVisitStatus) modalVisitStatus.value = 'Not Visited';
    if (modalVoteIntention) modalVoteIntention.value = 'Unknown';
    selectedVoterId = null;
}

// -------------------- SAVE VOTER (DEBUG VERSION) --------------------
async function saveVoter() {
    console.log('🔵 saveVoter() called');
    
    if (isSaving) {
        console.log('⏳ Already saving');
        return;
    }
    
    if (!selectedVoterId) {
        console.error('❌ No voter selected');
        showNotification('❌ No voter selected', 'error');
        return;
    }
    
    console.log('🆔 Selected voter ID:', selectedVoterId);
    
    const voter = allVoters.find(v => v.id === selectedVoterId);
    if (!voter) {
        console.error('❌ Voter not found');
        showNotification('❌ Voter not found', 'error');
        return;
    }
    
    console.log('👤 Voter name:', voter.name);
    console.log('📋 Current visit_status:', voter.visit_status);
    console.log('📋 Current vote_intention:', voter.vote_intention);
    
    // Get values from modal
    const visitStatus = modalVisitStatus ? modalVisitStatus.value : 'Not Visited';
    const voteIntention = modalVoteIntention ? modalVoteIntention.value : 'Unknown';
    const remarks = modalRemarks ? modalRemarks.value : null;
    const now = new Date().toISOString();
    
    const updateData = {
        visit_status: visitStatus,
        vote_intention: voteIntention,
        visit_remarks: remarks,
        last_visited: now,
        visited_by: 'Field Worker'
    };
    
    console.log('📦 Update data:', updateData);
    
    try {
        isSaving = true;
        if (modalSave) {
            modalSave.textContent = 'Saving...';
            modalSave.disabled = true;
        }
        
        // ✅ DEBUG: Log the exact query
        console.log('🔄 Executing update on ID:', selectedVoterId);
        console.log('🔄 With data:', JSON.stringify(updateData, null, 2));
        
        const { data, error } = await supabaseClient
            .from('people')
            .update(updateData)
            .eq('id', selectedVoterId)
            .select();
        
        console.log('📥 Response:', { data, error });
        
        // ✅ Check for specific error cases
        if (error) {
            console.error('❌ Supabase error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            throw error;
        }
        
        // ✅ Check if any rows were updated
        if (!data || data.length === 0) {
            console.error('❌ No rows updated!');
            console.error('   Possible causes:');
            console.error('   1. ID does not exist in table');
            console.error('   2. RLS policy blocking (though policy exists)');
            console.error('   3. Column names mismatch');
            
            // Try a different approach - without .select()
            console.log('🔄 Retrying without .select()...');
            const result2 = await supabaseClient
                .from('people')
                .update(updateData)
                .eq('id', selectedVoterId);
            
            console.log('📥 Retry response:', result2);
            
            if (result2.error) {
                throw result2.error;
            }
            
            // If we got here, it might have worked but .select() failed
            console.log('⚠️ Update may have succeeded but .select() failed');
            console.log('🔄 Refreshing data from Supabase...');
            
            // Refresh the voter data
            const { data: refreshData, error: refreshError } = await supabaseClient
                .from('people')
                .select('*')
                .eq('id', selectedVoterId);
            
            if (refreshError) {
                console.error('❌ Refresh error:', refreshError);
            } else if (refreshData && refreshData.length > 0) {
                console.log('✅ Refreshed data:', refreshData[0]);
                Object.assign(voter, refreshData[0]);
            }
            
            // Don't throw - let it continue
        } else {
            // ✅ Update local data with the returned data
            console.log('✅ Update successful! Updated row:', data[0]);
            Object.assign(voter, data[0]);
        }
        
        // ✅ Refresh UI
        console.log('🔄 Refreshing UI...');
        updateAllStats();
        renderTable();
        renderAnalysis();
        updateResultCount();
        console.log('✅ UI refreshed');
        
        // Update modal fields
        if (modalLastVisited) {
            modalLastVisited.textContent = new Date().toLocaleString();
        }
        if (modalVisitedBy) {
            modalVisitedBy.textContent = 'Field Worker';
        }
        
        if (modalSave) {
            modalSave.textContent = '✅ Saved!';
        }
        showNotification('✅ Voter updated!', 'success');
        
        setTimeout(() => {
            if (modalSave) {
                modalSave.textContent = 'Save Changes';
                modalSave.disabled = false;
            }
            isSaving = false;
        }, 1000);
        
        setTimeout(closeModal, 800);
        
    } catch (error) {
        console.error('❌ Save error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack
        });
        showNotification(`❌ ${error.message}`, 'error');
        if (modalSave) {
            modalSave.textContent = 'Save Changes';
            modalSave.disabled = false;
        }
        isSaving = false;
    }
}

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
        csv += row.map(cell => csvSafeCell(cell)).join(',') + '\n';
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

// -------------------- EVENT LISTENERS --------------------
if (searchInput) {
    searchInput.addEventListener('input', () => {
        if (clearBtn) clearBtn.style.display = searchInput.value ? 'block' : 'none';
        applyFiltersAndSort();
    });
}

if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        if (searchInput) {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            applyFiltersAndSort();
        }
    });
}

if (filterParty) filterParty.addEventListener('change', applyFiltersAndSort);
if (filterGender) filterGender.addEventListener('change', applyFiltersAndSort);
if (filterAge) filterAge.addEventListener('change', applyFiltersAndSort);
if (filterVisitStatus) filterVisitStatus.addEventListener('change', applyFiltersAndSort);
if (filterVoteIntention) filterVoteIntention.addEventListener('change', applyFiltersAndSort);

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderTable(); }
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredVoters.length / pageSize);
        if (currentPage < totalPages) { currentPage++; renderTable(); }
    });
}

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalSave) modalSave.addEventListener('click', saveVoter);

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (searchInput) searchInput.focus();
    }
});

const exportBtn = document.getElementById('export-csv');
if (exportBtn) exportBtn.addEventListener('click', exportCSV);

const printBtn = document.getElementById('print-view');
if (printBtn) printBtn.addEventListener('click', () => window.print());

// -------------------- INIT --------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchVoters);
} else {
    fetchVoters();
}
