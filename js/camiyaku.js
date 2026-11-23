/**
 * CamiYaku - JavaScript Completo (ODS 6: Agua Limpia y Saneamiento)
 * Incluye:
 * 1. Navegación por pestañas, alertas y recordatorios base.
 * 2. Calculadora de Consumo Diario + Asistente de Dictado por Voz (Web Speech API + NLP).
 * 3. Detector Multimodal de Fugas (Imagen en Canvas + Contexto Textual).
 * 4. Motor de Retos Adaptativos Semanales sincronizado con el consumo del usuario.
 */

document.addEventListener('DOMContentLoaded', () => {
    /* ======================================================================
       1. NAVEGACIÓN BASE, ALERTAS Y RECORDATORIOS
       ====================================================================== */
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const alertToggles = document.querySelectorAll('.toggle-alert');
    const btnAddReminder = document.getElementById('btn-add-reminder');
    const btnAddAlert = document.getElementById('btn-add-alert');
    const goToLinks = document.querySelectorAll('[data-goto]');
    const tabsNav = document.getElementById('main-tabs');
    const tabsToggle = document.getElementById('tabs-toggle');

    function mostrarVista(idVista) {
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === idVista);
        });

        tabButtons.forEach(btn => {
            const esActual = btn.dataset.tab === idVista;
            btn.classList.toggle('active', esActual);
            btn.textContent = esActual ? 'Inicio' : btn.dataset.label;
            btn.setAttribute('aria-current', esActual ? 'page' : 'false');
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const destino = button.classList.contains('active') ? 'tab-inicio' : button.dataset.tab;
            mostrarVista(destino);
        });
    });

    goToLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarVista(link.dataset.goto);
        });
    });

    if (tabsToggle) {
        tabsToggle.addEventListener('click', () => {
            const oculta = tabsNav.classList.toggle('collapsed');
            tabsToggle.setAttribute('aria-expanded', String(!oculta));
            tabsToggle.setAttribute('aria-label', oculta ? 'Mostrar pestañas' : 'Ocultar pestañas');
        });
    }

    alertToggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const alertContainer = e.target.closest('.alert-switch-item');
            const alertName = alertContainer ? alertContainer.querySelector('strong').textContent : 'Alerta';
            const isChecked = e.target.checked;

            if (isChecked) {
                alert(`Has ACTIVADO la alerta: "${alertName}". El sistema monitoreará anomalías de flujo.`);
            } else {
                alert(`Atención: Has DESACTIVADO la alerta: "${alertName}". Te sugerimos mantenerla activa para evitar desperdicio.`);
            }
        });
    });

    if (btnAddReminder) {
        btnAddReminder.addEventListener('click', () => {
            const newHabit = prompt('Ingresa el nuevo hábito o recordatorio para cuidar el agua (ODS 6):');
            if (newHabit && newHabit.trim() !== '') {
                const list = document.getElementById('reminders-list');
                if (list) {
                    const item = document.createElement('div');
                    item.className = 'reminder-item';
                    item.innerHTML = `
                        <span class="cal-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg></span>
                        <div class="reminder-text">
                            <strong>${newHabit.trim()}</strong>
                            <p>Personalizado • Hoy</p>
                            <span class="next">Siguiente ejecución: Mañana</span>
                        </div>
                        <span class="status-tag tag-pending">Pendiente</span>
                    `;
                    list.prepend(item);
                }
            }
        });
    }

    if (btnAddAlert) {
        btnAddAlert.addEventListener('click', () => {
            const nuevaAlerta = prompt('¿Qué alerta deseas añadir? (ej.: Consumo nocturno inusual)');
            if (nuevaAlerta && nuevaAlerta.trim() !== '') {
                alert(`Alerta "${nuevaAlerta}" registrada correctamente.`);
            }
        });
    }

    /* ======================================================================
       2. CALCULADORA DIARIA + ASISTENTE DE VOZ (WEB SPEECH API + NLP)
       ====================================================================== */
    const CAMIYAKU_CATALOGO = {
        ducha: {
            etiqueta: 'Ducha',
            unidad: 'minutos',
            litrosPorUnidad: 12,
            inputId: 'minutos-ducha',
            regex: /(?:duch[aéeoó]|bañ[aéeoó])\s*(?:por|unos|unas|durante)?\s*(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte)\s*(?:minuto|minutos|min)?/i
        },
        platos: {
            etiqueta: 'Lavado de platos',
            unidad: 'veces',
            litrosPorUnidad: 15,
            inputId: 'veces-platos',
            regex: /(?:lav[eéaoó]\s*(?:los\s*)?platos|vajilla)\s*(\d+|un|una|dos|tres|cuatro|cinco|seis)\s*(?:vez|veces)?/i
        },
        inodoro: {
            etiqueta: 'Uso de inodoro',
            unidad: 'descargas',
            litrosPorUnidad: 6,
            inputId: 'veces-inodoro',
            regex: /(?:inodoro|baño|palanca|jal[eé]\s*(?:la\s*)?palanca)\s*(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s*(?:vez|veces|descargas)?/i
        },
        lavadora: {
            etiqueta: 'Uso de lavadora',
            unidad: 'cargas',
            litrosPorUnidad: 60,
            inputId: 'cargas-lavadora',
            regex: /(?:lavadora|lav[eé]\s*ropa)\s*(\d+|un|una|dos|tres|cuatro)\s*(?:vez|veces|carga|cargas)?/i
        },
        manos: {
            etiqueta: 'Lavado de manos / dientes',
            unidad: 'veces',
            litrosPorUnidad: 2,
            inputId: 'veces-manos',
            regex: /(?:manos|dientes|cepill[eé])\s*(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s*(?:vez|veces)?/i
        }
    };

    const NUMEROS_TEXTO = {
        un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
        seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20
    };

    // Recálculo dinámico de la calculadora principal y sincronización global
    function recalcularConsumoPrincipal() {
        let totalLitros = 0;
        for (const config of Object.values(CAMIYAKU_CATALOGO)) {
            const input = document.getElementById(config.inputId);
            if (input) {
                const val = Math.max(0, parseInt(input.value, 10) || 0);
                totalLitros += val * config.litrosPorUnidad;
            }
        }

        const totalDisplay = document.getElementById('cyCalcTotalDisplay');
        const metaStatus = document.getElementById('cyCalcMetaStatus');
        const metricHoy = document.getElementById('metric-consumo-hoy');
        const ringDiario = document.getElementById('ring-limite-diario');
        const ringTexto = document.getElementById('ring-limite-texto');
        const tdConsumo = document.getElementById('td-consumo-hoy');
        const tdCosto = document.getElementById('td-costo-hoy');
        const tdEstado = document.getElementById('td-estado-hoy');

        if (totalDisplay) totalDisplay.textContent = `${totalLitros} Litros`;
        if (metricHoy) metricHoy.textContent = `${totalLitros} Litros`;
        if (tdConsumo) tdConsumo.textContent = totalLitros;
        if (tdCosto) tdCosto.textContent = `S/ ${(totalLitros * 0.006).toFixed(2)}`;

        const porcentaje = Math.min(100, Math.round((totalLitros / 150) * 100));
        if (ringDiario) ringDiario.style.setProperty('--p', porcentaje);
        if (ringTexto) ringTexto.innerHTML = `${porcentaje}%<small>Límite diario</small>`;

        if (metaStatus && tdEstado) {
            if (totalLitros <= 150) {
                metaStatus.className = 'badge badge-green';
                metaStatus.textContent = 'Dentro de la meta (≤ 150 L)';
                tdEstado.innerHTML = '<span class="badge badge-green">Cumplida</span>';
            } else if (totalLitros <= 185) {
                metaStatus.className = 'badge badge-orange';
                metaStatus.textContent = 'Cerca del límite diario';
                tdEstado.innerHTML = '<span class="badge badge-orange">Cerca del límite</span>';
            } else {
                metaStatus.className = 'badge badge-red';
                metaStatus.textContent = 'Excede límite recomendado';
                tdEstado.innerHTML = '<span class="badge badge-red">Excedida</span>';
            }
        }

        // Notificar al Motor de Retos Adaptativos
        document.dispatchEvent(new CustomEvent('camiyaku:consumoCalculado', {
            detail: { litrosDiarios: totalLitros }
        }));
    }

    const formCalculadora = document.getElementById('formCalculadoraAgua');
    if (formCalculadora) {
        formCalculadora.addEventListener('input', recalcularConsumoPrincipal);
    }

    // Referencias del Modal de Voz
    const modal = document.getElementById('modalVozCamiYaku');
    const btnAbrir = document.getElementById('btnAbrirVoz');
    const btnCerrar = document.getElementById('btnCerrarModalVoz');
    const btnCancelar = document.getElementById('btnCancelarDictado');
    const btnToggleMic = document.getElementById('btnToggleMic');
    const micVisual = document.getElementById('cyMicVisual');
    const estadoVoz = document.getElementById('cyEstadoVoz');
    const transcripcionBox = document.getElementById('cyTranscripcionVivo');
    const resultadosBox = document.getElementById('cyResultadosBox');
    const listaDetectados = document.getElementById('cyListaDetectados');
    const totalLitrosVoz = document.getElementById('cyTotalLitrosVoz');
    const btnAplicar = document.getElementById('btnAplicarDatos');
    const alertaError = document.getElementById('cyAlertaError');
    const mensajeError = document.getElementById('cyMensajeError');
    const btnReintentar = document.getElementById('btnReintentarVoz');
    const btnIrManual = document.getElementById('btnIrManual');

    let recognition = null;
    let estaEscuchando = false;
    let estadoDetectado = {};

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    function configurarReconocimiento() {
        if (!SpeechRecognition) {
            mostrarError(
                'Tu navegador no soporta el reconocimiento de voz nativo. Te recomendamos usar Google Chrome o Edge, o ingresar tus datos manualmente.'
            );
            if (btnToggleMic) btnToggleMic.disabled = true;
            return;
        }

        recognition = new SpeechRecognition();
        recognition.lang = 'es-PE';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            estaEscuchando = true;
            micVisual.classList.add('escuchando');
            estadoVoz.textContent = 'Escuchando... habla con naturalidad (toca el micrófono para pausar)';
            ocultarError();
        };

        recognition.onresult = (event) => {
            let textoCompleto = '';
            for (let i = 0; i < event.results.length; i++) {
                textoCompleto += event.results[i][0].transcript + ' ';
            }
            textoCompleto = textoCompleto.trim();
            transcripcionBox.textContent = textoCompleto;
            procesarLenguajeNatural(textoCompleto);
        };

        recognition.onerror = (event) => {
            detenerEscuchaUI();
            const erroresAmigables = {
                'not-allowed': 'No diste permiso para usar el micrófono. Actívalo en tu navegador o ingresa tus datos manualmente.',
                'no-speech': 'No logramos escuchar tu voz. Acércate un poco más al micrófono e inténtalo de nuevo.',
                'network': 'Hubo un problema de conexión con el servicio de voz. Puedes continuar con el formulario manual.'
            };
            mostrarError(erroresAmigables[event.error] || 'Ocurrió un inconveniente al capturar el audio. Puedes reintentar o llenar los campos manualmente.');
        };

        recognition.onend = () => {
            detenerEscuchaUI();
            if (Object.keys(estadoDetectado).length === 0 && transcripcionBox.textContent.trim() !== '' && !transcripcionBox.querySelector('.cy-placeholder')) {
                mostrarError(
                    'Escuchamos tu frase, pero no identificamos actividades o cantidades claras (ej. "8 minutos de ducha"). Intenta decir el hábito y el número.'
                );
            }
        };
    }

    function convertirANumero(token) {
        const limpio = token.toLowerCase().trim();
        if (!isNaN(limpio)) return parseInt(limpio, 10);
        return NUMEROS_TEXTO[limpio] || 0;
    }

    function procesarLenguajeNatural(texto) {
        let huboCambios = false;
        for (const [clave, config] of Object.entries(CAMIYAKU_CATALOGO)) {
            const match = texto.match(config.regex);
            if (match && match[1]) {
                const cantidad = convertirANumero(match[1]);
                if (cantidad > 0) {
                    estadoDetectado[clave] = cantidad;
                    huboCambios = true;
                }
            }
        }
        if (huboCambios) renderizarResultadosVoz();
    }

    function renderizarResultadosVoz() {
        listaDetectados.innerHTML = '';
        const claves = Object.keys(estadoDetectado);

        if (claves.length === 0) {
            resultadosBox.hidden = true;
            btnAplicar.disabled = true;
            return;
        }

        resultadosBox.hidden = false;
        btnAplicar.disabled = false;
        let totalLitros = 0;

        claves.forEach((clave) => {
            const config = CAMIYAKU_CATALOGO[clave];
            const valor = estadoDetectado[clave];
            const litros = valor * config.litrosPorUnidad;
            totalLitros += litros;

            const li = document.createElement('li');
            li.className = 'cy-detected-item';
            li.innerHTML = `
                <div class="cy-item-info">
                    <span class="cy-item-title">${config.etiqueta}</span>
                    <span class="cy-item-formula">${valor} ${config.unidad} × ${config.litrosPorUnidad} L = <strong>${litros} L</strong></span>
                </div>
                <div class="cy-item-controls">
                    <button type="button" class="cy-btn-step" data-accion="restar" data-clave="${clave}" aria-label="Disminuir ${config.etiqueta}">−</button>
                    <input type="number" min="0" value="${valor}" data-clave="${clave}" aria-label="Cantidad de ${config.etiqueta}">
                    <button type="button" class="cy-btn-step" data-accion="sumar" data-clave="${clave}" aria-label="Aumentar ${config.etiqueta}">+</button>
                </div>
            `;
            listaDetectados.appendChild(li);
        });

        totalLitrosVoz.textContent = `${totalLitros} Litros`;
    }

    if (listaDetectados) {
        listaDetectados.addEventListener('click', (e) => {
            const btn = e.target.closest('.cy-btn-step');
            if (!btn) return;
            const { accion, clave } = btn.dataset;
            if (accion === 'sumar') estadoDetectado[clave]++;
            if (accion === 'restar' && estadoDetectado[clave] > 0) estadoDetectado[clave]--;
            renderizarResultadosVoz();
        });

        listaDetectados.addEventListener('change', (e) => {
            if (e.target.matches('input[type="number"]')) {
                const clave = e.target.dataset.clave;
                estadoDetectado[clave] = Math.max(0, parseInt(e.target.value, 10) || 0);
                renderizarResultadosVoz();
            }
        });
    }

    function abrirModalVoz() {
        estadoDetectado = {};
        transcripcionBox.innerHTML = '<span class="cy-placeholder">Tu voz aparecerá aquí mientras hablas...</span>';
        resultadosBox.hidden = true;
        btnAplicar.disabled = true;
        ocultarError();
        modal.hidden = false;

        if (!recognition) configurarReconocimiento();
        iniciarEscucha();
    }

    function cerrarModalVoz(enfocarManual = false) {
        detenerEscucha();
        modal.hidden = true;
        if (enfocarManual) {
            const primerInput = document.getElementById('minutos-ducha');
            if (primerInput) primerInput.focus();
        }
    }

    function iniciarEscucha() {
        if (recognition && !estaEscuchando) {
            try { recognition.start(); } catch (e) {}
        }
    }

    function detenerEscucha() {
        if (recognition && estaEscuchando) recognition.stop();
        detenerEscuchaUI();
    }

    function detenerEscuchaUI() {
        estaEscuchando = false;
        if (micVisual) micVisual.classList.remove('escuchando');
        if (estadoVoz) estadoVoz.textContent = 'Dictado en pausa. Toca el micrófono para continuar hablando';
    }

    function mostrarError(texto) {
        mensajeError.textContent = texto;
        alertaError.hidden = false;
    }

    function ocultarError() {
        alertaError.hidden = true;
    }

    function aplicarACalculadoraPrincipal() {
        for (const [clave, cantidad] of Object.entries(estadoDetectado)) {
            const inputDestino = document.getElementById(CAMIYAKU_CATALOGO[clave].inputId);
            if (inputDestino) {
                inputDestino.value = cantidad;
            }
        }
        recalcularConsumoPrincipal();
        cerrarModalVoz(false);
    }

    if (btnAbrir) btnAbrir.addEventListener('click', abrirModalVoz);
    if (btnCerrar) btnCerrar.addEventListener('click', () => cerrarModalVoz(false));
    if (btnCancelar) btnCancelar.addEventListener('click', () => cerrarModalVoz(false));
    if (btnIrManual) btnIrManual.addEventListener('click', () => cerrarModalVoz(true));
    if (btnReintentar) btnReintentar.addEventListener('click', () => { ocultarError(); iniciarEscucha(); });
    if (btnToggleMic) btnToggleMic.addEventListener('click', () => { estaEscuchando ? detenerEscucha() : iniciarEscucha(); });
    if (btnAplicar) btnAplicar.addEventListener('click', aplicarACalculadoraPrincipal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.hidden) cerrarModalVoz(false);
    });

    /* ======================================================================
       3. DETECTOR MULTIMODAL DE FUGAS (IMAGEN + TEXTO)
       ====================================================================== */
    const CATEGORIAS_FUGA = {
        leve: {
            id: 'leve',
            icono: '💧',
            nombre: 'Goteo Lento',
            nivelTexto: 'URGENCIA BAJA',
            claseCss: 'nivel-leve',
            litrosDia: 30,
            equivalencia: '3 baldes de 10 L diarios',
            descripcionCorta: '1 gota cada 2-3 segundos',
            acciones: [
                'Coloca un recipiente debajo del caño para reutilizar esa agua en limpieza o riego.',
                'Ajusta el vástago o cambia la empaquetadura de jebe (costo aprox. S/ 2 en ferretería).',
                'Si es en el tanque del inodoro, revisa que la boya cierre completamente.'
            ]
        },
        moderado: {
            id: 'moderado',
            icono: '💦',
            nombre: 'Goteo Rápido',
            nivelTexto: 'URGENCIA MEDIA',
            claseCss: 'nivel-moderado',
            litrosDia: 80,
            equivalencia: '1 ducha completa desperdiciada al día',
            descripcionCorta: 'Gotas seguidas sin pausa',
            acciones: [
                'Cierra parcialmente la llave de paso del ambiente afectado mientras lo reparas.',
                'Reemplaza el cartucho cerámico o la válvula de descarga del inodoro hoy mismo.',
                'Verifica si el medidor de SEDAPAL sigue girando con todos los caños cerrados.'
            ]
        },
        grave: {
            id: 'grave',
            icono: '🚰',
            nombre: 'Hilo Continuo',
            nivelTexto: 'URGENCIA ALTA',
            claseCss: 'nivel-grave',
            litrosDia: 250,
            equivalencia: 'Más de 1 tanque Rotoplas a la semana',
            descripcionCorta: 'Flujo fino pero ininterrumpido',
            acciones: [
                'Cierra de inmediato la llave de control del baño o cocina.',
                'Sella temporalmente la unión con cinta teflón o masilla epóxica si es una rosca.',
                'Contacta a un gasfitero dentro de las próximas 24 horas para evitar daños estructurales.'
            ]
        },
        critico: {
            id: 'critico',
            icono: '⚠️',
            nombre: 'Chorro / Fuga Estructural',
            nivelTexto: 'EMERGENCIA HÍDRICA',
            claseCss: 'nivel-critico',
            litrosDia: 1200,
            equivalencia: '36,000 L al mes (alto impacto en recibo)',
            descripcionCorta: 'Chorro abierto, rotura o filtración severa',
            acciones: [
                'Cierra la llave general de agua de toda la vivienda de inmediato.',
                'Si la fuga está antes del medidor o en la vereda, repórtala al Aquafono de SEDAPAL (317-8000).',
                'Seca la zona cercana a tomacorrientes para evitar riesgos eléctricos.'
            ]
        }
    };

    const dropZone = document.getElementById('cyDropZone');
    const inputFoto = document.getElementById('cyInputFotoFuga');
    const uploadPlaceholder = document.getElementById('cyUploadPlaceholder');
    const previewWrapper = document.getElementById('cyPreviewWrapper');
    const imgPreview = document.getElementById('cyImgPreview');
    const btnCambiarFoto = document.getElementById('btnCambiarFoto');
    const textoFuga = document.getElementById('cyTextoFuga');
    const btnAnalizar = document.getElementById('btnAnalizarFuga');
    const btnAbrirManual = document.getElementById('btnAbrirSelectorManual');

    const fallbackVisual = document.getElementById('cyFallbackVisual');
    const alertaCalidad = document.getElementById('cyAlertaCalidadFoto');
    const motivoFallback = document.getElementById('cyMotivoFallback');
    const gridIconos = document.getElementById('cyGridIconosFuga');

    const emptyDiagnosis = document.getElementById('cyEmptyDiagnosis');
    const diagnosisResult = document.getElementById('cyDiagnosisResult');
    const urgencyBanner = document.getElementById('cyUrgencyBanner');
    const nivelTag = document.getElementById('cyNivelTag');
    const categoriaTitulo = document.getElementById('cyCategoriaTitulo');
    const litrosDiaEl = document.getElementById('cyLitrosDia');
    const litrosMesEl = document.getElementById('cyLitrosMes');
    const equivalenciaLimaEl = document.getElementById('cyEquivalenciaLima');
    const explicacionIAEl = document.getElementById('cyExplicacionIA');
    const categorySwitcher = document.getElementById('cyCategorySwitcher');
    const listaAcciones = document.getElementById('cyListaAcciones');
    const btnGuardarReporte = document.getElementById('btnGuardarReporteFuga');
    const confirmacionGuardado = document.getElementById('cyConfirmacionGuardado');

    let imagenCargada = null;
    let categoriaActual = 'leve';
    let explicacionBase = '';

    function inicializarControlesFugas() {
        if (!gridIconos || !categorySwitcher) return;
        gridIconos.innerHTML = '';
        categorySwitcher.innerHTML = '';

        Object.values(CATEGORIAS_FUGA).forEach((cat) => {
            const btnIcono = document.createElement('button');
            btnIcono.type = 'button';
            btnIcono.className = 'cy-visual-option';
            btnIcono.innerHTML = `
                <span class="cy-vo-icon">${cat.icono}</span>
                <strong>${cat.nombre}</strong>
                <span>${cat.descripcionCorta} (~${cat.litrosDia} L/día)</span>
            `;
            btnIcono.addEventListener('click', () => {
                explicacionBase = `Seleccionaste manualmente la categoría visual "${cat.nombre}" (${cat.descripcionCorta}).`;
                mostrarDiagnosticoFuga(cat.id, explicacionBase);
            });
            gridIconos.appendChild(btnIcono);

            const btnSwitch = document.createElement('button');
            btnSwitch.type = 'button';
            btnSwitch.className = 'cy-switch-btn';
            btnSwitch.dataset.catId = cat.id;
            btnSwitch.textContent = cat.nombre.split(' ')[0];
            btnSwitch.addEventListener('click', () => {
                const nuevaExpli = `${explicacionBase} (Ajustado manualmente por ti a "${cat.nombre}" para mayor precisión).`;
                mostrarDiagnosticoFuga(cat.id, nuevaExpli);
            });
            categorySwitcher.appendChild(btnSwitch);
        });
    }

    if (dropZone) {
        dropZone.addEventListener('click', (e) => {
            if (e.target !== btnCambiarFoto) inputFoto.click();
        });

        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputFoto.click();
            }
        });

        btnCambiarFoto.addEventListener('click', (e) => {
            e.stopPropagation();
            inputFoto.click();
        });

        inputFoto.addEventListener('change', (e) => {
            const archivo = e.target.files[0];
            if (!archivo) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                imgPreview.src = ev.target.result;
                imagenCargada = ev.target.result;
                uploadPlaceholder.hidden = true;
                previewWrapper.hidden = false;
            };
            reader.readAsDataURL(archivo);
        });

        document.querySelectorAll('.cy-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                textoFuga.value = chip.dataset.texto;
            });
        });

        btnAnalizar.addEventListener('click', () => {
            const textoUsuario = textoFuga.value.trim();
            const categoriaPorTexto = analizarTextoContexto(textoUsuario);

            if (!imagenCargada && !categoriaPorTexto) {
                activarRecuperacionVisual(
                    'No subiste una fotografía ni describiste la intensidad. Elige el ícono que mejor represente la fuga:'
                );
                return;
            }

            if (imagenCargada) {
                const metricas = analizarImagenEnCanvas(imgPreview);

                if ((metricas.esMuyOscura || metricas.esMuyBorrosa) && !categoriaPorTexto) {
                    const razon = metricas.esMuyOscura
                        ? 'La fotografía está muy oscura para distinguir el agua con seguridad.'
                        : 'La fotografía salió algo borrosa para medir el grosor del flujo.';
                    activarRecuperacionVisual(`${razon} Por favor, selecciona visualmente el tipo de goteo:`);
                    return;
                }

                let categoriaVisual = 'leve';
                if (metricas.ratioAgua > 0.28) categoriaVisual = 'critico';
                else if (metricas.ratioAgua > 0.16) categoriaVisual = 'grave';
                else if (metricas.ratioAgua > 0.08) categoriaVisual = 'moderado';

                const categoriaFinal = categoriaPorTexto || categoriaVisual;
                const razones = [];

                if (metricas.ratioAgua > 0.08) {
                    razones.push(`detectamos un ${(metricas.ratioAgua * 100).toFixed(0)}% de superficie con reflejos de agua activa en la imagen`);
                } else {
                    razones.push('observamos una zona puntual de humedad sin desborde masivo en la imagen');
                }

                if (categoriaPorTexto) {
                    razones.push(`tu descripción textual ("${textoUsuario}") confirma un patrón de ${CATEGORIAS_FUGA[categoriaPorTexto].nombre.toLowerCase()}`);
                }

                explicacionBase = `Se asignó este nivel porque ${razones.join(' y ')}.`;
                mostrarDiagnosticoFuga(categoriaFinal, explicacionBase);
                return;
            }

            explicacionBase = `Basado en tu descripción ("${textoUsuario}"), identificamos un patrón correspondiente a ${CATEGORIAS_FUGA[categoriaPorTexto].nombre.toLowerCase()}.`;
            mostrarDiagnosticoFuga(categoriaPorTexto, explicacionBase);
        });

        btnAbrirManual.addEventListener('click', () => {
            emptyDiagnosis.hidden = true;
            diagnosisResult.hidden = true;
            fallbackVisual.hidden = false;
            alertaCalidad.hidden = true;
        });

        btnGuardarReporte.addEventListener('click', () => {
            const info = CATEGORIAS_FUGA[categoriaActual];
            const historial = JSON.parse(localStorage.getItem('camiyaku_fugas') || '[]');
            historial.push({
                fecha: new Date().toLocaleDateString('es-PE'),
                categoria: info.nombre,
                litrosDia: info.litrosDia,
                nota: textoFuga.value.trim() || 'Sin nota adicional'
            });
            localStorage.setItem('camiyaku_fugas', JSON.stringify(historial));
            confirmacionGuardado.hidden = false;
        });

        inicializarControlesFugas();
    }

    function analizarImagenEnCanvas(imgElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const ancho = 120;
        const alto = 120;
        canvas.width = ancho;
        canvas.height = alto;
        ctx.drawImage(imgElement, 0, 0, ancho, alto);

        const data = ctx.getImageData(0, 0, ancho, alto).data;
        let sumaBrillo = 0;
        let pixelesReflejoAgua = 0;
        let variacionBordes = 0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brillo = (r + g + b) / 3;
            sumaBrillo += brillo;

            if ((b > r + 12 && brillo > 95) || brillo > 225) {
                pixelesReflejoAgua++;
            }

            if (i > 4) {
                const brilloAnterior = (data[i - 4] + data[i - 3] + data[i - 2]) / 3;
                variacionBordes += Math.abs(brillo - brilloAnterior);
            }
        }

        const totalPixeles = ancho * alto;
        return {
            esMuyOscura: (sumaBrillo / totalPixeles) < 42,
            esMuyBorrosa: (variacionBordes / totalPixeles) < 6.5,
            ratioAgua: pixelesReflejoAgua / totalPixeles
        };
    }

    function analizarTextoContexto(texto) {
        const t = texto.toLowerCase();
        if (/chorro|rotura|inund|revent|fuerte|pared/.test(t)) return 'critico';
        if (/hilo|continuo|constante|chorrito|inodoro corre/.test(t)) return 'grave';
        if (/rápido|rapido|seguido|varias gotas/.test(t)) return 'moderado';
        if (/lento|gota|goteo|pocos segundos/.test(t)) return 'leve';
        return null;
    }

    function activarRecuperacionVisual(mensaje) {
        emptyDiagnosis.hidden = true;
        diagnosisResult.hidden = true;
        fallbackVisual.hidden = false;
        alertaCalidad.hidden = false;
        motivoFallback.textContent = mensaje;
    }

    function mostrarDiagnosticoFuga(catId, explicacion) {
        const info = CATEGORIAS_FUGA[catId];
        if (!info) return;

        categoriaActual = catId;
        emptyDiagnosis.hidden = true;
        fallbackVisual.hidden = true;
        diagnosisResult.hidden = false;
        confirmacionGuardado.hidden = true;

        urgencyBanner.className = `cy-urgency-banner ${info.claseCss}`;
        nivelTag.textContent = info.nivelTexto;
        categoriaTitulo.textContent = `${info.icono} ${info.nombre}`;
        litrosDiaEl.textContent = `${info.litrosDia.toLocaleString('es-PE')} L`;

        const litrosMes = info.litrosDia * 30;
        litrosMesEl.textContent = `${litrosMes.toLocaleString('es-PE')} Litros`;
        equivalenciaLimaEl.textContent = info.equivalencia;
        explicacionIAEl.textContent = explicacion;

        document.querySelectorAll('.cy-switch-btn').forEach((btn) => {
            btn.classList.toggle('activo', btn.dataset.catId === catId);
        });

        listaAcciones.innerHTML = '';
        info.acciones.forEach((accion) => {
            const li = document.createElement('li');
            li.textContent = accion;
            listaAcciones.appendChild(li);
        });
    }

    /* ======================================================================
       4. MOTOR DE RECOMENDACIONES ADAPTATIVAS SEMANALES
       ====================================================================== */
    const BANCO_RETOS = [
        {
            id: 'ducha',
            habito: 'Ducha diaria',
            niveles: {
                suave: {
                    dificultad: 'Suave (Recalibrado)',
                    titulo: 'Reduce 1 minuto de ducha 3 días esta semana',
                    descripcion: 'Usa una canción corta de 4 minutos como referencia solo tres días de esta semana.',
                    ahorroLitros: 36
                },
                moderado: {
                    dificultad: 'Moderada',
                    titulo: 'Cierra la llave al enjabonarte (ahorra 2 min/día)',
                    descripcion: 'Mantén tus duchas diarias en máximo 6 minutos durante toda la semana.',
                    ahorroLitros: 168
                },
                intensivo: {
                    dificultad: 'Desafío Alto',
                    titulo: 'Ducha express de 5 minutos + balde de agua fría inicial',
                    descripcion: 'Recolecta el agua fría que sale antes de calentar y úsala para el inodoro o limpieza.',
                    ahorroLitros: 280
                }
            },
            generarExplicacion: (consumo) =>
                consumo > 130
                    ? `Tu consumo registrado (${consumo} L/día) supera el estándar saludable de la OMS (100 L/día). La ducha suele representar cerca del 45% del gasto en hogares de Lima.`
                    : `Aunque tu consumo (${consumo} L/día) es eficiente, optimizar el tiempo en la ducha es la forma más rápida de mantener tu ahorro semanal.`
        },
        {
            id: 'platos',
            habito: 'Lavado de vajilla',
            niveles: {
                suave: {
                    dificultad: 'Suave (Recalibrado)',
                    titulo: 'Usa una tina para enjabonar platos una vez al día',
                    descripcion: 'Enjabona todos los platos del almuerzo con el caño cerrado antes de abrirlo para enjuagar.',
                    ahorroLitros: 60
                },
                moderado: {
                    dificultad: 'Moderada',
                    titulo: 'Lavado sin caño abierto en todas las comidas',
                    descripcion: 'Remoja las ollas previamente y abre el caño solo al momento final del enjuague.',
                    ahorroLitros: 140
                },
                intensivo: {
                    dificultad: 'Desafío Alto',
                    titulo: 'Reutiliza el agua del último enjuague para pisos o patio',
                    descripcion: 'Coloca un recipiente en el lavadero y aprovecha el agua limpia del enjuague final.',
                    ahorroLitros: 210
                }
            },
            generarExplicacion: (consumo) =>
                `En Lima, lavar platos con el caño abierto consume hasta 15 litros por minuto. Este reto reduce directamente el desperdicio en cocina según tu perfil de ${consumo} L/día.`
        },
        {
            id: 'inodoro',
            habito: 'Uso de inodoro',
            niveles: {
                suave: {
                    dificultad: 'Suave (Recalibrado)',
                    titulo: 'Coloca una botella llena dentro del tanque del inodoro',
                    descripcion: 'Una acción de una sola vez: introduce una botella de 1 L con agua y arena en la cisterna para ahorrar en cada descarga.',
                    ahorroLitros: 42
                },
                moderado: {
                    dificultad: 'Moderada',
                    titulo: 'Prueba del colorante + uso consciente de descarga',
                    descripcion: 'Verifica que no haya fugas silenciosas en el tanque y evita usar el inodoro como basurero.',
                    ahorroLitros: 105
                },
                intensivo: {
                    dificultad: 'Desafío Alto',
                    titulo: 'Reutiliza agua de ducha o lavadora para el inodoro',
                    descripcion: 'Sustituye al menos 2 descargas diarias utilizando agua gris recolectada en baldes.',
                    ahorroLitros: 180
                }
            },
            generarExplicacion: (consumo) =>
                `Cada descarga de un tanque convencional en Lima usa entre 6 y 10 litros. Optimizar este hábito te permite ahorrar sin cambiar tu rutina diaria (consumo base: ${consumo} L/día).`
        }
    ];

    const STORAGE_KEY = 'camiyaku_adaptive_state_v1';
    let estadoAdaptativo = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        consumoDiarioPrevio: 142,
        indiceReto: 0,
        nivelActual: 'moderado',
        estadoReto: 'propuesta',
        ahorroAcumuladoLitros: 0,
        rachaSemanas: 0,
        fueRecalibrado: false
    };

    function guardarEstadoAdaptativo() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoAdaptativo));
    }

    const adaptiveSection = document.getElementById('moduloRetosAdaptativos');
    if (adaptiveSection) {
        const ahorroTotalEl = document.getElementById('cyAhorroTotalLitros');
        const ahorroEquivEl = document.getElementById('cyAhorroEquivalencia');
        const rachaEl = document.getElementById('cyRachaSemanas');
        const nivelUsuarioEl = document.getElementById('cyNivelUsuario');
        const alertaRecal = document.getElementById('cyAlertaRecalibracion');
        const textoRecal = document.getElementById('cyTextoRecalibracion');

        const tagDificultad = document.getElementById('cyTagDificultad');
        const metaAhorroSemanal = document.getElementById('cyMetaAhorroSemanal');
        const tituloReto = document.getElementById('cyTituloReto');
        const descripcionReto = document.getElementById('cyDescripcionReto');
        const razonRecomendacion = document.getElementById('cyRazonRecomendacion');

        const accionesPropuesta = document.getElementById('cyAccionesPropuesta');
        const accionesEnCurso = document.getElementById('cyAccionesEnCurso');
        const estadoDescartado = document.getElementById('cyEstadoDescartado');

        const btnAceptar = document.getElementById('btnAceptarReto');
        const btnCambiar = document.getElementById('btnCambiarReto');
        const btnDescartar = document.getElementById('btnDescartarReto');
        const btnCumpli = document.getElementById('btnCumpliReto');
        const btnNoCumpli = document.getElementById('btnNoCumpliReto');
        const btnReactivar = document.getElementById('btnReactivarRetos');

        const simInput = document.getElementById('cySimConsumoInput');
        const btnSimular = document.getElementById('btnSimularConsumo');

        function calibrarNivelPorConsumo(consumo) {
            if (consumo > 180) return 'intensivo';
            if (consumo >= 110) return 'moderado';
            return 'suave';
        }

        function calcularNivelRango(litrosAhorrados) {
            if (litrosAhorrados >= 1000) return 'Nivel: Guardián del Rímac';
            if (litrosAhorrados >= 300) return 'Nivel: Hogar Eficiente';
            return 'Nivel: Explorador Hídrico';
        }

        function renderizarRetosUI() {
            ahorroTotalEl.textContent = `${estadoAdaptativo.ahorroAcumuladoLitros.toLocaleString('es-PE')} L`;
            const bidones = Math.floor(estadoAdaptativo.ahorroAcumuladoLitros / 20);
            ahorroEquivEl.textContent = `${bidones} bidones de 20 L ahorrados`;
            rachaEl.textContent = `${estadoAdaptativo.rachaSemanas} sem`;
            nivelUsuarioEl.textContent = calcularNivelRango(estadoAdaptativo.ahorroAcumuladoLitros);

            alertaRecal.hidden = !estadoAdaptativo.fueRecalibrado;

            const retoBase = BANCO_RETOS[estadoAdaptativo.indiceReto % BANCO_RETOS.length];
            const configNivel = retoBase.niveles[estadoAdaptativo.nivelActual];

            tagDificultad.textContent = `Dificultad: ${configNivel.dificultad}`;
            metaAhorroSemanal.textContent = `+${configNivel.ahorroLitros} L / semana`;
            tituloReto.textContent = configNivel.titulo;
            descripcionReto.textContent = configNivel.descripcion;
            razonRecomendacion.textContent = retoBase.generarExplicacion(estadoAdaptativo.consumoDiarioPrevio);

            accionesPropuesta.hidden = estadoAdaptativo.estadoReto !== 'propuesta';
            accionesEnCurso.hidden = estadoAdaptativo.estadoReto !== 'activo';
            estadoDescartado.hidden = estadoAdaptativo.estadoReto !== 'descartado';
        }

        btnAceptar.addEventListener('click', () => {
            estadoAdaptativo.estadoReto = 'activo';
            estadoAdaptativo.fueRecalibrado = false;
            guardarEstadoAdaptativo();
            renderizarRetosUI();
        });

        btnCambiar.addEventListener('click', () => {
            estadoAdaptativo.indiceReto = (estadoAdaptativo.indiceReto + 1) % BANCO_RETOS.length;
            estadoAdaptativo.fueRecalibrado = false;
            guardarEstadoAdaptativo();
            renderizarRetosUI();
        });

        btnDescartar.addEventListener('click', () => {
            estadoAdaptativo.estadoReto = 'descartado';
            guardarEstadoAdaptativo();
            renderizarRetosUI();
        });

        btnReactivar.addEventListener('click', () => {
            estadoAdaptativo.estadoReto = 'propuesta';
            guardarEstadoAdaptativo();
            renderizarRetosUI();
        });

        btnCumpli.addEventListener('click', () => {
            const retoBase = BANCO_RETOS[estadoAdaptativo.indiceReto % BANCO_RETOS.length];
            const litrosGanados = retoBase.niveles[estadoAdaptativo.nivelActual].ahorroLitros;

            estadoAdaptativo.ahorroAcumuladoLitros += litrosGanados;
            estadoAdaptativo.rachaSemanas += 1;
            estadoAdaptativo.fueRecalibrado = false;

            if (estadoAdaptativo.nivelActual === 'suave') estadoAdaptativo.nivelActual = 'moderado';
            else if (estadoAdaptativo.nivelActual === 'moderado' && estadoAdaptativo.rachaSemanas >= 2) estadoAdaptativo.nivelActual = 'intensivo';

            estadoAdaptativo.indiceReto = (estadoAdaptativo.indiceReto + 1) % BANCO_RETOS.length;
            estadoAdaptativo.estadoReto = 'propuesta';

            guardarEstadoAdaptativo();
            renderizarRetosUI();
        });

        btnNoCumpli.addEventListener('click', () => {
            estadoAdaptativo.nivelActual = 'suave';
            estadoAdaptativo.fueRecalibrado = true;
            estadoAdaptativo.estadoReto = 'propuesta';
            textoRecal.textContent =
                'No pasa nada si esta semana fue complicada. Bajamos la intensidad del reto a nivel "Suave" para que puedas completarlo sin presión.';

            guardarEstadoAdaptativo();
            renderizarRetosUI();
        });

        btnSimular.addEventListener('click', () => {
            const nuevoConsumo = Math.max(20, parseInt(simInput.value, 10) || 120);
            estadoAdaptativo.consumoDiarioPrevio = nuevoConsumo;
            estadoAdaptativo.nivelActual = calibrarNivelPorConsumo(nuevoConsumo);
            estadoAdaptativo.fueRecalibrado = false;
            estadoAdaptativo.estadoReto = 'propuesta';
            guardarEstadoAdaptativo();
            renderizarRetosUI();
        });

        // Sincronización automática cuando cambia el consumo en la Calculadora de Voz o Manual
        document.addEventListener('camiyaku:consumoCalculado', (e) => {
            if (e.detail && typeof e.detail.litrosDiarios === 'number') {
                estadoAdaptativo.consumoDiarioPrevio = e.detail.litrosDiarios;
                estadoAdaptativo.nivelActual = calibrarNivelPorConsumo(e.detail.litrosDiarios);
                if (simInput) simInput.value = e.detail.litrosDiarios;
                guardarEstadoAdaptativo();
                renderizarRetosUI();
            }
        });

        renderizarRetosUI();
    }

    // Estado inicial
    recalcularConsumoPrincipal();
    mostrarVista('tab-inicio');
});