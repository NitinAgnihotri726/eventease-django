// executive_event_detail.js

// 1) Parse injected JSON
const guestData         = JSON.parse(document.getElementById('guest-data').textContent);
const vendorChartConfig = JSON.parse(document.getElementById('vendor-chart-data').textContent);
const timelineData      = JSON.parse(document.getElementById('timeline-data').textContent);

document.addEventListener('DOMContentLoaded', () => {
  // Update guest stats
  document.getElementById('invitedCount').textContent   = guestData.invited;
  document.getElementById('checkedInCount').textContent = guestData.checked_in;
  const remaining = guestData.invited - guestData.checked_in;
  document.getElementById('remainingCount').textContent = remaining;

  // Draw guest doughnut
  const guestCtx = document.getElementById('guestChart').getContext('2d');
  new Chart(guestCtx, {
    type: 'doughnut',
    data: {
      labels: ['Attended', 'Remaining'],
      datasets: [{
        data: [guestData.checked_in, remaining],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      cutout: '70%',
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label(ctx) {
              const val = ctx.raw;
              const pct = guestData.invited
                ? Math.round((val / guestData.invited) * 100)
                : 0;
              return `${ctx.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // Render timeline
  const tlList = document.querySelector('.timeline');
  timelineData.forEach(step => {
    const li = document.createElement('li');
    if (step.done) li.classList.add('done');
    li.innerHTML = `
      <time>${
        step.time
          ? new Date(step.time).toLocaleString(undefined, {
              month:  'short',
              day:    'numeric',
              hour:   '2-digit',
              minute: '2-digit'
            })
          : '—'
      }</time>
      <span>${step.name}</span>
    `;
    tlList.appendChild(li);
  });

  // QR Scanner setup with Start button
  const eventData = JSON.parse(document.getElementById('event-data').textContent);
  const startBtn = document.getElementById('startScanBtn');
  const stopBtn  = document.getElementById('stopScanBtn');
  const qrArea   = document.getElementById('qr-reader');
  const qrResult = document.getElementById('qr-reader-results');
  const flipBtn  = document.getElementById('flipCameraBtn');

  let scanner;
  let cameras = [];
  let currentCameraIndex = 0;

  startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    stopBtn.style.display  = 'inline-block';
    flipBtn.style.display  = 'inline-block';
    qrArea.style.display   = 'block';
    qrResult.textContent   = 'Initializing scanner…';

    scanner = new Html5Qrcode("qr-reader");

    Html5Qrcode.getCameras()
      .then(devices => {
        if (!devices || devices.length === 0) {
          throw new Error('No camera devices found');
        }
        cameras = devices;
        currentCameraIndex = 0;
        startCamera();
      })
      .catch(err => {
        console.error('Camera setup error:', err);
        qrResult.textContent = 'Cannot access camera: ' + err.message;
        startBtn.disabled = false;
      });
  });
  
  flipBtn.addEventListener('click', () => {
    if (!scanner || cameras.length < 2) return;

    scanner.stop()
      .then(() => {
        currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
        startCamera();
      })
      .catch(err => {
        console.error('Error flipping camera:', err);
        qrResult.textContent = 'Flip failed: ' + err.message;
      });
  });

  function startCamera() {
    const cameraId = cameras[currentCameraIndex].id;
    scanner.start(
      cameraId,
      { fps: 20, qrbox: 250 },
      onDecodeSuccess,
      () => {}
    ).then(() => {
      qrResult.textContent = 'Scanning for QR code…';
    });
  }
  stopBtn.addEventListener('click', () => {
    if (scanner) {
      scanner.stop()
        .then(() => {
          qrResult.textContent = 'Scanner stopped.';
          qrArea.style.display   = 'none';
          stopBtn.style.display  = 'none';
          startBtn.style.display = 'inline-block';
        })
        .catch(err => {
          console.error('Error stopping scanner:', err);
          qrResult.textContent = 'Error stopping scanner.';
        });
    }
  });

  function onDecodeSuccess(decodedText) {
    // Stop scanning immediately to enforce one-time use
    scanner.stop().catch(console.warn);

    qrArea.style.display   = 'none';
    stopBtn.style.display  = 'none';
    startBtn.style.display = 'inline-block';
    qrResult.textContent   = 'Verifying…';

    // Send token + event_id to backend
    fetch('/api/verify-qr-entry/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({
        token:    decodedText,
        event_id: eventData.event_id
      })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        qrResult.innerHTML = `<span style="color: var(--success)">
          ✔ ${data.guest_name} checked in
        </span>`;
      } else {
        qrResult.innerHTML = `<span style="color: var(--secondary)">
          ✘ ${data.message}
        </span>`;
      }
    })
    .catch(err => {
      console.error('Verification error:', err);
      qrResult.textContent = 'Server error';
    });
  }

});

// Utility to get CSRF token
function getCSRFToken() {
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('csrftoken='))
    ?.split('=')[1] || '';
}
