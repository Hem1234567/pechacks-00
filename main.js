document.addEventListener('DOMContentLoaded', () => {
  // --- Theme Toggle ---
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeText = document.getElementById('theme-toggle-text');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');
  
  let isDark = localStorage.getItem('theme') !== 'light';
  
  function updateTheme() {
    document.documentElement.classList.toggle('dark', isDark);
    if (isDark) {
      document.body.classList.add('bg-black', 'text-white');
      document.body.classList.remove('bg-white', 'text-black');
      if (themeText) themeText.textContent = 'Dark';
      if (themeIconSun) themeIconSun.style.display = 'block';
      if (themeIconMoon) themeIconMoon.style.display = 'none';
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('bg-black', 'text-white');
      document.body.classList.add('bg-white', 'text-black');
      if (themeText) themeText.textContent = 'Light';
      if (themeIconSun) themeIconSun.style.display = 'none';
      if (themeIconMoon) themeIconMoon.style.display = 'block';
      localStorage.setItem('theme', 'light');
    }
  }
  
  updateTheme(); // initial

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      isDark = !isDark;
      updateTheme();
    });
  }

  // --- Countdown Timer ---
  const targetDate = new Date("2026-08-29T00:00:00").getTime();
  const elDays = document.getElementById('cd-days');
  const elHours = document.getElementById('cd-hours');
  const elMins = document.getElementById('cd-mins');
  const elSecs = document.getElementById('cd-secs');

  function updateCountdown() {
    const now = Date.now();
    const diff = Math.max(0, targetDate - now);
    
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff / 3600000) % 24);
    const minutes = Math.floor((diff / 60000) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    
    const pad = (n) => String(n).padStart(2, "0");
    
    if (elDays) elDays.textContent = pad(days);
    if (elHours) elHours.textContent = pad(hours);
    if (elMins) elMins.textContent = pad(minutes);
    if (elSecs) elSecs.textContent = pad(seconds);
  }
  
  setInterval(updateCountdown, 1000);
  updateCountdown();

  // --- FAQ Accordion ---
  const faqButtons = document.querySelectorAll('.faq-btn');
  faqButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('.faq-icon');
      
      const isOpen = content.classList.contains('max-h-96');
      if (isOpen) {
        content.classList.remove('max-h-96', 'opacity-100', 'pb-6', 'md:pb-7');
        content.classList.add('max-h-0', 'opacity-0', 'pb-0');
        icon.classList.remove('bg-white', 'text-black', 'rotate-180');
        icon.classList.add('text-white');
      } else {
        content.classList.remove('max-h-0', 'opacity-0', 'pb-0');
        content.classList.add('max-h-96', 'opacity-100', 'pb-6', 'md:pb-7');
        icon.classList.remove('text-white');
        icon.classList.add('bg-white', 'text-black', 'rotate-180');
      }
    });
  });

  // --- Workshop Tabs ---
  const tabButtons = document.querySelectorAll('.workshop-tab-btn');
  const tabContents = document.querySelectorAll('.workshop-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.dataset.day;
      
      // Update buttons
      tabButtons.forEach(b => {
        if (b === btn) {
          b.classList.remove('bg-white/5', 'text-white/70', 'hover:bg-white/10', 'hover:text-white', 'border-white/10');
          b.classList.add('bg-white', 'text-black');
        } else {
          b.classList.add('bg-white/5', 'text-white/70', 'hover:bg-white/10', 'hover:text-white', 'border-white/10');
          b.classList.remove('bg-white', 'text-black');
        }
      });
      
      // Update contents
      tabContents.forEach(content => {
        if (content.dataset.day === day) {
          content.style.display = 'block';
        } else {
          content.style.display = 'none';
        }
      });
    });
  });
  
  // Show first tab by default
  if(tabButtons.length > 0) {
      tabButtons[0].click();
  }

  // --- Glimpse Player ---
  const glimpsePlayers = document.querySelectorAll('.glimpse-player');
  glimpsePlayers.forEach(player => {
    const btn = player.querySelector('.play-btn');
    const iframeContainer = player.querySelector('.iframe-container');
    const videoId = player.dataset.videoId;
    
    if (btn && iframeContainer) {
      btn.addEventListener('click', () => {
        btn.style.display = 'none';
        iframeContainer.innerHTML = `<iframe
          class="absolute inset-0 h-full w-full"
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        ></iframe>`;
      });
    }
  });

  // --- Gallery Hexagonal Layout ---
  const galleryPattern = [5, 4, 5, 4];
  const TOTAL_COLS = 12;

  function applyGalleryLayout() {
    const gridItems = document.querySelectorAll(".gallery-hex-container");
    const isMobile = window.innerWidth <= 600;

    if (isMobile) {
      // Below 600px, styles.css takes over with its own nth-child grid-column
      // rules for the honeycomb pattern. If we don't clear any inline
      // grid-column left over from a wider viewport (e.g. after resizing the
      // window or rotating a device), that inline style wins over the CSS
      // rule and the gallery can end up broken/invisible on mobile.
      gridItems.forEach((item) => {
        item.style.gridColumn = "";
      });
      return;
    } else {
      let row = 0;
      let inRowIndex = 0;

      gridItems.forEach((item) => {
        const perRow = galleryPattern[row % galleryPattern.length];
        const occupiedCols = perRow * 2;
        const leftOffset = Math.floor((TOTAL_COLS - occupiedCols) / 2);
        const startCol = leftOffset + 1 + inRowIndex * 2;
        item.style.gridColumn = `${startCol} / span 2`;

        inRowIndex++;
        if (inRowIndex >= perRow) {
          row++;
          inRowIndex = 0;
        }
      });
    }
  }

  window.addEventListener("resize", applyGalleryLayout);
  applyGalleryLayout();

  // Load GSAP & External Scripts sequentially
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });
  }

  (async () => {
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js");
      await loadScript("https://unpkg.com/@studio-freight/lenis@1.0.33/dist/lenis.min.js");
      await loadScript("./js/splashCursor.js");
      await loadScript("./js/script.js");
    } catch (e) {
      console.warn("PEC Hacks scripts failed to load", e);
    }
  })();
});
