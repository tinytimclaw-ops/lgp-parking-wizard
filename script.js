// Flight API base URL
const FLIGHT_API = 'https://flight.dock-yard.io';

// Airport names mapping
const AIRPORT_NAMES = {
  LHR: 'Heathrow', LGW: 'Gatwick', MAN: 'Manchester', STN: 'Stansted',
  LTN: 'Luton', BHX: 'Birmingham', EDI: 'Edinburgh', BRS: 'Bristol',
  NCL: 'Newcastle', LBA: 'Leeds Bradford', EMA: 'East Midlands',
  LPL: 'Liverpool', GLA: 'Glasgow', EXT: 'Exeter', LCY: 'London City',
  SEN: 'Southend', ABZ: 'Aberdeen', CWL: 'Cardiff'
};

// Form state with localStorage persistence
function loadState() {
  const saved = localStorage.getItem('parkingWizardState');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveState() {
  localStorage.setItem('parkingWizardState', JSON.stringify(state));
}

const state = {
  airport: null,
  airportName: null,
  parkingFromDate: null,
  parkingFromTime: null,
  parkingToDate: null,
  parkingToTime: null,
  outboundFlight: null,
  returnFlight: null,
  agent: 'WY992',
  adcode: '',
  promotionCode: '',
  ...loadState()
};

// Airport lat/lon for GPS
const airportCoords = {
  LHR: [51.4700, -0.4543], LGW: [51.1537, -0.1821], STN: [51.8860, 0.2389],
  LTN: [51.8747, -0.3683], LCY: [51.5053, 0.0553], SEN: [51.5714, 0.6956],
  BHX: [52.4539, -1.7480], MAN: [53.3537, -2.2750], EMA: [52.8311, -1.3278],
  BRS: [51.3827, -2.7190], LBA: [53.8659, -1.6605], NCL: [55.0375, -1.6917],
  EDI: [55.9500, -3.3725], GLA: [55.8719, -4.4331], ABZ: [57.2020, -2.1978],
  CWL: [51.3968, -3.3436]
};

// Update header title
function updateHeaderTitle() {
  const headerTitle = document.getElementById('header-title');
  if (state.airportName) {
    headerTitle.textContent = `${state.airportName} Airport Parking`;
  } else {
    headerTitle.textContent = 'Airport Parking';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupHashRouting();
  setupAirportSelection();
  setupGPSButton();
  updateHeaderTitle();

  // Check URL params first - if airport is set, skip to step 2
  const hasAirportParam = checkURLParams();

  // Set initial step from hash or default
  if (!hasAirportParam && !window.location.hash) {
    window.location.hash = '#/airport';
  }
  handleHashChange();
});

// Hash-based routing
const STEP_ROUTES = {
  1: 'airport',
  2: 'parking-dates',
  3: 'outbound-flight',
  4: 'drop-off-time',
  5: 'return-date',
  6: 'return-flight',
  7: 'collection-time',
  8: 'summary'
};

const ROUTE_TO_STEP = Object.fromEntries(
  Object.entries(STEP_ROUTES).map(([step, route]) => [route, parseInt(step)])
);

function setupHashRouting() {
  window.addEventListener('hashchange', handleHashChange);
}

function handleHashChange() {
  const hash = window.location.hash.replace('#/', '');
  const stepNum = ROUTE_TO_STEP[hash] || 1;
  showStep(stepNum);
}

function showStep(stepNum) {
  document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
  const stepEl = document.querySelector(`[data-step="${stepNum}"]`);
  if (stepEl) {
    stepEl.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Initialize step-specific content
    if (stepNum === 2) renderCalendarFrom();
    if (stepNum === 3) setupOutboundFlightSearch();
    if (stepNum === 4) setupDropoffTime();
    if (stepNum === 5) renderCalendarTo();
    if (stepNum === 6) setupReturnFlightSearch();
    if (stepNum === 7) setupCollectionTime();
    if (stepNum === 8) renderSummary();
  }
}

function goToStep(stepNum) {
  window.location.hash = `#/${STEP_ROUTES[stepNum]}`;
}

// URL params
function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  const location = params.get('location') || params.get('Location') || params.get('airport');

  // Capture all marketing params
  if (params.get('agent')) state.agent = params.get('agent');
  if (params.get('adcode')) state.adcode = params.get('adcode');
  if (params.get('promotionCode')) state.promotionCode = params.get('promotionCode');

  if (location) {
    const airportCode = location.toUpperCase();
    if (AIRPORT_NAMES[airportCode]) {
      state.airport = airportCode;
      state.airportName = AIRPORT_NAMES[airportCode];
      document.title = `${state.airportName} Airport Parking`;
      updateHeaderTitle();
      saveState();
      goToStep(2);
      return true;
    }
  }

  // Save params even if no location
  saveState();
  return false;
}

// Airport selection
function setupAirportSelection() {
  document.querySelectorAll('.airport-chip, .airport-item').forEach(btn => {
    btn.addEventListener('click', () => handleAirportClick(btn));
    // Restore selected state
    if (state.airport && btn.dataset.airport === state.airport) {
      btn.classList.add('clicked');
    }
  });
}

function handleAirportClick(btn) {
  const code = btn.dataset.airport;
  state.airport = code;
  state.airportName = AIRPORT_NAMES[code];
  saveState();
  document.title = `${state.airportName} Airport Parking`;
  updateHeaderTitle();

  btn.classList.add('clicked');
  setTimeout(() => {
    btn.classList.remove('clicked');
    goToStep(2);
  }, 250);
}

// GPS
function setupGPSButton() {
  const btn = document.getElementById('gps-btn');
  const text = document.getElementById('gps-text');

  // Restore saved GPS position
  const savedGPS = localStorage.getItem('parkingWizardGPS');
  if (savedGPS) {
    try {
      const { lat, lon } = JSON.parse(savedGPS);
      const nearest = findNearestAirports(lat, lon);
      updateNearestAirports(nearest);
      text.textContent = `GPS: ${lat.toFixed(4)}°N ${lon.toFixed(4)}°E`;
    } catch (e) {
      // Ignore invalid GPS data
    }
  }

  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      text.textContent = 'GPS not available';
      return;
    }

    text.textContent = 'Getting location...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const nearest = findNearestAirports(lat, lon);
        updateNearestAirports(nearest);
        text.textContent = `GPS: ${lat.toFixed(4)}°N ${lon.toFixed(4)}°E`;
        // Save GPS position
        localStorage.setItem('parkingWizardGPS', JSON.stringify({ lat, lon }));
      },
      () => { text.textContent = 'Location denied'; }
    );
  });
}

function findNearestAirports(lat, lon) {
  const distances = Object.entries(airportCoords).map(([code, [aLat, aLon]]) => ({
    code,
    name: AIRPORT_NAMES[code],
    distance: haversine(lat, lon, aLat, aLon)
  }));
  return distances.sort((a, b) => a.distance - b.distance).slice(0, 4);
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function updateNearestAirports(airports) {
  const container = document.getElementById('nearest-airports');
  container.innerHTML = '';
  airports.forEach(ap => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'airport-chip';
    btn.dataset.airport = ap.code;
    btn.textContent = ap.name;
    btn.addEventListener('click', () => handleAirportClick(btn));
    container.appendChild(btn);
  });
}

// Calendar
function renderCalendarFrom() {
  renderCalendar('calendar-from', date => {
    state.parkingFromDate = formatDate(date);
    saveState();
    goToStep(3);
  });
}

function renderCalendarTo() {
  const bar = document.getElementById('return-reminder-bar');
  const dropoffDate = new Date(state.parkingFromDate);
  bar.textContent = `Dropping off: ${formatLongDate(dropoffDate)} at ${state.parkingFromTime}`;

  // minDate is the day AFTER dropoff (prevent same-day returns)
  const minDate = new Date(state.parkingFromDate);
  minDate.setDate(minDate.getDate() + 1);

  renderCalendar('calendar-to', date => {
    state.parkingToDate = formatDate(date);
    saveState();
    goToStep(6);
  }, minDate);
}

function renderCalendar(containerId, onSelect, minDate = new Date()) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  const today = new Date();
  for (let i = 0; i < 4; i++) {
    const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
    container.appendChild(createMonthCalendar(month, onSelect, minDate, today));
  }
}

function createMonthCalendar(month, onSelect, minDate, today) {
  const div = document.createElement('div');
  div.className = 'calendar-month';
  
  const title = document.createElement('div');
  title.className = 'calendar-month-title';
  title.textContent = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  div.appendChild(title);
  
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach(day => {
    const h = document.createElement('div');
    h.className = 'calendar-day-header';
    h.textContent = day;
    grid.appendChild(h);
  });
  
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  
  for (let i = 0; i < offset; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }
  
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);

    const isPast = date < minDate && !isSameDay(date, minDate);
    if (isPast) {
      // Hide past dates instead of showing them disabled
      const empty = document.createElement('div');
      empty.className = 'calendar-day empty';
      grid.appendChild(empty);
      continue;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calendar-day';
    btn.textContent = day;

    if (isSameDay(date, today)) btn.classList.add('today');
    if (state.parkingFromDate && formatDate(date) === state.parkingFromDate) btn.classList.add('start-date');

    btn.addEventListener('click', () => {
      btn.classList.add('clicked');
        setTimeout(() => {
          btn.classList.remove('clicked');
          onSelect(date);
        }, 250);
      });
    }
    
    grid.appendChild(btn);
  }
  
  div.appendChild(grid);
  return div;
}

// Flight lookup
async function setupOutboundFlightSearch() {
  const subtitle = document.getElementById('outbound-subtitle');
  const loading = document.getElementById('flight-loading-out');
  const flightList = document.getElementById('flight-list-out');
  const searchBox = document.getElementById('flight-search-out');
  const searchInput = document.getElementById('flight-search-input');

  const date = new Date(state.parkingFromDate);
  subtitle.textContent = `${state.airportName} → ${formatShortDate(date)}`;

  document.getElementById('skip-outbound').onclick = () => goToStep(4);

  loading.style.display = 'block';
  flightList.innerHTML = '';
  searchBox.style.display = 'none';

  try {
    const dateStr = state.parkingFromDate;
    const url = `${FLIGHT_API}/searchDayFlights?location=${state.airport}&departDate=${dateStr}&noCodeShares=1&fullResults=true`;
    const res = await fetch(url);
    const flights = await res.json();

    loading.style.display = 'none';

    if (flights.length === 0) {
      flightList.innerHTML = '<p style="text-align:center;padding:20px;color:#767d7d;">No flights found</p>';
      return;
    }

    searchBox.style.display = 'block';
    setupFlightSearch(searchInput, flights, flightList, f => {
      state.outboundFlight = f;
      saveState();
      goToStep(4);
    });

    renderFlightList(flights, flightList, f => {
      state.outboundFlight = f;
      saveState();
      goToStep(4);
    });
  } catch (err) {
    loading.style.display = 'none';
    flightList.innerHTML = '<p style="text-align:center;padding:20px;color:#bc140f;">Error loading flights</p>';
  }
}

async function setupReturnFlightSearch() {
  // If no outbound flight selected, skip return flight step automatically
  if (!state.outboundFlight) {
    goToStep(7);
    return;
  }

  const subtitle = document.getElementById('return-subtitle');
  const loading = document.getElementById('flight-loading-return');
  const flightList = document.getElementById('flight-list-return');
  const searchBox = document.getElementById('flight-search-return');
  const searchInput = document.getElementById('flight-search-input-return');

  const date = new Date(state.parkingToDate);
  subtitle.textContent = `${formatShortDate(date)} → ${state.airportName}`;

  document.getElementById('skip-return').onclick = () => goToStep(7);

  loading.style.display = 'block';
  flightList.innerHTML = '';
  searchBox.style.display = 'none';

  try {
    const dateStr = state.parkingToDate;
    const outboundDestination = state.outboundFlight.arrival.airport_iata;
    const url = `${FLIGHT_API}/searchDayFlights?location=${outboundDestination}&departDate=${dateStr}&country=&destination=${state.airport}&noCodeShares=1`;

    const res = await fetch(url);
    const flights = await res.json();

    loading.style.display = 'none';

    if (flights.length === 0) {
      flightList.innerHTML = '<p style="text-align:center;padding:20px;color:#767d7d;">No flights found</p>';
      return;
    }

    searchBox.style.display = 'block';
    setupFlightSearch(searchInput, flights, flightList, f => {
      state.returnFlight = f;
      saveState();
      goToStep(7);
    });

    renderFlightList(flights, flightList, f => {
      state.returnFlight = f;
      saveState();
      goToStep(7);
    });
  } catch (err) {
    loading.style.display = 'none';
    flightList.innerHTML = '<p style="text-align:center;padding:20px;color:#bc140f;">Error loading flights</p>';
  }
}

function setupFlightSearch(input, allFlights, container, onSelect) {
  input.value = '';
  input.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query === '') {
      renderFlightList(allFlights, container, onSelect);
    } else {
      const filtered = allFlights.filter(f => {
        const code = ((f.flight && f.flight.code) || '').toLowerCase();
        const depIata = ((f.departure && f.departure.airport_iata) || '').toLowerCase();
        const arrIata = ((f.arrival && f.arrival.airport_iata) || '').toLowerCase();
        const depAirport = ((f.departure && f.departure.airport) || '').toLowerCase();
        const arrAirport = ((f.arrival && f.arrival.airport) || '').toLowerCase();
        const depCity = ((f.departure && f.departure.city) || '').toLowerCase();
        const arrCity = ((f.arrival && f.arrival.city) || '').toLowerCase();
        return code.includes(query) ||
               depIata.includes(query) || arrIata.includes(query) ||
               depAirport.includes(query) || arrAirport.includes(query) ||
               depCity.includes(query) || arrCity.includes(query);
      });
      renderFlightList(filtered, container, onSelect);
    }
  });
}

function renderFlightList(flights, container, onSelect) {
  container.innerHTML = '';
  flights.forEach(f => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'flight-item';

    const code = (f.flight && f.flight.code) || '';
    const depTime = (f.departure && f.departure.time) || '';
    const arrTime = (f.arrival && f.arrival.time) || '';
    const depIata = (f.departure && f.departure.airport_iata) || '';
    const arrIata = (f.arrival && f.arrival.airport_iata) || '';
    const depAirport = (f.departure && f.departure.airport) || depIata;
    const arrAirport = (f.arrival && f.arrival.airport) || arrIata;
    const stops = (f.flight && f.flight.connectingFlights && f.flight.connectingFlights.amount) || 0;

    item.innerHTML = `
      <div class="flight-code">${code} <span style="margin-left:auto;">${stops === 0 ? 'Direct' : stops + ' stop' + (stops > 1 ? 's' : '')}</span></div>
      <div class="flight-times">
        <div class="flight-time">${depTime} <span class="flight-airport">${depAirport}</span></div>
        <span style="color:#767d7d;">→</span>
        <div class="flight-time">${arrTime} <span class="flight-airport">${arrAirport}</span></div>
      </div>
    `;

    item.addEventListener('click', () => {
      item.classList.add('clicked');
      setTimeout(() => {
        item.classList.remove('clicked');
        onSelect(f);
      }, 250);
    });

    container.appendChild(item);
  });
}

// Time selection
function setupDropoffTime() {
  const reminder = document.getElementById('dropoff-reminder');
  
  let preselected = '04:00';
  if (state.outboundFlight) {
    reminder.style.display = 'block';
    const f = state.outboundFlight;
    const code = (f.flight && f.flight.code) || '';
    const depTime = (f.departure && f.departure.time) || '';
    const arrIata = (f.arrival && f.arrival.airport_iata) || '';
    reminder.textContent = `${code} to ${arrIata} departs ${depTime} • ${formatLongDate(new Date(state.parkingFromDate))}`;
    
    if (depTime) {
      const [h] = depTime.split(':').map(Number);
      preselected = `${String(Math.max(0, h - 3)).padStart(2, '0')}:00`;
    }
  } else {
    reminder.style.display = 'none';
  }
  
  renderTimeGrid('time-grid-dropoff', time => {
    state.parkingFromTime = time;
    saveState();
    goToStep(5);
  }, preselected);
}

function setupCollectionTime() {
  const reminder = document.getElementById('collection-reminder');
  const subtitle = document.getElementById('collection-subtitle');
  
  const returnDate = new Date(state.parkingToDate);
  subtitle.textContent = `What time will you collect your car on ${formatShortDate(returnDate)}?`;
  
  let preselected = '14:00';
  if (state.returnFlight) {
    reminder.style.display = 'block';
    const f = state.returnFlight;
    const code = (f.flight && f.flight.code) || '';
    const arrTime = (f.arrival && f.arrival.time) || '';
    reminder.textContent = `${code} lands ${arrTime} • ${formatLongDate(returnDate)}`;
    
    if (arrTime) {
      const [h] = arrTime.split(':').map(Number);
      preselected = `${String(Math.min(23, h + 2)).padStart(2, '0')}:00`;
    }
  } else {
    reminder.style.display = 'none';
  }
  
  renderTimeGrid('time-grid-collection', time => {
    state.parkingToTime = time;
    saveState();
    goToStep(8);
  }, preselected);
}

function renderTimeGrid(containerId, onSelect, preselected) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  const times = [];
  for (let h = 0; h < 24; h++) times.push(`${String(h).padStart(2, '0')}:00`);
  times.push('23:59');
  
  times.forEach(time => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'time-btn';
    btn.textContent = time;
    
    if (time === preselected) btn.classList.add('preselected');
    
    btn.addEventListener('click', () => {
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

// Summary
function renderSummary() {
  document.getElementById('summary-airport').textContent = state.airportName;
  
  const dropoffDate = new Date(state.parkingFromDate);
  document.getElementById('summary-dropoff').textContent = `${formatLongDate(dropoffDate)} at ${state.parkingFromTime}`;
  
  const dropoffFlight = document.getElementById('summary-dropoff-flight');
  if (state.outboundFlight) {
    const f = state.outboundFlight;
    const code = (f.flight && f.flight.code) || '';
    const depTime = (f.departure && f.departure.time) || '';
    const depAirport = (f.departure && f.departure.airport) || (f.departure && f.departure.airport_iata) || '';
    const arrAirport = (f.arrival && f.arrival.airport) || (f.arrival && f.arrival.airport_iata) || '';
    dropoffFlight.textContent = `✈ ${code} · ${depAirport} → ${arrAirport} at ${depTime}`;
  } else {
    dropoffFlight.textContent = '';
  }
  
  const pickupDate = new Date(state.parkingToDate);
  document.getElementById('summary-pickup').textContent = `${formatLongDate(pickupDate)} at ${state.parkingToTime}`;
  
  const pickupFlight = document.getElementById('summary-pickup-flight');
  if (state.returnFlight) {
    const f = state.returnFlight;
    const code = (f.flight && f.flight.code) || '';
    const arrTime = (f.arrival && f.arrival.time) || '';
    const depAirport = (f.departure && f.departure.airport) || (f.departure && f.departure.airport_iata) || '';
    const arrAirport = (f.arrival && f.arrival.airport) || (f.arrival && f.arrival.airport_iata) || '';
    pickupFlight.textContent = `✈ ${code} · ${depAirport} → ${arrAirport} at ${arrTime}`;
  } else {
    pickupFlight.textContent = '';
  }
  
  document.getElementById('search-btn').onclick = performSearch;
}

function performSearch() {
  const host = window.location.host;
  const isLocal = host.startsWith('127') || host.includes('github.io');
  const basedomain = isLocal ? 'www.holidayextras.com' : host;

  const outDate = state.parkingFromDate;
  const inDate = state.parkingToDate;
  const outTime = state.parkingFromTime.replace(':', '%3A');
  const inTime = state.parkingToTime.replace(':', '%3A');

  const flight = state.outboundFlight ? ((state.outboundFlight.flight && state.outboundFlight.flight.code) || 'default') : 'default';

  const url = `https://${basedomain}/static/?selectProduct=cp&#/categories?agent=${state.agent}&ppts=&customer_ref=&lang=en&adults=2&depart=${state.airport}&terminal=&arrive=&flight=${flight}&in=${inDate}&out=${outDate}&park_from=${outTime}&park_to=${inTime}&filter_meetandgreet=&filter_parkandride=&children=0&infants=0&redirectReferal=carpark&from_categories=true&adcode=${state.adcode}&promotionCode=${state.promotionCode}`;

  window.location.href = url;
}

// Utilities
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatLongDate(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatShortDate(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function isSameDay(d1, d2) {
  return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
}
