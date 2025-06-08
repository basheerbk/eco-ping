// Supabase configuration
const SUPABASE_URL = 'https://civgqrdgrofchdjwjxdb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdmdxcmRncm9mY2hkandqeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzOTY4MjgsImV4cCI6MjA2NDk3MjgyOH0.ezTvKgCOg3CeKx4nviraWx9BCrGWJ5-CJES0hgrj8O0'

// Defensive: Check if Supabase is loaded
if (!window.supabase || !window.supabase.createClient) {
    alert('Supabase library failed to load. Please check your internet connection or CDN link.');
    throw new Error('Supabase library not loaded');
}

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

const plantSvgContainer = document.getElementById('plant-svg')
const sensorValueEl = document.getElementById('sensor-value')
const sensorStatusEl = document.getElementById('sensor-status')
const lastUpdatedEl = document.getElementById('last-updated')
const loadingElement = document.getElementById('loading')
const errorElement = document.getElementById('error-message')

function getPlantColor(value) {
    if (value >= 800) return '#43a047'; // Green
    if (value >= 600) return '#fbc02d'; // Yellow
    if (value >= 400) return '#fb8c00'; // Orange
    return '#e53935'; // Red
}

function getStatusText(value) {
    if (value >= 800) return 'Healthy';
    if (value >= 600) return 'Okay';
    if (value >= 400) return 'Warning';
    return 'Critical';
}

function getStatusClass(value) {
    if (value >= 800) return 'text-success';
    if (value >= 600) return 'text-warning';
    if (value >= 400) return 'text-orange';
    return 'text-danger';
}

function getPlantImage(percent) {
    if (percent >= 80) return 'image/green.png';
    if (percent >= 60) return 'image/yellow.png';
    if (percent >= 40) return 'image/orange.png';
    return 'image/red.png';
}

function showError(message) {
    errorElement.textContent = message
    errorElement.classList.remove('d-none')
    loadingElement.style.display = 'none'
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString()
    } catch {
        return dateString
    }
}

// Converts sensor value (0-1023) to percentage
function sensorValueToPercent(value) {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    let percent = Math.round((value / 1023) * 100);
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
    return percent;
}

function updateUI(data) {
    if (!data || typeof data.sensor_value === 'undefined') {
        plantSvgContainer.innerHTML = '';
        sensorValueEl.textContent = '--';
        sensorStatusEl.textContent = 'No data';
        lastUpdatedEl.textContent = '';
        return;
    }
    const percent = sensorValueToPercent(data.sensor_value);
    const imgSrc = getPlantImage(percent);
    plantSvgContainer.innerHTML = `<img src="${imgSrc}" alt="Plant" class="img-fluid" style="max-height: 180px;">`;
    sensorValueEl.textContent = `${percent}%`;
    sensorStatusEl.textContent = getStatusText(data.sensor_value);
    sensorStatusEl.className = 'mb-2 fw-semibold ' + getStatusClass(data.sensor_value);
    lastUpdatedEl.textContent = 'Last updated: ' + formatDate(data.created_at);
}

// Function to fetch the latest data
async function fetchLatestData() {
    try {
        const { data, error } = await supabase
            .from('sensor_data')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)

        if (error) throw error
        if (!Array.isArray(data) || data.length === 0) {
            updateUI(null)
        } else {
            updateUI(data[0])
        }
        loadingElement.style.display = 'none'
    } catch (error) {
        showError('Failed to fetch sensor data')
        console.error('Error:', error)
    }
}

// Set up real-time subscription for only the latest data
function setupRealtimeSubscription() {
    try {
        const channel = supabase
            .channel('sensor_data_changes')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'sensor_data' },
                (payload) => {
                    if (!payload || !payload.new) {
                        console.warn('Received invalid real-time payload:', payload)
                        return
                    }
                    updateUI(payload.new)
                }
            )
            .subscribe()
        channel.catch && channel.catch((err) => {
            showError('Failed to subscribe to real-time updates')
            console.error('Subscription error:', err)
        })
    } catch (err) {
        showError('Failed to set up real-time updates')
        console.error('Setup error:', err)
    }
}

// Initialize the application
try {
    fetchLatestData()
    setupRealtimeSubscription()
} catch (err) {
    showError('Unexpected error initializing dashboard')
    console.error('Initialization error:', err)
} 