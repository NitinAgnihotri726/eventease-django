// Retrieve CSRF token from cookies
function getCSRFToken() {
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('csrftoken='))
    ?.split('=')[1] || '';
}

// Build a single event or food-stall card for the vendor dashboard
function createOrderCard(o) {
  const card = document.createElement('div');
  card.classList.add('card');
  card.classList.add(o.order_type === 'service' ? 'service' : 'addon');
  card.dataset.eventDate = o.event_date;
  card.dataset.eventId = o.event_id;
  card.dataset.orderType = o.order_type;

  const header = document.createElement('div');
  header.classList.add('card-header');
  const h2 = document.createElement('h2');
  h2.textContent = o.event_name;
  header.appendChild(h2);

  const body = document.createElement('div');
  body.classList.add('card-body');

  if (o.order_type === 'service') {
    const rowType = document.createElement('div');
    rowType.classList.add('info-row');
    rowType.innerHTML = `
      <span class="label">Event Type:</span>
      <span class="value">${o.event_type || ''}</span>
    `;
    body.appendChild(rowType);
  }

  const rowVenue = document.createElement('div');
  rowVenue.classList.add('info-row');
  rowVenue.innerHTML = `
    <span class="label">Venue:</span>
    <span class="value">${o.venue}</span>
  `;
  body.appendChild(rowVenue);

  const rowDate = document.createElement('div');
  rowDate.classList.add('info-row');
  rowDate.innerHTML = `
    <span class="label">Date:</span>
    <span class="value">${new Date(o.event_date).toLocaleDateString()}</span>
  `;
  body.appendChild(rowDate);

  const rowTime = document.createElement('div');
  rowTime.classList.add('info-row');
  rowTime.innerHTML = `
    <span class="label">Time:</span>
    <span class="value">${o.event_timing}</span>
  `;
  body.appendChild(rowTime);

  const rowNeeded = document.createElement('div');
  rowNeeded.classList.add('info-row');
  if (o.order_type === 'service') {
    let pluralType;
    const vt = window.VENDOR_TYPE?.toLowerCase();
    if (vt === 'decoration') {
      pluralType = 'Decorators';
    } else if (vt === 'waiter') {
      pluralType = 'Waiters';
    } else {
      pluralType = window.VENDOR_TYPE + 's';
    }
    rowNeeded.innerHTML = `
      <span class="label">${pluralType} Needed:</span>
      <span class="value">${o.needed}</span>
    `;
  } else {
    rowNeeded.innerHTML = `
      <span class="label">Food Stall:</span>
      <span class="value">${o.addon_food_name}</span>
    `;
  }
  body.appendChild(rowNeeded);

  const rowSalary = document.createElement('div');
  rowSalary.classList.add('info-row');
  rowSalary.innerHTML = `
    <span class="label">Salary (per day):</span>
    <span class="value">₹ ${o.salary_per_vendor.toLocaleString()}</span>
  `;
  body.appendChild(rowSalary);

  const rowCounter = document.createElement('div');
  rowCounter.classList.add('counter');
  rowCounter.textContent = `Accepted ${o.accepted_count} / ${o.needed}`;
  body.appendChild(rowCounter);

  const btnGroup = document.createElement('div');
  btnGroup.classList.add('btn-group');

  const btnAccept = document.createElement('button');
  btnAccept.classList.add('btn', 'btn-accept');
  btnAccept.textContent = 'Accept';
  if (o.accepted_count >= o.needed) {
    btnAccept.disabled = true;
  }
  btnAccept.addEventListener('click', () => respondToOrder(o, true));

  const btnReject = document.createElement('button');
  btnReject.classList.add('btn', 'btn-reject');
  btnReject.textContent = 'Ignore';
  btnReject.addEventListener('click', () => respondToOrder(o, false));

  btnGroup.appendChild(btnAccept);
  btnGroup.appendChild(btnReject);
  body.appendChild(btnGroup);

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

let pendingAction = null;

// Initiate modal flow when vendor clicks Accept or Ignore
function respondToOrder(o, accept) {
  pendingAction = { order: o, accept: accept };
  if (accept) {
    const acceptOverlay = document.getElementById('accept-modal-overlay');
    const acceptCheckbox = document.getElementById('accept-terms-checkbox');
    if (acceptOverlay && acceptCheckbox) {
      acceptCheckbox.checked = false;
      const acceptConfirmBtn = document.getElementById('accept-confirm-btn');
      if (acceptConfirmBtn) {
        acceptConfirmBtn.disabled = true;
      }
      acceptOverlay.classList.add('active');
    } else {
      actuallyRespondToOrder(o, true, '');
    }
  } else {
    const declineOverlay = document.getElementById('decline-modal-overlay');
    const reasonInput = document.getElementById('decline-reason-input');
    if (declineOverlay && reasonInput) {
      reasonInput.value = '';
      declineOverlay.classList.add('active');
    } else {
      actuallyRespondToOrder(o, false, '');
    }
  }
}

// Perform API request and remove other date cards upon success
function actuallyRespondToOrder(o, accept, reason) {
  const payload = {
    event_id: o.event_id,
    accept: accept,
    order_type: o.order_type
  };
  if (o.order_type === 'addon') {
    payload.addon_food_id = o.addon_food_id;
  }
  if (!accept && reason) {
    payload.reason = reason;
  }

  fetch('/api/event-response/', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(j => {
      if (j.success) {
        loadYourEvents();
        const dateToRemove = o.event_date;
        document.querySelectorAll(`.card[data-event-date="${dateToRemove}"]`).forEach(card => {
          card.classList.add('pop-delete');
          setTimeout(() => {
            if (card.parentElement) card.parentElement.removeChild(card);
          }, 300);
        });
      }
    })
    .catch(err => {
      console.error('Error responding to order:', err);
    });
}

// Initialize modal event listeners once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const acceptOverlay = document.getElementById('accept-modal-overlay');
  const declineOverlay = document.getElementById('decline-modal-overlay');

  const acceptConfirmBtn = document.getElementById('accept-confirm-btn');
  const acceptCheckbox = document.getElementById('accept-terms-checkbox');
  if (acceptCheckbox && acceptConfirmBtn) {
    acceptCheckbox.addEventListener('change', () => {
      acceptConfirmBtn.disabled = !acceptCheckbox.checked;
    });
  }

  if (acceptConfirmBtn) {
    acceptConfirmBtn.addEventListener('click', () => {
      if (acceptOverlay) {
        acceptOverlay.classList.remove('active');
      }
      if (pendingAction) {
        actuallyRespondToOrder(pendingAction.order, true, '');
        pendingAction = null;
      }
    });
  }

  const acceptCancelBtn = document.getElementById('accept-cancel-btn');
  if (acceptCancelBtn) {
    acceptCancelBtn.addEventListener('click', () => {
      if (acceptOverlay) {
        acceptOverlay.classList.remove('active');
      }
      pendingAction = null;
    });
  }

  const declineConfirmBtn = document.getElementById('decline-confirm-btn');
  const reasonInput = document.getElementById('decline-reason-input');
  if (declineConfirmBtn && reasonInput) {
    declineConfirmBtn.addEventListener('click', () => {
      const reasonText = reasonInput.value.trim();
      if (declineOverlay) {
        declineOverlay.classList.remove('active');
      }
      if (pendingAction) {
        actuallyRespondToOrder(pendingAction.order, false, reasonText);
        pendingAction = null;
      }
    });
  }

  const declineCancelBtn = document.getElementById('decline-cancel-btn');
  if (declineCancelBtn) {
    declineCancelBtn.addEventListener('click', () => {
      if (declineOverlay) {
        declineOverlay.classList.remove('active');
      }
      pendingAction = null;
    });
  }

  setupSectionNav();
  setupEventTabs();
  loadOrders();
  loadYourEvents();

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  setInterval(() => {
    document.querySelectorAll('.card:not(.visible)')
      .forEach(card => observer.observe(card));
  }, 500);

   // Mobile navigation setup
  const body = document.querySelector('body');
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  
  // Create mobile nav toggle button
  const mobileNavToggle = document.createElement('button');
  mobileNavToggle.className = 'mobile-nav-toggle';
  mobileNavToggle.innerHTML = '<i class="fas fa-bars"></i>';
  
  // Create overlay for mobile
  const sidebarOverlay = document.createElement('div');
  sidebarOverlay.className = 'sidebar-overlay';
  body.appendChild(sidebarOverlay);
  
  // Insert toggle button to header
  const header = document.querySelector('.header');
  header.insertBefore(mobileNavToggle, header.firstChild);
  
  // Toggle sidebar on mobile
  mobileNavToggle.addEventListener('click', function() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
    
    // Change icon based on state
    if (sidebar.classList.contains('active')) {
      mobileNavToggle.innerHTML = '<i class="fas fa-times"></i>';
    } else {
      mobileNavToggle.innerHTML = '<i class="fas fa-bars"></i>';
    }
  });
  
  // Close sidebar when clicking overlay
  sidebarOverlay.addEventListener('click', function() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    mobileNavToggle.innerHTML = '<i class="fas fa-bars"></i>';
  });
  
  // Close sidebar when window is resized to desktop size
  window.addEventListener('resize', function() {
    if (window.innerWidth > 992) {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      mobileNavToggle.innerHTML = '<i class="fas fa-bars"></i>';
    }
  });
});

// Fetch and render pending service and add-on orders
function loadOrders() {
  fetch('/api/vendor-orders/', { credentials: 'same-origin' })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const svcList = document.getElementById('service-order-list');
      const addonList = document.getElementById('addon-order-list');
      const addonSection = document.getElementById('addon-section');

      if (svcList) svcList.innerHTML = '';
      if (addonList) addonList.innerHTML = '';

      if (svcList) {
        if (!Array.isArray(data.service_orders) || !data.service_orders.length) {
          svcList.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-inbox"></i>
              <h4>No pending service orders</h4>
              <p>All service slots are filled or none available.</p>
            </div>`;
        } else {
          data.service_orders.forEach(o => {
            svcList.appendChild(createOrderCard(o));
          });
        }
      }

      if (window.VENDOR_TYPE && window.VENDOR_TYPE.toLowerCase() === 'chef') {
        if (addonSection) addonSection.style.display = '';
        if (addonList) {
          if (!Array.isArray(data.addon_orders) || !data.addon_orders.length) {
            addonList.innerHTML = `
              <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <h4>No pending add-on food orders</h4>
                <p>All add-on stalls are taken or none available.</p>
              </div>`;
          } else {
            data.addon_orders.forEach(o => {
              addonList.appendChild(createOrderCard(o));
            });
          }
        }
      } else {
        if (addonSection) addonSection.style.display = 'none';
      }

      fetch('/api/vendor-events/', { credentials: 'same-origin' })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(evData => {
          const acceptedDates = new Set();
          if (Array.isArray(evData.events)) {
            evData.events.forEach(ev => {
              acceptedDates.add(ev.event_date);
            });
          }
          document.querySelectorAll('.card[data-event-date]').forEach(card => {
            const cd = card.dataset.eventDate;
            if (acceptedDates.has(cd)) {
              card.classList.add('pop-delete');
              setTimeout(() => {
                if (card.parentElement) card.parentElement.removeChild(card);
              }, 300);
            }
          });
        })
        .catch(err => {
          console.error('Error fetching vendor-events in loadOrders:', err);
        });
    })
    .catch(err => console.error('Error loading orders:', err));
}

// Fetch and render accepted events under “Your Events”
function loadYourEvents() {
  fetch('/api/vendor-events/', { credentials: 'same-origin' })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const completedList = document.getElementById('completed-list');
      const ongoingList = document.getElementById('ongoing-list');
      const upcomingList = document.getElementById('upcoming-list');
      if (completedList) completedList.innerHTML = '';
      if (ongoingList) ongoingList.innerHTML = '';
      if (upcomingList) upcomingList.innerHTML = '';

      let cCount = 0, oCount = 0, uCount = 0;
      data.events.forEach(ev => {
        const card = document.createElement('div');
        card.classList.add('card', 'service');
        if (ev.order_type === 'addon') {
          card.classList.replace('service', 'addon');
        }

        const h = document.createElement('div');
        h.classList.add('card-header');
        h.innerHTML = `<h2>${ev.event_name}</h2>`;
        card.appendChild(h);

        const bd = document.createElement('div');
        bd.classList.add('card-body');
        bd.innerHTML = `
          <div class="info-row">
            <span class="label">Venue:</span>
            <span class="value">${ev.venue}</span>
          </div>
          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value">${new Date(ev.event_date).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="label">Time:</span>
            <span class="value">${ev.event_timing}</span>
          </div>
          <div class="info-row">
            <span class="label">Salary:</span>
            <span class="value">₹ ${ev.salary.toLocaleString()}</span>
          </div>
        `;
        bd.style.marginTop = '8px';
        card.appendChild(bd);

        if (ev.status === 'completed') {
          if (completedList) completedList.appendChild(card);
          cCount++;
        } else if (ev.status === 'ongoing') {
          if (ongoingList) ongoingList.appendChild(card);
          oCount++;
        } else {
          if (upcomingList) upcomingList.appendChild(card);
          uCount++;
        }
      });

      const completedEmpty = document.getElementById('completed-empty');
      const ongoingEmpty = document.getElementById('ongoing-empty');
      const upcomingEmpty = document.getElementById('upcoming-empty');
      if (completedEmpty) completedEmpty.style.display = cCount ? 'none' : '';
      if (ongoingEmpty) ongoingEmpty.style.display = oCount ? 'none' : '';
      if (upcomingEmpty) upcomingEmpty.style.display = uCount ? 'none' : '';
    })
    .catch(err => console.error('Error loading your events:', err));
}

// Tab navigation for “Your Events”
function setupEventTabs() {
  const tabs = document.querySelectorAll('.tab');
  const secs = document.querySelectorAll('.events-section');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      secs.forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });
}

// Handle sidebar anchor navigation
function setupSectionNav() {
  const sections = document.querySelectorAll('.form-step');
  const navLinks = document.querySelectorAll('.sidebar-menu a[href^="#"]');
  function showSection(hash) {
    sections.forEach(sec => sec.classList.remove('active'));
    const panel = document.querySelector(hash);
    if (panel) panel.classList.add('active');
  }
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      const h = link.getAttribute('href');
      if (!h.startsWith('#')) return;
      e.preventDefault();
      history.pushState(null, '', h);
      showSection(h);
    });
  });
  showSection(window.location.hash || '#vendor-dashboard');
}


function approveVendor(vendorId) {
  fetch('/api/vendor-approve/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ vendor_id: vendorId, approve: true })
  }).then(() => location.reload());
}

// Prompt for rejection reason and send rejection request
function rejectVendorPrompt(vendorId) {
  const reason = prompt('Enter rejection reason:');
  if (!reason) {
    alert('Rejection reason is required.');
    return;
  }
  fetch('/api/vendor-approve/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ vendor_id: vendorId, approve: false, reason })
  }).then(() => location.reload());
}

async function logout() {
  try {
    // Disable the logout button to prevent double-clicks
    const btn = document.querySelector('#nav-logout a');
    if (btn) btn.style.pointerEvents = 'none';

    // Send POST to your logout API view
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