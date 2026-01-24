// ==================== MULTI-BRAND THEME CONFIGURATION ====================
// Supports Legacy Translations and TRADUX branding

export const THEMES = {
  legacy: {
    code: 'legacy',
    name: 'Legacy Translations',
    tagline: 'Professional Translation Services',

    // Colors
    colors: {
      primary: '#1a2a4a',        // Dark blue
      primaryLight: '#2c3e5c',
      secondary: '#c9a227',      // Gold
      secondaryLight: '#e6c547',
      accent: '#1e40af',
      background: '#f4f4f4',
      surface: '#ffffff',
      text: '#1a2a4a',
      textLight: '#64748b',
      success: '#166534',
      error: '#dc2626',
      warning: '#f59e0b',
    },

    // Gradients
    gradients: {
      header: 'linear-gradient(135deg, #1a2a4a 0%, #2c3e5c 100%)',
      button: 'linear-gradient(135deg, #1a2a4a 0%, #2c3e5c 100%)',
      gold: 'linear-gradient(90deg, #c9a227 0%, #e6c547 50%, #c9a227 100%)',
    },

    // Logo
    logo: {
      text: 'Legacy Translations',
      html: '<span style="color: #ffffff; font-size: 24px; font-weight: 600;">Legacy Translations</span>',
    },

    // Company Info
    company: {
      name: 'Legacy Translations Inc.',
      email: 'contact@legacytranslations.com',
      phone: '(617) 925-4154',
      address: '867 Boylston Street, 5th Floor #2073, Boston, MA 02116',
      website: 'https://legacytranslations.com',
    },

    // Certifier Info
    certifier: {
      name: 'Beatriz Paiva',
      title: 'Certified Translator',
      credentials: 'ATA #275993',
    },

    // Badges
    badges: {
      showATA: true,
      showBBB: true,
      showUSCIS: true,
    },

    // Social Links
    social: {
      facebook: 'https://www.facebook.com/legacytranslationsusa/',
      instagram: 'https://www.instagram.com/legacytranslations/',
    },
  },

  tradux: {
    code: 'tradux',
    name: 'TRADUX',
    tagline: 'Fast, Affordable, Professional',

    // Colors - Navy Blue and Orange (matching tradux-site repo + user preference)
    colors: {
      primary: '#1E3A8A',        // Navy blue (from tradux-site)
      primaryLight: '#3B82F6',   // Bright blue (from tradux-site)
      secondary: '#f97316',      // Orange (user preference)
      secondaryLight: '#ea580c', // Dark orange
      accent: '#f97316',
      gold: '#D4AF37',           // Gold accent (from tradux-site icons)
      background: '#f8f8f8',     // Light gray (from tradux-site)
      surface: '#ffffff',
      text: '#1E3A8A',
      textLight: '#64748b',
      success: '#166534',
      error: '#dc2626',
      warning: '#f59e0b',
    },

    // Gradients
    gradients: {
      header: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
      button: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      accent: 'linear-gradient(90deg, #f97316 0%, #ea580c 50%, #f97316 100%)',
      hero: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #1E3A8A 100%)',
    },

    // Assets from tradux-site GitHub repository
    assets: {
      baseUrl: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main',
      logo: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/tradux-logo.svg',
      logoWhite: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/tradux-logo-white.svg',
      heroImage: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/hero-image.svg',
      pattern: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/pattern.svg',
      icons: {
        certified: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/certified-icon.svg',
        document: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/document-icon.svg',
        support: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/support-icon.svg',
        uscis: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/uscis-icon.svg',
      },
      social: {
        facebook: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/facebook-icon.svg',
        instagram: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/instagram-icon.svg',
        linkedin: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/linkedin-icon.svg',
        twitter: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/twitter-icon.svg',
        whatsapp: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/whatsapp-icon.svg',
      },
    },

    // Logo - X is highlighted and larger (X marks the spot!)
    logo: {
      text: 'TRADUX',
      html: `<span style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -1px;">
        <span style="color: #ffffff;">TRADU</span><span style="color: #f97316; font-size: 1.35em; font-weight: 900; text-shadow: 0 0 10px rgba(249,115,22,0.5);">X</span>
      </span>`,
      // For dark backgrounds
      htmlDark: `<span style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -1px;">
        <span style="color: #ffffff;">TRADU</span><span style="color: #f97316; font-size: 1.35em; font-weight: 900; text-shadow: 0 0 10px rgba(249,115,22,0.5);">X</span>
      </span>`,
      // For light backgrounds
      htmlLight: `<span style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -1px;">
        <span style="color: #1E3A8A;">TRADU</span><span style="color: #f97316; font-size: 1.35em; font-weight: 900; text-shadow: 0 0 10px rgba(249,115,22,0.5);">X</span>
      </span>`,
      // SVG logo from repo
      svgUrl: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/tradux-logo.svg',
      svgWhiteUrl: 'https://raw.githubusercontent.com/Beatrizpaiva2025/tradux-site/main/tradux-logo-white.svg',
    },

    // Company Info
    company: {
      name: 'TRADUX',
      email: 'contact@tradux.com',
      phone: '(857) 208-1139',
      address: '',
      website: 'https://tradux.com',
      vercelSite: 'https://tradux-site.vercel.app',
      whatsapp: '(857) 208-1139',
    },

    // Certifier Info
    certifier: {
      name: 'TRADUX Translations',
      title: 'Professional Translation Services',
      credentials: '',
    },

    // Badges - TRADUX doesn't show these
    badges: {
      showATA: false,
      showBBB: false,
      showUSCIS: true,  // Show USCIS accepted badge
    },

    // Social Links
    social: {
      facebook: '',
      instagram: '',
      linkedin: '',
      twitter: '',
      whatsapp: 'https://wa.me/18572081139',
    },
  },
};

// Helper function to get theme
export const getTheme = (themeCode = 'legacy') => {
  return THEMES[themeCode] || THEMES.legacy;
};

// Helper function to get CSS variables from theme
export const getThemeCSSVars = (theme) => {
  return {
    '--primary': theme.colors.primary,
    '--primary-light': theme.colors.primaryLight,
    '--secondary': theme.colors.secondary,
    '--secondary-light': theme.colors.secondaryLight,
    '--accent': theme.colors.accent,
    '--background': theme.colors.background,
    '--surface': theme.colors.surface,
    '--text': theme.colors.text,
    '--text-light': theme.colors.textLight,
    '--header-gradient': theme.gradients.header,
    '--button-gradient': theme.gradients.button,
  };
};

// TRADUX Logo Component (for React)
// X is highlighted larger with glow effect - "X marks the spot!"
export const TraduxLogo = ({ size = 'normal', variant = 'dark' }) => {
  const sizeStyles = {
    small: { fontSize: '18px' },
    normal: { fontSize: '28px' },
    large: { fontSize: '42px' },
    xlarge: { fontSize: '56px' },
  };

  const style = {
    fontFamily: "'Segoe UI', Arial, sans-serif",
    fontWeight: 800,
    letterSpacing: '-1px',
    ...sizeStyles[size],
  };

  const xStyle = {
    color: '#f97316',
    fontSize: '1.35em',
    fontWeight: 900,
    textShadow: '0 0 10px rgba(249,115,22,0.5)',
    display: 'inline-block',
    transform: 'translateY(-2px)',
  };

  const textColor = variant === 'light' ? '#1E3A8A' : '#ffffff';

  return (
    <span style={style}>
      <span style={{ color: textColor }}>TRADU</span>
      <span style={xStyle}>X</span>
    </span>
  );
};

// TRADUX Icon URLs helper
export const getTraduxAssets = () => THEMES.tradux.assets;

export default THEMES;
