import { useEffect, useRef } from 'react';
import ADS_CONFIG from '../config/ads';
import './AdSlot.css';

// Generates the ad HTML/script for each network
function getAdContent(type) {
  if (!ADS_CONFIG.ENABLED) return null;

  const network = ADS_CONFIG.NETWORK;
  const config = ADS_CONFIG[network];
  if (!config) return null;

  switch (network) {
    case 'monetag': {
      const zoneId = type === 'banner' ? config.bannerZone : config.rectangleZone;
      return `<script async src="https://alwingulla.com/tag.min.js" data-zone="${zoneId}"></script>`;
    }
    case 'hilltopads': {
      const zoneId = type === 'banner' ? config.bannerZone : config.rectangleZone;
      return `<script async src="https://hilltopads.net/hta/js/${zoneId}.js"></script>`;
    }
    case 'adsterra': {
      const key = type === 'banner' ? config.bannerKey : config.nativeBannerKey;
      return `<script async src="//www.highperformanceformat.com/${key}/invoke.js"></script><div id="container-${key}"></div>`;
    }
    case 'a-ads': {
      const size = type === 'banner' ? '728x90' : '300x250';
      return `<iframe data-aa="${config.adUnitId}" src="//ad.a-ads.com/${config.adUnitId}?size=${size}" style="width:${size.split('x')[0]}px; height:${size.split('x')[1]}px; border:0; padding:0; overflow:hidden; background:transparent;"></iframe>`;
    }
    case 'custom': {
      return type === 'banner' ? config.bannerHtml : config.rectangleHtml;
    }
    default:
      return null;
  }
}

/**
 * AdSlot Component
 * 
 * Usage: <AdSlot type="banner" />  or  <AdSlot type="rectangle" />
 * 
 * type="banner"     → 728x90 leaderboard (horizontal, between sections)
 * type="rectangle"  → 300x250 medium rectangle (sidebar, inline)
 */
export default function AdSlot({ type = 'banner', className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!ADS_CONFIG.ENABLED || !containerRef.current) return;

    const html = getAdContent(type);
    if (!html) return;

    // Clear old content
    containerRef.current.innerHTML = '';

    // Parse and inject scripts properly
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Move all nodes including scripts
    Array.from(temp.childNodes).forEach(node => {
      if (node.tagName === 'SCRIPT') {
        const script = document.createElement('script');
        // Copy all attributes
        Array.from(node.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });
        if (node.textContent) script.textContent = node.textContent;
        containerRef.current.appendChild(script);
      } else {
        containerRef.current.appendChild(node.cloneNode(true));
      }
    });
  }, [type]);

  // Don't render anything if ads are disabled
  if (!ADS_CONFIG.ENABLED) return null;

  return (
    <div
      ref={containerRef}
      id={`ad-slot-${type}-${Math.random().toString(36).substr(2, 9)}`}
      className={`ad-slot ad-slot--${type} ${className}`}
      data-ad-type={type}
    >
      {/* Ad content will be injected here */}
    </div>
  );
}

/**
 * PopunderLoader
 * 
 * Loads a pop-under script once on first user click.
 * Place this component once in App.jsx.
 */
export function PopunderLoader() {
  useEffect(() => {
    if (!ADS_CONFIG.ENABLED) return;
    
    const network = ADS_CONFIG.NETWORK;
    const config = ADS_CONFIG[network];
    
    if (!config?.popunderEnabled) return;

    let scriptSrc = '';
    if (network === 'monetag') {
      scriptSrc = `https://alwingulla.com/tag.min.js`;
    } else if (network === 'hilltopads') {
      scriptSrc = `https://hilltopads.net/hta/js/${config.popunderZone}.js`;
    } else if (network === 'adsterra') {
      scriptSrc = `//www.highperformanceformat.com/${config.popunderKey}/invoke.js`;
    }

    if (!scriptSrc) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = scriptSrc;
    if (network === 'monetag') {
      script.setAttribute('data-zone', config.popunderZone);
    }
    document.head.appendChild(script);

    return () => {
      try { document.head.removeChild(script); } catch {}
    };
  }, []);

  return null; // Invisible component
}
