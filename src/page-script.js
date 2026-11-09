  (function () {
    var html = document.documentElement;
    var viewBtn = document.getElementById('viewToggleBtn');
    var viewLbl = document.getElementById('viewLabel');
    var world = document.getElementById('cameraWorld');
    var viewport = document.getElementById('spatialViewport');

    function setView(next) {
      html.setAttribute('data-view', next);
      if (viewLbl) viewLbl.textContent = next === '3d' ? '3D HUD' : 'FLAT DOC';
      try { localStorage.setItem('viewMode', next); } catch (e) {}
      if (world) world.style.transform = '';
      if (viewport) viewport.scrollTop = 0;
    }
    if (viewBtn) {
      viewBtn.addEventListener('click', function () {
        setView((html.getAttribute('data-view') || '3d') === '3d' ? 'flat' : '3d');
      });
    }
    setView(html.getAttribute('data-view') || '3d');

    var themeBtn = document.getElementById('themeToggleBtn');
    var themeLbl = document.getElementById('themeLabel');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var next = (html.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        if (themeLbl) themeLbl.textContent = next.toUpperCase();
        try { localStorage.setItem('theme', next); } catch (e) {}
      });
    }

    var crtBtn = document.getElementById('crtToggleBtn');
    var crtLbl = document.getElementById('crtLabel');
    function setCrt(on) {
      document.body.classList.toggle('crt-enabled', on);
      if (crtLbl) crtLbl.textContent = on ? 'ON' : 'OFF';
      try { localStorage.setItem('crtFilter', on ? 'on' : 'off'); } catch (e) {}
    }
    var savedCrt = 'on';
    try { savedCrt = localStorage.getItem('crtFilter') || 'on'; } catch (e) {}
    setCrt(savedCrt === 'on');
    if (crtBtn) {
      crtBtn.addEventListener('click', function () {
        setCrt(!document.body.classList.contains('crt-enabled'));
      });
    }

    function tick() {
      var el = document.getElementById('liveClock');
      if (el) el.textContent = new Date().toISOString().substring(11, 19) + ' UTC';
    }
    tick();
    setInterval(tick, 1000);

    if (viewport && world) {
      viewport.addEventListener('pointermove', function (e) {
        if (html.getAttribute('data-view') !== '3d') return;
        var x = e.clientX / window.innerWidth - 0.5;
        var y = e.clientY / window.innerHeight - 0.5;
        world.style.transform = 'rotateY(' + (x * 6).toFixed(2) + 'deg) rotateX(' + (-y * 4).toFixed(2) + 'deg)';
      }, { passive: true });
      viewport.addEventListener('pointerleave', function () { world.style.transform = ''; });
    }
  })();
