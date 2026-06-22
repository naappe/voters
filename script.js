// -------------------- CONFIGURATION --------------------
// Your Supabase URL and anon key (public) – safe to embed in frontend
const SUPABASE_URL = 'https://espezmdpkoixnfchomqb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T3YWqdZYy1rSla37qOWOmQ_1Dz43nUm';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Reference to the container
const listContainer = document.getElementById('people-list');

// -------------------- FETCH DATA --------------------
async function fetchPeople() {
    // Show loading state
    listContainer.innerHTML = '<div class="loading">⏳ Loading people…</div>';

    try {
        // Query the 'people' table – select all columns
        const { data, error } = await supabase
            .from('people')
            .select('*');

        if (error) throw error;

        // If no data returned
        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div class="no-data">😕 No people found in the database.</div>';
            return;
        }

        // Render the cards
        renderPeople(data);

    } catch (error) {
        console.error('Fetch error:', error);
        listContainer.innerHTML = `
            <div class="error">
                ❌ Failed to load data: ${error.message}
                <br><small>Check console for details.</small>
            </div>
        `;
    }
}

// -------------------- RENDER CARDS --------------------
function renderPeople(people) {
    // Clear the container
    listContainer.innerHTML = '';

    // Loop through each person and build a card
    people.forEach(person => {
        const card = document.createElement('div');
        card.className = 'card';

        // Create the inner HTML
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
