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

    // Colors - Blue and Orange with highlighted X
    colors: {
      primary: '#1e3a5f',        // Deep blue
      primaryLight: '#2563eb',   // Bright blue
      secondary: '#f97316',      // Orange
      secondaryLight: '#ea580c', // Dark orange
      accent: '#f97316',
      background: '#f4f4f4',
      surface: '#ffffff',
      text: '#1e3a5f',
      textLight: '#64748b',
      success: '#166534',
      error: '#dc2626',
      warning: '#f59e0b',
    },

    // Gradients
    gradients: {
      header: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      button: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      accent: 'linear-gradient(90deg, #f97316 0%, #ea580c 50%, #f97316 100%)',
    },

    // Logo - X is highlighted and larger
    logo: {
      text: 'TRADUX',
      html: `<span style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -1px;">
        <span style="color: #ffffff;">TRADU</span><span style="color: #f97316; font-size: 1.25em; font-weight: 900;">X</span>
      </span>`,
      // For dark backgrounds
      htmlDark: `<span style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -1px;">
        <span style="color: #ffffff;">TRADU</span><span style="color: #f97316; font-size: 1.25em; font-weight: 900;">X</span>
      </span>`,
      // For light backgrounds
      htmlLight: `<span style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -1px;">
        <span style="color: #1e3a5f;">TRADU</span><span style="color: #f97316; font-size: 1.25em; font-weight: 900;">X</span>
      </span>`,
    },

    // Company Info
    company: {
      name: 'TRADUX',
      email: 'contact@tradux.com',
      phone: '',
      address: '',
      website: 'https://tradux.com',
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
      showUSCIS: false,
    },

    // Social Links
    social: {
      facebook: '',
      instagram: '',
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
export const TraduxLogo = ({ size = 'normal', variant = 'dark' }) => {
  const sizeStyles = {
    small: { fontSize: '18px' },
    normal: { fontSize: '28px' },
    large: { fontSize: '42px' },
  };

  const style = {
    fontFamily: "'Segoe UI', Arial, sans-serif",
    fontWeight: 800,
    letterSpacing: '-1px',
    ...sizeStyles[size],
  };

  const xStyle = {
    color: '#f97316',
    fontSize: '1.25em',
    fontWeight: 900,
  };

  const textColor = variant === 'light' ? '#1e3a5f' : '#ffffff';

  return (
    <span style={style}>
      <span style={{ color: textColor }}>TRADU</span>
      <span style={xStyle}>X</span>
    </span>
  );
};

export default THEMES;
