(function(){
  const API_BASE = window.SAFEWORKUK_API_BASE || '';
  const CALENDLY_URL = window.SAFEWORKUK_CALENDLY || 'https://calendly.com/safeworkuk/intro-call';

  function el(tag, cls, text){ const e=document.createElement(tag); if(cls) e.className=cls; if(text) e.textContent=text; return e; }

  const root = document.getElementById('safeworkuk-chat-root') || document.body;
  const btn = el('button', '', 'Chat • SafeWorkUK'); btn.id='safeworkuk-chat-button'; root.appendChild(btn);

  const panel = el('div'); panel.id='safeworkuk-panel';
  panel.innerHTML = ''
    + '<div id="safeworkuk-header">'
    + '  <span>SafeWorkUK Agent</span>'
    + '  <div class="actions">'
    + '    <a href="#" id="book-call" target="_blank" rel="noopener">Book a call</a>'
    + '    <button id="lead-btn">Get a quote</button>'
    + '  </div>'
    + '</div>'
    + '<div id="safeworkuk-body"></div>'
    + '<div id="safeworkuk-lead">'
    + '  <h4>Request a tailored quote</h4>'
    + '  <div class="row">'
    + '    <input id="lead-name" placeholder="Name" />'
    + '    <input id="lead-company" placeholder="Company (optional)" />'
    + '  </div>'
    + '  <div class="row">'
    + '    <input id="lead-email" placeholder="Email" />'
    + '    <input id="lead-phone" placeholder="Phone (optional)" />'
    + '  </div>'
    + '  <textarea id="lead-message" placeholder="Tell us about your premises (size, people, type)"></textarea>'
    + '  <div class="submit">'
    + '    <button class="cancel" id="lead-cancel">Cancel</button>'
    + '    <button class="send" id="lead-send">Send</button>'
    + '  </div>'
    + '</div>'
    + '<div id="safeworkuk-input"><input placeholder="Ask a safety question..."/><button>Send</button></div>';
  document.body.appendChild(panel);

  const body = panel.querySelector('#safeworkuk-body');
  const input = panel.querySelector('#safeworkuk-input input');
  const sendBtn = panel.querySelector('#safeworkuk-input button');

  const bookBtn = panel.querySelector('#book-call');
  const leadBtn = panel.querySelector('#lead-btn');
  const leadDrawer = panel.querySelector('#safeworkuk-lead');
  const leadCancel = panel.querySelector('#lead-cancel');
  const leadSend = panel.querySelector('#lead-send');

  const leadName = panel.querySelector('#lead-name');
  const leadCompany = panel.querySelector('#lead-company');
  const leadEmail = panel.querySelector('#lead-email');
  const leadPhone = panel.querySelector('#lead-phone');
  const leadMessage = panel.querySelector('#lead-message');

  bookBtn.onclick = (e)=>{ e.preventDefault(); window.open(CALENDLY_URL, '_blank'); };

  function toggleLead(open){ leadDrawer.style.display = open ? 'block' : 'none'; }
  leadBtn.onclick = ()=> toggleLead(true);
  leadCancel.onclick = ()=> toggleLead(false);

  async function postLead(){
    const payload = {
      name: (leadName.value||'').trim(),
      company: (leadCompany.value||'').trim(),
      email: (leadEmail.value||'').trim(),
      phone: (leadPhone.value||'').trim(),
      message: (leadMessage.value||'').trim()
    };
    if(!payload.email && !payload.phone){
      alert('Please provide at least an email or phone.');
      return;
    }
    try{
      const r = await fetch(API_BASE + '/lead', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if(j.ok){
        toggleLead(false);
        addMessage('agent', 'Thanks — we’ve received your details and will get back to you shortly.');
        leadName.value = leadCompany.value = leadEmail.value = leadPhone.value = leadMessage.value = '';
      }else{
        addMessage('agent', 'Sorry, we could not submit your details. Please try again.');
      }
    }catch(e){
      addMessage('agent', 'Network error while sending your details.');
    }
  }
  leadSend.onclick = postLead;

  function addMessage(role, text){
    const m = el('div', 'message '+role);
    const b = el('div', 'bubble'); b.textContent = text;
    m.appendChild(b); body.appendChild(m); body.scrollTop = body.scrollHeight;
  }

  async function send(){
    const text = input.value.trim();
    if(!text) return;
    addMessage('user', text);
    input.value=''; sendBtn.disabled=true;
    try{
      const r = await fetch(API_BASE + '/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: text })
      });
      const j = await r.json();
      addMessage('agent', j.answer || 'Sorry, something went wrong.');
    }catch(e){
      addMessage('agent','Network error.');
    }finally{
      sendBtn.disabled=false;
    }
  }

  const chatBtn = document.getElementById('safeworkuk-chat-button');
  chatBtn.onclick = ()=>{ panel.style.display = panel.style.display==='block' ? 'none' : 'block'; };
  sendBtn.onclick = send;
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') send(); });

  setTimeout(()=> addMessage('agent', 'Hi — ask me anything about Fire & Health & Safety. You can also book a call or request a quote.'), 400);
})();
