// --------------------- CONFIGURATION ---------------------
// REPLACE these with YOUR values from Supabase Dashboard -> Settings -> API
const SUPABASE_URL = 'https://espezmdpkoixnfchomqb.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE'; // <-- COPY YOUR ANON KEY!

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --------------------- FETCH DATA ---------------------
async function fetchPeople() {
    const listContainer = document.getElementById('people-list');

    try {
        // Query the 'people' table and select all columns
        const { data, error } = await supabase
            .from('people')
            .select('*');

        if (error) throw error;

        // If no data found
        if (!data || data.length === 0) {
            listContainer.innerHTML = '<p class="error">No people found in the database.</p>';
            return;
        }

        // Render the data as cards
        renderPeople(data, listContainer);

    } catch (error) {
        console.error('Fetch error:', error);
        listContainer.innerHTML = `<p class="error">❌ Failed to load data: ${error.message}</p>`;
    }
}

// --------------------- RENDER CARDS ---------------------
function renderPeople(people, container) {
    container.innerHTML = ''; // Clear "Loading..."

    people.forEach(person => {
        const card = document.createElement('div');
        card.className = 'card';

        // Build the card content
        card.innerHTML = `
            <h3>${person.name || 'Unnamed'}</h3>
            <p><span class="label">ID:</span> ${person.id}</p>
            <p><span class="label">National ID:</span> ${person.national_id || 'N/A'}</p>
            <p><span class="label">House:</span> ${person.house || 'N/A'}</p>
            <p><span class="label">Phone:</span> ${person.phone || 'N/A'}</p>
            <p><span class="label">Sex:</span> ${person.sex || 'N/A'}</p>
            <p><span class="label">Age:</span> ${person.age || 'N/A'}</p>
            <p><span class="label">Party:</span> ${person.party || 'N/A'}</p>
            ${person.photo ? `<img src="${person.photo}" alt="Photo" style="max-width:100px; margin-top:10px; border-radius:8px;">` : ''}
        `;

        container.appendChild(card);
    });
}

// --------------------- RUN IT ---------------------
fetchPeople();
