<p align="center">
  <img src="assets/images/logo%20and%20media%20coorporative/logo-sin-nombre.png" width="110" alt="Hermanos Lynch Logo" />
</p>

<h1 align="center">HERMANOS LYNCH • TELEMETRÍA INDUSTRIAL</h1>

<p align="center">
  <strong>Plataforma Telemática Integral para Monitoreo, Mantenimiento Preventivo y Gestión de Plantas Eléctricas & Grupos Electrógenos</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Versi%C3%B3n-2026.1.0-blue?style=for-the-badge&logo=appveyor" alt="Version 2026" />
  <img src="https://img.shields.io/badge/Expo_SDK-52-black?style=for-the-badge&logo=expo" alt="Expo SDK 52" />
  <img src="https://img.shields.io/badge/React_Native-0.76-61DAFB?style=for-the-badge&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Licencia-Proprietary-red?style=for-the-badge" alt="Licencia Comercial" />
</p>

---

## ⚡ Descripción del Sistema

La suite telemática de **Hermanos Lynch C.A.** es una solución de ingeniería de software diseñada para la supervisión en tiempo real, gestión operativa y mantenimiento preventivo de grupos electrógenos industriales (**Blue Power Generation, Cummins, Perkins, Caterpillar, Leroy Somer, Deep Sea y ComAp**).

Desarrollada con arquitectura de diseño Bento inspirada en Figma (tipografía estricta **Montserrat**, modo Claro/Oscuro de alto contraste y microinteracciones de precisión), la plataforma conecta a los **Clientes / Propietarios de Plantas**, a los **Operadores Técnicos de Campo** y al **Super Usuario / Administrador Principal** en un ecosistema centralizado.

---

## 🏛️ Arquitectura de Roles y Accesos

```
                          ┌───────────────────────────┐
                          │   SUPER ADMIN / HL-ROOT   │
                          │   (Operador Principal)    │
                          └─────────────┬─────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
       ┌────────────────────────┐              ┌────────────────────────┐
       │   OPERADOR TÉCNICO     │              │   CLIENTE / TITULAR    │
       │   (Personal de Campo)  │              │   (Empresas / Hogares) │
       └────────────┬───────────┘              └────────────┬───────────┘
                    │                                       │
                    ▼                                       ▼
       • Plantas a su Cargo                    • Telemetría de su Planta
       • Agenda de Citas & Casos               • Registro de Horómetro
       • WhatsApp Directo Técnico              • Control de Diésel / Litros
       • Móvil de Flota Asignado               • Expediente PDF con QR
       • Bitácora & Cierre de Fallas           • Solicitud de Citas & Fallas
```

### 1. 🛡️ Super Usuario (Operador Principal)
* **Control Central de Accesos y Seguridad**: Panel de auditoría con aprobación y revocación de cuentas en tiempo real (`PendingApprovalScreen` gatekeeper).
* **Gestión de Técnicos**: Creación y acreditación oficial de operadores con carnets corporativos (`HL-TECH-XXXX`) y especialidades técnicas.
* **Asignación Geográfica y Logística (`AssignOperatorModal`)**:
  * Asignación de qué plantas específicas están a cargo de cada operador técnico (mostrando marca, modelo, serial, titular y ubicación física exacta).
  * Asignación de vehículos corporativos de la flota de asistencia (`Toyota Hilux 4x4`, `Ford F-150 Cuadrilla`) con activación automática de Guantera Digital (Wallet).
* **Métricas Globales (KPI)**: Total de operadores acreditados, clientes activos, plantas monitoreadas y solicitudes pendientes.

### 2. 🔧 Operador Técnico Acreditado
* **Panel Bento de Supervisión**: Vista técnica con telemetría de 10 subsistemas industriales.
* **Agenda de Clientes e Inquietudes (`OperatorAgendaModal`)**:
  * Módulo dedicado para ver citas solicitadas por sus clientes asignados.
  * Bandeja de problemas, fallas en panel ComAp e inquietudes técnicas clasificadas por prioridad (*Urgente*, *Alta*, *Normal*).
  * Botón de contacto directo por **WhatsApp corporativo** con mensaje técnico pre-redactado.
  * Gestión de estados: *Confirmar Cita*, *En Proceso* y *Marcar Resuelto* con bitácora de notas de resolución.
* **Flota Asignada**: Acceso a la Guantera Digital (Wallet) para pólizas, RCV, trimestres y mantenimientos de su unidad de soporte.

### 3. 🏢 Cliente / Titular de la Planta Eléctrica (`ClientDashboardView`)
* **Visualización Focalizada**: Acceso exclusivo a su grupo electrógeno con fotografía OEM de alta resolución.
* **Telemetría Read-Only**: Desgaste y ciclos de mantenimiento en tiempo real (aceite, filtros, refrigerante, batería, correas).
* **Actualización de Horómetro**: Registro de horas reales de operación acumuladas.
* **Balance Operativo & Diésel**: Control financiero de combustible cargado (Litros vs. Costo USD) con cálculo de costo por hora de respaldo eléctrico.
* **Expediente Oficial PDF**: Generación con 1 clic de reporte técnico con especificaciones OEM, firma del operador asignado y **código QR único de validación telemática**.
* **Solicitud de Citas y Soporte (`ClientInquiryModal`)**: Envío directo de solicitudes de mantenimiento preventivo y reporte de alarmas hacia su técnico asignado.

---

## ⚙️ Especificaciones Técnicas y Subsistemas Monitoreados

La telemetría calcula el ciclo de vida útil y horas restantes de 10 subsistemas críticos del grupo electrógeno:

| Subsistema Industrial | Intervalo OEM | Métricas Monitoreadas |
|---|---|---|
| **Aceite de Motor 15W-40** | 250 horas | Viscosidad, presión de aceite, horas transcurridas |
| **Filtro de Aceite Lubricante** | 250 horas | Presión diferencial, retención de partículas |
| **Filtro de Combustible Primario / Trampa de Agua** | 250 horas | Separación de agua, saturación micrónica |
| **Filtro de Aire de Admisión Heavy Duty** | 500 horas | Restricción de flujo (mm H₂O), horas de polvo |
| **Refrigerante 50/50 & Termostato** | 1,000 horas | Nivel de glicol, temperatura de bloque (85°C - 95°C) |
| **Sistema Eléctrico 24V DC / Alternador / Batería** | 1,000 horas | Tensión de flotación, estado de carga, borneado |
| **Correas de Accesorios y Tensor** | 1,000 horas | Tensión, desgaste estriado, holgura de polea |
| **Bomba de Inyección y Toberas** | 1,500 horas | Presión de riel común / inyectores mecánicos |
| **Calibración de Válvulas Cummins / Perkins** | 1,500 horas | Holgura de admisión y escape, compresión |
| **Tablero de Transferencia Automática (ATS) & ComAp** | 500 horas | Maniobra de contactores, temporizador de corte |

---

## 📦 Stack Tecnológico

* **Frontend**: React Native 0.76 • Expo SDK 52 • Expo Router (File-based navigation)
* **Tipografía**: Montserrat (`700Bold`, `600SemiBold`, `500Medium`, `400Regular`, `800ExtraBold`)
* **Estilizado**: StyleSheet con soporte nativo de Tokens Dark/Light (#0c0e14 / #f4f6fa)
* **Backend & Base de Datos**: Supabase PostgreSQL con Row Level Security (RLS) estricto y Triggers PL/pgSQL
* **Autenticación**: Supabase Auth con Roles (`superadmin`, `operator`, `client`) y validación de aprobación
* **Generación Documental**: Expedientes técnicos imprimibles con renderizado de códigos QR y firmas digitales
* **Integración Mensajería**: Deep links interactivos de WhatsApp Web y Mobile para comunicación técnica inmediata

---

## 🚀 Puesta en Marcha (Entorno de Desarrollo)

### Requisitos Previos
* Node.js 18+ instalado
* Gestor de paquetes `npm` o `bun`
* Proyecto de Supabase configurado con las migraciones incluidas

### Instalación
```bash
# 1. Clonar el repositorio oficial
git clone https://github.com/DervisMartinez/plantas-electricas-hermanoslynch.git
cd plantas-electricas-hermanoslynch

# 2. Instalar dependencias del proyecto
npm install

# 3. Configurar variables de entorno (.env)
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# 4. Iniciar el servidor de desarrollo Expo
npx expo start --web
```

### Comandos de Calidad y Compilación
```bash
# Verificación estricta de tipos TypeScript
npx tsc --noEmit --skipLibCheck

# Diagnóstico de dependencias y compatibilidad SDK
npx expo-doctor

# Exportación y empaquetado para producción Web
npx expo export -p web
```

---

## 🔒 Licencia y Propiedad Intelectual

**Copyright (c) 2026 Hermanos Lynch C.A. Todos los derechos reservados.**

Este repositorio, su código fuente, arquitectura, diseños, logotipos e ingeniería de telemetría son propiedad exclusiva y confidencial de **Hermanos Lynch C.A.** Queda estrictamente prohibida la reproducción, modificación, copia, redistribución o uso comercial sin autorización previa y por escrito de la empresa. Consulte el archivo [LICENSE](LICENSE) para conocer los términos legales completos.

---

<p align="center">
  <strong>HERMANOS LYNCH C.A.</strong><br/>
  División de Potencia & Grupos Electrógenos Industriales<br/>
  Caracas, Venezuela • operaciones@hermanoslynch.com • +58 (212) 238-1244
</p>
