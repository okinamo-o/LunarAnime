import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BRAND_NAME = 'LunarAnime';

/**
 * useSEO Hook
 * Dynamically updates document title and meta tags.
 */
export default function useSEO({ title, description }) {
  const location = useLocation();

  useEffect(() => {
    // Construct the title: "Page Name | LunarAnime" or just "LunarAnime"
    const pageTitle = title ? `${title} | ${BRAND_NAME}` : BRAND_NAME;
    
    // Set document title
    document.title = pageTitle;
    
    console.log(`[SEO] Title set to: ${pageTitle} for path: ${location.pathname}`);

    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description || 'LunarAnime - وجهتك الأولى لمشاهدة الأنمي المترجم بجودة عالية.';

    // Open Graph Tags
    const updateOG = (property, content) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    updateOG('og:title', pageTitle);
    updateOG('og:description', metaDesc.content);
    updateOG('og:url', window.location.href);

  }, [title, description, location.pathname]); // Watch pathname specifically
}
