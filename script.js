// Form state
const state = {
  airport: null,
  airportName: null,
  parkingFromDate: null,
  parkingFromTime: null,
  parkingToDate: null,
  parkingToTime: null,
  outboundFlight: null,
  returnFlight: null,
  userLocation: null
};

// Airport data
const airports = {
  'LHR': { name: 'Heathrow', lat: 51.4700, lon: -0.4543 },
  'LGW': { name: 'Gatwick', lat: 51.1537, lon: -0.1821 },
  'STN': { name: 'Stansted', lat: 51.8860, lon: 0.2389 },
  'LTN': { name: 'Luton', lat: 51.8747, lon: -0.3683 },
  'LCY': { name: 'London City', lat: 51.5053, lon: 0.0553 },
  'SEN': { name: 'Southend', lat: 51.5714, lon: 0.6956 },
  'BHX': { name: 'Birmingham', lat: 52.4539, lon: -1.7480 },
  'MAN': { name: 'Manchester', lat: 53.3537, lon: -2.2750 },
  'EMA': { name: 'East Midlands', lat: 52.8311, lon: -1.3278 },
  'BRS': { name: 'Bristol', lat: 51.3827, lon: -2.7190 },
  'LBA': { name: 'Leeds Bradford', lat: 53.8659, lon: -1.6605 },
  'NCL': { name: 'Newcastle', lat: 55.0375, lon: -1.6917 },
  'EDI': { name: 'Edinburgh', lat: 55.9500, lon: -3.3725 },
  'GLA': { name: 'Glasgow', lat: 55.8719, lon: -4.4331 },
  'ABZ': { name: 'Aberdeen', lat: 57.2020, lon: -2.1978 },
  'CWL': { name: 'Cardiff', lat: 51.3968, lon: -3.3436 }
};

// Mock flight data
const mockFlights = {
  'LHR': [
    { number: 'BA2561', airline: 'British Airways', departure: '07:00', arrival: '09:30', destination: 'Malaga', destinationCode: 'AGP' },
    { number: 'EZY8901', airline: 'easyJet', departure: '09:15', arrival: '12:45', destination: 'Alicante', destinationCode: 'ALC' },
    { number: 'BA456', airline: 'British Airways', departure: '11:30', arrival: '14:00', destination: 'Barcelona', destinationCode: 'BCN' }
  ],
  'LGW': [
    { number: 'U25725', airline: 'easyJet', departure: '07:00', arrival: '10:15', destination: 'Gran Canaria', destinationCode: 'LPA' },
    { number: 'BY123', airline: 'TUI', departure: '09:30', arrival: '12:45', destination: 'Tenerife', destinationCode: 'TFS' }
  ]
};

// Current step
let currentStep = 1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  checkURLParams();
});

function initializeApp() {
  setupAirportSelection();
  setupGPSButton();
}

// Check URL parameters
function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location');

  if (locationParam) {
    // Auto-select airport from URL parameter
    const airport = locationParam.toUpperCase();
    if (airports[airport]) {
      state.airport = airport;
      state.airportName = airports[airport].name;
      goToStep(2);
    }
  }
}

// Airport Selection
function setupAirportSelection() {
  // Nearest airport chips
  document.querySelectorAll('.airport-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      handleAirportSelection(btn.dataset.airport, btn);
    });
  });

  // All airports list
  document.querySelectorAll('.airport-item').forEach(btn => {
    btn.addEventListener('click', () => {
      handleAirportSelection(btn.dataset.airport, btn);
    });
  });
}

function handleAirportSelection(airportCode, button) {
  state.airport = airportCode;
  state.airportName = airports[airportCode].name;

  // Add clicked class with 250ms delay
  button.classList.add('clicked');

  setTimeout(() => {
    button.classList.remove('clicked');
    goToStep(2);
  }, 250);
}

// GPS Button
function setupGPSButton() {
  const gpsBtn = document.getElementById('gps-btn');
  const gpsText = document.getElementById('gps-text');

  gpsBtn.addEventListener('click', () => {
    gpsText.textContent = 'Getting location...';

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          state.userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };

          const nearest = findNearestAirports(state.userLocation);
          updateNearestAirports(nearest);

          gpsText.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> ${state.userLocation.lat.toFixed(4)}°N ${state.userLocation.lon.toFixed(4)}°E`;
        },
        error => {
          gpsText.textContent = 'Location access denied';
        }
      );
    } else {
      gpsText.textContent = 'GPS not available';
    }
  });
}

function findNearestAirports(location) {
  const airportDistances = Object.entries(airports).map(([code, airport]) => {
    const distance = calculateDistance(
      location.lat, location.lon,
      airport.lat, airport.lon
    );
    return { code, ...airport, distance };
  });

  return airportDistances.sort((a, b) => a.distance - b.distance).slice(0, 4);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function updateNearestAirports(nearest) {
  const container = document.getElementById('nearest-airports');
  container.innerHTML = '';

  nearest.forEach(airport => {
    const btn = document.createElement('button');
    btn.className = 'airport-chip';
    btn.dataset.airport = airport.code;
    btn.textContent = `${airport.name} (${airport.distance.toFixed(0)}km)`;
    btn.addEventListener('click', () => {
      handleAirportSelection(airport.code, btn);
    });
    container.appendChild(btn);
  });
}

// Step Navigation
function goToStep(stepNumber) {
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  currentStep = stepNumber;

  switch(stepNumber) {
    case 1:
      document.getElementById('step-airport').classList.remove('hidden');
      break;
    case 2:
      document.getElementById('step-parking-from').classList.remove('hidden');
      renderCalendar('calendar-from', handleParkingFromSelection);
      break;
    case 3:
      document.getElementById('step-outbound-flight').classList.remove('hidden');
      setupOutboundFlightSearch();
      break;
    case 4:
      document.getElementById('step-dropoff-time').classList.remove('hidden');
      setupDropoffTime();
      break;
    case 5:
      document.getElementById('step-parking-to').classList.remove('hidden');
      renderReturnCalendar();
      break;
    case 6:
      document.getElementById('step-return-flight').classList.remove('hidden');
      setupReturnFlightSearch();
      break;
    case 7:
      document.getElementById('step-collection-time').classList.remove('hidden');
      setupCollectionTime();
      break;
    case 8:
      document.getElementById('step-summary').classList.remove('hidden');
      renderSummary();
      break;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Calendar Rendering
function renderCalendar(containerId, onDateSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const today = new Date();
  const months = 4; // Show 4 months

  for (let i = 0; i < months; i++) {
    const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthEl = createMonthCalendar(month, onDateSelect, today);
    container.appendChild(monthEl);
  }
}

function createMonthCalendar(month, onDateSelect, today) {
  const monthEl = document.createElement('div');
  monthEl.className = 'calendar-month';

  const monthTitle = document.createElement('div');
  monthTitle.className = 'calendar-month-title';
  monthTitle.textContent = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  monthEl.appendChild(monthTitle);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // Day headers
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  days.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    grid.appendChild(header);
  });

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Adjust so Monday = 0

  // Empty cells before first day
  for (let i = 0; i < adjustedFirstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }

  // Days of month
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const dayEl = document.createElement('button');
    dayEl.className = 'calendar-day';
    dayEl.textContent = day;

    const dateStr = formatDate(date);
    const isPast = date < today && !isSameDay(date, today);

    if (isPast) {
      dayEl.classList.add('past');
      dayEl.disabled = true;
    } else {
      if (isSameDay(date, today)) {
        dayEl.classList.add('today');
      }

      if (state.parkingFromDate && dateStr === state.parkingFromDate) {
        dayEl.classList.add('start-date');
      }

      dayEl.addEventListener('click', () => {
        dayEl.classList.add('clicked');
        setTimeout(() => {
          dayEl.classList.remove('clicked');
          onDateSelect(date);
        }, 250);
      });
    }

    grid.appendChild(dayEl);
  }

  monthEl.appendChild(grid);
  return monthEl;
}

function renderReturnCalendar() {
  const container = document.getElementById('calendar-to');
  container.innerHTML = '';

  // Update reminder bar
  const reminderBar = document.getElementById('return-reminder-bar');
  const dropoffDate = new Date(state.parkingFromDate);
  reminderBar.textContent = `Dropping off: ${formatLongDate(dropoffDate)} at ${state.parkingFromTime}`;

  // Start from parking from date
  const startDate = new Date(state.parkingFromDate);
  const months = 4;

  for (let i = 0; i < months; i++) {
    const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const monthEl = createReturnMonthCalendar(month, startDate);
    container.appendChild(monthEl);
  }
}

function createReturnMonthCalendar(month, minDate) {
  const monthEl = document.createElement('div');
  monthEl.className = 'calendar-month';

  const monthTitle = document.createElement('div');
  monthTitle.className = 'calendar-month-title';
  monthTitle.textContent = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  monthEl.appendChild(monthTitle);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // Day headers
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  days.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    grid.appendChild(header);
  });

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < adjustedFirstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const dayEl = document.createElement('button');
    dayEl.className = 'calendar-day';
    dayEl.textContent = day;

    const dateStr = formatDate(date);
    const isPast = date < minDate;

    if (isPast) {
      dayEl.classList.add('past');
      dayEl.disabled = true;
    } else {
      if (isSameDay(date, minDate)) {
        dayEl.classList.add('start-date');
      }

      dayEl.addEventListener('click', () => {
        dayEl.classList.add('clicked');
        setTimeout(() => {
          dayEl.classList.remove('clicked');
          handleParkingToSelection(date);
        }, 250);
      });
    }

    grid.appendChild(dayEl);
  }

  monthEl.appendChild(grid);
  return monthEl;
}

function handleParkingFromSelection(date) {
  state.parkingFromDate = formatDate(date);
  goToStep(3);
}

function handleParkingToSelection(date) {
  state.parkingToDate = formatDate(date);
  goToStep(6);
}

// Flight Search
function setupOutboundFlightSearch() {
  const subtitle = document.getElementById('outbound-subtitle');
  const parkingDate = new Date(state.parkingFromDate);
  subtitle.textContent = `${state.airportName} → ${formatLongDateShort(parkingDate)}`;

  const skipBtn = document.getElementById('skip-outbound');
  skipBtn.addEventListener('click', () => goToStep(4), { once: true });

  const searchInput = document.getElementById('flight-search-out');
  const flightList = document.getElementById('flight-list-out');

  const flights = mockFlights[state.airport] || [];
  renderFlights(flights, flightList, handleOutboundFlightSelection);

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = flights.filter(f =>
      f.number.toLowerCase().includes(query) ||
      f.destination.toLowerCase().includes(query) ||
      f.airline.toLowerCase().includes(query)
    );
    renderFlights(filtered, flightList, handleOutboundFlightSelection);
  });
}

function setupReturnFlightSearch() {
  const subtitle = document.getElementById('return-subtitle');
  const returnDate = new Date(state.parkingToDate);
  subtitle.textContent = `${formatLongDateShort(returnDate)} → ${state.airportName}`;

  const skipBtn = document.getElementById('skip-return');
  skipBtn.addEventListener('click', () => goToStep(7), { once: true });

  // Show date selector
  const datesContainer = document.getElementById('return-flight-dates');
  const parkingTo = new Date(state.parkingToDate);
  const dayBefore = new Date(parkingTo);
  dayBefore.setDate(dayBefore.getDate() - 1);

  datesContainer.innerHTML = `
    <button class="flight-date-btn" data-date="${formatDate(dayBefore)}">
      ${formatShortDate(dayBefore)}
    </button>
    <button class="flight-date-btn active" data-date="${formatDate(parkingTo)}">
      ${formatShortDate(parkingTo)}
    </button>
  `;

  // Render flights for selected date
  const flightList = document.getElementById('flight-list-return');
  const flights = mockFlights[state.airport] || [];
  renderReturnFlights(flights, flightList);

  // Date button handlers
  document.querySelectorAll('.flight-date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.flight-date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function renderFlights(flights, container, onSelect) {
  container.innerHTML = '';

  flights.forEach(flight => {
    const flightEl = document.createElement('button');
    flightEl.className = 'flight-item';
    flightEl.innerHTML = `
      <div class="flight-number">
        ${flight.number} • ${flight.airline}
        <span style="margin-left: auto;">${flight.departure}</span>
      </div>
      <div class="flight-times">
        <div class="flight-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
          ${flight.departure}
          <span class="flight-airport">${state.airportName}</span>
        </div>
        <div class="flight-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          ${flight.arrival}
          <span class="flight-airport">${flight.destination}</span>
        </div>
      </div>
    `;

    flightEl.addEventListener('click', () => {
      flightEl.classList.add('clicked');
      setTimeout(() => {
        flightEl.classList.remove('clicked');
        onSelect(flight);
      }, 250);
    });

    container.appendChild(flightEl);
  });
}

function renderReturnFlights(flights, container) {
  container.innerHTML = '';

  flights.forEach(flight => {
    const flightEl = document.createElement('button');
    flightEl.className = 'flight-item';
    flightEl.innerHTML = `
      <div class="flight-number">
        ${flight.number} • ${flight.airline}
        <span style="margin-left: auto;">${flight.departure}</span>
      </div>
      <div class="flight-times">
        <div class="flight-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
          ${flight.departure}
          <span class="flight-airport">${flight.destination}</span>
        </div>
        <div class="flight-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          ${flight.arrival}
          <span class="flight-airport">${state.airportName}</span>
        </div>
      </div>
    `;

    flightEl.addEventListener('click', () => {
      flightEl.classList.add('clicked');
      setTimeout(() => {
        flightEl.classList.remove('clicked');
        handleReturnFlightSelection(flight);
      }, 250);
    });

    container.appendChild(flightEl);
  });
}

function handleOutboundFlightSelection(flight) {
  state.outboundFlight = flight;
  goToStep(4);
}

function handleReturnFlightSelection(flight) {
  state.returnFlight = flight;
  goToStep(7);
}

// Time Selection
function setupDropoffTime() {
  const reminder = document.getElementById('dropoff-reminder');

  if (state.outboundFlight) {
    const flightTime = state.outboundFlight.departure;
    const preselectedTime = calculatePreselectedTime(flightTime, -3);

    reminder.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
      <div class="flight-reminder-text">
        ${state.outboundFlight.number} to ${state.outboundFlight.destination} • departs ${flightTime} • ${formatLongDate(new Date(state.parkingFromDate))} • ${state.airportName}
      </div>
    `;

    renderTimeGrid('time-grid-dropoff', handleDropoffTimeSelection, preselectedTime);
  } else {
    reminder.style.display = 'none';
    renderTimeGrid('time-grid-dropoff', handleDropoffTimeSelection);
  }
}

function setupCollectionTime() {
  const reminder = document.getElementById('collection-reminder');
  const subtitle = document.getElementById('collection-subtitle');

  if (state.returnFlight) {
    const flightTime = state.returnFlight.arrival;
    const preselectedTime = calculatePreselectedTime(flightTime, 2);

    const returnDate = new Date(state.parkingToDate);
    subtitle.textContent = `What time will you collect your car on ${formatShortDate(returnDate)}?`;

    reminder.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
      <div class="flight-reminder-text">
        ${state.returnFlight.number} lands ${flightTime} • ${formatLongDate(returnDate)} • ${state.airportName}
      </div>
    `;

    renderTimeGrid('time-grid-collection', handleCollectionTimeSelection, preselectedTime);
  } else {
    reminder.style.display = 'none';
    const returnDate = new Date(state.parkingToDate);
    subtitle.textContent = `What time will you collect your car on ${formatShortDate(returnDate)}?`;
    renderTimeGrid('time-grid-collection', handleCollectionTimeSelection);
  }
}

function renderTimeGrid(containerId, onSelect, preselectedTime) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const times = [];
  for (let h = 0; h < 24; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`);
  }
  times.push('23:59');

  times.forEach(time => {
    const btn = document.createElement('button');
    btn.className = 'time-btn';
    btn.textContent = time;

    if (preselectedTime && time === preselectedTime) {
      btn.classList.add('preselected');
    }

    btn.addEventListener('click', () => {
      // Remove preselected from all
      container.querySelectorAll('.time-btn').forEach(b => b.classList.remove('preselected'));

      btn.classList.add('clicked');
      setTimeout(() => {
        btn.classList.remove('clicked');
        onSelect(time);
      }, 250);
    });

    container.appendChild(btn);
  });
}

function calculatePreselectedTime(flightTime, hourOffset) {
  const [hours, minutes] = flightTime.split(':').map(Number);
  let newHours = hours + hourOffset;

  if (newHours < 0) newHours = 0;
  if (newHours > 23) newHours = 23;

  return `${String(newHours).padStart(2, '0')}:00`;
}

function handleDropoffTimeSelection(time) {
  state.parkingFromTime = time;
  goToStep(5);
}

function handleCollectionTimeSelection(time) {
  state.parkingToTime = time;
  goToStep(8);
}

// Summary
function renderSummary() {
  document.getElementById('summary-airport').textContent = state.airportName;

  const dropoffDate = new Date(state.parkingFromDate);
  document.getElementById('summary-dropoff').textContent =
    `${formatLongDate(dropoffDate)} at ${state.parkingFromTime}`;

  if (state.outboundFlight) {
    document.getElementById('summary-dropoff-flight').innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
      ${state.outboundFlight.number} to ${state.outboundFlight.destination} at ${state.outboundFlight.departure}
    `;
  }

  const pickupDate = new Date(state.parkingToDate);
  document.getElementById('summary-pickup').textContent =
    `${formatLongDate(pickupDate)} at ${state.parkingToTime}`;

  if (state.returnFlight) {
    document.getElementById('summary-pickup-flight').innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
      ${state.returnFlight.number} from ${state.returnFlight.destination} at ${state.returnFlight.arrival}
    `;
  }

  document.getElementById('search-btn').addEventListener('click', performSearch, { once: true });
}

function performSearch() {
  // Build Holiday Extras search URL
  const params = new URLSearchParams({
    product: 'PAR',
    location: state.airport,
    arrive_date: state.parkingFromDate.replace(/-/g, ''),
    arrive_time: state.parkingFromTime.replace(':', ''),
    depart_date: state.parkingToDate.replace(/-/g, ''),
    depart_time: state.parkingToTime.replace(':', '')
  });

  if (state.outboundFlight) {
    params.set('OutFltNo', state.outboundFlight.number);
    params.set('OutFltTm', state.outboundFlight.departure.replace(':', ''));
  }

  if (state.returnFlight) {
    params.set('InFltNo', state.returnFlight.number);
    params.set('InFltTm', state.returnFlight.arrival.replace(':', ''));
  }

  const url = `https://www.holidayextras.com/search-results.html?${params.toString()}`;
  window.location.href = url;
}

// Utility Functions
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLongDate(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatLongDateShort(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatShortDate(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${days[date.getDay()]} ${day} ${month}`;
}

function isSameDay(date1, date2) {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}
