/**
 * Utilitários de Responsividade Dinâmica
 * Suporte completo para: Phones, Tablets, Desktops, TVs
 */

// Detectar tipo de dispositivo e características
const ResponsiveHelper = {
  // Tamanhos de breakpoint
  breakpoints: {
    xs: 320,      // Telefones muito pequenos
    sm: 380,      // Telefones pequenos
    md: 481,      // Telefones médios
    lg: 768,      // Tablets
    xl: 1025,     // Desktops
    xxl: 1281,    // Desktops grandes
    xxxl: 1601,   // 4K
  },

  // Detectar tamanho atual
  getCurrentSize() {
    const width = window.innerWidth;
    if (width < 380) return 'xs';
    if (width < 481) return 'sm';
    if (width < 768) return 'md';
    if (width < 1025) return 'lg';
    if (width < 1281) return 'xl';
    if (width < 1601) return 'xxl';
    return 'xxxl';
  },

  // Detectar tipo de dispositivo
  getDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isTablet = /tablet|ipad|android/.test(ua) && !/mobile/.test(ua);
    const isPhone = /mobile|phone/.test(ua) || (isAndroid && !isTablet) || (isIos && !isTablet);
    
    return {
      isPhone,
      isTablet,
      isDesktop: !isPhone && !isTablet,
      isAndroid,
      isIos,
      isSafari: /safari/.test(ua),
      isChrome: /chrome/.test(ua),
    };
  },

  // Orientação
  getOrientation() {
    if (window.innerHeight > window.innerWidth) return 'portrait';
    return 'landscape';
  },

  // Detectar suporte a features
  hasFeature(feature) {
    const features = {
      touchscreen: () => window.matchMedia('(hover: none)').matches || 'ontouchstart' in window,
      notch: () => window.matchMedia('screen and (prefers-color-scheme: light)').matches && CSS.supports('padding-top', 'env(safe-area-inset-top)'),
      darkMode: () => window.matchMedia('(prefers-color-scheme: dark)').matches,
      reducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highDpi: () => window.devicePixelRatio >= 2,
    };
    return features[feature] ? features[feature]() : false;
  },

  // Aplicar classe baseada em tamanho
  applyResponsiveClass() {
    const size = this.getCurrentSize();
    const device = this.getDeviceType();
    const html = document.documentElement;
    
    // Remover classes anteriores
    html.classList.remove('size-xs', 'size-sm', 'size-md', 'size-lg', 'size-xl', 'size-xxl', 'size-xxxl');
    html.classList.remove('device-phone', 'device-tablet', 'device-desktop');
    
    // Adicionar classes atuais
    html.classList.add(`size-${size}`);
    if (device.isPhone) html.classList.add('device-phone');
    if (device.isTablet) html.classList.add('device-tablet');
    if (device.isDesktop) html.classList.add('device-desktop');
    
    if (device.isAndroid) html.classList.add('os-android');
    if (device.isIos) html.classList.add('os-ios');
    if (this.getOrientation() === 'landscape') html.classList.add('landscape');
    else html.classList.add('portrait');
  },

  // Ajustar font-size da página
  adjustFontSize() {
    const size = this.getCurrentSize();
    const sizes = {
      xs: '14px',
      sm: '15px',
      md: '16px',
      lg: '16px',
      xl: '16px',
      xxl: '17px',
      xxxl: '18px',
    };
    document.documentElement.style.fontSize = sizes[size];
  },

  // Ajustar altura mínima de elementos clicáveis
  adjustTouchTargets() {
    if (this.hasFeature('touchscreen')) {
      document.documentElement.style.setProperty('--min-touch-height', '44px');
    } else {
      document.documentElement.style.setProperty('--min-touch-height', '32px');
    }
  },

  // Aplicar tema de cor (dark mode automático se preferência do SO)
  applyTheme() {
    if (this.hasFeature('darkMode')) {
      document.documentElement.style.colorScheme = 'dark';
    }
  },

  // Listener para mudanças de resize
  setupResizeListener(callback) {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.applyResponsiveClass();
        this.adjustFontSize();
        this.adjustTouchTargets();
        if (callback) callback();
      }, 150);
    });
  },

  // Listener para mudanças de orientação
  setupOrientationListener(callback) {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.applyResponsiveClass();
        if (callback) callback();
      }, 100);
    });
  },

  // Inicializar
  init(onResize, onOrientationChange) {
    this.applyResponsiveClass();
    this.adjustFontSize();
    this.adjustTouchTargets();
    this.applyTheme();
    this.setupResizeListener(onResize);
    this.setupOrientationListener(onOrientationChange);
  },

  // Verificar se está em viewport
  isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // Ajustar altura do modal em pequenas telas
  adjustModalHeight() {
    const modals = document.querySelectorAll('.modal-content');
    modals.forEach(modal => {
      if (this.getCurrentSize() === 'xs' || this.getCurrentSize() === 'sm') {
        modal.style.maxHeight = '85vh';
      } else if (this.getCurrentSize() === 'md') {
        modal.style.maxHeight = '80vh';
      } else {
        modal.style.maxHeight = '90vh';
      }
    });
  },

  // Desabilitar zoom em inputs em iOS
  disableInputZoom() {
    if (this.getDeviceType().isIos) {
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.style.fontSize = '16px'; // Evita zoom automático no iOS
      });
    }
  },
};

// Inicializar ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
  ResponsiveHelper.init(
    () => {
      // Callback para redimensionamento (opcional)
      console.log('Tamanho atual:', ResponsiveHelper.getCurrentSize());
    },
    () => {
      // Callback para mudança de orientação (opcional)
      console.log('Orientação:', ResponsiveHelper.getOrientation());
    }
  );

  // Aplicar ajustes iniciais
  ResponsiveHelper.adjustModalHeight();
  ResponsiveHelper.disableInputZoom();

  // Reajustar modais quando abertos
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    const observer = new MutationObserver(() => {
      if (modal.style.display === 'flex') {
        ResponsiveHelper.adjustModalHeight();
      }
    });
    observer.observe(modal, { attributes: true });
  });
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.ResponsiveHelper = ResponsiveHelper;
}
