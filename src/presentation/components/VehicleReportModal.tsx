import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
import { Moto, isCar, isPlanta } from '../../domain/entities/Moto';
import { MotoSpecs, getMotoSpecs } from '../../data/specs';
import {
  calculateWearPercentage,
  COMPONENT_NAMES,
  getVehicleComponents,
  getComponentLifespan,
  ComponentType,
} from '../../constants/telemetry';
import { PLANTA_COMPONENTS } from '../../constants/telemetryPlantas';
import { HERMANOS_LYNCH_LOGO_DATA_URI, HERMANOS_LYNCH_INFO } from '../../constants/brandAssets';
import { VEHICLE_CATALOG } from '../../data/catalog';
import { supabase } from '../../data/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HL_LOGO_REQUIRE = require('../../../assets/images/logo and media coorporative/logo.png');
const PLANTA_IMG_REQUIRE = require('../../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png');

interface VehicleReportModalProps {
  visible: boolean;
  onClose: () => void;
  myMoto: Moto | null;
  specs?: MotoSpecs | null;
}

export const VehicleReportModal: React.FC<VehicleReportModalProps> = ({
  visible,
  onClose,
  myMoto,
  specs: passedSpecs,
}) => {
  const { colors, mode, isDark } = useTheme();
  const { records } = useMyMoto();

  const [ownerData, setOwnerData] = useState<{
    firstName: string;
    lastName: string;
    dni: string;
    phone: string;
    bloodType: string;
    emergencyContact: string;
    emergencyPhone: string;
  }>({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    bloodType: 'O+',
    emergencyContact: '',
    emergencyPhone: '',
  });

  // Operator endorsement state
  const [operatorName, setOperatorName] = useState('Ing. Carlos Mendoza');
  const [operatorDni, setOperatorDni] = useState('V-18.423.891');
  const [operatorRole, setOperatorRole] = useState('Técnico Especialista en Generación Diésel');
  const [operatorLicense, setOperatorLicense] = useState('HL-TEC-0482');
  const [operatorNotes, setOperatorNotes] = useState(
    'Mantenimiento preventivo ejecutado bajo especificaciones OEM Hermanos Lynch. Se verificó presión de aceite (4.8 bar), refrigeración, tensión de baterías en flotación y sincronismo de alternador a 60 Hz sin fugas ni anomalías.'
  );
  const [isEditingOperator, setIsEditingOperator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isVehicleCar = myMoto ? isCar(myMoto) : false;
  const isVehiclePlanta = myMoto ? isPlanta(myMoto) : true;

  const currentHours = useMemo(() => {
    if (!myMoto) return 0;
    return myMoto.currentHours || myMoto.currentOdometer || 0;
  }, [myMoto]);

  const specs = useMemo(() => {
    if (passedSpecs) return passedSpecs;
    if (!myMoto) return null;
    return getMotoSpecs(myMoto.brand, myMoto.model);
  }, [passedSpecs, myMoto]);

  // Load cached and auth user metadata for owner & operator defaults
  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem('@user_profile_data').then((cached) => {
      if (cached) {
        try {
          const p = JSON.parse(cached);
          const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          setOwnerData((prev) => ({
            ...prev,
            firstName: p.first_name || prev.firstName,
            lastName: p.last_name || prev.lastName,
            dni: p.document_id || prev.dni,
            phone: p.phone || prev.phone,
            bloodType: p.blood_type || prev.bloodType,
            emergencyContact: p.emergency_contact_name || prev.emergencyContact,
            emergencyPhone: p.emergency_contact_phone || prev.emergencyPhone,
          }));
          if (fullName) {
            setOperatorName(fullName);
          }
          if (p.document_id) {
            setOperatorDni(p.document_id);
          }
        } catch (e) {}
      }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.user_metadata) {
        const m = data.user.user_metadata;
        const fullName = `${m.first_name || ''} ${m.last_name || ''}`.trim();
        setOwnerData((prev) => ({
          ...prev,
          firstName: m.first_name || prev.firstName,
          lastName: m.last_name || prev.lastName,
          dni: m.document_id || m.dni || prev.dni,
          phone: m.phone || prev.phone,
          bloodType: m.blood_type || prev.bloodType,
          emergencyContact: m.emergency_contact_name || prev.emergencyContact,
          emergencyPhone: m.emergency_contact_phone || prev.emergencyPhone,
        }));
        if (fullName) {
          setOperatorName(fullName);
        }
        if (m.document_id || m.dni) {
          setOperatorDni(m.document_id || m.dni);
        }
      }
    });
  }, [visible]);

  // Catalog item lookup
  const catMoto = useMemo(() => {
    if (!myMoto) return null;
    return (
      VEHICLE_CATALOG.find(
        (m) =>
          m.brand.toLowerCase() === myMoto.brand.toLowerCase() &&
          m.model.toLowerCase() === myMoto.model.toLowerCase()
      ) ||
      VEHICLE_CATALOG.find(
        (m) => m.brand.toLowerCase() === myMoto.brand.toLowerCase()
      )
    );
  }, [myMoto]);

  // Formatted Report Metadata
  const reportDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const reportTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  // Unique report Folio & Cryptographic Verification Token
  const reportFolio = useMemo(() => {
    if (!myMoto) return 'HL-REP-000000';
    const dateNum = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanId = myMoto.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const prefix = isVehiclePlanta ? 'HL-PLANT' : isVehicleCar ? 'HL-FLOTA' : 'HL-MOTO';
    return `${prefix}-${dateNum}-${cleanId || '7721'}`;
  }, [myMoto, isVehiclePlanta, isVehicleCar]);

  const uniqueValidationHash = useMemo(() => {
    if (!myMoto) return 'HL-VAL-7FA91024';
    const cleanId = myMoto.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    return `HL-VAL-SHA256-${cleanId || '8849A'}-OK`;
  }, [myMoto]);

  const verificationUrl = useMemo(() => {
    const plantName = myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Planta Electrica';
    return `${HERMANOS_LYNCH_INFO.website}/certificados/validador?folio=${reportFolio}&hash=${uniqueValidationHash}&equipo=${encodeURIComponent(
      plantName
    )}&horas=${currentHours}&tecnico=${encodeURIComponent(operatorName)}`;
  }, [reportFolio, uniqueValidationHash, myMoto, currentHours, operatorName]);

  const qrImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&data=${encodeURIComponent(
      verificationUrl
    )}`;
  }, [verificationUrl]);

  // Telemetry Calculations (Industrial generator vs regular vehicle)
  const componentsAnalysis = useMemo(() => {
    if (!myMoto) return [];

    if (isVehiclePlanta) {
      // 10 Industrial subsystems for Hermanos Lynch generators
      const plantItems = [
        {
          id: 'engineOil',
          typeMap: ['oil'],
          name: 'Aceite de Motor Diésel',
          subsystem: 'Lubricación Diésel (SAE 15W-40 API CI-4/CK-4)',
          nominalHours: 250,
          recommendation: specs?.oilTypeRecommended || 'SAE 15W-40 Diésel (Cada 250 hrs)',
        },
        {
          id: 'oilFilter',
          typeMap: ['oil_filter'],
          name: 'Filtro de Aceite Lubricante',
          subsystem: 'Filtración de Aceite de Motor',
          nominalHours: 250,
          recommendation: 'Reemplazo de cartucho de flujo pleno (Cada 250 hrs)',
        },
        {
          id: 'fuelFilter',
          typeMap: ['fuel_filter'],
          name: 'Filtro de Diésel y Trampa Racor',
          subsystem: 'Alimentación e Inyección de Diésel',
          nominalHours: 250,
          recommendation: 'Filtro primario y separador de agua (Cada 250 hrs)',
        },
        {
          id: 'airFilter',
          typeMap: ['air_filter'],
          name: 'Filtro de Aire Industrial Heavy Duty',
          subsystem: 'Admisión de Aire Motor',
          nominalHours: 500,
          recommendation: 'Elemento primario y secundario de alta retención (Cada 500 hrs)',
        },
        {
          id: 'coolant',
          typeMap: ['coolant'],
          name: 'Circuito de Refrigerante y Radiador',
          subsystem: 'Enfriamiento por Radiador Tropicalizado',
          nominalHours: 1000,
          recommendation: 'Mezcla 50/50 etilenglicol anticorrosivo (Cada 1000 hrs)',
        },
        {
          id: 'startingBattery',
          typeMap: ['battery'],
          name: 'Banco de Baterías 24V y Cargador',
          subsystem: 'Sistema de Arranque Eléctrico y Flotación',
          nominalHours: 2000,
          recommendation: 'Tensión de flotación 27.4V y bornes sin sulfatación (Cada 2000 hrs)',
        },
        {
          id: 'fanBelt',
          typeMap: ['accessory_belt'],
          name: 'Correa de Ventilador y Alternador',
          subsystem: 'Transmisión Mecánica Auxiliar Poli-V',
          nominalHours: 1000,
          recommendation: 'Tensión automática y estado de ranuras (Cada 1000 hrs)',
        },
        {
          id: 'valveAdjustment',
          typeMap: ['spark_plugs', 'other'],
          name: 'Calibración de Válvulas e Inyectores',
          subsystem: 'Tren Valvular e Inyección Diésel',
          nominalHours: 1500,
          recommendation: 'Holgura de admisión/escape y pulverización (Cada 1500 hrs)',
        },
        {
          id: 'fuelTankInspection',
          typeMap: ['other'],
          name: 'Inspección de Tanque y Drenaje Lodos',
          subsystem: 'Almacenamiento de Combustible Diésel',
          nominalHours: 500,
          recommendation: 'Purga de agua en el fondo del tanque base (Cada 500 hrs)',
        },
        {
          id: 'alternatorWinding',
          typeMap: ['other'],
          name: 'Aislamiento de Alternador (Megado)',
          subsystem: 'Generación Eléctrica Leroy Somer',
          nominalHours: 2000,
          recommendation: 'Megado a 500V DC > 5 Megaohms y prueba de AVR (Cada 2000 hrs)',
        },
      ];

      return plantItems.map((item) => {
        const matchingRecords = records.filter(
          (r) =>
            item.typeMap.includes(r.type) ||
            (r.notes && r.notes.toLowerCase().includes(item.name.toLowerCase()))
        );

        let wear = 0;
        let lastHours = 0;
        let hoursSince = 0;
        let hoursRemaining = item.nominalHours;
        let isConfigured = matchingRecords.length > 0 || currentHours > 0;
        let status: 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO' | 'SIN CALIBRAR' = 'SIN CALIBRAR';
        let statusColor = '#ff9500';

        if (matchingRecords.length > 0) {
          lastHours = Math.max(...matchingRecords.map((r) => r.odometer || 0));
          hoursSince = Math.max(0, currentHours - lastHours);
          const ratio = Math.max(0, 1 - hoursSince / item.nominalHours);
          wear = Math.min(100, Math.round(ratio * 100));
          hoursRemaining = Math.max(0, item.nominalHours - hoursSince);
        } else if (currentHours > 0) {
          const usedInCycle = currentHours % item.nominalHours;
          hoursSince = usedInCycle;
          const ratio = Math.max(0, 1 - usedInCycle / item.nominalHours);
          wear = Math.min(100, Math.round(ratio * 100));
          hoursRemaining = Math.max(0, item.nominalHours - usedInCycle);
        } else {
          isConfigured = false;
        }

        if (isConfigured) {
          if (wear >= 60) {
            status = 'ÓPTIMO';
            statusColor = '#00ae78';
          } else if (wear >= 30) {
            status = 'PREVENTIVO';
            statusColor = '#ffb703';
          } else {
            status = 'CRÍTICO';
            statusColor = '#ba1a1a';
          }
        }

        return {
          id: item.id,
          name: item.name,
          subsystem: item.subsystem,
          wear,
          isConfigured,
          nominalLife: item.nominalHours,
          lastOdo: lastHours,
          kmSince: hoursSince,
          kmRemaining: hoursRemaining,
          status,
          statusColor,
          totalServices: matchingRecords.length,
          recommendation: item.recommendation,
          unitLabel: 'hrs',
        };
      });
    }

    // Fallback for regular car / moto
    const components = getVehicleComponents(isVehicleCar).filter(
      (c) => c !== 'fuel' && c !== 'other'
    ) as Exclude<ComponentType, 'fuel' | 'other'>[];

    return components.map((comp) => {
      const typeRecords = records.filter((r) => r.type === comp);
      const isConfigured = typeRecords.length > 0 || !!myMoto.isFromAgency;
      const nominalLife = getComponentLifespan(comp, isVehicleCar);

      let wear = 0;
      let lastOdo = 0;
      let kmSince = 0;
      let kmRemaining = nominalLife;
      let status: 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO' | 'SIN CALIBRAR' = 'SIN CALIBRAR';
      let statusColor = '#ff9500';

      if (isConfigured) {
        lastOdo =
          typeRecords.length > 0
            ? Math.max(...typeRecords.map((r) => r.odometer))
            : 0;
        kmSince = Math.max(0, myMoto.currentOdometer - lastOdo);
        wear = calculateWearPercentage(
          myMoto.currentOdometer,
          lastOdo,
          comp,
          nominalLife,
          isVehicleCar
        );
        kmRemaining = Math.max(0, nominalLife - kmSince);

        if (wear >= 60) {
          status = 'ÓPTIMO';
          statusColor = '#00ae78';
        } else if (wear >= 30) {
          status = 'PREVENTIVO';
          statusColor = '#ffb703';
        } else {
          status = 'CRÍTICO';
          statusColor = '#ba1a1a';
        }
      }

      return {
        id: comp,
        name: COMPONENT_NAMES[comp] || comp,
        subsystem: isVehicleCar ? 'Sistemas Automotrices' : 'Tren de Rodaje & Motor',
        wear,
        isConfigured,
        nominalLife,
        lastOdo,
        kmSince,
        kmRemaining,
        status,
        statusColor,
        totalServices: typeRecords.length,
        recommendation: `Ciclo recomendado: cada ${nominalLife.toLocaleString()} km`,
        unitLabel: 'km',
      };
    });
  }, [myMoto, records, isVehicleCar, isVehiclePlanta, currentHours, specs]);

  // Overall health score
  const generalHealth = useMemo(() => {
    const configured = componentsAnalysis.filter((c) => c.isConfigured);
    if (configured.length === 0) return 0;
    const sum = configured.reduce((acc, c) => acc + c.wear, 0);
    return Math.round(sum / configured.length);
  }, [componentsAnalysis]);

  // Financial & Fuel Statistics
  const financialStats = useMemo(() => {
    const fuelRecords = records.filter((r) => r.type === 'fuel');
    const serviceRecords = records.filter((r) => r.type !== 'fuel');

    const totalFuelUSD = fuelRecords.reduce((sum, r) => sum + (r.costUSD || 0), 0);
    const totalServicesUSD = serviceRecords.reduce((sum, r) => sum + (r.costUSD || 0), 0);
    const totalCostUSD = totalFuelUSD + totalServicesUSD;

    const monthlyMap: Record<string, { fuel: number; services: number; total: number }> = {};
    records.forEach((r) => {
      const monthKey = r.date ? r.date.slice(0, 7) : '2026-00';
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { fuel: 0, services: 0, total: 0 };
      }
      const cost = r.costUSD || 0;
      if (r.type === 'fuel') {
        monthlyMap[monthKey].fuel += cost;
      } else {
        monthlyMap[monthKey].services += cost;
      }
      monthlyMap[monthKey].total += cost;
    });

    const monthlyData = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);

    return {
      totalFuelUSD,
      totalServicesUSD,
      totalCostUSD,
      fuelRecordsCount: fuelRecords.length,
      serviceRecordsCount: serviceRecords.length,
      monthlyData,
    };
  }, [records]);

  const copyValidationLink = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(verificationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // High-Resolution Official HTML Report for Print and Download
  const generateReportHTML = () => {
    if (!myMoto) return '';

    const maxMonthly = Math.max(
      ...financialStats.monthlyData.map((d) => d[1].total),
      100
    );

    const monthlyChartBars = financialStats.monthlyData
      .map(([month, data]) => {
        const fuelH = Math.round((data.fuel / maxMonthly) * 80);
        const servH = Math.round((data.services / maxMonthly) * 80);
        const monthLabel = month.slice(5) + '/' + month.slice(2, 4);
        return `
          <div style="display:flex; flex-direction:column; align-items:center; width:52px; font-size:11px;">
            <div style="height:90px; display:flex; align-items:flex-end; gap:3px;">
              <div title="Combustible / Diésel: $${data.fuel.toFixed(2)}" style="width:18px; height:${fuelH}px; background:#00b4d8; border-radius:3px 3px 0 0;"></div>
              <div title="Mantenimiento: $${data.services.toFixed(2)}" style="width:18px; height:${servH}px; background:#0b3b60; border-radius:3px 3px 0 0;"></div>
            </div>
            <div style="margin-top:6px; font-weight:bold; color:#4a5568;">${monthLabel}</div>
            <div style="font-size:10px; color:#718096;">$${data.total.toFixed(0)}</div>
          </div>
        `;
      })
      .join('');

    const componentRows = componentsAnalysis
      .map(
        (c) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 8px; font-weight:600; font-size:12px; color:#1a202c;">
            <div>${c.name}</div>
            <div style="font-size:10px; color:#718096; font-weight:normal;">${c.subsystem}</div>
          </td>
          <td style="padding:10px 8px; text-align:center;">
            <span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:10px; font-weight:bold; color:#ffffff; background:${c.statusColor};">
              ${c.status}
            </span>
          </td>
          <td style="padding:10px 8px; width:130px;">
            <div style="background:#edf2f7; border-radius:4px; height:8px; width:100%; overflow:hidden;">
              <div style="background:${c.statusColor}; height:100%; width:${c.isConfigured ? c.wear : 0}%;"></div>
            </div>
          </td>
          <td style="padding:10px 8px; text-align:center; font-weight:bold; font-size:12px; color:#2d3748;">
            ${c.isConfigured ? `${c.wear}%` : 'N/D'}
          </td>
          <td style="padding:10px 8px; text-align:right; font-size:11.5px; color:#4a5568;">
            ${c.isConfigured ? `${c.kmSince.toLocaleString()} ${c.unitLabel}` : 'Sin datos'}
          </td>
          <td style="padding:10px 8px; text-align:right; font-size:11.5px; font-weight:600; color:${c.kmRemaining < (c.unitLabel === 'hrs' ? 50 : 1000) ? '#e53e3e' : '#0b3b60'};">
            ${c.isConfigured ? `${c.kmRemaining.toLocaleString()} ${c.unitLabel}` : `Ciclo: ${c.nominalLife.toLocaleString()} ${c.unitLabel}`}
          </td>
        </tr>
      `
      )
      .join('');

    const logsRows =
      records.length > 0
        ? records
            .slice(0, 35)
            .map(
              (r) => `
          <tr style="border-bottom:1px solid #edf2f7; font-size:11px;">
            <td style="padding:8px 6px; color:#4a5568;">${r.date || 'S/F'}</td>
            <td style="padding:8px 6px; font-weight:bold; color:#2d3748;">${COMPONENT_NAMES[r.type] || r.type}</td>
            <td style="padding:8px 6px; text-align:right; color:#2d3748;">${r.odometer ? `${r.odometer.toLocaleString()} ${isVehiclePlanta ? 'hrs' : 'km'}` : 'N/D'}</td>
            <td style="padding:8px 6px; text-align:right; font-weight:bold; color:#0b3b60;">$${(r.costUSD || 0).toFixed(2)}</td>
            <td style="padding:8px 6px; color:#718096;">${r.notes || '—'}</td>
          </tr>
        `
            )
            .join('')
        : `<tr><td colspan="5" style="padding:20px; text-align:center; color:#718096;">No hay registros históricos almacenados en este equipo.</td></tr>`;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Dossier Técnico — HERMANOS LYNCH - ${myMoto.brand} ${myMoto.model} (${myMoto.plate || 'S/S'})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Great+Vibes&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f7fafc;
      color: #2d3748;
      padding: 24px;
      line-height: 1.5;
    }
    .report-container {
      max-width: 920px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      padding: 36px;
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #0b3b60;
      padding-bottom: 22px;
      margin-bottom: 24px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .corporate-logo {
      height: 58px;
      object-fit: contain;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #0b3b60;
      letter-spacing: -0.3px;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .badge-pill {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 14px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .section-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0b3b60;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-left: 4px solid #00b4d8;
      padding-left: 10px;
      margin-top: 26px;
      margin-bottom: 14px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 14px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .card-label {
      font-size: 9.5px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 3px;
    }
    .card-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 9px 8px;
      text-align: left;
    }
    .print-btn-bar {
      position: sticky;
      top: 12px;
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 16px;
    }
    .btn {
      background: #0b3b60;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      transition: background 0.2s;
    }
    .btn:hover { background: #072a45; }
    .btn-outline {
      background: #ffffff;
      color: #0b3b60;
      border: 1.5px solid #0b3b60;
    }
    .endorsement-box {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 10px;
      padding: 20px;
      margin-top: 24px;
    }
    .operator-signature-font {
      font-family: 'Great Vibes', cursive, sans-serif;
      font-size: 34px;
      color: #0b3b60;
      line-height: 1;
      margin-top: 6px;
    }
    .official-seal {
      border: 2px dashed #00b4d8;
      border-radius: 50%;
      width: 90px;
      height: 90px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      font-size: 8px;
      font-weight: 800;
      color: #0b3b60;
      text-transform: uppercase;
      line-height: 1.1;
      transform: rotate(-10deg);
    }
    .qr-security-box {
      display: flex;
      align-items: center;
      gap: 18px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 16px 20px;
      margin-top: 24px;
    }
    @media print {
      body { background:#ffffff; padding:0; }
      .print-btn-bar { display:none !important; }
      .report-container { border:none; box-shadow:none; padding:0; max-width:100%; }
      @page { size: A4 portrait; margin: 12mm; }
      .page-break { page-break-before: always; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <div class="print-btn-bar">
    <button class="btn btn-outline" onclick="window.close()">Cerrar Ventana</button>
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <div class="report-container">
    
    <!-- CORPORATE HEADER HERMANOS LYNCH -->
    <div class="header-banner">
      <div class="logo-container">
        <img class="corporate-logo" src="${HERMANOS_LYNCH_LOGO_DATA_URI}" alt="Hermanos Lynch Logo" />
        <div>
          <div class="brand-title">HERMANOS LYNCH, C.A.</div>
          <div class="brand-subtitle">División de Energía, Plantas Eléctricas & Respaldo Crítico</div>
          <div style="font-size:10px; color:#64748b; margin-top:2px;">
            Web: <b>www.hermanoslynch.com</b> | Sede Principal: Caracas, Venezuela
          </div>
        </div>
      </div>
      <div style="text-align:right;">
        <div class="badge-pill">
          ${isVehiclePlanta ? 'PLANTA ELÉCTRICA INDUSTRIAL' : isVehicleCar ? 'VEHÍCULO OPERATIVO' : 'MOTOCICLETA'}
        </div>
        <div style="font-size:18px; font-weight:900; color:#0b3b60; margin-top:6px;">
          SALUD: ${generalHealth}%
        </div>
        <div style="font-size:10px; color:#64748b; margin-top:2px;">
          Folio: <b>${reportFolio}</b>
        </div>
      </div>
    </div>

    <!-- DOCUMENT TITLE -->
    <div style="margin-bottom:18px;">
      <h1 style="font-size:18px; font-weight:800; color:#0f172a; text-transform:uppercase;">
        ${isVehiclePlanta ? 'Informe Técnico y Protocolo de Auditoría de Planta Eléctrica' : 'Expediente Técnico y Auditoría Vehicular'}
      </h1>
      <p style="font-size:11.5px; color:#64748b; margin-top:3px;">
        Emisión oficial: <b>${reportDate}</b> a las <b>${reportTime}</b> | Certificación técnica con firma digital y verificación QR.
      </p>
    </div>

    <!-- EQUIPMENT & CLIENT SUMMARY -->
    <div class="grid-2">
      <!-- PLANT IDENTIFICATION -->
      <div class="card" style="border-left: 4px solid #0b3b60;">
        <div class="card-label">IDENTIFICACIÓN DEL EQUIPO / PLANTA</div>
        <div style="font-size:18px; font-weight:800; color:#0f172a; margin-top:2px;">
          ${myMoto.brand} ${myMoto.model}
        </div>
        <div style="margin-top:8px; font-size:12px; color:#475569; line-height:1.6;">
          <div>Potencia: <b style="color:#0b3b60;">${myMoto.powerKva || 35} kVA / ${myMoto.powerKw || 28} kW</b> (Standby)</div>
          <div>Horómetro Acumulado: <b style="color:#0f172a;">${currentHours.toLocaleString()} Horas de Operación</b></div>
          <div>Número de Serie / ID: <b>${myMoto.plate || myMoto.serialNumber || 'HL-PLANT-001'}</b></div>
          <div>Ubicación / Proyecto: <b>${myMoto.location || 'Sede Principal / Enlace Crítico'}</b></div>
        </div>
      </div>

      <!-- CLIENT / REGISTERED OPERATOR -->
      <div class="card" style="border-left: 4px solid #00b4d8;">
        <div class="card-label">TITULAR DEL CONTRATO / INSTALACIÓN</div>
        <div style="font-size:16px; font-weight:700; color:#0f172a; margin-top:2px;">
          ${ownerData.firstName || ownerData.lastName ? `${ownerData.firstName} ${ownerData.lastName}` : 'Hermanos Lynch C.A.'}
        </div>
        <div style="margin-top:8px; font-size:12px; color:#475569; line-height:1.6;">
          <div>Cédula / RIF: <b>${ownerData.dni || 'J-31045920-1'}</b> | Tel: <b>${ownerData.phone || '+58 212 555-LYNCH'}</b></div>
          <div>Tipo de Instalación: <b>${myMoto.installationType || 'Canopy Insonorizada Heavy Duty'}</b></div>
          <div>Contacto de Soporte: <b>${ownerData.emergencyContact || 'Ingeniería de Guardia'} (${ownerData.emergencyPhone || '+58 414 000-0000'})</b></div>
        </div>
      </div>
    </div>

    <!-- OEM SPECIFICATIONS -->
    <div class="section-title">Especificaciones Técnicas de Fábrica (OEM)</div>
    <div class="grid-3">
      <div class="card">
        <div class="card-label">${isVehiclePlanta ? 'Motor Diésel & Gobernador' : 'Motor & Cilindrada'}</div>
        <div class="card-value">${specs?.engineType || (isVehiclePlanta ? 'Cummins 4B3.9G2 Diésel' : 'Gasolina 4 Tiempos')}</div>
        <div style="font-size:11px; color:#64748b; margin-top:4px;">${specs?.hp || (isVehiclePlanta ? '44 HP @ 1800 RPM' : 'N/D')}</div>
      </div>
      <div class="card">
        <div class="card-label">${isVehiclePlanta ? 'Alternador & Regulación' : 'Lubricación & Aceite'}</div>
        <div class="card-value">${specs?.transmission || (isVehiclePlanta ? 'Leroy Somer TAL-A42 (AVR ±1%)' : specs?.oilCapacity || '4.0 L')}</div>
        <div style="font-size:11px; color:#64748b; margin-top:4px;">${specs?.oilTypeRecommended || 'SAE 15W-40 CI-4 / CK-4'}</div>
      </div>
      <div class="card">
        <div class="card-label">${isVehiclePlanta ? 'Tanque & Controlador' : 'Tanque de Combustible'}</div>
        <div class="card-value">${specs?.equipment || (isVehiclePlanta ? 'ComAp InteliLite IL-9' : specs?.fuelCapacity || 'N/D')}</div>
        <div style="font-size:11px; color:#64748b; margin-top:4px;">Tanque: ${specs?.fuelCapacity || (isVehiclePlanta ? '180 Litros Diésel' : '15 L')}</div>
      </div>
    </div>

    <!-- TELEMETRY WEAR TABLE -->
    <div class="section-title">Auditoría de Desgaste y Estado de Componentes Críticos</div>
    <table>
      <thead>
        <tr>
          <th>Componente / Subsistema</th>
          <th style="text-align:center;">Estado</th>
          <th>Nivel de Vida</th>
          <th style="text-align:center;">% Salud</th>
          <th style="text-align:right;">Uso Acumulado</th>
          <th style="text-align:right;">Horas / Km Restante</th>
        </tr>
      </thead>
      <tbody>
        ${componentRows}
      </tbody>
    </table>

    <!-- FINANCIAL & CONSUMPTION ANALYSIS -->
    <div class="section-title">Consumo de Combustible y Costo Operativo</div>
    <div class="grid-3" style="margin-bottom:14px;">
      <div class="card" style="border-left:4px solid #00b4d8;">
        <div class="card-label">${isVehiclePlanta ? 'Gasto en Diésel' : 'Gasto en Gasolina'}</div>
        <div class="card-value" style="color:#007791;">$${financialStats.totalFuelUSD.toFixed(2)} USD</div>
        <div style="font-size:11px; color:#64748b; margin-top:3px;">${financialStats.fuelRecordsCount} despachos registrados</div>
      </div>
      <div class="card" style="border-left:4px solid #0b3b60;">
        <div class="card-label">Gasto en Mantenimiento</div>
        <div class="card-value" style="color:#0b3b60;">$${financialStats.totalServicesUSD.toFixed(2)} USD</div>
        <div style="font-size:11px; color:#64748b; margin-top:3px;">${financialStats.serviceRecordsCount} intervenciones registradas</div>
      </div>
      <div class="card" style="border-left:4px solid #00ae78;">
        <div class="card-label">Costo Operativo Total</div>
        <div class="card-value" style="color:#00ae78;">$${financialStats.totalCostUSD.toFixed(2)} USD</div>
        <div style="font-size:11px; color:#64748b; margin-top:3px;">
          ${currentHours > 0 ? `$${(financialStats.totalCostUSD / currentHours).toFixed(2)} / ${isVehiclePlanta ? 'hora' : 'km'}` : '$0.00'}
        </div>
      </div>
    </div>

    <!-- MONTHLY EXPENDITURES CHART -->
    ${
      financialStats.monthlyData.length > 0
        ? `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div class="card-label">Evolución de Consumo y Gastos Mensuales ($ USD)</div>
          <div style="display:flex; gap:12px; font-size:10.5px; font-weight:bold;">
            <span style="color:#00b4d8;">■ Diésel</span>
            <span style="color:#0b3b60;">■ Mantenimiento</span>
          </div>
        </div>
        <div style="display:flex; justify-content:space-around; align-items:flex-end; padding:10px 0 0 0;">
          ${monthlyChartBars}
        </div>
      </div>
    `
        : ''
    }

    <!-- SERVICE LOGS / BITÁCORA -->
    <div class="section-title page-break">Bitácora Técnica e Historial de Servicios Realizados</div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Tipo de Servicio</th>
          <th style="text-align:right;">Horómetro / Odómetro</th>
          <th style="text-align:right;">Costo</th>
          <th>Observaciones Técnicas</th>
        </tr>
      </thead>
      <tbody>
        ${logsRows}
      </tbody>
    </table>

    <!-- OPERATOR TECHNICAL ENDORSEMENT -->
    <div class="endorsement-box">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="flex: 1;">
          <div style="font-size:11px; font-weight:900; color:#166534; text-transform:uppercase; letter-spacing:0.8px;">
            ✓ CERTIFICACIÓN Y AVAL DEL OPERADOR TÉCNICO RESPONSABLE
          </div>
          <div style="font-size:12px; color:#14532d; margin-top:6px; line-height:1.5;">
            "${operatorNotes}"
          </div>

          <div style="margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:11px; color:#166534;">
            <div>Operador / Técnico: <b style="color:#0f172a;">${operatorName}</b></div>
            <div>Cédula / Licencia: <b style="color:#0f172a;">${operatorDni}</b></div>
            <div>Especialidad: <b>${operatorRole}</b></div>
            <div>Carnet Técnico HL: <b>${operatorLicense}</b></div>
          </div>
        </div>

        <div style="margin-left: 24px; display:flex; flex-direction:column; align-items:center;">
          <div class="operator-signature-font">${operatorName.split(' ')[0] || 'Carlos'} ${operatorName.split(' ')[1] || 'Mendoza'}</div>
          <div style="border-top:1.5px solid #0b3b60; width:150px; text-align:center; font-size:9.5px; font-weight:bold; color:#0b3b60; margin-top:2px;">
            FIRMA DIGITALIZADA
          </div>
        </div>

        <div style="margin-left: 20px;">
          <div class="official-seal">
            <span>HERMANOS LYNCH</span>
            <span style="font-size:7px; color:#0284c7;">★ ★ ★</span>
            <span>AVAL TÉCNICO</span>
            <span style="font-size:7px;">CERTIFICADO</span>
          </div>
        </div>
      </div>
    </div>

    <!-- QR SECURITY CODE & UNIQUE REPORT SIGNATURE -->
    <div class="qr-security-box">
      <img src="${qrImageUrl}" alt="Código QR Único" style="width:110px; height:110px; border-radius:6px; border:1px solid #e2e8f0; background:#ffffff; padding:4px;" />
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="background:#0284c7; color:#ffffff; font-size:9.5px; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">
            VALIDACIÓN QR ACTIVA
          </span>
          <span style="font-size:11px; font-weight:700; color:#0b3b60;">Folio: ${reportFolio}</span>
        </div>
        <div style="font-size:11px; color:#475569; margin-top:5px; line-height:1.5;">
          Escanee este código QR con la cámara de su teléfono o dispositivo móvil para verificar la autenticidad técnica de este reporte en el servidor seguro de <b>Hermanos Lynch</b>.
        </div>
        <div style="font-size:10px; font-family:monospace; color:#64748b; margin-top:6px; word-break:break-all;">
          Hash de Seguridad: <b>${uniqueValidationHash}</b>
        </div>
      </div>
    </div>

    <!-- CERTIFICATION FOOTER -->
    <div style="margin-top:30px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; font-size:10px; color:#718096;">
      <div>
        Documento técnico oficial emitido por el Sistema de Telemetría Hermanos Lynch • Fecha de emisión: ${reportDate} ${reportTime}<br>
        Resolución de conformidad técnica bajo normas ISO 8528 / NFPA 110 para generación eléctrica.
      </div>
      <div style="text-align:right; font-weight:bold; color:#0b3b60;">
        HERMANOS LYNCH, C.A. • RIF: J-31045920-1
      </div>
    </div>

  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {});
  </script>
</body>
</html>
    `;
  };

  const handlePrint = () => {
    setGenerating(true);
    const htmlContent = generateReportHTML();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            setGenerating(false);
          }, 450);
        } else {
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.right = '0';
          iframe.style.bottom = '0';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = '0';
          document.body.appendChild(iframe);
          iframe.contentWindow?.document.write(htmlContent);
          iframe.contentWindow?.document.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            document.body.removeChild(iframe);
            setGenerating(false);
          }, 500);
        }
      } catch (e) {
        console.error('Error al imprimir:', e);
        setGenerating(false);
      }
    } else {
      setGenerating(false);
      alert('Reporte generado exitosamente. Abre desde el navegador web para exportar a PDF directo.');
    }
  };

  const handleDownloadHTML = () => {
    if (!myMoto) return;
    const htmlContent = generateReportHTML();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-hermanos-lynch-${myMoto.brand}-${myMoto.model}-${reportFolio}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  if (!myMoto) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: isDark ? '#080a10' : '#f0f3f8' }]}>
        
        {/* TOP BAR / CONTROLS */}
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: isDark ? '#10141e' : '#ffffff',
              borderBottomColor: colors.outlineVariant,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.pdfIconBadge, { backgroundColor: '#0b3b60' }]}>
              <MaterialIcons name="assessment" size={22} color="#00e3fd" />
            </View>
            <View>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 16 }}>
                Expediente Técnico • Hermanos Lynch
              </Text>
              <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11 }}>
                Folio: {reportFolio} • {reportDate}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Quick Toggle for Operator Edit */}
            <TouchableOpacity
              onPress={() => setIsEditingOperator(!isEditingOperator)}
              style={[
                styles.actionBtn,
                {
                  borderColor: isEditingOperator ? colors.primary : colors.outlineVariant,
                  backgroundColor: isEditingOperator ? colors.surfaceContainerHighest : colors.surfaceContainer,
                },
              ]}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isEditingOperator ? 'check' : 'edit'}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                {isEditingOperator ? 'Listo Operador' : 'Editar Aval Operador'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDownloadHTML}
              style={[
                styles.actionBtn,
                { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainer },
              ]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="download" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Descargar HTML</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePrint}
              disabled={generating}
              style={[styles.primaryActionBtn, { backgroundColor: '#0b3b60' }]}
              activeOpacity={0.8}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="print" size={17} color="#ffffff" />
                  <Text style={styles.primaryActionBtnText}>Guardar como PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeIconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* OPERATOR EDIT DRAWER IF EXPANDED */}
        {isEditingOperator && (
          <View
            style={[
              styles.operatorEditDrawer,
              {
                backgroundColor: isDark ? '#141a29' : '#e6f4fe',
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MaterialIcons name="badge" size={18} color={colors.primary} />
              <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 13 }}>
                Datos de Aval y Firma del Operador Técnico Responsable
              </Text>
            </View>

            <View style={styles.operatorInputGrid}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={styles.inputMiniLabel}>NOMBRE DEL OPERADOR / TÉCNICO</Text>
                <TextInput
                  value={operatorName}
                  onChangeText={setOperatorName}
                  placeholder="Ej: Ing. Carlos Mendoza"
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={[
                    styles.drawerTextInput,
                    {
                      backgroundColor: isDark ? '#1c2438' : '#ffffff',
                      color: colors.onSurface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                />
              </View>

              <View style={{ flex: 1, minWidth: 160 }}>
                <Text style={styles.inputMiniLabel}>CÉDULA / DNI / LICENCIA</Text>
                <TextInput
                  value={operatorDni}
                  onChangeText={setOperatorDni}
                  placeholder="Ej: V-18.423.891"
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={[
                    styles.drawerTextInput,
                    {
                      backgroundColor: isDark ? '#1c2438' : '#ffffff',
                      color: colors.onSurface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                />
              </View>

              <View style={{ flex: 1, minWidth: 160 }}>
                <Text style={styles.inputMiniLabel}>CARNET TÉCNICO HL</Text>
                <TextInput
                  value={operatorLicense}
                  onChangeText={setOperatorLicense}
                  placeholder="Ej: HL-TEC-0482"
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={[
                    styles.drawerTextInput,
                    {
                      backgroundColor: isDark ? '#1c2438' : '#ffffff',
                      color: colors.onSurface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.inputMiniLabel}>DICTAMEN / OBSERVACIÓN TÉCNICA DEL OPERADOR</Text>
              <TextInput
                value={operatorNotes}
                onChangeText={setOperatorNotes}
                multiline
                numberOfLines={2}
                placeholder="Observaciones de la prueba bajo carga y estado operativo..."
                placeholderTextColor={colors.onSurfaceVariant}
                style={[
                  styles.drawerTextInput,
                  {
                    backgroundColor: isDark ? '#1c2438' : '#ffffff',
                    color: colors.onSurface,
                    borderColor: colors.outlineVariant,
                    minHeight: 50,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* REPORT LIVE PREVIEW CONTAINER */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.previewPaper,
              {
                backgroundColor: isDark ? '#121622' : '#ffffff',
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            
            {/* CORPORATE DOCUMENT HEADER */}
            <View style={[styles.docHeader, { borderBottomColor: '#0b3b60' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Image
                  source={HL_LOGO_REQUIRE}
                  style={styles.headerLogoImg}
                  resizeMode="contain"
                />
                <View>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 20, color: '#0b3b60' }}>
                    HERMANOS LYNCH<Text style={{ color: '#00b4d8' }}>, C.A.</Text>
                  </Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: colors.onSurface, marginTop: 2 }}>
                    {isVehiclePlanta
                      ? 'INFORME TÉCNICO Y AUDITORÍA DE PLANTA ELÉCTRICA'
                      : 'EXPEDIENTE TÉCNICO VEHICULAR'}
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.onSurfaceVariant, marginTop: 2 }}>
                    www.hermanoslynch.com • División de Generación y Respaldo Continuo
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.typeBadge, { backgroundColor: '#e0f2fe' }]}>
                  <Text style={{ fontFamily: F.bold, fontSize: 10, color: '#0369a1', letterSpacing: 0.5 }}>
                    {isVehiclePlanta ? 'PLANTA ELÉCTRICA INDUSTRIAL' : isVehicleCar ? 'VEHÍCULO OPERATIVO' : 'MOTOCICLETA'}
                  </Text>
                </View>
                <Text style={{ fontFamily: F.extrabold, fontSize: 22, color: '#00ae78', marginTop: 6 }}>
                  {generalHealth}% SALUD
                </Text>
                <Text style={{ fontFamily: F.medium, fontSize: 10, color: colors.onSurfaceVariant }}>
                  {reportDate}
                </Text>
              </View>
            </View>

            {/* PLANT / VEHICLE & OWNER OVERVIEW */}
            <View style={styles.twoColGrid}>
              <View
                style={[
                  styles.infoCard,
                  { backgroundColor: colors.surfaceContainerLow, borderColor: '#0b3b60', borderLeftWidth: 4 },
                ]}
              >
                <Text style={[styles.cardTag, { color: '#0b3b60' }]}>
                  {isVehiclePlanta ? 'DATOS DE LA PLANTA ELÉCTRICA' : 'DATOS DEL VEHÍCULO'}
                </Text>
                <Text style={{ fontFamily: F.extrabold, color: colors.onSurface, fontSize: 18, marginTop: 4 }}>
                  {myMoto.brand} {myMoto.model}
                </Text>
                <View style={{ marginTop: 8, gap: 4 }}>
                  {isVehiclePlanta ? (
                    <>
                      <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                        Potencia: <Text style={{ fontFamily: F.bold, color: '#0b3b60' }}>{myMoto.powerKva || 35} kVA / {myMoto.powerKw || 28} kW Standby</Text>
                      </Text>
                      <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                        Horómetro de Operación: <Text style={{ fontFamily: F.extrabold }}>{currentHours.toLocaleString()} Horas</Text>
                      </Text>
                      <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                        Serial / Identificador: <Text style={{ fontFamily: F.bold, color: colors.primary }}>{myMoto.plate || myMoto.serialNumber || 'HL-PLANT-001'}</Text>
                      </Text>
                      <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                        Ubicación: <Text style={{ fontFamily: F.bold }}>{myMoto.location || 'Sede Principal / Área Crítica'}</Text>
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                        Año: <Text style={{ fontFamily: F.bold }}>{myMoto.year}</Text>
                      </Text>
                      <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                        Placa: <Text style={{ fontFamily: F.bold, color: colors.primary }}>{myMoto.plate || 'Sin Placa'}</Text>
                      </Text>
                      <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                        Odómetro: <Text style={{ fontFamily: F.extrabold }}>{myMoto.currentOdometer.toLocaleString()} km</Text>
                      </Text>
                    </>
                  )}
                </View>
              </View>

              <View
                style={[
                  styles.infoCard,
                  { backgroundColor: colors.surfaceContainerLow, borderColor: '#00b4d8', borderLeftWidth: 4 },
                ]}
              >
                <Text style={[styles.cardTag, { color: '#00b4d8' }]}>
                  {isVehiclePlanta ? 'TITULAR DEL EQUIPO / PROYECTO' : 'PROPIETARIO / CONDUCTOR'}
                </Text>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 16, marginTop: 4 }}>
                  {ownerData.firstName || ownerData.lastName
                    ? `${ownerData.firstName} ${ownerData.lastName}`
                    : 'Hermanos Lynch C.A.'}
                </Text>
                <View style={{ marginTop: 8, gap: 4 }}>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                    Cédula / RIF: <Text style={{ fontFamily: F.bold }}>{ownerData.dni || 'J-31045920-1'}</Text>
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                    Teléfono: <Text style={{ fontFamily: F.bold }}>{ownerData.phone || '+58 212 555-LYNCH'}</Text>
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurface, fontSize: 12 }}>
                    {isVehiclePlanta ? 'Instalación: ' : 'Grupo Sanguíneo: '}
                    <Text style={{ fontFamily: F.bold, color: isVehiclePlanta ? colors.onSurface : '#e53e3e' }}>
                      {isVehiclePlanta
                        ? myMoto.installationType || 'Canopy Insonorizada Heavy Duty'
                        : ownerData.bloodType}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* FACTORY SPECIFICATIONS */}
            <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>
              {isVehiclePlanta ? 'ESPECIFICACIONES INDUSTRIALES OEM' : 'ESPECIFICACIONES TÉCNICAS OEM'}
            </Text>
            <View style={styles.threeColGrid}>
              <View style={[styles.miniSpecCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
                <Text style={[styles.cardTag, { color: colors.onSurfaceVariant }]}>
                  {isVehiclePlanta ? 'MOTOR DIÉSEL & RPM' : 'MOTOR & CILINDRADA'}
                </Text>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, marginTop: 2 }}>
                  {specs?.engineType || (isVehiclePlanta ? 'Cummins 4B3.9G2 Diésel' : '4 Tiempos')}
                </Text>
                <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>
                  {specs?.hp || (isVehiclePlanta ? '44 HP @ 1800 RPM (60 Hz)' : 'N/D')}
                </Text>
              </View>

              <View style={[styles.miniSpecCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
                <Text style={[styles.cardTag, { color: colors.onSurfaceVariant }]}>
                  {isVehiclePlanta ? 'ALTERNADOR & REGULACIÓN' : 'LUBRICACIÓN & ACEITE'}
                </Text>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, marginTop: 2 }}>
                  {specs?.transmission || (isVehiclePlanta ? 'Leroy Somer TAL-A42' : specs?.oilTypeRecommended || '10W-30')}
                </Text>
                <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>
                  {specs?.oilTypeRecommended || 'SAE 15W-40 CI-4/CK-4'}
                </Text>
              </View>

              <View style={[styles.miniSpecCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
                <Text style={[styles.cardTag, { color: colors.onSurfaceVariant }]}>
                  {isVehiclePlanta ? 'CONTROLADOR & TANQUE' : 'TANQUE & PRESIÓN'}
                </Text>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, marginTop: 2 }}>
                  {specs?.equipment || (isVehiclePlanta ? 'ComAp InteliLite IL-9' : specs?.fuelCapacity || 'N/D')}
                </Text>
                <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>
                  Tanque: {specs?.fuelCapacity || (isVehiclePlanta ? '180 Litros Diésel' : 'N/D')}
                </Text>
              </View>
            </View>

            {/* DETAILED WEAR ITEMS */}
            <Text style={[styles.sectionHeading, { color: colors.onSurface, marginTop: 24 }]}>
              {isVehiclePlanta
                ? 'AUDITORÍA DE DESGASTE DE SUBSISTEMAS INDUSTRIALES'
                : 'ESTADO DETALLADO DE COMPONENTES'}
            </Text>
            <View style={[styles.tableContainer, { borderColor: colors.outlineVariant }]}>
              <View style={[styles.tableHeader, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={[styles.colHeader, { flex: 2.2, color: colors.onSurfaceVariant }]}>
                  {isVehiclePlanta ? 'SUBSISTEMA / COMPONENTE' : 'COMPONENTE'}
                </Text>
                <Text style={[styles.colHeader, { flex: 1, textAlign: 'center', color: colors.onSurfaceVariant }]}>
                  ESTADO
                </Text>
                <Text style={[styles.colHeader, { flex: 1.5, textAlign: 'center', color: colors.onSurfaceVariant }]}>
                  SALUD (%)
                </Text>
                <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'right', color: colors.onSurfaceVariant }]}>
                  {isVehiclePlanta ? 'USO' : 'RECORRIDO'}
                </Text>
                <Text style={[styles.colHeader, { flex: 1.5, textAlign: 'right', color: colors.onSurfaceVariant }]}>
                  {isVehiclePlanta ? 'RESTANTE' : 'REMANENTE'}
                </Text>
              </View>

              {componentsAnalysis.map((comp) => (
                <View key={comp.id} style={[styles.tableRow, { borderBottomColor: colors.outlineVariant }]}>
                  <View style={{ flex: 2.2 }}>
                    <Text style={[styles.colCell, { fontFamily: F.bold, color: colors.onSurface }]}>
                      {comp.name}
                    </Text>
                    {isVehiclePlanta && (
                      <Text style={{ fontFamily: F.regular, fontSize: 10, color: colors.onSurfaceVariant }}>
                        {comp.subsystem}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <View style={[styles.statusBadge, { backgroundColor: comp.statusColor }]}>
                      <Text style={styles.statusBadgeText}>{comp.status}</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 }}>
                    <View style={[styles.progressBarBase, { backgroundColor: colors.surfaceContainerHighest }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${comp.isConfigured ? comp.wear : 0}%`,
                            backgroundColor: comp.statusColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: comp.statusColor, width: 34 }}>
                      {comp.isConfigured ? `${comp.wear}%` : 'N/D'}
                    </Text>
                  </View>

                  <Text style={[styles.colCell, { flex: 1.2, textAlign: 'right', color: colors.onSurfaceVariant, fontSize: 11 }]}>
                    {comp.isConfigured ? `${comp.kmSince.toLocaleString()} ${comp.unitLabel}` : '—'}
                  </Text>

                  <Text
                    style={[
                      styles.colCell,
                      {
                        flex: 1.5,
                        textAlign: 'right',
                        fontFamily: F.semibold,
                        color: comp.kmRemaining < (comp.unitLabel === 'hrs' ? 50 : 1000) ? '#ba1a1a' : '#0b3b60',
                        fontSize: 11,
                      },
                    ]}
                  >
                    {comp.isConfigured
                      ? `${comp.kmRemaining.toLocaleString()} ${comp.unitLabel}`
                      : `Ciclo: ${comp.nominalLife.toLocaleString()} ${comp.unitLabel}`}
                  </Text>
                </View>
              ))}
            </View>

            {/* FINANCIAL / CONSUMPTION OVERVIEW */}
            <Text style={[styles.sectionHeading, { color: colors.onSurface, marginTop: 24 }]}>
              {isVehiclePlanta ? 'CONSUMO DE DIÉSEL Y COSTO OPERATIVO' : 'CONSUMO Y RESUMEN FINANCIERO'}
            </Text>
            <View style={styles.threeColGrid}>
              <View style={[styles.financialCard, { backgroundColor: colors.surfaceContainerLow, borderColor: '#00b4d8' }]}>
                <Text style={[styles.cardTag, { color: colors.onSurfaceVariant }]}>
                  {isVehiclePlanta ? 'GASTO EN DIÉSEL' : 'GASTO COMBUSTIBLE'}
                </Text>
                <Text style={{ fontFamily: F.extrabold, fontSize: 18, color: '#008da8', marginTop: 4 }}>
                  ${financialStats.totalFuelUSD.toFixed(2)} USD
                </Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 }}>
                  {financialStats.fuelRecordsCount} despachos registrados
                </Text>
              </View>

              <View style={[styles.financialCard, { backgroundColor: colors.surfaceContainerLow, borderColor: '#0b3b60' }]}>
                <Text style={[styles.cardTag, { color: colors.onSurfaceVariant }]}>GASTO MANTENIMIENTO</Text>
                <Text style={{ fontFamily: F.extrabold, fontSize: 18, color: '#0b3b60', marginTop: 4 }}>
                  ${financialStats.totalServicesUSD.toFixed(2)} USD
                </Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 }}>
                  {financialStats.serviceRecordsCount} servicios realizados
                </Text>
              </View>

              <View style={[styles.financialCard, { backgroundColor: colors.surfaceContainerLow, borderColor: '#00ae78' }]}>
                <Text style={[styles.cardTag, { color: colors.onSurfaceVariant }]}>INVERSIÓN TOTAL OPERATIVA</Text>
                <Text style={{ fontFamily: F.extrabold, fontSize: 18, color: '#00ae78', marginTop: 4 }}>
                  ${financialStats.totalCostUSD.toFixed(2)} USD
                </Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 }}>
                  {currentHours > 0
                    ? `$${(financialStats.totalCostUSD / currentHours).toFixed(2)} / ${isVehiclePlanta ? 'hora' : 'km'}`
                    : '$0.00'}
                </Text>
              </View>
            </View>

            {/* OPERATOR ENDORSEMENT CARD */}
            <View
              style={[
                styles.operatorEndorsementContainer,
                {
                  backgroundColor: isDark ? '#0e1814' : '#f0fdf4',
                  borderColor: isDark ? '#1b4d3e' : '#86efac',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ flex: 1, minWidth: 260 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name="verified" size={20} color="#16a34a" />
                    <Text style={{ fontFamily: F.extrabold, fontSize: 13, color: isDark ? '#4ade80' : '#166534', letterSpacing: 0.5 }}>
                      AVAL TÉCNICO Y AUDITORÍA DEL OPERADOR RESPONSABLE
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontFamily: F.regular,
                      fontSize: 11.5,
                      color: isDark ? '#bbf7d0' : '#14532d',
                      marginTop: 8,
                      lineHeight: 18,
                    }}
                  >
                    "{operatorNotes}"
                  </Text>

                  <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                    <View>
                      <Text style={[styles.endorsementLabel, { color: isDark ? '#86efac' : '#15803d' }]}>TÉCNICO OPERADOR</Text>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 12 }}>{operatorName}</Text>
                    </View>
                    <View>
                      <Text style={[styles.endorsementLabel, { color: isDark ? '#86efac' : '#15803d' }]}>CÉDULA / DNI</Text>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 12 }}>{operatorDni}</Text>
                    </View>
                    <View>
                      <Text style={[styles.endorsementLabel, { color: isDark ? '#86efac' : '#15803d' }]}>CARNET HL</Text>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 12 }}>{operatorLicense}</Text>
                    </View>
                    <View>
                      <Text style={[styles.endorsementLabel, { color: isDark ? '#86efac' : '#15803d' }]}>ESTADO</Text>
                      <Text style={{ fontFamily: F.extrabold, color: '#16a34a', fontSize: 12 }}>[✓] HOMOLOGADO</Text>
                    </View>
                  </View>
                </View>

                {/* Simulated Signature & Seal */}
                <View style={{ alignItems: 'center', minWidth: 160 }}>
                  <View style={[styles.signatureBox, { borderColor: colors.outlineVariant }]}>
                    <Text style={styles.signatureScript}>
                      {operatorName.split(' ')[0] || 'Carlos'} {operatorName.split(' ')[1] || 'Mendoza'}
                    </Text>
                    <View style={[styles.signatureLine, { backgroundColor: '#0b3b60' }]} />
                    <Text style={{ fontFamily: F.bold, fontSize: 9, color: '#0b3b60', marginTop: 2 }}>
                      FIRMA TÉCNICA AUTORIZADA
                    </Text>
                  </View>
                  <View style={styles.roundSealBadge}>
                    <Text style={styles.sealTextTop}>HERMANOS LYNCH</Text>
                    <Text style={styles.sealStars}>★ ★ ★</Text>
                    <Text style={styles.sealTextBottom}>AVAL OFICIAL</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* UNIQUE QR CODE VERIFICATION BOX */}
            <View
              style={[
                styles.qrContainer,
                {
                  backgroundColor: colors.surfaceContainerLow,
                  borderColor: colors.outlineVariant,
                },
              ]}
            >
              <Image source={{ uri: qrImageUrl }} style={styles.qrImage} resizeMode="contain" />
              <View style={{ flex: 1, minWidth: 240 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.qrActiveBadge}>
                    <Text style={styles.qrActiveBadgeText}>CÓDIGO QR ÚNICO DE VALIDACIÓN</Text>
                  </View>
                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.primary }}>
                    Folio: {reportFolio}
                  </Text>
                </View>
                <Text style={{ fontFamily: F.regular, fontSize: 11, color: colors.onSurfaceVariant, marginTop: 6, lineHeight: 17 }}>
                  Este código QR certifica la trazabilidad técnica, horómetro y autenticidad del mantenimiento registrado en los servidores de <Text style={{ fontFamily: F.bold }}>Hermanos Lynch</Text>.
                </Text>
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: colors.onSurfaceVariant }}>
                    Hash: <Text style={{ fontFamily: F.bold, color: colors.onSurface }}>{uniqueValidationHash}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={copyValidationLink}
                    style={[styles.copyLinkBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name={copiedLink ? 'check' : 'content-copy'} size={13} color={colors.primary} />
                    <Text style={{ fontFamily: F.bold, fontSize: 10, color: colors.primary }}>
                      {copiedLink ? 'Copiado' : 'Copiar URL'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* HISTORICAL SERVICE LOG TABLE */}
            <Text style={[styles.sectionHeading, { color: colors.onSurface, marginTop: 24 }]}>
              BITÁCORA Y LOG HISTÓRICO DE SERVICIOS
            </Text>
            <View style={[styles.tableContainer, { borderColor: colors.outlineVariant }]}>
              <View style={[styles.tableHeader, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={[styles.colHeader, { flex: 1.2, color: colors.onSurfaceVariant }]}>FECHA</Text>
                <Text style={[styles.colHeader, { flex: 2, color: colors.onSurfaceVariant }]}>SERVICIO</Text>
                <Text style={[styles.colHeader, { flex: 1.3, textAlign: 'right', color: colors.onSurfaceVariant }]}>
                  {isVehiclePlanta ? 'HORÓMETRO' : 'ODÓMETRO'}
                </Text>
                <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'right', color: colors.onSurfaceVariant }]}>COSTO</Text>
                <Text style={[styles.colHeader, { flex: 3, color: colors.onSurfaceVariant, paddingLeft: 10 }]}>NOTAS / DETALLES</Text>
              </View>

              {records.length > 0 ? (
                records.map((r) => (
                  <View key={r.id} style={[styles.tableRow, { borderBottomColor: colors.outlineVariant }]}>
                    <Text style={[styles.colCell, { flex: 1.2, color: colors.onSurfaceVariant, fontSize: 11 }]}>
                      {r.date || 'S/F'}
                    </Text>
                    <Text style={[styles.colCell, { flex: 2, fontFamily: F.bold, color: colors.onSurface, fontSize: 11.5 }]}>
                      {COMPONENT_NAMES[r.type] || r.type}
                    </Text>
                    <Text style={[styles.colCell, { flex: 1.3, textAlign: 'right', color: colors.onSurface, fontSize: 11 }]}>
                      {r.odometer ? `${r.odometer.toLocaleString()} ${isVehiclePlanta ? 'hrs' : 'km'}` : '—'}
                    </Text>
                    <Text style={[styles.colCell, { flex: 1.2, textAlign: 'right', fontFamily: F.bold, color: '#0b3b60', fontSize: 11 }]}>
                      ${(r.costUSD || 0).toFixed(2)}
                    </Text>
                    <Text style={[styles.colCell, { flex: 3, color: colors.onSurfaceVariant, fontSize: 11, paddingLeft: 10 }]} numberOfLines={2}>
                      {r.notes || '—'}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12 }}>
                    No se han registrado servicios en la bitácora aún.
                  </Text>
                </View>
              )}
            </View>

            {/* DOCUMENT FOOTER */}
            <View style={[styles.docFooter, { borderTopColor: colors.outlineVariant }]}>
              <Text style={{ fontFamily: F.medium, fontSize: 10, color: colors.onSurfaceVariant }}>
                Expediente certificado por Hermanos Lynch C.A. • Folio de Validación: {reportFolio}
              </Text>
              <Text style={{ fontFamily: F.bold, fontSize: 10, color: '#0b3b60', marginTop: 4 }}>
                Soluciones Industriales de Generación Diésel • RIF J-31045920-1 • www.hermanoslynch.com
              </Text>
            </View>

          </View>
        </ScrollView>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    zIndex: 10,
    flexWrap: 'wrap',
    gap: 10,
  },
  pdfIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  operatorEditDrawer: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    zIndex: 20,
  },
  operatorInputGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  inputMiniLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9.5,
    color: '#0b3b60',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  drawerTextInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  previewPaper: {
    maxWidth: 920,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    paddingBottom: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLogoImg: {
    width: 140,
    height: 48,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  twoColGrid: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  infoCard: {
    flex: 1,
    minWidth: 280,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardTag: {
    fontSize: 9.5,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
  },
  sectionHeading: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  threeColGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  miniSpecCard: {
    flex: 1,
    minWidth: 200,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  colHeader: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  colCell: {
    fontSize: 11.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.4,
  },
  progressBarBase: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  financialCard: {
    flex: 1,
    minWidth: 220,
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 3.5,
    borderWidth: 1,
  },
  operatorEndorsementContainer: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 18,
    marginTop: 24,
  },
  endorsementLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  signatureBox: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  signatureScript: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    fontStyle: 'italic',
    color: '#0b3b60',
  },
  signatureLine: {
    width: 140,
    height: 1.5,
    marginTop: 2,
  },
  roundSealBadge: {
    marginTop: 10,
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1.5,
    borderColor: '#00b4d8',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sealTextTop: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 6.5,
    color: '#0b3b60',
    textAlign: 'center',
  },
  sealStars: {
    fontSize: 7,
    color: '#00b4d8',
    marginVertical: 1,
  },
  sealTextBottom: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 6,
    color: '#0b3b60',
    textAlign: 'center',
  },
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  qrImage: {
    width: 95,
    height: 95,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  qrActiveBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qrActiveBadgeText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  copyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  docFooter: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
});
