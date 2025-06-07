// --------------------------
// Global Variables & Constants
// --------------------------
let funds = 0;
let monetaryGifts = [];
let currentCategory   = "northIndian";
let foodSearchTerm    = "";
let selectedFoodItems = [];

const PRICE_MAP = {
  // North Indian
  "Dal Makhani":           12000,
  "Paneer Butter Masala":  13000,
  "Chole Bhature":         11000,
  "Rajma Chawal":          11500,
  "Aloo Gobi":             10500,
  "Malai Kofta":           14000,
  "Vegetable Biryani":     12500,
  "Palak Paneer":          13500,
  "Dum Aloo":              11800,
  "Kadai Paneer":          12800,

  // South Indian
  "Masala Dosa":           10000,
  "Idli Sambar":           10200,
  "Uttapam":               10800,
  "Vada":                  10100,
  "Sambar Rice":           11300,
  "Lemon Rice":            10900,
  "Vegetable Upma":        10700,
  "Rasam":                 10300,
  "Bisi Bele Bath":        11700,
  "Coconut Chutney":       10400,

  // Eastern Indian
  "Mishti Doi":            15000,
  "Rosogulla":             14500,
  "Sandesh":               14800,
  "Chena Poda":            15200,
  "Rasgulla":              14700,
  "Malpua":                15500,
  "Chana Dal":             11500,
  "Dalma":                 11900,
  "Posta Payesh":          15800,
  "Bengali Pulao":         12200,

  // Western Indian
  "Dhokla":                10600,
  "Undhiyu":               14000,
  "Gujarati Kadhi":        11200,
  "Puran Poli":            12500,
  "Shrikhand":             13000,
  "Vadapav":               10000,
  "Modak":                 13500,
  "Thepla":                10700,
  "Handvo":                11000,
  "Khandvi":               11800,

  // Special Regional
  "Banarasi Paan":         14500,
  "Agra ka Petha":         15000,
  "Hathras ki Rabdi":      15500,
  "Lucknowi Chaat":        13500,
  "Mathura ke Pedhe":      14800,
  "Amritsar di Lassi":     11200,
  "Hyderabadi Kheer":      14200,
  "Goan Bebinca":          16000,
  "Kerala Payasam":        15300,
  "Rajasthani Gatte ki Sabzi": 13800,

  // Street & Fast Food
  "Pani Puri":             10000,
  "Pav Bhaji":             11000,
  "Chowmein":              10500,
  "Burger":                12000,
  "Vada Pav":              10200,
  "Samosa":                10000,
  "Bread Pakora":          10800,
  "Aloo Tikki":            10600,
  "Frankie":               11500,
  "Momos":                 11200
};
// Food Categories for Add‑On Foods
const FOOD_CATEGORIES = {
  northIndian: [
    "Dal Makhani", "Paneer Butter Masala", "Chole Bhature", "Rajma Chawal", "Aloo Gobi",
    "Malai Kofta", "Vegetable Biryani", "Palak Paneer", "Dum Aloo", "Kadai Paneer"
  ],
  southIndian: [
    "Masala Dosa", "Idli Sambar", "Uttapam", "Vada", "Sambar Rice",
    "Lemon Rice", "Vegetable Upma", "Rasam", "Bisi Bele Bath", "Coconut Chutney"
  ],
  easternIndian: [
    "Mishti Doi", "Rosogulla", "Sandesh", "Chena Poda", "Rasgulla",
    "Malpua", "Chana Dal", "Dalma", "Posta Payesh", "Bengali Pulao"
  ],
  westernIndian: [
    "Dhokla", "Undhiyu", "Gujarati Kadhi", "Puran Poli", "Shrikhand",
    "Vadapav", "Modak", "Thepla", "Handvo", "Khandvi"
  ],
  specialRegionalFoods: [
    "Banarasi Paan", "Agra ka Petha", "Hathras ki Rabdi", "Lucknowi Chaat", "Mathura ke Pedhe",
    "Amritsar di Lassi", "Hyderabadi Kheer", "Goan Bebinca", "Kerala Payasam", "Rajasthani Gatte ki Sabzi"
  ],
  streetFoodAndFastFood: [
    "Pani Puri", "Pav Bhaji", "Chowmein", "Burger", "Vada Pav",
    "Samosa", "Bread Pakora", "Aloo Tikki", "Frankie", "Momos"
  ]
};


// --------------------------
// Navigation Functions
// --------------------------
function showStep(stepId) {
  document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
  const targetSection = document.getElementById(stepId);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  // Adjust sidebar navigation based on step
  if (["event-details", "vendor-registration", "addons", "addons-summary", "payment"].includes(stepId)) {
    document.getElementById('nav-event-details').style.display = 'block';
    document.getElementById('nav-vendor-registration').style.display = 'block';
    document.getElementById('nav-addons').style.display = 'block';
    document.getElementById('nav-payment').style.display = 'block';
    document.getElementById('nav-guest-addition').style.display = 'none';
    document.getElementById('nav-dashboard').style.display = 'none';
    document.getElementById('nav-funds').style.display = 'none';
  } else if (["guest-addition", "dashboard", "funds"].includes(stepId)) {
    document.getElementById('nav-event-details').style.display = 'none';
    document.getElementById('nav-vendor-registration').style.display = 'none';
    document.getElementById('nav-addons').style.display = 'none';
    document.getElementById('nav-payment').style.display = 'none';
    document.getElementById('nav-guest-addition').style.display = 'block';
    document.getElementById('nav-dashboard').style.display = 'block';
    document.getElementById('nav-funds').style.display = 'block';
  }
  
  document.querySelectorAll(".sidebar-menu li").forEach(li => li.classList.remove("active"));
  const navItem = document.getElementById("nav-" + stepId);
  if (navItem) navItem.classList.add("active");
}

async function logout() {
  try {
    // Disable the logout button to prevent double-clicks
    const btn = document.querySelector('#nav-logout a');
    if (btn) btn.style.pointerEvents = 'none';

    // Send POST to logout API view
    await fetch('/logout_api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      credentials: 'same-origin'
    });

  } catch (err) {
    console.error('Logout failed, but we’ll redirect anyway.', err);
  } finally {
    // Either way, send them back to the homepage
    window.location.href = '/';
  }
}

async function loadGuestList() {
  const resp = await fetch('/api/load-guests/');
  const { success, guests } = await resp.json();
  if (!success) return;
  const tbody = document.getElementById('guest-list');
  tbody.innerHTML = ''; // clear placeholder
  guests.forEach(addGuestRow);
}

// --------------------------
// CSRF Token Helper
// --------------------------
function getCSRFToken() {
  const name = 'csrftoken';
  return document.cookie.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(name + '='))
    ?.split('=')[1] || '';
}

// --------------------------
// API Call Helpers
// --------------------------
async function saveEventData(section, data) {
  try {
    const response = await fetch('/api/save-event/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({ section, data })
    });
    const result = await response.json();
    console.log(`Saved ${section}:`, result);
    return result;
  } catch (error) {
    console.error(`Error saving ${section}:`, error);
    throw error;
  }
}

async function loadEventData() {
  try {
    const response = await fetch('/api/load-event/');
    const result   = await response.json();
    if (!result.success) return;

    const data = result.data;
    // 1) Populate the fields we already had:
    document.getElementById('event-name').value       = data.event_name       || '';
    document.getElementById('event-type').value       = data.event_type       || '';
    document.getElementById('event-date').value       = data.event_date       || '';
    document.getElementById('event-start-time').value = data.event_start_time || '';
    document.getElementById('event-end-time').value   = data.event_end_time   || '';
    document.getElementById('event-location').value   = data.event_location   || '';
    document.getElementById('expected-guests').value  = data.event_size       || '';

    // Always set guest‐capacity so other steps can read it
    document.getElementById('guest-capacity').value   = data.event_size || '';
    document.getElementById('max-guests').textContent = data.event_size || 0;
    updateGuestProgress();
    // 2) Populate Event‐Package cards if you already chose one
    if (data.selected_package) {
      // first regenerate the cards for the saved capacity
      populateEventPackages(data.event_size);
      // then mark the one that was saved
      document
        .querySelectorAll('#event-package-cards .package-card')
        .forEach(c => {
          if (c.querySelector('h3').innerText === data.selected_package) {
            c.classList.add('selected');
            document.getElementById('selected-package').value = data.selected_package;
            document.getElementById('package-price').value    = data.package_price;
          }
        });
      // advance to Vendor step
      showStep('vendor-registration');
    }

    // 3) Vendor registration
    if (data.vendor_package_name) {
      populateVendorPackages();
      document
        .querySelectorAll('#vendor-package-cards .package-card')
        .forEach(c => {
          if (c.querySelector('h3').innerText === data.vendor_package_name) {
            c.classList.add('selected');
            document.getElementById('selected-vendor-package').value = data.vendor_package_name;
            document.getElementById('vendor-package-price').value    = data.vendor_package_price;
          }
        });
      showStep('addons');
    }

    // 4) Add‑On foods
    if (data.selectedFoodItems) {
      selectedFoodItems = data.selectedFoodItems;
      renderCategoryButtons();
      renderFoodItems();
      showStep('addons-summary');
    }

    // 5) Payment
    if (data.payment_status) {
      populatePaymentSummary();
      showStep('guest-addition');
    }

  } catch (err) {
    console.error('Error loading event data:', err);
  }
}


function renderCategoryButtons() {
  const container = document.getElementById('food-category-buttons');
  container.innerHTML = "";
  Object.keys(FOOD_CATEGORIES).forEach(category => {
    const btn = document.createElement('button');
    btn.innerText = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    btn.classList.add('category-btn');
    if (category === currentCategory) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentCategory = category;
      renderCategoryButtons();
      renderFoodItems();
    });
    container.appendChild(btn);
  });
}

function renderFoodItems() {
  const listContainer = document.getElementById('food-items-list');
  if (!listContainer){
    console.error("No #food-items-list element found");
    return; 
  }  
  listContainer.innerHTML = "";
  let items = [];
  if (foodSearchTerm.trim() !== "") {
    items = Object.values(FOOD_CATEGORIES).flat().filter(item =>
      item.toLowerCase().includes(foodSearchTerm.toLowerCase())
    );
  } else {
    items = FOOD_CATEGORIES[currentCategory] || [];
  }
  items.forEach(item => {
    const div = document.createElement('div');
    div.classList.add('food-item');
    const price = PRICE_MAP[item] || 0
    const qty = (selectedFoodItems.find(f => f.name === item)?.quantity) || 0;
    div.innerHTML = `<span>${item} (₹${price.toLocaleString()})</span>
                     <div>
                       <button class="remove-food-btn">-</button>
                       <span class="food-qty">${qty}</span>
                       <button class="add-food-btn">+</button>
                     </div>`;
    div.querySelector('.add-food-btn')
      .addEventListener('click', () => {
         const ex = selectedFoodItems.find(f => f.name === item);
         if (ex) ex.quantity++; else selectedFoodItems.push({ name: item, quantity: 1, price });
         renderFoodItems();
      });
    div.querySelector('.remove-food-btn')
      .addEventListener('click', () => {
         selectedFoodItems = selectedFoodItems
           .map(f => f.name === item ? { ...f, quantity: f.quantity - 1 } : f)
           .filter(f => f.quantity > 0);
         renderFoodItems();
       });
    listContainer.appendChild(div);
  });
}

function showAddonsSummary() {
  const summaryContainer = document.getElementById('addons-summary-list');
  summaryContainer.innerHTML = "";
  if (selectedFoodItems.length === 0) {
    summaryContainer.innerHTML = "<p>No add‑on food items selected.</p>";
    document.getElementById('summary-addons-total').innerText = "₹0";
  } else {
    let total = 0;
    const table = document.createElement('table');
    table.classList.add('guest-table');
    table.innerHTML = `<thead>
                        <tr>
                          <th>Food Item</th>
                          <th>Quantity</th>
                          <th>Price (₹)</th>
                          <th>Subtotal (₹)</th>
                        </tr>
                      </thead>`;
    const tbody = document.createElement('tbody');
    selectedFoodItems.forEach(item => {
      const subtotal = item.quantity * item.price;
      total += subtotal;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.name}</td>
                      <td>${item.quantity}</td>
                      <td>₹${item.price.toLocaleString()}</td>
                      <td>₹${subtotal.toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    summaryContainer.appendChild(table);
    const totalDiv = document.createElement('div');
    totalDiv.classList.add('funds-summary');
    totalDiv.innerHTML = `<h3>Total Add‑On Amount: ₹${total.toLocaleString()}</h3>`;
    summaryContainer.appendChild(totalDiv);
    document.getElementById('summary-addons-total').innerText = '₹' + total.toLocaleString();
  }
  // Save add‑on foods data via API call if needed
  saveEventData('addons', { selectedFoodItems });
  showStep('addons-summary');
}

function attachGuestRowEvents(tr) {
  const btn = tr.querySelector('.invite-btn');
  const delBtn = tr.querySelector('.delete-btn');
  const statusSpan = tr.querySelector('.accept-status span');

  if (btn) {
    btn.addEventListener('click', async e => {
      e.preventDefault();

      // Disable delete immediately and start loader
      delBtn.disabled = true;
      btn.disabled = true;
      btn.querySelector('.button-text').textContent = 'Sending';
      btn.querySelector('.loader').style.opacity = 1;

      try {
        // Fake a little progress animation
        let progress = 0;
        const progressBar = btn.querySelector('.progress-bar');
        const interval = setInterval(() => {
          if (progress < 90) {
            progress += 10;
            progressBar.style.width = progress + '%';
          }
        }, 100);

        // Call your API
        await fetch(`/api/send-invite/${btn.dataset.id}/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCSRFToken() }
        });

        clearInterval(interval);
        progressBar.style.width = '100%';

        // Finalize UI
        btn.querySelector('.loader').style.opacity = 0;
        btn.querySelector('.button-text').textContent = 'Sent';
        btn.classList.add('sent');
        statusSpan.textContent = 'Pending';
        statusSpan.className = 'status-pending';

      } catch (err) {
        console.error(err);
        // Roll back on error
        btn.disabled = false;
        delBtn.disabled = false;
        btn.querySelector('.loader').style.opacity = 0;
        btn.querySelector('.progress-bar').style.width = '0';
        btn.querySelector('.button-text').textContent = 'Send';
        alert('Failed to send. Try again.');
      }
    });
  }

  // DELETE GUEST handler
  if (delBtn) {
    delBtn.addEventListener('click', async e => {
      e.preventDefault();

      // Only allow delete if not yet invited, or if they explicitly rejected
      const invited = btn.classList.contains('sent');
      const rejected = statusSpan.classList.contains('status-rejected');
      if (invited && !rejected) {
        return;
      }

      try {
        await fetch(`/api/delete-guest/${delBtn.dataset.id}/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCSRFToken() }
        });
        tr.remove();
        updateGuestProgress();
      } catch (err) {
        console.error('Error deleting guest:', err);
        alert('Failed to delete guest. Please try again.');
      }
    });
  }

  const viewBtn = tr.querySelector('.view-reason-btn');
  if (viewBtn) viewBtn.addEventListener('click', e => {
    e.preventDefault();            // ← again, just in case
    alert("Decline reason: " + e.currentTarget.dataset.reason);
  });
}

function styleInviteStatusCell(cell, sendStatus, acceptStatus) {
  if (!sendStatus) {
    cell.innerText = "Pending";
    cell.style.color = "orange";
  } else if (acceptStatus === 1) {
    cell.innerText = "Accepted";
    cell.style.color = "green";
  } else if (acceptStatus === -1) {
    cell.innerText = "Rejected";
    cell.style.color = "red";
  } else {
    // sent but not yet responded
    cell.innerText = "Sent";
    cell.style.color = "blue";
  }
}


// --------------------------
// Document Ready Initialization
// --------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Set initial sidebar visibility for pre‑payment steps
  document.getElementById('nav-event-details').style.display = 'block';
  document.getElementById('nav-vendor-registration').style.display = 'block';
  document.getElementById('nav-addons').style.display = 'block';
  document.getElementById('nav-payment').style.display = 'block';
  document.getElementById('nav-guest-addition').style.display = 'none';
  document.getElementById('nav-dashboard').style.display = 'none';
  document.getElementById('nav-funds').style.display = 'none';

  // Sidebar navigation click events
  document.querySelectorAll(".sidebar-menu li a").forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      e.preventDefault();
      let target = this.getAttribute("href").substring(1);
      if (this.parentElement.style.display !== "none") showStep(target);
    });
  });
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar    = document.querySelector('.sidebar');

  // open sidebar on hamburger click
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // close sidebar on our new chevron button click
  const sidebarClose = document.querySelector('.sidebar-close');
  sidebarClose.addEventListener('click', () => {
    sidebar.classList.remove('active');
  });
  
  loadEventData();
  loadGuestList();
  // Initialize existing rows on page‐load:
  document.getElementById('event-details-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const eventDateValue = document.getElementById('event-date').value;
    if (!eventDateValue) {
      alert("Please select an event date.");
      return;
    }
    const eventDate = new Date(eventDateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (eventDate < tomorrow || eventDate > maxDate) {
      alert("Please select a date between " + tomorrow.toLocaleDateString() + " and " + maxDate.toLocaleDateString() + ".");
      return;
    }
    const selectedPackageCard = document.querySelector('#event-details .package-card.selected');
    if (!selectedPackageCard) {
      alert('Please select an event package.');
    return;
    }
    const packagePrice = selectedPackageCard.getAttribute('data-price');
    const capacity = document.getElementById('guest-capacity').value;
    document.getElementById('selected-package').value = selectedPackageCard.querySelector('h3').innerText;
    document.getElementById('package-price').value = packagePrice;
    document.getElementById('guest-capacity').value = capacity;
  
      // Update dashboard greeting with event name
    const eventName = document.getElementById('event-name').value.trim();
    document.getElementById('dashboard-event-name').innerText = "Welcome, " + eventName + "!";
  
    // Prepare event details payload and save via API
    const eventData = {
      event_name: eventName,
      event_type: document.getElementById('event-type').value,
      event_date: document.getElementById('event-date').value,
      event_start_time: document.getElementById('event-start-time').value,
      event_end_time: document.getElementById('event-end-time').value,
      event_location: document.getElementById('event-location').value.trim(),
      event_size: capacity,
      selected_package: selectedPackageCard.querySelector('h3').innerText,
      package_price: packagePrice
    };
    saveEventData('event_details', eventData);

    // --------------------------
    // Vendor Registration Form Submission --------------------------
    document.getElementById('vendor-registration-form').addEventListener('submit', async function(e) {
      e.preventDefault();
  
    // If "I have my own vendors" is not checked, ensure a vendor package is selected.
      if (!document.getElementById('use-own-vendors').checked) {
      const selectedVendorPkg = document.querySelector('#vendor-package-cards .package-card.selected');
      if (!selectedVendorPkg) {
        alert('Please select a vendor package.');
        return;
        }
      }
  
      // Build vendor registration data payload
      let vendorData = {};
      if (document.getElementById('use-own-vendors').checked) {
        vendorData.vendor_details = {
        vendor_name: document.getElementById('vendor-name').value.trim(),
        vendor_type: document.getElementById('vendor-type').value,
        vendor_contact: document.getElementById('vendor-contact').value.trim(),
        vendor_email: document.getElementById('vendor-email').value.trim()
      };
    } else {
        vendorData.selected_vendor_package = document.getElementById('selected-vendor-package').value;
        vendorData.vendor_package_price = document.getElementById('vendor-package-price').value;
      }
  
      try {
        await saveEventData('vendor_registration', vendorData);
      } catch (err) {
        console.error("Error saving vendor registration data:", err);
        alert("Failed to save vendor data. Please try again.");
      return;
      }
  
      showStep('addons');
      // Optionally, call populateVendorPackages() if needed.
    });
  
  // Proceed to vendor registration step
    showStep('vendor-registration');
    populateVendorPackages();
  });
  
  document.getElementById('open-guest-modal-btn').addEventListener('click', function() {
    const allowedCount = parseInt(document.getElementById('guest-capacity').value) || Infinity;
    let currentCount = document.querySelectorAll('#guest-list tr').length;
    const noGuestRow = document.querySelector('#guest-list .no-guests');
    if (noGuestRow) currentCount = 0;
      if (currentCount >= allowedCount) {
        alert("You have reached the maximum allowed guest count (" + allowedCount + ").");
        return;
    }
  document.getElementById('guest-modal').classList.add('active');
  });

  document.getElementById('guest-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    // … validation …
    const payload = {
      guest_name:    document.getElementById('guest-name').value.trim(),
      guest_contact: document.getElementById('guest-contact').value.trim(),
      guest_email:   document.getElementById('guest-email').value.trim(),
      guest_type:    document.getElementById('guest-type').value,
      max_companions:+document.getElementById('max-companions').value || 1
    };
    const resp = await fetch('/api/add-guest/', {
      method: 'POST',
      headers:{ 'Content-Type':'application/json', 'X-CSRFToken':getCSRFToken() },
      body: JSON.stringify(payload)
    });
    const result = await resp.json();
    if (result.success) {
      addGuestRow(result.guest);
      document.getElementById('guest-modal')?.classList.remove('active');
    }
  });
  
  const max = document.getElementById('expected-guests').value || 0;
  document.getElementById('max-guests').innerText =
    document.getElementById('guest-capacity').value || '0';

  document.querySelectorAll('#guest-list tr').forEach(r => attachGuestRowEvents(r));

  let currentCategory = "northIndian";
  let foodSearchTerm = "";

  document.getElementById('food-search')?.addEventListener('input', e => {
    foodSearchTerm = e.target.value;
    renderFoodItems();
  });
  document.getElementById('addons-submit-btn')?.addEventListener('click', showAddonsSummary);
  document.getElementById('addons-confirm-btn')?.addEventListener('click', () => {
    populatePaymentSummary();
    showStep('payment');
  });
  renderCategoryButtons();
  renderFoodItems();

  // --------------------------
  // Payment Form Submission --------------------------
  document.getElementById('payment-form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Payment successful!');
    saveEventData('payment', { /* Include payment details if needed */ });
    localStorage.setItem('post_payment', 'true');
    // After payment, update sidebar to show post‑payment options
    document.getElementById('nav-event-details').style.display = 'none';
    document.getElementById('nav-vendor-registration').style.display = 'none';
    document.getElementById('nav-addons').style.display = 'none';
    document.getElementById('nav-payment').style.display = 'none';
    document.getElementById('nav-guest-addition').style.display = 'block';
    document.getElementById('nav-dashboard').style.display = 'block';
    document.getElementById('nav-funds').style.display = 'block';
    showStep('guest-addition');
    renderDashboardGraphs();
  });

  // helper to sum array
  const ctxInv    = document.getElementById('invitationChart').getContext('2d');
  const ctxPlates = document.getElementById('platesChart')?.getContext('2d');
  const ctxEntry  = document.getElementById('entryChart')?.getContext('2d');

  let timelineSteps = [];
  try {
    timelineSteps = JSON.parse(document.getElementById('timeline-data').textContent);
  } catch (e) {
    console.error('Error parsing timeline data:', e);
  }

  // 2) Generic doughnut factory
  function makeDoughnut(ctx, labels, data, bgColors) {
    return new Chart(ctx, {
      type: 'doughnut',
      data:    { labels, datasets: [{ data, backgroundColor: bgColors, borderColor: '#fff', borderWidth: 2 }] },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        animation: { animateRotate: true, duration: 800 },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
          tooltip: {
            callbacks: {
              label(ctx) {
                const val = ctx.raw;
                const total = data.reduce((a, b) => a + b, 0);
                const pct = total ? Math.round((val / total) * 100) : 0;
                return `${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 3) Build the three charts
  makeDoughnut(
    ctxInv,
    ['Accepted', 'Pending', 'Available'],
    [chartData.invites.accepted, chartData.invites.pending, chartData.invites.available],
    ['#48c78e', '#ff9f43', '#6c75ff']
  );

  if (isEventDay && ctxPlates) {
    makeDoughnut(
      ctxPlates,
      ['Served', 'Remaining'],
      [chartData.plates.served, chartData.plates.remaining],
      ['#6366f1', '#cbd5e1']
    );
  }

  if (isEventDay && ctxEntry) {
    makeDoughnut(
      ctxEntry,
      ['Entered', 'Not Entered'],
      [chartData.entry.entered, chartData.entry.not_entered],
      ['#10b981', '#ef4444']
    );
  }

  // 4) Render the timeline
  const tlContainer = document.getElementById('eventTimeline');
  timelineSteps.forEach((step, i) => {
    const item = document.createElement('div');
    // add .done if done, .current if it's the first incomplete or last completed
    const done    = step.done;
    const prevDone= i === 0 ? true : timelineSteps[i-1].done;
    const isCurrent = !done && prevDone;
    item.className  = 'timeline-item' + (done ? ' done' : '') + (isCurrent ? ' current' : '');
    item.innerHTML  = `
      <div class="timeline-dot">${done ? '✓' : ''}</div>
      <div class="timeline-content">
        <h4>${step.name}</h4>
        <p>${step.time ? new Date(step.time).toLocaleString() : '—'}</p>
      </div>`;
    tlContainer.appendChild(item);
  });
});

// --------------------------
// Date Condition Setup
// --------------------------
function updateDateCondition() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  const formatDate = date => date.toISOString().split('T')[0];
  document.getElementById('date-condition').innerText = "Allowed: " + formatDate(tomorrow) + " to " + formatDate(maxDate);
  const dateInput = document.getElementById('event-date');
  dateInput.setAttribute('min', formatDate(tomorrow));
  dateInput.setAttribute('max', formatDate(maxDate));
}
updateDateCondition();

document.getElementById('event-date').addEventListener('change', function() {
  const eventDate = new Date(this.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (eventDate < tomorrow || eventDate > maxDate) {
    alert("Please select a date between " + tomorrow.toLocaleDateString() + " and " + maxDate.toLocaleDateString() + ".");
    this.value = "";
  }
});

document.getElementById('expected-guests').addEventListener('change', function() {
  const capacity = this.value;
  if (capacity) {
    document.getElementById('guest-capacity').value = capacity;
    populateEventPackages(capacity);
  } else {
    document.getElementById('event-package-cards').innerHTML = '';
  }
});

// --------------------------
// Populate Event Packages --------------------------
function populateEventPackages(capacity) {
  const container = document.getElementById('event-package-cards');
  container.innerHTML = '';
  const eventPackages = {
    "100": [
      { name: "Standard Event Package", price: 50000, details: "Standard decoration, 5 waiters, standard services." },
      { name: "Premium Event Package", price: 70000, details: "1 onsite manager, premium decoration, enhanced coordination, 5 waiters." },
      { name: "Exclusive Event Package", price: 85000, details: "QR code verification, premium decoration, 2 onsite managers, 10 waiters, priority coordination." },
      { name: "Grand Event Package", price: 100000, details: "Premium decoration, VIP coordination, 3 onsite managers, custom premium decoration, 10 waiters." }
    ],
    "200": [
      { name: "Standard Event Package", price: 100000, details: "Standard decoration, 10 waiters, standard services." },
      { name: "Premium Event Package", price: 140000, details: "1 onsite manager, premium decoration, enhanced coordination, 15 waiters." },
      { name: "Exclusive Event Package", price: 170000, details: "QR code verification, premium decoration, 2 onsite managers, 20 waiters, priority coordination." },
      { name: "Grand Event Package", price: 200000, details: "Premium decoration, VIP coordination, 3 onsite managers, custom premium decoration, 25 waiters." }
    ],
    "500": [
      { name: "Standard Event Package", price: 250000, details: "Standard decoration, 25 waiters, standard services." },
      { name: "Premium Event Package", price: 325000, details: "1 onsite manager, premium decoration, enhanced coordination, 30 waiters." },
      { name: "Exclusive Event Package", price: 400000, details: "QR code verification, premium decoration, 2 onsite managers, 40 waiters, priority coordination." },
      { name: "Grand Event Package", price: 450000, details: "Premium decoration, VIP coordination, 3 onsite managers, custom premium decoration, 50 waiters." }
    ],
    "1000": [
      { name: "Standard Event Package", price: 400000, details: "Standard decoration, 50 waiters, standard services." },
      { name: "Premium Event Package", price: 550000, details: "1 onsite manager, premium decoration, enhanced coordination, 75 waiters." },
      { name: "Exclusive Event Package", price: 700000, details: "QR code verification, premium decoration, 2 onsite managers, 100 waiters, priority coordination." },
      { name: "Grand Event Package", price: 900000, details: "Premium decoration, VIP coordination, 3 onsite managers, custom premium decoration, 125 waiters." }
    ]
  };
  const packages = eventPackages[capacity] || [];
  packages.forEach(pkg => {
    const card = document.createElement('div');
    card.classList.add('package-card');
    card.setAttribute('data-price', pkg.price);
    card.setAttribute('data-guests', capacity);
    card.innerHTML = `<h3>${pkg.name}</h3>
                      <div class="price">₹${pkg.price.toLocaleString()}</div>
                      <p>${pkg.details}</p>`;
    card.addEventListener('click', function() {
      container.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      document.getElementById('selected-package').value = pkg.name;
      document.getElementById('package-price').value = pkg.price;
    });
    container.appendChild(card);
  });
}

// --------------------------
// Populate Vendor Packages --------------------------
function populateVendorPackages() {
  const capacity = document.getElementById('guest-capacity').value;
  const container = document.getElementById('vendor-package-cards');
  container.innerHTML = '';
  const vendorPackages = {
    "100": [
      { name: "Standard Vendor Package", price: 100000, details: "Essential vendor services." },
      { name: "Premium Vendor Package", price: 125000, details: "Enhanced vendor services with additional support." },
      { name: "Exclusive Vendor Package", price: 150000, details: "Exclusive vendor services including QR code for food distribution." },
      { name: "Grand Vendor Package", price: 200000, details: "All-inclusive vendor services with premium extras." }
    ],
    "200": [
      { name: "Standard Vendor Package", price: 175000, details: "Essential vendor services." },
      { name: "Premium Vendor Package", price: 200000, details: "Enhanced vendor services with additional support." },
      { name: "Exclusive Vendor Package", price: 230000, details: "Exclusive vendor services including QR code for food distribution." },
      { name: "Grand Vendor Package", price: 300000, details: "All-inclusive vendor services with premium extras." }
    ],
    "500": [
      { name: "Standard Vendor Package", price: 475000, details: "Essential vendor services." },
      { name: "Premium Vendor Package", price: 600000, details: "Enhanced vendor services with additional support." },
      { name: "Exclusive Vendor Package", price: 750000, details: "Exclusive vendor services including QR code for food distribution." },
      { name: "Grand Vendor Package", price: 850000, details: "All-inclusive vendor services with premium extras." }
    ],
    "1000": [
      { name: "Standard Vendor Package", price: 900000, details: "Essential vendor services." },
      { name: "Premium Vendor Package", price: 1250000, details: "Enhanced vendor services with additional support." },
      { name: "Exclusive Vendor Package", price: 1500000, details: "Exclusive vendor services including QR code for food distribution." },
      { name: "Grand Vendor Package", price: 1750000, details: "All-inclusive vendor services with premium extras." }
    ]
  };
  const packages = vendorPackages[capacity] || [];
  packages.forEach(pkg => {
    const card = document.createElement('div');
    card.classList.add('package-card');
    card.setAttribute('data-price', pkg.price);
    card.setAttribute('data-guests', capacity);
    card.innerHTML = `<h3>${pkg.name}</h3>
                      <div class="price">₹${pkg.price.toLocaleString()}</div>
                      <p>${pkg.details}</p>`;
    card.addEventListener('click', function() {
      container.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      document.getElementById('selected-vendor-package').value = pkg.name;
      document.getElementById('vendor-package-price').value = pkg.price;
    });
    container.appendChild(card);
  });
}

// --------------------------
// Own Vendors Toggle --------------------------
document.getElementById('use-own-vendors').addEventListener('change', function() {
  if (this.checked) {
    document.getElementById('own-vendors-section').style.display = 'block';
    document.getElementById('vendor-package-cards').style.display = 'none';
  } else {
    document.getElementById('own-vendors-section').style.display = 'none';
    document.getElementById('vendor-package-cards').style.display = 'flex';
  }
});

// --------------------------
// Guest Modal & Form --------------------------
document.getElementById('goto-guest-addition-btn').addEventListener('click', function() {
  showStep('guest-addition');
});


const guestType = document.getElementById('guest-type');
const maxGroup  = document.getElementById('max-companions-group');

guestType.addEventListener('change', () => {
  maxGroup.style.display = 'block';

});

document.getElementById('cancel-guest').addEventListener('click', function() {
  document.getElementById('guest-modal').classList.remove('active');
});
document.getElementById('close-guest-modal').addEventListener('click', function() {
  document.getElementById('guest-modal').classList.remove('active');
});



function addGuestRow(g) {
  const tbody = document.getElementById('guest-list');
  tbody.querySelectorAll('.no-guests').forEach(n => n.remove());

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${g.guest_id}</td>
    <td>${g.guest_name}</td>
    <td>${g.contact}</td>
    <td>${g.email}</td>
    <td>${g.guest_type}</td>
    <td>${g.max_companions}</td>
    <td>
      <button
        type="button"
        class="invite-btn send-button${g.invitation_send_status ? ' sent' : ''}"
        data-id="${g.guest_id}"
        ${g.invitation_send_status ? 'disabled' : ''}
      >
        <span class="button-text">${g.invitation_send_status ? 'Sent' : 'Send'}</span>
        <div class="loader" style="opacity:0;">
          <div class="loader-dots">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
        <div class="progress-bar"></div>
      </button>
    </td>
    <td class="accept-status">
      <span class="
        ${g.invitation_accept_status === 0 ? 'status-pending' : ''}
        ${g.invitation_accept_status === 1 ? 'status-accepted' : ''}
        ${g.invitation_accept_status === -1 ? 'status-rejected' : ''}
      ">
        ${
          g.invitation_accept_status === 1 ? 'Accepted' :
          g.invitation_accept_status === -1 ? 'Rejected' :
          (g.invitation_send_status ? 'Pending' : '')
        }
      </span>
    </td>
    <td class="members">${g.accepted_members || 0}</td>
    <td>
      <button
        type="button"
        class="view-reason-btn"
        style="${g.decline_reason ? '' : 'display:none'}"
        data-reason="${g.decline_reason}"
      >View</button>
    </td>
    <td>
      <button
        type="button"
        class="delete-btn"
        data-id="${g.guest_id}"
        ${g.invitation_send_status ? 'disabled' : ''}
        >Delete</button>
      </td>
 `;
  tbody.appendChild(tr);
  attachGuestRowEvents(tr);
  updateGuestProgress();
}



document.getElementById('guest-list').addEventListener('click', function(e) {
  if (e.target.closest('.delete-btn')) {
    const row = e.target.closest('tr');
    const inviteBtn = row.querySelector('.invite-btn');
    if (inviteBtn && inviteBtn.getAttribute('data-invited') === "true") {
      alert("This guest has been invited and cannot be removed.");
      return;
    }
    row.remove();
    if (document.querySelectorAll('#guest-list tr').length === 0) {
      const tbody = document.getElementById('guest-list');
      const tr = document.createElement('tr');
      tr.classList.add('no-guests');
      tr.innerHTML = `<td colspan="6" style="text-align: center;">No guests added yet</td>`;
      tbody.appendChild(tr);
    }
  } else if (e.target.closest('.invite-btn')) {
    const btn = e.target.closest('.invite-btn');
    if (btn.getAttribute('data-invited') === "false") {
      btn.innerText = "Sent";
      btn.style.backgroundColor = "lightblue";
      btn.style.color = "blue";
      btn.setAttribute('data-invited', "true");
      const row = btn.closest('tr');
      const deleteBtn = row.querySelector('.delete-btn');
      if (deleteBtn) deleteBtn.disabled = true;
    }
  }
});

document.getElementById('send-all-invitations-btn').addEventListener('click', async () => {
  const btn    = document.getElementById('send-all-invitations-btn');
  const popup  = document.createElement('div');
  const overlay = document.createElement('div');

  // apply your “send-button” styling
  btn.classList.add('send-button');
  btn.innerHTML = `
    <span class="button-text">Sending to all…</span>
    <div class="loader">
      <div class="loader-dots">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>
    <div class="progress-bar"></div>
  `;

  // overlay & popup setup
  overlay.className = 'overlay show';
  popup.className   = 'success-popup';
  popup.innerHTML   = `
    <div class="success-icon">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17l-3.88-3.88L3 13.41 9 19.41 21 7.41 19.59 6l-10.59 10.17z"/></svg>
    </div>
    <div class="success-title">Invitations Sent!</div>
    <div class="success-message">All invitations have been dispatched successfully.</div>
    <button class="success-button">OK</button>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // Gather all non-disabled send buttons
  const allSendBtns = Array.from(document.querySelectorAll('#guest-list .invite-btn:not(.sent)'));
  const total       = allSendBtns.length;
  let completed     = 0;

  for (const sbtn of allSendBtns) {
    // simulate per-guest send
    await sbtn.click();
    completed++;
    // update progress-bar width
    const pct = Math.round((completed / total) * 100);
    btn.querySelector('.progress-bar').style.width = `${pct}%`;
  }

  // finish loader
  btn.querySelector('.loader').style.opacity = 0;
  btn.querySelector('.button-text').textContent = 'All Sent';

  // show popup after a tiny delay
  setTimeout(() => popup.classList.add('show'), 300);

  // hide popup & overlay on OK
  popup.querySelector('.success-button').addEventListener('click', () => {
    popup.classList.remove('show');
    overlay.classList.remove('show');
    // restore original button
    btn.classList.remove('send-button');
    btn.textContent = 'Send Invitation To All';
  });
});

document.getElementById('guest-addition-form').addEventListener('submit', function(e) {
  e.preventDefault();
  // Save guest addition data via API call if needed
  saveEventData('guest_addition', { /* gather guest addition data as needed */ });
  showStep('dashboard');
  renderDashboardGraphs();
});

document.getElementById('goto-guest-addition-btn').addEventListener('click', function() {
  showStep('guest-addition');
});

function updateGuestProgress() {
  const total = Array.from(
    document.querySelectorAll('#guest-list .members')
  ).reduce((sum, td) => sum + (parseInt(td.textContent, 10) || 0), 0);

  // get max from hidden input or guest-capacity field
  const max = parseInt(document.getElementById('guest-capacity').value, 10) || 0;

  // update text
  document.getElementById('current-guests').textContent = total;
  document.getElementById('max-guests').textContent     = max;

  // update bar
  const pct = max > 0 ? Math.min((total / max) * 100, 100) : 0;
  document.getElementById('guest-progress-bar').style.width = pct + '%';
}


// --------------------------
// Dashboard Graphs Rendering --------------------------
function renderDashboardGraphs() {
  const capacity = parseInt(document.getElementById('guest-capacity').value, 10) || 0;
  const invitedCount = document.querySelectorAll('#guest-list .invite-btn.sent').length;
  const acceptedCount = Array.from(document.querySelectorAll('#guest-list .accept-status span.status-accepted'))
                              .reduce((sum, el) => sum + parseInt(el.closest('tr').querySelector('.members').textContent, 10), 0);
  const pendingRsvps = invitedCount - acceptedCount;
  const availableSlots = capacity - invitedCount;

  // helper to init/update a chart
  function upsertDoughnut(chartVar, ctx, labels, data, colors) {
    if (chartVar && chartVar.destroy) chartVar.destroy();
    return new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
      options: {
        cutout: '70%',
        rotation: -Math.PI,
        circumference: Math.PI,
        responsive: true,
        animation: { animateRotate: true, duration: 800 },
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  // Invitation chart
  window.invChart = upsertDoughnut(
    window.invChart,
    document.getElementById('invitationChart').getContext('2d'),
    ['Invited', 'Remaining'],
    [invitedCount, Math.max(capacity - invitedCount, 0)],
    ['#6366f1', '#cbd5e1']
  );

  // Food plates (use 60% served as example)
  const served = Math.floor(invitedCount * 0.6);
  window.foodChart = upsertDoughnut(
    window.foodChart,
    document.getElementById('foodPlatesChart').getContext('2d'),
    ['Served', 'Pending'],
    [served, Math.max(invitedCount - served, 0)],
    ['#10b981', '#e2e8f0']
  );

  // Attendance chart
  window.attChart = upsertDoughnut(
    window.attChart,
    document.getElementById('attendanceChart').getContext('2d'),
    ['Accepted', 'Declined', 'No Response'],
    [acceptedCount, pendingRsvps, Math.max(capacity - invitedCount, 0)],
    ['#48c78e', '#ff9f43', '#6c75ff']
  );
}

// --------------------------
// Add-On Foods Section --------------------------


function addFoodItem(name, price) {
  const existing = selectedFoodItems.find(f => f.name === name);
  if (existing) {
    existing.quantity++;
  } else {
    selectedFoodItems.push({ name, quantity: 1, price });
  }
  renderFoodItems();
}

function removeFoodItem(name) {
  selectedFoodItems = selectedFoodItems.map(f => {
    if (f.name === name) return { ...f, quantity: f.quantity - 1 };
    return f;
  }).filter(f => f.quantity > 0);
  renderFoodItems();
}


// --------------------------
// Add-On Foods Form Submission --------------------------
document.getElementById('addons-submit-btn').addEventListener('click', function() {
  showAddonsSummary();
});

document.getElementById('addons-confirm-btn').addEventListener('click', function() {
  populatePaymentSummary();
  showStep('payment');
});



document.querySelectorAll('.payment-method').forEach(method => {
  method.addEventListener('click', function() {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
    this.classList.add('selected');
  });
});

function populatePaymentSummary() {
  const eventPackageName = document.getElementById('selected-package').value;
  const eventPackagePrice = parseFloat(document.getElementById('package-price').value) || 0;
  const capacity = document.getElementById('guest-capacity').value;
  const vendorPackagePrice = document.getElementById('use-own-vendors').checked
    ? 0
    : (parseFloat(document.getElementById('vendor-package-price').value) || 0);
  const addonsTotal = selectedFoodItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  document.getElementById('summary-event-package').innerText = eventPackageName;
  document.getElementById('summary-package-price').innerText = '₹' + eventPackagePrice.toLocaleString();
  document.getElementById('summary-vendor-package-price').innerText = '₹' + vendorPackagePrice.toLocaleString();
  document.getElementById('summary-guest-capacity').innerText = capacity;
  document.getElementById('summary-addons-total').innerText = '₹' + addonsTotal.toLocaleString();
  const totalPayment = eventPackagePrice + vendorPackagePrice + addonsTotal;
  document.getElementById('summary-total').innerText = '₹' + totalPayment.toLocaleString();
}

document.getElementById('event-details-form').addEventListener('submit', populatePaymentSummary);

// --------------------------
// Guest Addition Form Submission --------------------------
document.getElementById('guest-addition-form').addEventListener('submit', function(e) {
  e.preventDefault();
  // Save guest addition data via API call if needed
  saveEventData('guest_addition', { /* Include guest addition data as needed */ });
  showStep('dashboard');
  renderDashboardGraphs();
});

document.getElementById('goto-guest-addition-btn').addEventListener('click', function() {
  showStep('guest-addition');
});

document.getElementById('funds-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nameEl   = document.getElementById('gift-guest-name');
  const amountEl = document.getElementById('gift-amount');
  const guest    = nameEl.value.trim();
  const amount   = parseFloat(amountEl.value);

  if (!guest || !amount || amount <= 0) {
    return alert("Please enter a valid name and amount.");
  }

  try {
    const resp = await fetch('/api/add-gift/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({ guest_name: guest, amount })
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);

    // Append new row
    const tbody = document.getElementById('funds-list-body');
    tbody.querySelectorAll('.no-funds').forEach(tr => tr.remove());
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${result.gift.guest_name}</td>
      <td>₹${result.gift.amount.toLocaleString()}</td>
    `;
    tbody.appendChild(tr);

    // Update total
    document.getElementById('total-funds').textContent = 
      '₹' + result.total_funds.toLocaleString();

    // Clear form
    nameEl.value = '';
    amountEl.value = '';
  } catch (err) {
    console.error(err);
    alert("Could not save gift. " + (err.message || ""));
  }
});