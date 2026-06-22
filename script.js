// -------------------- CONFIGURATION --------------------
const SUPABASE_URL = 'https://espezmdpkoixnfchomqb.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1';

// Initialize the Supabase client with explicit headers
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    },
    headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
});

// Reference to the container
const listContainer = document.getElementById('people-list');

// -------------------- FETCH DATA --------------------
async function fetchPeople() {
    listContainer.innerHTML = '<div class="loading">⏳ Loading people…</div>';

    try {
        console.log('🔍 Connecting to Supabase...');
        console.log('URL:', SUPABASE_URL);
        console.log('Table: people');

        const { data, error } = await supabase
            .from('people')
            .select('*');

        console.log('📦 Raw response:', { data, error });

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.log('ℹ️ No data returned');
            listContainer.innerHTML = '<div class="no-data">😕 No people found in the database.</div>';
            return;
        }

        console.log('✅ Found', data.length, 'records');
        renderPeople(data);

    } catch (error) {
        console.error('💥 Full error:', error);
        listContainer.innerHTML = `
            <div class="error">
                ❌ Failed to load data: ${error.message}
                <br><small>Check console (F12) for details.</small>
            </div>
        `;
    }
}

// -------------------- RENDER CARDS --------------------
function renderPeople(people) {
    listContainer.innerHTML = '';

    people.forEach(person => {
        const card = document.createElement('div');
        card.className = 'card';

        card.innerHTML = `
            <h3>${escapeHtml(person.name) || 'Unnamed'}</h3>
            <p><span class="label">ID</span><span class="value">${person.id}</span></p>
            <p><span class="label">National ID</span><span class="value">${escapeHtml(person.national_id) || 'N/A'}</span></p>
            <p><span class="label">House</span><span class="value">${escapeHtml(person.house) || 'N/A'}</span></p>
            <p><span class="label">Phone</span><span class="value">${escapeHtml(person.phone) || 'N/A'}</span></p>
            <p><span class="label">Sex</span><span class="value">${escapeHtml(person.sex) || 'N/A'}</span></p>
            <p><span class="label">Age</span><span class="value">${escapeHtml(person.age) || 'N/A'}</span></p>
            <p><span class="label">Party</span><span class="value">${escapeHtml(person.party) || 'N/A'}</span></p>
            ${person.photo ? `<img src="${escapeHtml(person.photo)}" alt="Photo of ${escapeHtml(person.name)}" />` : ''}
        `;

        listContainer.appendChild(card);
    });
}

// -------------------- UTILITY: Escape HTML to prevent XSS --------------------
function escapeHtml(text) {
    if (!text) return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// -------------------- RUN THE APP --------------------
fetchPeople();
