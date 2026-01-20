
// --- 1. CONFIGURATION & SAFETY GLOBALS ---
mapboxgl.accessToken = 'pk.eyJ1Ijoic2lkZGhhbnRiYW5zb2QiLCJhIjoiY21raWJ5amo2MHI3cjNlcXhwY2RmZHlhNiJ9.AmRwXlI_MuxXn7x2PR7IAg';

let mapInstance = null;
let markers = [];
let userLat = 19.0330;
let userLng = 73.0297;
let currentUser = null; // Holds the logged-in user (or guest)

// --- 2. AUTHENTICATION & REGISTRATION LOGIC ---
//localStorage.removeItem('paws_guest_profile'); location.reload();
// Global Variables
let authMode = 'login';
let uploadedPhotoBase64 = null; // To store the image string

window.addEventListener('load', () => {
    initPreview();
    updateHomeGreeting();
    // Check for saved user (Guest or Supabase)
    const guestData = localStorage.getItem('paws_guest_profile');
    if (guestData) {
        currentUser = { isGuest: true, data: JSON.parse(guestData) };
        // Auto-load profile picture if exists
        if (currentUser.data.photo) updateProfilePhotoUI(currentUser.data.photo);
        // Hide auth screen
        document.getElementById('auth-screen').classList.add('hidden');
        updateUIWithProfile(currentUser.data);
    }
});

// A. Toggle between Simple Login and Big Register Form
function toggleAuthMode(mode) {
    authMode = mode;
    const btn = document.getElementById('auth-action-btn');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const regFields = document.getElementById('register-fields');
    const regAvatar = document.getElementById('register-avatar');

    if (mode === 'login') {
        btn.innerText = "Log In";
        tabLogin.className = "flex-1 py-2 text-sm font-bold rounded-lg bg-zinc-600 text-white transition-all";
        tabRegister.className = "flex-1 py-2 text-sm font-bold rounded-lg text-zinc-400 hover:text-white transition-all";
        regFields.classList.add('hidden');
        regAvatar.classList.add('hidden');
    } else {
        btn.innerText = "Create Profile";
        tabRegister.className = "flex-1 py-2 text-sm font-bold rounded-lg bg-zinc-600 text-white transition-all";
        tabLogin.className = "flex-1 py-2 text-sm font-bold rounded-lg text-zinc-400 hover:text-white transition-all";
        regFields.classList.remove('hidden');
        regAvatar.classList.remove('hidden'); // Show photo uploader
        regAvatar.classList.add('flex');
    }
}

// B. Handle Photo Preview (Converts to Base64)
function previewRegPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            uploadedPhotoBase64 = e.target.result; // Save string
            const previewDiv = document.getElementById('reg-photo-preview');
            previewDiv.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// C. Update Profile Photo Everywhere
function updateProfilePhotoUI(base64String) {
    if (!base64String) return;

    // 1. Home Screen Profile Button
    const homeBtn = document.querySelector('button[onclick="showScreen(\'profile\')"]');
    if (homeBtn) {
        homeBtn.innerHTML = `<img src="${base64String}" class="w-full h-full object-cover rounded-full border border-zinc-600">`;
    }

    // 2. Profile Screen Large Avatar
    const profileAvatar = document.querySelector('#profile-screen .w-24.h-24'); // Target the big circle
    if (profileAvatar) {
        profileAvatar.innerHTML = `<img src="${base64String}" class="w-full h-full object-cover">`;
        profileAvatar.classList.remove('bg-zinc-800'); // Remove gray background
    }
}

// D. Main Handle Auth (Login OR Register)
async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorMsg = document.getElementById('auth-error');
    const btn = document.getElementById('auth-action-btn');

    errorMsg.innerText = "";

    // 1. LOGIN MODE
    if (authMode === 'login') {
        if (!email || !password) { errorMsg.innerText = "Please enter email & password."; return; }
        // For demo, we just simulate login or bypass
        bypassAuth();
        return;
    }

    // 2. REGISTER MODE (The Big Save)
    if (authMode === 'register') {
        const fname = document.getElementById('reg-firstname').value.trim();
        const lname = document.getElementById('reg-lastname').value.trim();

        if (!fname || !lname) {
            errorMsg.innerText = "First and Last Name are required.";
            return;
        }

        btn.innerText = "Creating Profile...";

        // Combine Names
        const fullName = `${fname} ${lname}`;

        const newProfile = {
            id: "user_" + Math.random().toString(36).substr(2, 9),
            email: email,
            full_name: fullName, // Saved as one string for display
            first_name: fname,   // Saved separately for logic
            last_name: lname,
            age: document.getElementById('reg-age').value,
            blood_group: document.getElementById('reg-blood').value,
            conditions: selectedConditions.join(", "),
            // Meds are optional, no check needed
            medications: document.getElementById('reg-meds') ? document.getElementById('reg-meds').value : "",
            dietary_goal: document.getElementById('reg-goal').value, // Gets value from dropdown
            location: document.getElementById('reg-location').value,
            photo: uploadedPhotoBase64,
            joined_at: new Date()
        };

        // SAVE DATA (Simulate Database Insert)
        try {
            // A. Save to Local Storage (Guest DB)
            localStorage.setItem('paws_guest_profile', JSON.stringify(newProfile));

            // B. If Supabase was active, we would run: 
            // await supabase.from('profiles').insert([newProfile]);

            // C. Update App State
            currentUser = { isGuest: true, data: newProfile };
            updateUIWithProfile(newProfile); // Update text fields
            updateProfilePhotoUI(newProfile.photo); // Update images

            // D. Success Transition
            setTimeout(() => {
                document.getElementById('auth-screen').classList.add('hidden');
                alert("Welcome, " + newProfile.full_name + "!");
            }, 800);

        } catch (e) {
            errorMsg.innerText = "Error saving profile. Try again.";
            btn.innerText = "Create Profile";
        }
    }
}

// E. Update UI Text Fields (Helper)
// --- FIXED UPDATE UI FUNCTION ---
function updateUIWithProfile(data) {
    // 1. Basic Fields
    if (data.full_name) {
        document.getElementById('p-name').value = data.full_name;
        // Also update the Home Screen Header
        const headerName = document.querySelector('h1 span');
        if (headerName) headerName.innerText = data.full_name.split(' ')[0];
        // Also update the Greeting
        updateHomeGreeting();
    }

    // Safely update fields only if they exist
    if (document.getElementById('p-age')) document.getElementById('p-age').value = data.age || '';
    if (document.getElementById('p-blood')) document.getElementById('p-blood').value = data.blood_group || 'Unknown';
    if (document.getElementById('p-meds')) document.getElementById('p-meds').value = data.medications || '';
    if (document.getElementById('p-goal')) document.getElementById('p-goal').value = data.dietary_goal || '';
    if (document.getElementById('p-location')) document.getElementById('p-location').value = data.location || '';

    // 2. CRITICAL FIX: Handle Conditions (Tags vs Textbox)
    // The old code tried: document.getElementById('p-conditions').value = ... (CRASHES)

    // New Logic: Populate the Tags Array
    if (data.conditions && data.conditions.trim() !== "") {
        // Split string "Diabetes, Asthma" -> Array ["Diabetes", "Asthma"]
        profileSelectedConditions = data.conditions.split(', ').filter(i => i);
    } else {
        profileSelectedConditions = [];
    }

    // 3. Render the tags immediately
    renderProfileTags();
}
// Keep existing bypassAuth for the "Guest" button
function bypassAuth() {
    currentUser = { id: "guest", isGuest: true };
    document.getElementById('auth-screen').classList.add('hidden');

    // Attempt to load existing data
    const savedData = localStorage.getItem('paws_guest_profile');
    if (savedData) {
        const data = JSON.parse(savedData);
        updateUIWithProfile(data);
        if (data.photo) updateProfilePhotoUI(data.photo);
    }
}
// --- LOCATION DETECTION LOGIC ---
async function detectUserLocation() {
    const locInput = document.getElementById('reg-location');
    const icon = event.currentTarget.querySelector('i');

    // Visual Feedback
    locInput.value = "Locating...";
    icon.className = "fa-solid fa-spinner fa-spin";

    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        locInput.value = "";
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Use Mapbox Reverse Geocoding to get City Name
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&access_token=${mapboxgl.accessToken}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                // Found the city!
                locInput.value = data.features[0].text;
            } else {
                // Fallback if Mapbox fails to find city name
                locInput.value = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
            }
        } catch (e) {
            console.error(e);
            locInput.value = "Unknown Location";
        }

        // Reset Icon
        icon.className = "fa-solid fa-location-crosshairs";

    }, () => {
        alert("Unable to retrieve your location. Please type it manually.");
        locInput.value = "";
        locInput.readOnly = false; // Let user type if GPS fails
        icon.className = "fa-solid fa-location-crosshairs";
    });
}
// --- MEDICAL CONDITION TAGGING SYSTEM (Fixed) ---

// --- 1. EXPANDED MEDICAL DATABASE (Professional Grade) ---
const MASTER_CONDITIONS = [
    // Metabolic & Endocrine
    "Type 1 Diabetes Mellitus", "Type 2 Diabetes Mellitus", "Gestational Diabetes",
    "Prediabetes", "Hypothyroidism (Hashimoto's)", "Hyperthyroidism (Graves' Disease)",
    "PCOS (Polycystic Ovary Syndrome)", "Addison's Disease", "Cushing's Syndrome",
    "Obesity (Class I)", "Obesity (Class II)", "Obesity (Class III)",

    // Cardiovascular (Heart)
    "Hypertension (Chronic High BP)", "Coronary Artery Disease (CAD)",
    "Atrial Fibrillation (A-Fib)", "Congestive Heart Failure (CHF)",
    "History of Myocardial Infarction (Heart Attack)", "Dilated Cardiomyopathy",
    "Hypertrophic Cardiomyopathy", "Aortic Valve Stenosis", "Mitral Valve Prolapse",
    "Peripheral Artery Disease (PAD)", "Deep Vein Thrombosis (DVT)",

    // Respiratory (Lungs)
    "Asthma (Mild Intermittent)", "Asthma (Severe Persistent)",
    "COPD (Chronic Obstructive Pulmonary Disease)", "Pulmonary Fibrosis",
    "Sleep Apnea (Obstructive)", "Sleep Apnea (Central)", "Cystic Fibrosis",
    "Pulmonary Hypertension",

    // Oncology (Cancers - Specific)
    "Breast Cancer (In Remission)", "Breast Cancer (Active Treatment)",
    "Prostate Cancer", "Lung Cancer (Non-Small Cell)", "Lung Cancer (Small Cell)",
    "Colorectal Cancer", "Melanoma", "Basal Cell Carcinoma",
    "Leukemia (ALL)", "Leukemia (AML)", "Leukemia (CLL)", "Leukemia (CML)",
    "Hodgkin Lymphoma", "Non-Hodgkin Lymphoma", "Pancreatic Cancer",
    "Ovarian Cancer", "Liver Cancer (Hepatocellular Carcinoma)", "Glioblastoma",

    // Kidney (Renal)
    "Chronic Kidney Disease (Stage 1-2)", "Chronic Kidney Disease (Stage 3a/3b)",
    "Chronic Kidney Disease (Stage 4)", "End-Stage Renal Disease (ESRD)",
    "Polycystic Kidney Disease (PKD)", "Recurrent Kidney Stones", "Glomerulonephritis",

    // Liver & Pancreas
    "Liver Cirrhosis (Compensated)", "Liver Cirrhosis (Decompensated)",
    "Non-Alcoholic Fatty Liver Disease (NAFLD)", "NASH",
    "Chronic Hepatitis B", "Chronic Hepatitis C", "Autoimmune Hepatitis",
    "Chronic Pancreatitis", "Hemochromatosis",

    // Neurological
    "Epilepsy / Seizure Disorder", "Migraine (Chronic)", "Alzheimer's Disease",
    "Parkinson's Disease", "Multiple Sclerosis (MS)", "Myasthenia Gravis",
    "Peripheral Neuropathy", "Stroke History (Ischemic)", "Stroke History (Hemorrhagic)",

    // Autoimmune & Musculoskeletal
    "Rheumatoid Arthritis", "Osteoarthritis", "Systemic Lupus Erythematosus (SLE)",
    "Psoriatic Arthritis", "Ankylosing Spondylitis", "Sjogren's Syndrome",
    "Gout (Chronic)", "Osteoporosis", "Fibromyalgia",

    // Gastrointestinal
    "Celiac Disease", "Crohn's Disease", "Ulcerative Colitis",
    "IBS (Irritable Bowel Syndrome)", "GERD (Chronic Reflux)", "Barrett's Esophagus",

    // Hereditary / Genetic
    "Sickle Cell Anemia", "Thalassemia Major", "Thalassemia Minor",
    "Hemophilia A", "Hemophilia B", "Von Willebrand Disease",
    "Huntington's Disease", "Marfan Syndrome", "Ehlers-Danlos Syndrome",
    "Lynch Syndrome", "BRCA1 Mutation", "BRCA2 Mutation",

    // Allergies (Severe)
    "Peanut Allergy (Anaphylactic)", "Shellfish Allergy", "Tree Nut Allergy",
    "Egg Allergy", "Dairy Allergy", "Soy Allergy", "Wheat Allergy",
    "Penicillin Allergy", "Sulfa Drug Allergy", "Latex Allergy"
];

let selectedConditions = [];

// Re-attach listeners whenever we switch to Register mode
function attachConditionListeners() {
    const input = document.getElementById('p-condition-search');
    const suggestionBox = document.getElementById('p-suggestions-box');
    if (!input || !suggestionBox) return;

    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    // OPTIMIZATION: Debounce Timer
    let searchTimeout;

    newInput.addEventListener('input', (e) => {
        // Clear the previous timer (cancels the search if you keep typing)
        clearTimeout(searchTimeout);

        // Wait 300ms before actually searching
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase();
            if (query.length < 1) { 
                suggestionBox.classList.add('hidden'); 
                return; 
            }

            // Heavy filtering logic only runs once you pause typing
            const matches = MASTER_CONDITIONS.filter(c => 
                c.toLowerCase().includes(query) && !profileSelectedConditions.includes(c)
            );
            
            if (matches.length > 0) {
                suggestionBox.innerHTML = matches.map(c => `
                    <div onclick="addProfileTag('${c}')" class="p-3 hover:bg-blue-600/20 hover:text-blue-400 text-zinc-300 cursor-pointer border-b border-white/5 text-sm font-medium transition-colors">
                        ${c}
                    </div>
                `).join('');
                suggestionBox.classList.remove('hidden');
            } else {
                suggestionBox.innerHTML = `<div class="p-3 text-zinc-500 text-sm italic">No match found</div>`;
                suggestionBox.classList.remove('hidden');
            }
        }, 300); // 300ms delay
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#p-condition-search') && !e.target.closest('#p-suggestions-box')) {
            suggestionBox.classList.add('hidden');
        }
    });
}

// Add Tag
function addConditionTag(condition) {
    if (selectedConditions.includes(condition)) return;
    selectedConditions.push(condition);
    renderTags();

    const input = document.getElementById('condition-search');
    input.value = "";
    document.getElementById('suggestions-box').classList.add('hidden');
    input.focus();
}

// Remove Tag
function removeConditionTag(condition) {
    selectedConditions = selectedConditions.filter(c => c !== condition);
    renderTags();
}

// Render Blue Chips
function renderTags() {
    const container = document.getElementById('conditions-container');
    container.innerHTML = selectedConditions.map(c => `
        <div class="bg-blue-600/20 border border-blue-500/50 text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium animate-fade-in">
            <span>${c}</span>
            <button onclick="removeConditionTag('${c}')" class="hover:text-white transition">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join('');
}

// --- UPDATE TOGGLE FUNCTION ---
// Update your existing toggleAuthMode function to call attachConditionListeners()
const originalToggle = toggleAuthMode; // Store old ref if needed, or just overwrite:

function toggleAuthMode(mode) {
    authMode = mode;
    const btn = document.getElementById('auth-action-btn');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const regFields = document.getElementById('register-fields');
    const regAvatar = document.getElementById('register-avatar');

    if (mode === 'login') {
        btn.innerText = "Log In";
        tabLogin.className = "flex-1 py-2 text-sm font-bold rounded-lg bg-zinc-600 text-white transition-all";
        tabRegister.className = "flex-1 py-2 text-sm font-bold rounded-lg text-zinc-400 hover:text-white transition-all";
        regFields.classList.add('hidden');
        regAvatar.classList.add('hidden');
    } else {
        btn.innerText = "Create Profile";
        tabRegister.className = "flex-1 py-2 text-sm font-bold rounded-lg bg-zinc-600 text-white transition-all";
        tabLogin.className = "flex-1 py-2 text-sm font-bold rounded-lg text-zinc-400 hover:text-white transition-all";
        regFields.classList.remove('hidden');
        regAvatar.classList.remove('hidden');
        regAvatar.classList.add('flex');

        // CRITICAL: Activate the search box now that it is visible
        setTimeout(attachConditionListeners, 100);
    }
}

// --- 3. PREVIEW MAP (Small Static Image) ---
function initPreview() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
            const staticUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${userLng},${userLat},13,0/600x400?access_token=${mapboxgl.accessToken}`;
            document.getElementById('static-map-preview').style.backgroundImage = `url('${staticUrl}')`;
            const previewDiv = document.getElementById('static-map-preview');
            if (previewDiv) {
                previewDiv.style.backgroundImage = `url('${staticUrl}')`;
                previewDiv.style.backgroundSize = 'cover';
                previewDiv.style.opacity = '0.8';
            }
        });
    }
}

// --- 4. ANIMATIONS (Fixed Visibility Bug) ---
function openMapModal() {
    const card = document.getElementById('care-card');
    const modal = document.getElementById('map-modal');
    const content = document.getElementById('modal-content');
    const rect = card.getBoundingClientRect();

    modal.style.visibility = 'visible'; // CRITICAL FIX
    modal.style.transition = 'none';
    modal.style.top = `${rect.top}px`;
    modal.style.left = `${rect.left}px`;
    modal.style.width = `${rect.width}px`;
    modal.style.height = `${rect.height}px`;
    modal.style.borderRadius = '24px';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'none';
    if (!mapInstance) {
        // Wait 300ms for the open animation to finish, THEN load map
        setTimeout(() => {
            initFullMap();
        }, 300);
    }

    modal.offsetHeight; // Force Paint

    modal.style.transition = '';
    requestAnimationFrame(() => {
        modal.style.top = '0px';
        modal.style.left = '0px';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.borderRadius = '0px';
    });

    content.classList.remove('content-hidden');
    content.classList.add('content-visible');

    setTimeout(() => {
        modal.style.pointerEvents = 'auto'; // Unlock Interaction
        initFullMap();
    }, 500);
}

function closeMapModal() {
    const card = document.getElementById('care-card');
    const modal = document.getElementById('map-modal');
    const content = document.getElementById('modal-content');
    const rect = card.getBoundingClientRect();

    content.classList.remove('content-visible');
    content.classList.add('content-hidden');

    modal.style.pointerEvents = 'none';
    modal.style.top = `${rect.top}px`;
    modal.style.left = `${rect.left}px`;
    modal.style.width = `${rect.width}px`;
    modal.style.height = `${rect.height}px`;
    modal.style.borderRadius = '24px';

    
    setTimeout(() => {
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden'; // CRITICAL FIX
    
    if (mapInstance) {
            mapInstance.remove(); // Vital for mobile stability
            mapInstance = null;
        }

    markers = [];
    }, 500);
}

// --- 5. MAP BUILDER ---
function initFullMap() {
    if (mapInstance) {
        mapInstance.resize();
        return;
    }
    setTimeout(() => {
        mapInstance = new mapboxgl.Map({
            container: 'full-map',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [userLng, userLat],
            zoom: 14,
            pitch: 45,
            attributionControl: false
        });

        const el = document.createElement('div');
        el.className = 'user-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.backgroundColor = '#3b82f6';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 0 20px #3b82f6';
        new mapboxgl.Marker(el).setLngLat([userLng, userLat]).addTo(mapInstance);

        mapInstance.on('load', () => {
            mapInstance.resize();
            const layers = mapInstance.getStyle().layers;
            const labelLayerId = layers.find(l => l.type === 'symbol' && l.layout['text-field']).id;
            mapInstance.addLayer({
                'id': 'add-3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                    'fill-extrusion-color': '#222',
                    'fill-extrusion-height': ['get', 'height'],
                    'fill-extrusion-base': ['get', 'min_height'],
                    'fill-extrusion-opacity': 0.8
                }
            }, labelLayerId);
        });
    }, 100);
}

// --- 6. SEARCH LOGIC ---
async function searchNearby(category) {
    if (!mapInstance) return;
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-white"></i>`;

    if (markers) markers.forEach(m => m.remove());
    markers = [];

    const searchTerm = category === 'hospital' ? 'hospital, clinic' : category;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchTerm}.json?proximity=${userLng},${userLat}&types=poi&limit=10&access_token=${mapboxgl.accessToken}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            data.features.forEach((place) => {
                const el = document.createElement('div');
                const colorClass = category === 'hospital' ? 'bg-red-500' : 'bg-blue-500';
                el.className = `w-4 h-4 rounded-full border-2 border-white shadow-lg ${colorClass}`;
                const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
                    .setHTML(`<b style="color:black">${place.text}</b><br><span style="color:#555;font-size:10px">${place.properties?.address || ''}</span>`);
                const marker = new mapboxgl.Marker(el)
                    .setLngLat(place.center)
                    .setPopup(popup)
                    .addTo(mapInstance);
                markers.push(marker);
                bounds.extend(place.center);
            });
            mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 15 });
            addMessage(`Found ${data.features.length} ${category}s nearby.`, false);
        } else {
            loadUlweBackups(category);
        }
    } catch (error) {
        loadUlweBackups(category);
    }
    btn.innerHTML = originalContent;
}
// --- DYNAMIC GREETING LOGIC ---
function updateHomeGreeting() {
    const textEl = document.getElementById('greeting-text');
    const nameEl = document.getElementById('greeting-name');

    if (!textEl || !nameEl) return;

    // 1. Time Logic
    const hour = new Date().getHours();
    let greeting = "Good Morning,";

    if (hour >= 12 && hour < 17) {
        greeting = "Good Afternoon,";
    } else if (hour >= 17 || hour < 5) {
        greeting = "Good Evening,";
    }

    textEl.innerText = greeting;

    // 2. Name Logic
    if (currentUser && currentUser.data && currentUser.data.full_name) {
        // Get just the first name (e.g., "Siddhant" from "Siddhant Bansod")
        nameEl.innerText = currentUser.data.full_name.split(' ')[0];
    } else {
        nameEl.innerText = "Guest";
    }
}
// --- LOGOUT LOGIC (Smooth & Silent) ---
function logout() {
    // 1. Visual Feedback (Button press feel)
    const btn = event.currentTarget;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Signing out...`;

    setTimeout(() => {
        // 2. Clear Session Data
        localStorage.removeItem('paws_guest_profile');
        currentUser = null;

        // 3. Close Profile Modal Smoothly
        toggleProfile(false);

        // 4. Reset Forms (So next user sees empty fields)
        document.getElementById('auth-email').value = "";
        document.getElementById('auth-password').value = "";

        // 5. Bring back Auth Screen (Fade In)
        const authScreen = document.getElementById('auth-screen');
        authScreen.classList.remove('hidden');
        authScreen.style.opacity = '0'; // Start invisible

        // Force browser paint
        requestAnimationFrame(() => {
            authScreen.style.transition = 'opacity 0.5s ease';
            authScreen.style.opacity = '1'; // Fade to black
        });

        // 6. Reset Button State (Silent Reset)
        setTimeout(() => {
            btn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Log Out`;
        }, 500);

    }, 600); // Small delay to make it feel "processed"
}
function loadUlweBackups(category) {
    if (category !== 'hospital' && category !== 'clinic') { alert("No results found."); return; }
    const ulweData = [
        { text: "Feather Touch Hospital", center: [73.0280, 18.9745] },
        { text: "Galaxy Hospital", center: [73.0295, 18.9780] },
        { text: "Apollo Clinic", center: [73.0245, 18.9752] },
        { text: "Millennium Hospital", center: [73.0310, 18.9720] }
    ];
    const bounds = new mapboxgl.LngLatBounds();
    ulweData.forEach(place => {
        const el = document.createElement('div');
        el.className = `w-4 h-4 rounded-full border-2 border-white shadow-lg bg-red-500`;
        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`<b style="color:black">${place.text}</b><br><span style="color:#555;font-size:10px">Ulwe, Navi Mumbai</span>`);
        const marker = new mapboxgl.Marker(el).setLngLat(place.center).setPopup(popup).addTo(mapInstance);
        markers.push(marker);
        bounds.extend(place.center);
    });
    mapInstance.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    addMessage("Used offline data (Network/API Limit).", false);
}

// --- 7. PROFILE & CHAT (Fixed) ---
// --- FIXED UPDATE UI FUNCTION ---
function updateUIWithProfile(data) {
    // 1. Basic Fields (Safe Checks)
    if (data.full_name) {
        const nameInput = document.getElementById('p-name');
        if (nameInput) nameInput.value = data.full_name;

        // Update Home Screen Header
        const headerName = document.querySelector('h1 span');
        if (headerName) headerName.innerText = data.full_name.split(' ')[0];

        // Update Greeting
        if (typeof updateHomeGreeting === "function") updateHomeGreeting();
    }

    // Safely update other fields only if they exist
    if (document.getElementById('p-age')) document.getElementById('p-age').value = data.age || '';
    if (document.getElementById('p-blood')) document.getElementById('p-blood').value = data.blood_group || 'Unknown';
    if (document.getElementById('p-meds')) document.getElementById('p-meds').value = data.medications || '';
    if (document.getElementById('p-goal')) document.getElementById('p-goal').value = data.dietary_goal || '';
    if (document.getElementById('p-location')) document.getElementById('p-location').value = data.location || '';
    if (document.getElementById('p-height')) document.getElementById('p-height').value = data.height || '';
    if (document.getElementById('p-weight')) document.getElementById('p-weight').value = data.weight || '';

    // 2. CRITICAL FIX: Handle Conditions (Tags vs Old Textbox)
    // The old code crashed here because 'p-conditions' ID is gone.

    // New Logic: Populate the Global Tags Array
    if (data.conditions && data.conditions.trim() !== "") {
        // Split string "Diabetes, Asthma" -> Array ["Diabetes", "Asthma"]
        profileSelectedConditions = data.conditions.split(', ').filter(i => i);
    } else {
        profileSelectedConditions = [];
    }

    // 3. Render the tags immediately
    if (typeof renderProfileTags === "function") renderProfileTags();
    updateHomeGreeting();
}

async function saveAndCloseProfile() {
    const btn = event.target;
    btn.innerText = "Saving...";

    const updates = {
        full_name: document.getElementById('p-name').value,
        age: document.getElementById('p-age').value,
        blood_group: document.getElementById('p-blood').value,

        // JOIN TAGS ARRAY INTO A STRING FOR SAVING
        conditions: profileSelectedConditions.join(", "),

        medications: document.getElementById('p-meds').value,
        dietary_goal: document.getElementById('p-goal').value,
        location: document.getElementById('p-location').value,

        // Preserve existing photo if not changed here
        photo: currentUser.data.photo
    };

    // SAVE TO LOCAL STORAGE (Guest Mode)
    localStorage.setItem('paws_guest_profile', JSON.stringify(updates));
    updateUIWithProfile(updates);

    setTimeout(() => {
        btn.innerText = "Done";
        toggleProfile(false);
    }, 500);
}

async function sendMessage() {
    const inputField = document.getElementById("user-input");
    const message = inputField.value.trim();
    if (message === "") return;

    addMessage(message, true);
    inputField.value = "";

    const mascotText = document.getElementById('mascot-text');
    if (mascotText) mascotText.innerText = "Let me think...";

    try {
        const response = await fetch("https://medipanda-ekck.onrender.com/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_message: message })
        });
        const data = await response.json();
        addMessage(data.reply);
        if (mascotText) mascotText.innerText = "I found something!";
    } catch (error) {
        addMessage("I can't reach my brain right now! (Server Error)");
    }
}

// --- 8. HELPERS (Navigation, Camera, Etc) ---
// --- FIXED TOGGLE FUNCTION ---
function toggleProfile(show) {
    const modal = document.getElementById('profile-modal');
    // Select the elements that are "bleeding through"
    const home = document.getElementById('home-screen');
    const island = document.getElementById('dynamic-island');
    const askAiBtn = document.querySelector('button[onclick*="showScreen(\'chat\')"]'); // The floating blue button

    if (!modal) return;

    if (show) {
        // 1. Show the Profile Modal
        modal.classList.remove('hidden');

        // 2. Hide Background Elements (So they don't overlap)
        if (home) home.classList.add('hidden');
        if (island) island.classList.add('hidden');
        if (askAiBtn) askAiBtn.classList.add('hidden');
        setTimeout(attachProfileConditionListeners, 500);

        // 3. Slide In Animation
        requestAnimationFrame(() => {
            modal.classList.remove('translate-x-full');
            modal.classList.add('translate-x-0');
        });

        // 4. Load Data
        if (currentUser && currentUser.data) {
            updateUIWithProfile(currentUser.data);
            // 2. Load Conditions (Split string back into Array)
            if (currentUser.data.conditions && currentUser.data.conditions.trim() !== "") {
                profileSelectedConditions = currentUser.data.conditions.split(', ').filter(i => i);
            } else {
                profileSelectedConditions = [];
            }
            renderProfileTags();
            setTimeout(attachProfileConditionListeners, 100);
        }
    } else {
        // 1. Slide Out Animation
        modal.classList.remove('translate-x-0');
        modal.classList.add('translate-x-full');

        // 2. Bring Back Background Elements
        if (home) home.classList.remove('hidden');
        if (island) island.classList.remove('hidden');
        if (askAiBtn) askAiBtn.classList.remove('hidden');

        // 3. Fully Hide Modal after animation finishes (300ms)
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}
// --- PROFILE TAGGING LOGIC ---

let profileSelectedConditions = []; // Separate array for the profile screen

function attachProfileConditionListeners() {
    const input = document.getElementById('p-condition-search');
    const suggestionBox = document.getElementById('p-suggestions-box');

    if (!input || !suggestionBox) return;

    // Remove old listeners by cloning
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    // Typing Event
    newInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();

        if (query.length < 1) {
            suggestionBox.classList.add('hidden');
            return;
        }

        const matches = MASTER_CONDITIONS.filter(c =>
            c.toLowerCase().includes(query) && !profileSelectedConditions.includes(c)
        );

        if (matches.length > 0) {
            suggestionBox.innerHTML = matches.map(c => `
                <div onclick="addProfileTag('${c}')" 
                     class="p-3 text-white hover:bg-blue-600 cursor-pointer border-b border-white/10 text-sm font-medium transition-colors">
                    ${c}
                </div>
            `).join('');
            suggestionBox.classList.remove('hidden');
        } else {
            suggestionBox.innerHTML = `<div class="p-3 text-zinc-500 text-sm italic">No match found</div>`;
            suggestionBox.classList.remove('hidden');
        }
    });

    // Hide when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#p-condition-search') && !e.target.closest('#p-suggestions-box')) {
            suggestionBox.classList.add('hidden');
        }
    });
}
// 1. Initialize Listeners (Call this when Profile Opens)
function attachProfileConditionListeners() {
    const input = document.getElementById('p-condition-search');
    const suggestionBox = document.getElementById('p-suggestions-box');

    if (!input || !suggestionBox) return;

    // Clone to remove old listeners (prevents duplicate triggers)
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    // INPUT EVENT: Filter the Master List
    newInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();

        // Hide if empty
        if (query.length < 1) {
            suggestionBox.classList.add('hidden');
            return;
        }

        // Filter Logic
        const matches = MASTER_CONDITIONS.filter(c =>
            c.toLowerCase().includes(query) && !profileSelectedConditions.includes(c)
        );

        // Render Dropdown
        if (matches.length > 0) {
            suggestionBox.innerHTML = matches.map(c => `
                <div onclick="addProfileTag('${c}')" 
                     class="p-3 hover:bg-blue-600/20 hover:text-blue-400 text-zinc-300 cursor-pointer border-b border-white/5 last:border-0 transition text-sm font-medium flex justify-between items-center group">
                    <span>${c}</span>
                    <i class="fa-solid fa-plus text-zinc-600 group-hover:text-blue-500"></i>
                </div>
            `).join('');
            suggestionBox.classList.remove('hidden');
        } else {
            suggestionBox.innerHTML = `<div class="p-3 text-zinc-500 text-sm italic">No matching condition found.</div>`;
            suggestionBox.classList.remove('hidden');
        }
    });

    // CLICK AWAY: Hide dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#p-condition-search') && !e.target.closest('#p-suggestions-box')) {
            suggestionBox.classList.add('hidden');
        }
    });
}

// 2. Add Tag
function addProfileTag(condition) {
    if (profileSelectedConditions.includes(condition)) return;
    profileSelectedConditions.push(condition);
    renderProfileTags();

    // Reset Input
    const input = document.getElementById('p-condition-search');
    input.value = "";
    document.getElementById('p-suggestions-box').classList.add('hidden');
    input.focus();
}

function removeProfileTag(condition) {
    profileSelectedConditions = profileSelectedConditions.filter(c => c !== condition);
    renderProfileTags();
}

function renderProfileTags() {
    const container = document.getElementById('p-conditions-container');
    if (!container) return;

    container.innerHTML = profileSelectedConditions.map(c => `
        <div class="bg-blue-600/20 border border-blue-500/50 text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold">
            <span>${c}</span>
            <button onclick="removeProfileTag('${c}')" class="hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
}

function formatAIResponse(text) {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>'); formatted = formatted.replace(/\n/g, '<br>'); formatted = formatted.replace(/^\* /gm, '• '); return formatted;
}

function addMessage(text, isUser = false) {
    const container = document.getElementById('chat-container'); const div = document.createElement('div');
    if (isUser) { div.className = "flex items-end justify-end w-full mb-4"; div.innerHTML = `<div class="bg-blue-600 text-white rounded-2xl rounded-tr-none p-4 shadow-md max-w-[85%] fade-enter"><p class="font-bold text-sm leading-relaxed">${text}</p></div>`; }
    else { const cleanHtml = formatAIResponse(text); div.className = "flex items-start w-full mb-4"; div.innerHTML = `<div class="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-none p-4 shadow-sm max-w-[85%] fade-enter text-gray-200 text-sm leading-relaxed"><div>${cleanHtml}</div></div>`; }
    container.appendChild(div); setTimeout(() => { const bubble = div.querySelector('.fade-enter'); if (bubble) bubble.classList.add('fade-enter-active'); }, 10); container.scrollTop = container.scrollHeight;
}

function showScreen(screenName) {
    const screens = ['home-screen', 'chat-screen', 'profile-screen'];
    screens.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
    const target = document.getElementById(screenName + '-screen'); if (target) target.classList.remove('hidden');
    const navBar = document.querySelector('.fixed.bottom-0'); const island = document.getElementById('dynamic-island'); const profileBtn = document.querySelector('button[onclick="showScreen(\'profile\')"]');
    if (screenName === 'home') { if (navBar) navBar.classList.remove('hidden'); if (island) island.classList.remove('hidden'); if (profileBtn) profileBtn.classList.remove('hidden'); }
    else { if (island) island.classList.add('hidden'); if (profileBtn) profileBtn.classList.add('hidden'); if (screenName === 'profile') { if (navBar) navBar.classList.add('hidden'); } else { if (navBar) navBar.classList.remove('hidden'); } }
}

// Camera Globals
const island = document.getElementById('dynamic-island');
const icon = document.getElementById('camera-icon');
const view = document.getElementById('camera-view');
let isExpanded = false;

function expandCamera() {
    if (isExpanded) return; isExpanded = true;
    island.style.width = "95%"; island.style.height = "50vh"; island.style.borderRadius = "32px"; island.style.cursor = "default"; icon.style.opacity = "0";
    setTimeout(() => { view.style.opacity = "1"; view.style.pointerEvents = "auto"; document.getElementById('camera-input').click(); }, 300);
}

function collapseCamera(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation(); isExpanded = false;
    if (view) { view.style.opacity = "0"; view.style.pointerEvents = "none"; }
    setTimeout(() => { if (island) { island.style.width = "200px"; island.style.height = "64px"; island.style.borderRadius = "9999px"; island.style.cursor = "pointer"; } if (icon) icon.style.opacity = "1"; }, 100);
}

// Camera Input Listener
const cameraInput = document.getElementById('camera-input');
if (cameraInput) {
    cameraInput.addEventListener('change', async function (e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            const video = document.getElementById('camera-stream');
            if (video) { video.style.backgroundImage = `url(${url})`; video.style.backgroundSize = "cover"; }
            setTimeout(() => { collapseCamera(); showScreen('chat'); addMessage("Scanning this image...", true); }, 1000);

            // Demo Upload Logic
            const formData = new FormData(); formData.append("file", file); formData.append("user_id", "demo_user");
            try {
                const response = await fetch("https://medipanda-ekck.onrender.com/analyze", { method: "POST", body: formData });
                const data = await response.json();
                addMessage(data.reply);
            } catch (error) { addMessage("I couldn't upload the image. Is the server running?"); }
        }
    });
}
