// ** IMPORTANT: Replace 'YOUR_API_KEY' with your actual OpenWeatherMap API Key **
const API_KEY = 'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API key}';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const currentWeatherDiv = document.getElementById('current-weather');
const forecastSection = document.querySelector('.forecast-section');
const forecastContainer = document.getElementById('forecast-container');
const errorMessage = document.getElementById('error-message');

// Utility Functions
const showElement = (el) => el.classList.remove('hidden');
const hideElement = (el) => el.classList.add('hidden');
const formatTime = (timestamp, timezoneOffset) => {
    // Converts UNIX timestamp and timezone offset (seconds) to a readable time string
    const date = new Date((timestamp + timezoneOffset) * 1000);
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return date.toUTCString().slice(-12, -7) + (date.toUTCString().slice(-4, -1)); // Simple time format with AM/PM
};

const displayError = (message) => {
    errorMessage.textContent = message;
    showElement(errorMessage);
    hideElement(currentWeatherDiv);
    hideElement(forecastSection);
};

const clearError = () => {
    hideElement(errorMessage);
};

// --- API Fetching Functions ---

const fetchWeatherData = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('City not found. Please check the name.');
            }
            throw new Error(`Weather data failed to fetch (Status: ${response.status})`);
        }
        return await response.json();
    } catch (error) {
        displayError(`Error: ${error.message}`);
        return null;
    }
};

const getWeatherByCoords = async (lat, lon) => {
    clearError();
    const currentUrl = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const forecastUrl = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    const [currentData, forecastData] = await Promise.all([
        fetchWeatherData(currentUrl),
        fetchWeatherData(forecastUrl)
    ]);

    if (currentData && forecastData) {
        displayCurrentWeather(currentData);
        displayForecast(forecastData);
    }
};

const getWeatherByCity = async (city) => {
    clearError();
    if (!city) {
        displayError('Please enter a city name.');
        return;
    }
    const currentUrl = `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`;
    const forecastUrl = `${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`;

    const [currentData, forecastData] = await Promise.all([
        fetchWeatherData(currentUrl),
        fetchWeatherData(forecastUrl)
    ]);

    if (currentData && forecastData) {
        displayCurrentWeather(currentData);
        displayForecast(forecastData);
    }
};


// --- Display Functions ---

const displayCurrentWeather = (data) => {
    const { main, weather, wind, sys, name, timezone } = data;
    const weatherIconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;

    document.getElementById('location-name').textContent = name;
    document.getElementById('temp-icon').innerHTML = `<img src="${weatherIconUrl}" alt="${weather[0].description}" width="50" height="50">`;
    document.getElementById('current-temp').textContent = Math.round(main.temp);
    document.getElementById('current-condition').textContent = weather[0].description;
    document.getElementById('current-humidity').textContent = main.humidity;
    document.getElementById('current-wind').textContent = wind.speed.toFixed(1);
    document.getElementById('sunrise-time').textContent = formatTime(sys.sunrise, timezone);
    document.getElementById('sunset-time').textContent = formatTime(sys.sunset, timezone);

    showElement(currentWeatherDiv);
};

const displayForecast = (data) => {
    forecastContainer.innerHTML = ''; // Clear previous forecast

    // OpenWeatherMap provides data every 3 hours. We pick one entry per day for 5 days.
    const fiveDayForecast = data.list.filter((reading) => {
        // Filter for the reading closest to 12:00:00 (midday) each day
        return reading.dt_txt.includes("12:00:00");
    }).slice(0, 5); // Ensure exactly 5 days

    if (fiveDayForecast.length === 0) {
        // Fallback for cities with sparse data, just grab the next 5 readings
        fiveDayForecast.push(...data.list.slice(0, 5));
    }


    fiveDayForecast.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const temp = Math.round(item.main.temp);
        const description = item.weather[0].description;
        const iconCode = item.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;

        const forecastItemHTML = `
            <div class="forecast-item">
                <p class="forecast-day">${dayName}</p>
                <img src="${iconUrl}" alt="${description}" width="40" height="40">
                <p class="forecast-temp">${temp}°C</p>
                <p class="forecast-desc">${description}</p>
            </div>
        `;
        forecastContainer.insertAdjacentHTML('beforeend', forecastItemHTML);
    });

    showElement(forecastSection);
};

// --- Event Listeners and GeoLocation ---

const handleSearch = () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherByCity(city);
    }
};

searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

const handleLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            (error) => {
                let msg = 'Geolocation failed. Ensure location services are enabled.';
                if (error.code === error.PERMISSION_DENIED) {
                    msg = 'You denied location access. Please use the city search.';
                }
                displayError(msg);
            }
        );
    } else {
        displayError('Geolocation is not supported by your browser.');
    }
};

locationBtn.addEventListener('click', handleLocation);

// Initial Load: Check for any default location or prompt user
window.onload = () => {
    // Optionally trigger location check or a default city like 'London' or 'Tokyo'
    // handleLocation(); // Uncomment to prompt for location on load
};