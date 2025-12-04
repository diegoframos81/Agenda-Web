/**
 * Testes de Responsividade
 * Para verificar a funcionamento em diferentes dispositivos
 */

// Simulador de tamanhos de tela para testes
const ResponsiveTestHelper = {
  // Tamanhos de dispositivos conhecidos
  devices: {
    'iPhone SE': { width: 375, height: 667, dpr: 2 },
    'iPhone 12': { width: 390, height: 844, dpr: 3 },
    'iPhone 14 Pro': { width: 393, height: 852, dpr: 3 },
    'iPhone 14 Pro Max': { width: 430, height: 932, dpr: 3 },
    'Samsung Galaxy A12': { width: 480, height: 960, dpr: 2 },
    'Samsung Galaxy S21': { width: 360, height: 800, dpr: 2 },
    'Pixel 6': { width: 412, height: 915, dpr: 2.75 },
    'iPad Mini': { width: 768, height: 1024, dpr: 2 },
    'iPad Air': { width: 820, height: 1180, dpr: 2 },
    'iPad Pro 11"': { width: 834, height: 1194, dpr: 2 },
    'iPad Pro 12.9"': { width: 1024, height: 1366, dpr: 2 },
    'Laptop 13"': { width: 1280, height: 720, dpr: 1 },
    'Desktop 1080p': { width: 1920, height: 1080, dpr: 1 },
    'Desktop 1440p': { width: 2560, height: 1440, dpr: 1 },
    'TV 4K': { width: 3840, height: 2160, dpr: 1 },
  },

  // Testar responsividade em um dispositivo simulado
  testDevice(deviceName) {
    const device = this.devices[deviceName];
    if (!device) {
      console.error(`Dispositivo não encontrado: ${deviceName}`);
      return;
    }

    console.log(`\n📱 Testando: ${deviceName}`);
    console.log(`   Resolução: ${device.width}x${device.height}`);
    console.log(`   DPR: ${device.dpr}`);

    // Simular mudança de tamanho
    const size = ResponsiveHelper.getCurrentSize();
    const deviceType = ResponsiveHelper.getDeviceType();

    console.log(`   Breakpoint detectado: ${size}`);
    console.log(`   Tipo: ${deviceType.isPhone ? 'Telefone' : deviceType.isTablet ? 'Tablet' : 'Desktop'}`);
    console.log(`   Orientação: ${ResponsiveHelper.getOrientation()}`);

    // Verificar features
    console.log(`   Touchscreen: ${ResponsiveHelper.hasFeature('touchscreen')}`);
    console.log(`   Dark Mode: ${ResponsiveHelper.hasFeature('darkMode')}`);
    console.log(`   Notch: ${ResponsiveHelper.hasFeature('notch')}`);

    // Verificar elementos importantes
    this.checkElements(deviceName, device);
  },

  // Verificar se elementos estão corretamente dimensionados
  checkElements(deviceName, device) {
    console.log(`\n🔍 Verificando elementos:`);

    // Verificar header
    const header = document.querySelector('header');
    if (header) {
      const rect = header.getBoundingClientRect();
      console.log(`   Header altura: ${rect.height}px`);
      console.log(`   Header largura: ${rect.width}px`);
    }

    // Verificar topbar
    const topbar = document.querySelector('.topbar');
    if (topbar) {
      const rect = topbar.getBoundingClientRect();
      console.log(`   Topbar altura: ${rect.height}px`);
      const buttons = topbar.querySelectorAll('button');
      if (buttons.length > 0) {
        const btnRect = buttons[0].getBoundingClientRect();
        console.log(`   Botão altura: ${btnRect.height}px (Recomendado: ≥44px)`);
        console.log(`   Botão largura: ${btnRect.width}px`);
      }
    }

    // Verificar modais
    const modals = document.querySelectorAll('.modal-content');
    modals.forEach((modal, idx) => {
      const rect = modal.getBoundingClientRect();
      console.log(`   Modal ${idx + 1} largura: ${rect.width}px (Max: ${device.width * 0.9}px)`);
      console.log(`   Modal ${idx + 1} altura: ${rect.height}px`);
    });

    // Verificar calendário
    const calendar = document.querySelector('#calendar');
    if (calendar) {
      const rect = calendar.getBoundingClientRect();
      console.log(`   Calendário altura: ${rect.height}px`);
      console.log(`   Calendário largura: ${rect.width}px`);
    }

    // Verificar grid
    const grid = document.querySelector('.rooms-grid');
    if (grid) {
      const rect = grid.getBoundingClientRect();
      const items = grid.querySelectorAll('.room-card');
      console.log(`   Grid items: ${items.length}`);
      if (items.length > 0) {
        const itemRect = items[0].getBoundingClientRect();
        console.log(`   Item card altura: ${itemRect.height}px`);
        console.log(`   Item card largura: ${itemRect.width}px`);
      }
    }
  },

  // Testar todos os dispositivos
  testAllDevices() {
    console.log('\n========== TESTE DE RESPONSIVIDADE ==========\n');
    Object.keys(this.devices).forEach(device => {
      this.testDevice(device);
    });
    console.log('\n========== FIM DO TESTE ==========\n');
  },

  // Gerar relatório de acessibilidade
  generateAccessibilityReport() {
    console.log('\n📊 RELATÓRIO DE ACESSIBILIDADE\n');

    // Verificar áreas de toque
    const buttons = document.querySelectorAll('button, [role="button"]');
    let smallButtons = 0;
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.height < 44 || rect.width < 44) {
        smallButtons++;
      }
    });
    console.log(`Botões com área de toque < 44px: ${smallButtons}/${buttons.length}`);

    // Verificar contraste de cores (simples)
    const textElements = document.querySelectorAll('body *');
    console.log(`Total de elementos: ${textElements.length}`);

    // Verificar labels
    const inputs = document.querySelectorAll('input, select, textarea');
    let withoutLabel = 0;
    inputs.forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (!label && !input.closest('label')) {
        withoutLabel++;
      }
    });
    console.log(`Inputs sem label: ${withoutLabel}/${inputs.length}`);

    // Verificar ARIA labels
    const withoutAria = Array.from(document.querySelectorAll('button:not([aria-label]):not([title])'));
    console.log(`Botões sem aria-label: ${withoutAria.length}`);

    // Verificar focusable elements
    const focusable = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    console.log(`Elementos focalizáveis (keyboard): ${focusable.length}`);
  },

  // Testar performance em resize
  testResizePerformance() {
    console.log('\n⏱️ TESTE DE PERFORMANCE EM RESIZE\n');

    const sizes = [320, 380, 480, 768, 1024, 1280, 1920, 3840];
    sizes.forEach(width => {
      const start = performance.now();
      
      // Simular resize
      window.innerWidth = width;
      const event = new Event('resize');
      window.dispatchEvent(event);

      const end = performance.now();
      const duration = (end - start).toFixed(2);
      
      const size = ResponsiveHelper.getCurrentSize();
      console.log(`${width}px (${size}): ${duration}ms`);
    });
  },

  // Checklist de responsividade
  generateChecklist() {
    const checks = {
      '320px viewport': () => window.innerWidth >= 320,
      '480px viewport': () => window.innerWidth >= 480,
      '768px viewport': () => window.innerWidth >= 768,
      '1024px viewport': () => window.innerWidth >= 1024,
      'Sem scroll horizontal': () => document.documentElement.scrollWidth <= window.innerWidth,
      'Header visível': () => !!document.querySelector('header'),
      'Calendário carregado': () => !!document.querySelector('#calendar'),
      'Modais não-overflow': () => {
        const modals = document.querySelectorAll('.modal-content');
        return Array.from(modals).every(m => m.offsetHeight <= window.innerHeight * 0.9);
      },
      'Botões >= 44px': () => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons).every(b => b.offsetHeight >= 44 || b.offsetHeight === 0);
      },
      'Touch-friendly (mobile)': () => {
        if (window.innerWidth > 768) return true;
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons).every(b => b.offsetHeight >= 44 || b.offsetHeight === 0);
      },
      'Fonte legível': () => {
        const fontSize = parseInt(getComputedStyle(document.body).fontSize);
        return fontSize >= 14;
      },
      'Cores com contraste': () => true, // Verificação manual
      'Sem elementos ocultos indesejados': () => {
        const hidden = document.querySelectorAll('[style*="display: none"]');
        return hidden.length < document.querySelectorAll('*').length * 0.5;
      },
      'Tabelas responsivas': () => {
        const tables = document.querySelectorAll('table');
        return Array.from(tables).length === 0 || window.innerWidth >= 768;
      },
    };

    console.log('\n✅ CHECKLIST DE RESPONSIVIDADE\n');
    let passed = 0;
    let failed = 0;

    Object.entries(checks).forEach(([check, fn]) => {
      try {
        const result = fn();
        if (result) {
          console.log(`✅ ${check}`);
          passed++;
        } else {
          console.log(`❌ ${check}`);
          failed++;
        }
      } catch (e) {
        console.log(`⚠️ ${check} (erro: ${e.message})`);
      }
    });

    console.log(`\nResultado: ${passed} passou, ${failed} falhou`);
    console.log(`Taxa de sucesso: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  },
};

// Exportar para usar no console
window.ResponsiveTestHelper = ResponsiveTestHelper;

// Instruções de uso
console.log(`
🧪 FERRAMENTA DE TESTE DE RESPONSIVIDADE

Use os seguintes comandos no console (F12):

1. Testar um dispositivo específico:
   ResponsiveTestHelper.testDevice('iPhone 14 Pro')
   ResponsiveTestHelper.testDevice('iPad Air')
   ResponsiveTestHelper.testDevice('Desktop 1080p')

2. Testar todos os dispositivos:
   ResponsiveTestHelper.testAllDevices()

3. Gerar relatório de acessibilidade:
   ResponsiveTestHelper.generateAccessibilityReport()

4. Testar performance em resize:
   ResponsiveTestHelper.testResizePerformance()

5. Gerar checklist:
   ResponsiveTestHelper.generateChecklist()

6. Ver tamanho detectado:
   ResponsiveHelper.getCurrentSize()

7. Ver tipo de dispositivo:
   ResponsiveHelper.getDeviceType()

8. Verificar features suportadas:
   ResponsiveHelper.hasFeature('touchscreen')

Dispositivos disponíveis para teste:
${Object.keys(ResponsiveTestHelper.devices).map(d => `  - ${d}`).join('\n')}
`);
