import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './obd.css';
import { HouseObdApp } from './HouseObdApp';

function RootSwitcher() {
  const [mode, setMode] = useState<'obd' | 'storefront'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('screenshot') || params.get('view') === 'storefront') {
      return 'storefront';
    }
    return 'obd';
  });

  useEffect(() => {
    const storefrontNodes = [
      document.getElementById('gs-hud'),
      document.getElementById('gs-main'),
      document.getElementById('gs-footer'),
      document.getElementById('product-stage-root'),
      document.getElementById('bag-drawer-root'),
    ];
    for (const el of storefrontNodes) {
      if (!el) continue;
      if (mode === 'obd') {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    }
    if (mode === 'storefront') {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    }
  }, [mode]);

  if (mode === 'storefront') {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          type="button"
          onClick={() => setMode('obd')}
          className="px-3.5 py-2 bg-[#0A0A0C]/95 hover:bg-[#FF5500] text-white hover:text-black border border-[#FF5500] obd-mono text-xs font-semibold shadow-[0_0_15px_rgba(255,85,0,0.3)] transition-colors"
        >
          ← Return to HOUSE-OBD Tactical HUD
        </button>
      </div>
    );
  }

  return <HouseObdApp onToggleStorefront={() => setMode('storefront')} />;
}

export function mountHouseObdHud() {
  let mountEl = document.getElementById('house-obd-root');
  if (!mountEl) {
    mountEl = document.createElement('div');
    mountEl.id = 'house-obd-root';
    document.body.prepend(mountEl);
  }
  const root = createRoot(mountEl);
  root.render(<RootSwitcher />);
}
