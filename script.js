// Weather Dashboard Application JavaScript
// Using OpenWeatherMap API for weather data

// API Configuration
const API_KEY = "your_openweathermap_api_key"; // Replace with your actual API key
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_URL = "https://api.openweathermap.org/geo/1.0";

// Global state for current location and units
let currentLocation = {
    city: "New York",
    state: "NY",
    country: "USA",
    lat: 40.7128,
    lon: -74.0060
};
let units = "metric"; // Can be 'metric' or 'imperial'

// DOM Ready event
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    initApp();
    
    // Set up event listeners
    setupEventListeners();
});

// Initialize application
function initApp() {
    // Load default location (could also use geolocation API here)
    loadDefaultLocation();
    
    // Initialize charts
    initCharts();
    
    // Initial sidebar state
    handleSidebarToggle();
}

// Set up all event listeners
function setupEventListeners() {
    // Search location
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchLocation(searchInput.value);
        }
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    sidebarToggle.addEventListener('click', handleSidebarToggle);
    
    // Time period filters
    const filters = document.querySelectorAll('.filter');
    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            // Remove active class from all filters
            filters.forEach(f => f.classList.remove('active'));
            // Add active class to clicked filter
            filter.classList.add('active');
            // Update data for the selected time period
            updateForTimePeriod(filter.textContent.trim());
        });
    });
    
    // Location selector dropdown
    const locationSelector = document.getElementById('location-selector');
    locationSelector.addEventListener('click', toggleLocationDropdown);
    
    // Tab navigation
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Find parent tab-nav
            const tabNav = e.target.closest('.tab-nav');
            // Remove active class from all tabs in this navigation
            tabNav.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            // Update content based on the selected tab
            updateTabContent(tab);
        });
    });
}

// Load default location and weather data
function loadDefaultLocation() {
    // You could use browser geolocation here instead of hardcoded values
    fetchWeatherData(currentLocation.lat, currentLocation.lon);
}

// Search for a location by name
function searchLocation(query) {
    if (!query.trim()) return;
    
    // Show loading state
    showLoading(true);
    
    // Fetch location coordinates from geocoding API
    fetch(`${GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                showError("Location not found. Please try another search.");
                return;
            }
            
            // Update current location
            const location = data[0];
            currentLocation = {
                city: location.name,
                state: location.state || "",
                country: location.country,
                lat: location.lat,
                lon: location.lon
            };
            
            // Update location display
            updateLocationDisplay();
            
            // Fetch weather data for the new location
            fetchWeatherData(currentLocation.lat, currentLocation.lon);
        })
        .catch(error => {
            console.error("Error searching location:", error);
            showError("Failed to search location. Please try again later.");
        })
        .finally(() => {
            showLoading(false);
        });
}

// Update the location display in the UI
function updateLocationDisplay() {
    const locationElement = document.getElementById('current-location');
    const displayLocation = [
        currentLocation.city,
        currentLocation.state,
        currentLocation.country
    ].filter(Boolean).join(", ");
    
    locationElement.textContent = displayLocation;
}

// Fetch all weather data for a location
function fetchWeatherData(lat, lon) {
    // Show loading state
    showLoading(true);
    
    // Create promises for all the API calls we need
    const currentWeatherPromise = fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`);
    const forecastPromise = fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`);
    const airQualityPromise = fetch(`${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const oneCallPromise = fetch(`${BASE_URL}/onecall?lat=${lat}&lon=${lon}&units=${units}&exclude=minutely&appid=${API_KEY}`);
    
    // Execute all API calls in parallel
    Promise.all([
        currentWeatherPromise.then(resp => resp.json()),
        forecastPromise.then(resp => resp.json()),
        airQualityPromise.then(resp => resp.json()),
        oneCallPromise.then(resp => resp.json())
    ])
    .then(([currentWeather, forecast, airQuality, oneCall]) => {
        // Update the UI with the fetched data
        updateCurrentWeather(currentWeather);
        updateForecast(forecast, oneCall);
        updateAirQuality(airQuality);
        updateUVIndex(oneCall);
        updateSunMoonInfo(currentWeather, oneCall);
        updateCharts(oneCall, forecast);
        
        // Cache the data if needed
        cacheWeatherData({
            currentWeather,
            forecast,
            airQuality,
            oneCall
        });
    })
    .catch(error => {
        console.error("Error fetching weather data:", error);
        showError("Failed to fetch weather data. Please try again later.");
    })
    .finally(() => {
        showLoading(false);
    });
}

// Update current weather information in the UI
function updateCurrentWeather(data) {
    // Update temperature
    document.getElementById('current-temp').innerHTML = `${Math.round(data.main.temp)}<span class="weather-unit">°${units === 'metric' ? 'C' : 'F'}</span>`;
    
    // Update feels like
    document.getElementById('feels-like').textContent = `${Math.round(data.main.feels_like)}°${units === 'metric' ? 'C' : 'F'}`;
    
    // Update humidity
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    
    // Update wind speed
    const windSpeedUnit = units === 'metric' ? 'km/h' : 'mph';
    // Convert m/s to km/h if metric
    const windSpeed = units === 'metric' ? (data.wind.speed * 3.6).toFixed(1) : data.wind.speed;
    document.getElementById('wind-speed').textContent = `${windSpeed} ${windSpeedUnit}`;
    
    // Update pressure
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    
    // Update weather icon
    updateWeatherIcon('current-weather-icon', data.weather[0].id);
}

// Update weather forecast in the UI
function updateForecast(forecastData, oneCallData) {
    const forecastContainer = document.getElementById('forecast-container');
    
    // Clear existing forecast items
    forecastContainer.innerHTML = '';
    
    // We'll use daily forecast from oneCallData for 7-day forecast
    oneCallData.daily.slice(0, 7).forEach((day, index) => {
        const date = new Date(day.dt * 1000);
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon"><i class="${getWeatherIconClass(day.weather[0].id)}"></i></div>
            <div class="forecast-temp">
                <span class="high">${Math.round(day.temp.max)}°</span> / 
                <span class="low">${Math.round(day.temp.min)}°</span>
            </div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
}

// Update air quality information
function updateAirQuality(data) {
    const aqiList = data.list[0];
    const aqi = aqiList.main.aqi;
    
    // AQI value (1: Good, 2: Fair, 3: Moderate, 4: Poor, 5: Very Poor)
    const aqiValue = document.getElementById('aqi-value');
    let aqiText = '';
    let aqiPercentage = 0;
    
    // Calculate a more granular AQI value for display
    const pm25 = aqiList.components.pm2_5;
    const pm10 = aqiList.components.pm10;
    const o3 = aqiList.components.o3;
    
    // Simple weighted calculation (you can use a more accurate formula)
    const calculatedAQI = Math.round((pm25 * 3 + pm10 * 1 + o3 * 2) / 6 * 10);
    
    switch(aqi) {
        case 1:
            aqiText = 'Good';
            aqiPercentage = 10;
            break;
        case 2:
            aqiText = 'Fair';
            aqiPercentage = 30;
            break;
        case 3:
            aqiText = 'Moderate';
            aqiPercentage = 50;
            break;
        case 4:
            aqiText = 'Poor';
            aqiPercentage = 70;
            break;
        case 5:
            aqiText = 'Very Poor';
            aqiPercentage = 90;
            break;
    }
    
    // Update AQI info
    aqiValue.textContent = calculatedAQI;
    document.querySelector('.info-label').textContent = `AQI - ${aqiText}`;
    document.querySelector('.air-quality-level').textContent = aqiText;
    document.querySelector('.air-quality-indicator').style.left = `${aqiPercentage}%`;
    
    // Update pollutant values
    document.getElementById('pm25').textContent = `${pm25.toFixed(1)} µg/m³`;
    document.getElementById('pm10').textContent = `${pm10.toFixed(1)} µg/m³`;
    document.getElementById('o3').textContent = `${o3.toFixed(1)} µg/m³`;
}

// Update UV index information
function updateUVIndex(data) {
    // Get UV index from oneCall API
    const uvIndex = Math.round(data.current.uvi);
    
    // Update UV Index value
    document.getElementById('uv-index').textContent = uvIndex;
    
    // Set UV level and protection advice
    let uvLevel = '';
    let protectionAdvice = '';
    let uvPercentage = 0;
    let safeExposure = '';
    
    if (uvIndex <= 2) {
        uvLevel = 'Low';
        protectionAdvice = 'No protection needed';
        uvPercentage = 10;
        safeExposure = '60+ min';
    } else if (uvIndex <= 5) {
        uvLevel = 'Moderate';
        protectionAdvice = 'Protection recommended';
        uvPercentage = 30;
        safeExposure = '30-45 min';
    } else if (uvIndex <= 7) {
        uvLevel = 'High';
        protectionAdvice = 'Protection needed';
        uvPercentage = 60;
        safeExposure = '15-25 min';
    } else if (uvIndex <= 10) {
        uvLevel = 'Very High';
        protectionAdvice = 'Extra protection needed';
        uvPercentage = 80;
        safeExposure = '10-15 min';
    } else {
        uvLevel = 'Extreme';
        protectionAdvice = 'Maximum protection needed';
        uvPercentage = 95;
        safeExposure = 'Less than 10 min';
    }
    
    // Update UI elements for UV information
    document.querySelector('.card-title + .info-label').textContent = uvLevel;
    document.querySelector('.air-quality-level').textContent = `${uvLevel} - ${protectionAdvice}`;
    document.getElementById('safe-exposure').textContent = safeExposure;
    
    // Update indicator position
    document.querySelectorAll('.air-quality-indicator')[1].style.left = `${uvPercentage}%`;
    
    // Set max UV time (roughly estimated based on standard patterns)
    // In reality, this would be more accurately calculated based on location and date
    document.getElementById('max-uv-time').textContent = '11:00 AM - 3:00 PM';
}

// Update sun and moon information
function updateSunMoonInfo(weatherData, oneCallData) {
    // Sun information
    const sunriseTime = new Date(weatherData.sys.sunrise * 1000);
    const sunsetTime = new Date(weatherData.sys.sunset * 1000);
    
    // Format times
    const sunriseFormatted = formatTime(sunriseTime);
    const sunsetFormatted = formatTime(sunsetTime);
    
    // Calculate day length
    const dayLengthMs = sunsetTime - sunriseTime;
    const dayLengthHours = Math.floor(dayLengthMs / (1000 * 60 * 60));
    const dayLengthMinutes = Math.floor((dayLengthMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Update sun info
    document.getElementById('sunrise').textContent = sunriseFormatted;
    document.getElementById('sunset').textContent = sunsetFormatted;
    document.getElementById('day-length').textContent = `${dayLengthHours}h ${dayLengthMinutes}m`;
    
    // Moon phase (simplified calculation)
    // In a real app, you'd use a proper lunar phase calculation or API data
    const moonPhase = oneCallData.daily[0].moon_phase;
    let moonPhaseName = '';
    
    if (moonPhase === 0 || moonPhase === 1) {
        moonPhaseName = 'New Moon';
    } else if (moonPhase < 0.25) {
        moonPhaseName = 'Waxing Crescent';
    } else if (moonPhase === 0.25) {
        moonPhaseName = 'First Quarter';
    } else if (moonPhase < 0.5) {
        moonPhaseName = 'Waxing Gibbous';
    } else if (moonPhase === 0.5) {
        moonPhaseName = 'Full Moon';
    } else if (moonPhase < 0.75) {
        moonPhaseName = 'Waning Gibbous';
    } else if (moonPhase === 0.75) {
        moonPhaseName = 'Last Quarter';
    } else {
        moonPhaseName = 'Waning Crescent';
    }
    
    document.getElementById('moon-phase').textContent = moonPhaseName;
}

// Initialize charts
function initCharts() {
    // Create temperature chart
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    window.temperatureChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: Array(24).fill().map((_, i) => formatHour(i)),
            datasets: [{
                label: 'Temperature (°C)',
                data: Array(24).fill(null),
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
    
    // Create precipitation chart
    const precipCtx = document.getElementById('precipitationChart').getContext('2d');
    window.precipitationChart = new Chart(precipCtx, {
        type: 'bar',
        data: {
            labels: Array(24).fill().map((_, i) => formatHour(i)),
            datasets: [
                {
                    label: 'Precipitation (%)',
                    data: Array(24).fill(null),
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    yAxisID: 'y'
                },
                {
                    label: 'Humidity (%)',
                    data: Array(24).fill(null),
                    type: 'line',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Precipitation (%)'
                    }
                },
                y1: {
                    beginAtZero: true,
                    max: 100,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Humidity (%)'
                    }
                }
            }
        }
    });
}

// Update chart data
function updateCharts(oneCallData, forecastData) {
    // Update temperature chart with hourly data
    const hourlyTemps = oneCallData.hourly.slice(0, 24).map(hour => hour.temp);
    window.temperatureChart.data.datasets[0].data = hourlyTemps;
    window.temperatureChart.update();
    
    // Update precipitation chart
    const hourlyPrecip = oneCallData.hourly.slice(0, 24).map(hour => (hour.pop * 100)); // Convert to percentage
    const hourlyHumidity = oneCallData.hourly.slice(0, 24).map(hour => hour.humidity);
    
    window.precipitationChart.data.datasets[0].data = hourlyPrecip;
    window.precipitationChart.data.datasets[1].data = hourlyHumidity;
    window.precipitationChart.update();
}

// Update content based on selected time period
function updateForTimePeriod(period) {
    // This would typically fetch different data or display different views
    // based on the selected time period (Today, This Week, This Month, Custom)
    console.log(`Updating for period: ${period}`);
    
    // For demonstration, we'll just show an alert
    // In a real app, you'd update charts and data for the selected period
    // showMessage(`Displaying weather data for: ${period}`);
}

// Update tab content
function updateTabContent(tab) {
    const tabText = tab.textContent.trim();
    const cardTitle = tab.closest('.card').querySelector('.card-title').textContent.trim();
    
    console.log(`Updating ${cardTitle} tab: ${tabText}`);
    
    // In a real app, you would update the chart or content based on the tab
    // For example, switch between hourly and daily data for charts
}

// Toggle location dropdown
function toggleLocationDropdown() {
    // In a real app, you would show a dropdown with recent locations
    // For demonstration, we'll just use the search box
    document.getElementById('search-input').focus();
}

// Handle sidebar toggle
function handleSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
    
    // Update toggle button icon
    const toggleIcon = document.querySelector('#sidebarToggle i');
    if (sidebar.classList.contains('collapsed')) {
        toggleIcon.className = 'fas fa-chevron-left';
    } else {
        toggleIcon.className = 'fas fa-chevron-right';
    }
}

// Helper function to update weather icon
function updateWeatherIcon(elementId, weatherCode) {
    const iconElement = document.getElementById(elementId);
    iconElement.className = getWeatherIconClass(weatherCode);
}

// Helper function to get weather icon class based on weather code
function getWeatherIconClass(weatherCode) {
    // Map OpenWeatherMap weather codes to FontAwesome icons
    if (weatherCode >= 200 && weatherCode < 300) {
        return 'fas fa-bolt'; // Thunderstorm
    } else if (weatherCode >= 300 && weatherCode < 400) {
        return 'fas fa-cloud-rain'; // Drizzle
    } else if (weatherCode >= 500 && weatherCode < 600) {
        return 'fas fa-cloud-showers-heavy'; // Rain
    } else if (weatherCode >= 600 && weatherCode < 700) {
        return 'fas fa-snowflake'; // Snow
    } else if (weatherCode >= 700 && weatherCode < 800) {
        return 'fas fa-smog'; // Atmosphere (fog, mist, etc.)
    } else if (weatherCode === 800) {
        return 'fas fa-sun'; // Clear sky
    } else if (weatherCode === 801) {
        return 'fas fa-cloud-sun'; // Few clouds
    } else {
        return 'fas fa-cloud'; // Clouds
    }
}

// Helper function to format time (12-hour format with AM/PM)
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Helper function to format hour for charts
function formatHour(hour) {
    return `${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}`;
}

// Show/hide loading indicator
function showLoading(show) {
    // In a real app, you would have a loading spinner
    // For demonstration, we'll just log to console
    console.log(show ? 'Loading...' : 'Loaded');
}

// Show error message
function showError(message) {
    console.error(message);
    // In a real app, you would show a toast or alert with the error message
    alert(message);
}

// Show message/notification
function showMessage(message) {
    // In a real app, you would show a toast or notification
    console.log(message);
}

// Cache weather data for offline use or performance
function cacheWeatherData(data) {
    // Save to localStorage
    const cacheData = {
        timestamp: Date.now(),
        location: currentLocation,
        data: data
    };
    
    try {
        localStorage.setItem('weatherCache', JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Failed to cache weather data:', error);
    }
}

// Load cached weather data
function loadCachedWeatherData() {
    try {
        const cachedData = localStorage.getItem('weatherCache');
        if (!cachedData) return null;
        
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        
        // Return cached data if it's less than 30 minutes old
        if (cacheAge < 30 * 60 * 1000) {
            return parsed;
        }
    } catch (error) {
        console.warn('Failed to load cached weather data:', error);
    }
    
    return null;
}

// Function to handle unit conversion
function toggleUnits() {
    // Toggle between metric and imperial
    units = units === 'metric' ? 'imperial' : 'metric';
    
    // Refetch data with new units
    fetchWeatherData(currentLocation.lat, currentLocation.lon);
    
    // Save preference
    localStorage.setItem('weatherUnits', units);
}

// Function to load saved preferences
function loadPreferences() {
    // Load preferred units
    const savedUnits = localStorage.getItem('weatherUnits');
    if (savedUnits) {
        units = savedUnits;
    }
    
    // Load saved locations (would be implemented in a real app)
    // ...
}

// Function to search by browser geolocation
function useCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Got coordinates
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Reverse geocode to get location name
                fetch(`${GEO_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.length > 0) {
                            currentLocation = {
                                city: data[0].name,
                                state: data[0].state || "",
                                country: data[0].country,
                                lat: lat,
                                lon: lon
                            };
                            
                            updateLocationDisplay();
                        }
                        
                        // Fetch weather data
                        fetchWeatherData(lat, lon);
                    })
                    .catch(error => {
                        console.error("Error in reverse geocoding:", error);
                        // Even if geocoding fails, still fetch weather
                        fetchWeatherData(lat, lon);
                    });
            },
            (error) => {
                console.error("Geolocation error:", error);
                showError("Failed to get your location. Please search manually.");
                loadDefaultLocation();
            }
        );
    } else {
        showError("Geolocation is not supported by this browser.");
        loadDefaultLocation();
    }
}