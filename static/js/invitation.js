document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const {
    guestId,
    maxCompanions,
    apiUrl,
    initialAcceptStatus,
    initialDeclineReason
  } = window.GUEST_DATA;

  const acceptBtn        = document.getElementById('acceptBtn');
  const declineBtn       = document.getElementById('declineBtn');
  const acceptForm       = document.getElementById('acceptForm');
  const declineForm      = document.getElementById('declineForm');
  const submitAccept     = document.getElementById('submitAccept');
  const submitDecline    = document.getElementById('submitDecline');
  const attendeeCount    = document.getElementById('attendeeCount');
  const memberForms      = document.getElementById('memberFormsContainer');
  const termsAgreed      = document.getElementById('termsAgreed');
  const decisionBtns     = document.querySelector('.decision-buttons');
  const overlay          = document.getElementById('popupOverlay');        // ← new overlay div
  const successPopup     = document.getElementById('rsvpSuccessPopup');
  const successText      = document.getElementById('rsvpSuccessText');
  const closeSuccess     = document.getElementById('closeSuccess');

  // CSRF helper
  function getCSRF() {
    return document.cookie.split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('csrftoken='))
      ?.split('=')[1];
  }

  // Show our new popup + overlay
  function showPopup(message) {
    successText.textContent = message;
    overlay.style.display      = 'block';
    successPopup.classList.add('popup-visible');
  }

    // Wire up the OK button on the popup
  closeSuccess.addEventListener('click', () => {
       overlay.style.display = 'none';
       successPopup.classList.remove('popup-visible'); //
  });

  // If they've already answered, lock everything and show popup
  if (+initialAcceptStatus === 1 || +initialAcceptStatus === -1) {
    decisionBtns.style.display = 'none';
    acceptForm.style.display   = 'none';
    declineForm.style.display  = 'none';

    showPopup(
      +initialAcceptStatus === 1
        ? 'Your RSVP was already confirmed! QR codes will be emailed to all attendees.'
        : (initialDeclineReason || 'You have already declined this invitation.')
    );
    return;
  }



  // Show Accept Form
  function showAcceptForm(e) {
    e.preventDefault();
    acceptForm.style.display = 'block';
    declineForm.style.display = 'none';
    acceptBtn.classList.add('active');
    declineBtn.classList.remove('active');
    acceptForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Show Decline Form
  function showDeclineForm(e) {
    e.preventDefault();
    declineForm.style.display = 'block';
    acceptForm.style.display = 'none';
    declineBtn.classList.add('active');
    acceptBtn.classList.remove('active');
    declineForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Build the per-attendee subforms
  function generateMemberForms() {
    const count = parseInt(attendeeCount.value, 10);
    memberForms.innerHTML = '';
    if (isNaN(count)) return;

    const RELATIONS = ['Myself','Spouse','Father','Mother','Son','Daughter','Sister','Brother','Other'];
    for (let i = 1; i <= count; i++) {
      let options = `<option value="">Select relation</option>`;
      RELATIONS.forEach(rel => {
        if (rel === 'Myself' && i > 1) return;
        const sel = (i === 1 && rel === 'Myself') ? ' selected' : '';
        options += `<option value="${rel}"${sel}>${rel}</option>`;
      });

      const div = document.createElement('div');
      div.className = 'member-form';
      div.innerHTML = `
        <h3><i class="fas fa-user"></i> Attendee ${i}</h3>
        <div class="form-group">
          <label for="memberName${i}">Full Name</label>
          <input type="text" id="memberName${i}" placeholder="Enter full name">
          <div class="error-text" id="nameError${i}">Please enter the attendee's name.</div>
        </div>
        <div class="form-group">
          <label for="memberAge${i}">Age</label>
          <input type="number" id="memberAge${i}" min="1" max="120" placeholder="Enter age">
          <div class="error-text" id="ageError${i}">Please enter a valid age.</div>
        </div>
        <div class="form-group">
          <label for="memberRelation${i}">Relation with Invited Guest</label>
          <select id="memberRelation${i}">${options}</select>
          <div class="error-text" id="relationError${i}">Please select a relation.</div>
        </div>
        <div class="other-relation" id="otherRelation${i}" style="display:none;">
          <div class="form-group">
            <label for="otherRelationText${i}">Please specify relation</label>
            <input type="text" id="otherRelationText${i}" placeholder="Enter relation">
            <div class="error-text" id="otherRelationError${i}">Please specify the relation.</div>
          </div>
        </div>
      `;
      memberForms.appendChild(div);

      // toggle the “Other” box
      const relSelect = document.getElementById(`memberRelation${i}`);
      const otherDiv  = document.getElementById(`otherRelation${i}`);
      relSelect.addEventListener('change', () => {
        otherDiv.style.display = (relSelect.value === 'Other') ? 'block' : 'none';
      });
    }
  }

  // Validate Decline form
  function validateDecline() {
    const reason = document.getElementById('declineReason');
    const err    = document.getElementById('declineReasonError');
    if (!reason.value.trim()) {
      err.style.display = 'block';
      return false;
    }
    err.style.display = 'none';
    return true;
  }

  // Validate Accept form
  function validateAcceptForm() {
    let isValid = true;
    const count = parseInt(attendeeCount.value, 10);
    const cntErr = document.getElementById('attendeeCountError');
    const termsErr = document.getElementById('termsError');

    if (isNaN(count)) {
      cntErr.style.display = 'block';
      isValid = false;
    } else {
      cntErr.style.display = 'none';
    }

    if (!termsAgreed.checked) {
      termsErr.style.display = 'block';
      isValid = false;
    } else {
      termsErr.style.display = 'none';
    }

    for (let i = 1; i <= count; i++) {
      const nameInput   = document.getElementById(`memberName${i}`);
      const ageInput    = document.getElementById(`memberAge${i}`);
      const relSelect   = document.getElementById(`memberRelation${i}`);
      const nameErr     = document.getElementById(`nameError${i}`);
      const ageErr      = document.getElementById(`ageError${i}`);
      const relErr      = document.getElementById(`relationError${i}`);

      if (!nameInput.value.trim())       { nameErr.style.display = 'block'; isValid = false; }
      else                               { nameErr.style.display = 'none';  }

      const age = parseInt(ageInput.value,10);
      if (isNaN(age) || age < 1 || age > 120) { ageErr.style.display = 'block'; isValid = false; }
      else                                    { ageErr.style.display = 'none';  }

      if (!relSelect.value)              { relErr.style.display = 'block'; isValid = false; }
      else                               { relErr.style.display = 'none';  }

      if (relSelect.value === 'Other') {
        const othTxt = document.getElementById(`otherRelationText${i}`);
        const othErr = document.getElementById(`otherRelationError${i}`);
        if (!othTxt.value.trim()) { othErr.style.display='block'; isValid=false; }
        else                      { othErr.style.display='none';   }
      }
    }

    return isValid;
  }

  // POST decline
  async function handleDecline(e) {
    e.preventDefault();
    if (!validateDecline()) return;

    const payload = {
      guest_id: guestId,
      response: 'decline',
      decline_reason: document.getElementById('declineReason').value.trim()
    };

    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRF()
        },
        body: JSON.stringify(payload)
      });
      const result = await resp.json();
      if (result.success) {
        decisionBtns.style.display = 'none';
        showPopup('Your decline response has been received.');
      } else {
        throw new Error('API returned failure');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting your response. Please try again.');
    }
  }

  // POST accept
  async function handleAccept(e) {
    e.preventDefault();
    if (!validateAcceptForm()) return;

    const loader = document.getElementById('acceptLoader');
    loader.style.display = 'block';
    submitAccept.disabled = true;

    const count = parseInt(attendeeCount.value, 10);
    const members = [];
    for (let i = 1; i <= count; i++) {
      const name = document.getElementById(`memberName${i}`).value.trim();
      const age  = document.getElementById(`memberAge${i}`).value;
      let rel    = document.getElementById(`memberRelation${i}`).value;
      if (rel === 'Other') {
        rel = document.getElementById(`otherRelationText${i}`).value.trim();
      }
      members.push({ name, age, relation: rel });
    }

    const payload = {
      guest_id: guestId,
      response: 'accept',
      accepted_members: count,
      members
    };

    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRF()
        },
        body: JSON.stringify(payload)
      });
      const result = await resp.json();
      if (result.success) {
        loader.style.display = 'none';
        showPopup('Thank you! Your RSVP has been confirmed. QR codes will be emailed shortly.');
      } else {
        throw new Error('API returned failure');
      }
    } catch (err) {
      console.error(err);
      loader.style.display = 'none';
      submitAccept.disabled = false;
      alert('Oops! Something went wrong. Please try again.');
    }
  }

  // Wire up event listeners
  acceptBtn.addEventListener('click',      showAcceptForm);
  declineBtn.addEventListener('click',     showDeclineForm);
  attendeeCount.addEventListener('change', generateMemberForms);
  submitDecline.addEventListener('click',  handleDecline);
  submitAccept.addEventListener('click',   handleAccept);

  // Build initial form
  generateMemberForms();
});