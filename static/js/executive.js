function getCSRFToken() {
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('csrftoken='))
    .split('=')[1];
} 

window.openEventDetails = function(eventId) {
  // You could fetch more details via an API:
  fetch(`/api/event-details/${eventId}/`)
    .then(res => res.json())
    .then(data => {
      // render into your #event-details-content…
      document.getElementById('eventId').textContent = eventId;
      document.getElementById('event-details-content').innerHTML = data.html;
      document.getElementById('event-details-modal').classList.add('show');
      const url = `/executive/event/${eventId}/`;
      window.location.href = url;
    });
};

document.addEventListener('DOMContentLoaded', function() {
  // Initialize sidebar toggle functionality
  initSidebar();
  
  // Initialize tab navigation
  initTabs();
  
  // Initialize menu items click events
  initMenuItems();
  
  // Initialize vendor authentication functionality
  initVendorFunctions();
  
  // Initialize modal functionality
  initModals();
});



// Sidebar toggle functionality
function initSidebar() {
  const toggleBtn = document.getElementById('toggleSidebar');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('expanded');
    });
  }
  
  // Toggle submenu visibility
  const menuItems = document.querySelectorAll('.menu-item[data-has-submenu="true"]');
  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      const section = this.getAttribute('data-section');
      const submenuId = section + 'Submenu';
      const submenu = document.getElementById(submenuId);
      
      if (submenu) {
        submenu.classList.toggle('open');
        this.classList.toggle('expanded');
      }
    });
  });
}

// Initialize tab navigation
function initTabs() {
  const tabItems = document.querySelectorAll('.tab-item');
  
  tabItems.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      const tabSection = this.closest('.section');
      
      // Remove active class from all tabs
      tabSection.querySelectorAll('.tab-item').forEach(t => {
        t.classList.remove('active');
      });
      
      // Hide all tab content
      tabSection.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Activate selected tab and content
      this.classList.add('active');
      tabSection.querySelector(`.tab-content[data-tab-content="${tabId}"]`).classList.add('active');
    });
  });
  
  // Initialize sub-menu items for section tabs
  const subMenuItems = document.querySelectorAll('.sub-menu-item');
  subMenuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent parent menu item click
      
      const section = this.getAttribute('data-section');
      const tab = this.getAttribute('data-tab');
      
      // Show the section
      showSection(section);
      
      // Activate the tab
      const tabItem = document.querySelector(`#${section} .tab-item[data-tab="${tab}"]`);
      if (tabItem) {
        tabItem.click();
      }
    });
  });
}

// Initialize menu items click events
function initMenuItems() {
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      // Skip if this menu item has submenu and the click wasn't on the menu item itself
      if (this.getAttribute('data-has-submenu') === 'true' && e.target !== this && !e.target.classList.contains('menu-item')) {
        return;
      }
      
      const sectionId = this.getAttribute('data-section');
      showSection(sectionId);
      
      // Update active menu item
      menuItems.forEach(mi => mi.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// Show specific section and update page title
function showSection(sectionId) {
  // Hide all sections
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.classList.remove('active');
  });
  
  // Show requested section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
      // Convert first letter to uppercase and the rest to lowercase
      const formattedTitle = sectionId.charAt(0).toUpperCase() + sectionId.slice(1).toLowerCase();
      pageTitle.textContent = formattedTitle;
    }
  }
}

// Approve vendor application
window.approveVendor = function(vendorId) {
  fetch('/api/vendor-approve/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ vendor_id: vendorId, approve: true })
  })
  .then(() => location.reload());
};

window.rejectVendorPrompt = function(vendorId) {
  const reason = prompt("Please provide a reason for rejection:");
  if (!reason) {
    return alert("Rejection reason is required.");
  }
  fetch('/api/vendor-approve/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ vendor_id: vendorId, approve: false, reason })
  })
  .then(() => location.reload());
};

// Initialize modals
function initModals() {
  // Get all close modal buttons
  const closeButtons = document.querySelectorAll('.close-modal');
  closeButtons.forEach(button => {
    button.addEventListener('click', function() {
      closeModal();
    });
  });
  
  // Close modal when clicking outside the modal content
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal();
      }
    });
  });
}

// Close any open modals
function closeModal() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.classList.remove('show');
  });
}

// Show vendor ID card modal
function showVendorId(url) {
  const vendorIdModal = document.getElementById('vendor-id-modal');
  const vendorIdContent = document.getElementById('vendor-id-content');
  
  if (vendorIdModal && vendorIdContent) {
    vendorIdContent.innerHTML = `<img src="${url}" alt="Vendor ID Card" class="vendor-id-image">`;
    vendorIdModal.classList.add('show');
  }
}

// Add event listeners for search input
document.querySelectorAll('.search-input').forEach(input => {
  input.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const tableRows = this.closest('.section').querySelectorAll('tbody tr');
    
    tableRows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });
});

// Filter event status checkboxes
document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
  checkbox.addEventListener('change', function() {
    const status = this.id.replace('filter-', '');
    const isChecked = this.checked;
    
    // In a real app, this would filter results from server
    // For demo, just show/hide corresponding tab
    const tabItem = document.querySelector(`.tab-item[data-tab="${status}"]`);
    if (tabItem) {
      tabItem.style.display = isChecked ? '' : 'none';
      
      // If unchecked tab was active, activate first visible tab
      if (!isChecked && tabItem.classList.contains('active')) {
        const firstVisibleTab = document.querySelector('.tab-item:not([style*="display: none"])');
        if (firstVisibleTab) {
          firstVisibleTab.click();
        }
      }
    }
  });
});

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
