import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Moto, ServiceRecord, isCar, isPlanta, VehicleType } from '../../domain/entities/Moto';
import { supabase } from '../../data/supabaseClient';

interface MotoContextType {
  myMoto: Moto | null;
  motos: Moto[];
  records: ServiceRecord[];
  drivesCompanyVehicle: boolean;
  setDrivesCompanyVehicle: (val: boolean) => Promise<void>;
  userRole: 'admin' | 'client';
  setUserRole: (role: 'admin' | 'client') => void;
  isAdmin: boolean;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  systemMetrics: { total_operators: number; total_clients: number; total_plants: number; pending_approvals: number };
  pendingUsersList: any[];
  operatorsList: any[];
  clientsList: any[];
  loadSystemUsers: () => Promise<void>;
  approveUser: (userId: string) => Promise<boolean>;
  rejectUser: (userId: string) => Promise<boolean>;
  checkApprovalStatus: () => Promise<void>;
  saveMoto: (moto: Moto) => void;
  updateMoto: (updates: Partial<Moto>) => void;
  addRecord: (record: ServiceRecord) => void;
  deleteRecord: (id: string) => void;
  selectMoto: (id: string) => void;
  deleteMoto: (id: string) => void;
  isLoaded: boolean;
  logout: () => void;
  isAddingMoto: boolean;
  setIsAddingMoto: (val: boolean) => void;
}

const MotoContext = createContext<MotoContextType | undefined>(undefined);

export const MotoProvider = ({ children }: { children: ReactNode }) => {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [myMoto, setMyMoto] = useState<Moto | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [drivesCompanyVehicle, setDrivesCompanyVehicleState] = useState(false);
  const [userRole, setUserRoleState] = useState<'admin' | 'client'>('client');
  const [isLoaded, setIsLoaded] = useState(false);
  const isAdmin = userRole === 'admin';

  const setUserRole = (role: 'admin' | 'client') => {
    setUserRoleState(role);
    supabase.auth.updateUser({ data: { role } }).catch(() => {});
  };
  const [isAddingMoto, setIsAddingMoto] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'pending' | 'rejected'>('approved');
  const [systemMetrics, setSystemMetrics] = useState({
    total_operators: 0,
    total_clients: 0,
    total_plants: 0,
    pending_approvals: 0,
  });
  const [pendingUsersList, setPendingUsersList] = useState<any[]>([]);
  const [operatorsList, setOperatorsList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);

  const loadSystemUsers = async () => {
    try {
      const { data: metrics } = await supabase.rpc('get_system_metrics');
      if (metrics) {
        setSystemMetrics(metrics);
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profiles) {
        setPendingUsersList(profiles.filter((p: any) => p.approval_status === 'pending'));
        setOperatorsList(profiles.filter((p: any) => p.role === 'operator'));
        setClientsList(profiles.filter((p: any) => p.role === 'client' || p.role === 'user'));
      }
    } catch (err) {
      console.warn('Notice al cargar usuarios del sistema:', err);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('approve_user', { target_user_id: userId });
      if (error) {
        await supabase
          .from('profiles')
          .update({ approval_status: 'approved' })
          .eq('id', userId);
      }
      await loadSystemUsers();
      return true;
    } catch (err) {
      console.error('Error al aprobar usuario:', err);
      return false;
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('reject_user', { target_user_id: userId });
      if (error) {
        await supabase
          .from('profiles')
          .update({ approval_status: 'rejected' })
          .eq('id', userId);
      }
      await loadSystemUsers();
      return true;
    } catch (err) {
      console.error('Error al rechazar usuario:', err);
      return false;
    }
  };

  const checkApprovalStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status, role')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      setApprovalStatus(profile.approval_status || 'approved');
      if (profile.role === 'superadmin' || profile.role === 'admin') {
        setUserRoleState('admin');
        setApprovalStatus('approved');
      }
    }
  };

  // In-memory cache for service records by entity id to make vehicle/planta pagination instant
  const recordsCacheRef = React.useRef<Map<string, ServiceRecord[]>>(new Map());
  const recordsFetchTimeRef = React.useRef<Map<string, number>>(new Map());
  const initialLoadDoneRef = React.useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
          loadDataFromCloud();
        }
      } else {
        setIsLoaded(true);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
          loadDataFromCloud();
        }
      } else {
        setMotos([]);
        setMyMoto(null);
        setRecords([]);
        setDrivesCompanyVehicleState(false);
        recordsCacheRef.current.clear();
        recordsFetchTimeRef.current.clear();
        initialLoadDoneRef.current = false;
        setIsLoaded(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadDataFromCloud = async (preferredMotoId?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (!user) return;

      // 0. DETERMINAR ROL (ADMIN vs CLIENTE) Y PREFERENCIA DE VEHÍCULO
      let detectedRole: 'admin' | 'client' = 'client';
      const emailLower = (user.email || '').toLowerCase();
      if (
        emailLower.includes('admin') ||
        emailLower.includes('hermanoslynch') ||
        emailLower.includes('lynch') ||
        user.user_metadata?.role === 'admin'
      ) {
        detectedRole = 'admin';
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('drives_company_vehicle, role, approval_status')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (profile.role === 'superadmin' || profile.role === 'admin') {
            detectedRole = 'admin';
            setApprovalStatus('approved');
          } else {
            setApprovalStatus(profile.approval_status || 'pending');
            if (profile.role === 'client') detectedRole = 'client';
          }
          setDrivesCompanyVehicleState(!!profile.drives_company_vehicle);
        }
      } catch (err) {
        console.warn('Notice al consultar perfil:', err);
      }

      setUserRoleState(detectedRole);
      if (detectedRole === 'admin') {
        loadSystemUsers();
      }

      // 1. CARGA PRIORITARIA: Plantas Eléctricas (Hermanos Lynch / Blue Power Generation)
      const { data: plantasData } = await supabase
        .from('plantas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const parsedPlantas: Moto[] = (plantasData || []).map((p: any) => ({
        id: p.id,
        brand: p.brand || 'Blue Power Generation',
        model: p.model || 'C35',
        year: 2026,
        imageUrl: p.image_url,
        catalogImageRes: undefined,
        plate: p.serial_number || p.location || `PLANTA-${p.model}`,
        currentOdometer: Number(p.current_hours) || 0,
        currentHours: Number(p.current_hours) || 0,
        powerKva: Number(p.power_kva) || 35,
        powerKw: Number(p.power_kw) || 28,
        fuelType: p.fuel_type || 'Diesel',
        engineBrand: p.engine_brand || 'Cummins',
        engineModel: p.engine_model,
        alternatorBrand: p.alternator_brand || 'Leroy Somer',
        alternatorModel: p.alternator_model,
        controllerModel: p.controller_model || 'ComAp InteliLite IL-9',
        installationType: p.installation_type || 'Canopy Insonorizada',
        fuelTankCapacity: p.fuel_tank_capacity ? Number(p.fuel_tank_capacity) : 180,
        oilPanCapacity: p.oil_pan_capacity ? Number(p.oil_pan_capacity) : 10.9,
        coolantCapacity: p.coolant_capacity ? Number(p.coolant_capacity) : 7.2,
        systemVoltage: p.system_voltage || '24V DC',
        serialNumber: p.serial_number,
        location: p.location,
        assignedOperatorId: p.assigned_operator_id,
        assignedOperatorName: p.assigned_operator_name,
        isFromAgency: p.is_from_agency ?? false,
        vehicleType: 'planta' as VehicleType,
      }));

      // 2. Flota de Vehículos de la Empresa (Automóviles/Camionetas de Soporte Técnico)
      const { data: vehiculosData } = await supabase
        .from('vehiculos_empresa')
        .select('*')
        .eq('user_id', user.id);

      const parsedVehiculos: Moto[] = (vehiculosData || []).map((v: any) => ({
        id: v.id,
        brand: v.brand,
        model: v.model,
        year: v.year || 2024,
        imageUrl: v.image_url,
        plate: v.plate,
        currentOdometer: v.current_odometer || 0,
        isFromAgency: v.is_from_agency ?? false,
        vehicleType: 'car' as VehicleType,
      }));

      // 3. Motos registradas
      const { data: motosData } = await supabase
        .from('motos')
        .select('*')
        .eq('user_id', user.id);

      const parsedMotos: Moto[] = (motosData || []).map((m: any) => ({
        id: m.id,
        brand: m.brand,
        model: m.model,
        year: m.year,
        imageUrl: m.image_url,
        plate: m.plate,
        currentOdometer: m.current_odometer || 0,
        isFromAgency: m.is_from_agency ?? false,
        vehicleType: (isCar(m) ? 'car' : 'moto') as VehicleType,
      }));

      // Combinar unidades dando prioridad absoluta a Plantas Eléctricas
      const allUnits = [...parsedPlantas, ...parsedVehiculos, ...parsedMotos];

      if (allUnits.length > 0) {
        setMotos(allUnits);

        setMyMoto((prev) => {
          const targetId = preferredMotoId || prev?.id;
          if (targetId) {
            const found = allUnits.find(u => u.id === targetId);
            if (found) return found;
          }
          if (prev) {
            const foundByDetails = allUnits.find(
              u => u.brand.trim().toLowerCase() === prev.brand.trim().toLowerCase() &&
                   u.model.trim().toLowerCase() === prev.model.trim().toLowerCase()
            );
            if (foundByDetails) return foundByDetails;
          }
          return allUnits[0];
        });
      } else {
        setMotos([]);
        setMyMoto(null);
      }
    } catch (e) {
      console.error('Error cargando datos de Supabase', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const setDrivesCompanyVehicle = async (val: boolean) => {
    setDrivesCompanyVehicleState(val);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || (await supabase.auth.getUser()).data?.user;
      if (user) {
        await supabase.from('profiles').update({ drives_company_vehicle: val }).eq('id', user.id);
      }
    } catch (e) {
      console.warn('Error actualizando perfil drives_company_vehicle:', e);
    }
  };

  useEffect(() => {
    if (!myMoto) {
      setRecords([]);
      return;
    }

    const unitId = myMoto.id;
    const cached = recordsCacheRef.current.get(unitId);
    if (cached) {
      setRecords(cached);
    }

    const lastFetch = recordsFetchTimeRef.current.get(unitId) || 0;
    const now = Date.now();
    if (cached && now - lastFetch < 20000) {
      return;
    }

    let isMounted = true;
    const loadRecords = async () => {
      try {
        const { data: recordsData } = await supabase
          .from('service_records')
          .select('*')
          .or(`moto_id.eq.${unitId},planta_id.eq.${unitId},vehiculo_id.eq.${unitId}`)
          .order('created_at', { ascending: false });

        if (isMounted && recordsData) {
          const parsedRecords: ServiceRecord[] = recordsData.map((r: any) => ({
            id: r.id,
            type: r.type as any,
            date: r.date,
            odometer: Number(r.hours || r.odometer || 0),
            costUSD: Number(r.cost_usd || 0),
            notes: r.notes,
            status: (r.status as any) || 'completed',
            scheduledTime: r.scheduled_time || '09:00 - 11:00',
          }));
          recordsCacheRef.current.set(unitId, parsedRecords);
          recordsFetchTimeRef.current.set(unitId, Date.now());
          setRecords(parsedRecords);
        }
      } catch (e) {
        console.error('Error cargando registros de servicio:', e);
      }
    };

    loadRecords();
    return () => {
      isMounted = false;
    };
  }, [myMoto?.id]);

  const saveMoto = async (moto: Moto) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMotos(prev => [...prev.filter(m => m.id !== moto.id), moto]);
      setMyMoto(moto);
      return;
    }

    try {
      const type = moto.vehicleType || (isPlanta(moto) ? 'planta' : isCar(moto) ? 'car' : 'planta');

      if (type === 'planta') {
        // Guardar en tabla public.plantas
        const { data: inserted, error } = await supabase.from('plantas').insert({
          user_id: user.id,
          brand: moto.brand || 'Blue Power Generation',
          model: moto.model || 'C35',
          power_kva: moto.powerKva || 35,
          power_kw: moto.powerKw || 28,
          fuel_type: moto.fuelType || 'Diesel',
          engine_brand: moto.engineBrand || 'Cummins',
          engine_model: moto.engineModel,
          alternator_brand: moto.alternatorBrand || 'Leroy Somer',
          alternator_model: moto.alternatorModel,
          controller_model: moto.controllerModel || 'ComAp InteliLite IL-9',
          installation_type: moto.installationType || 'Canopy Insonorizada',
          fuel_tank_capacity: moto.fuelTankCapacity || 180,
          oil_pan_capacity: moto.oilPanCapacity || 10.9,
          coolant_capacity: moto.coolantCapacity || 7.2,
          system_voltage: moto.systemVoltage || '24V DC',
          current_hours: moto.currentOdometer || 0,
          serial_number: moto.serialNumber || moto.plate,
          location: moto.location || 'Sede Principal',
          image_url: moto.imageUrl,
          is_from_agency: moto.isFromAgency ?? false,
        }).select().single();

        if (error) console.error('Error guardando en plantas:', error);
        await loadDataFromCloud(inserted?.id);
      } else if (type === 'car') {
        // Guardar en vehiculos_empresa
        const { data: inserted, error } = await supabase.from('vehiculos_empresa').insert({
          user_id: user.id,
          brand: moto.brand,
          model: moto.model,
          year: moto.year,
          plate: moto.plate,
          current_odometer: moto.currentOdometer,
          image_url: moto.imageUrl,
          is_from_agency: moto.isFromAgency ?? false,
        }).select().single();

        if (error) console.error('Error guardando en vehiculos_empresa:', error);
        await loadDataFromCloud(inserted?.id);
      } else {
        // Guardar en motos
        const { data: inserted, error } = await supabase.from('motos').insert({
          user_id: user.id,
          brand: moto.brand,
          model: moto.model,
          year: moto.year,
          plate: moto.plate,
          current_odometer: moto.currentOdometer,
          image_url: moto.imageUrl,
          is_from_agency: moto.isFromAgency ?? false,
        }).select().single();

        if (error) console.error('Error guardando en motos:', error);
        await loadDataFromCloud(inserted?.id);
      }
    } catch (e) {
      console.error('Error guardando unidad:', e);
      await loadDataFromCloud();
    }
  };

  const updateMoto = async (updates: Partial<Moto>) => {
    if (!myMoto) return;
    const updated = { ...myMoto, ...updates };
    setMyMoto(updated);
    setMotos(prev => prev.map(m => m.id === updated.id ? updated : m));

    try {
      const type = myMoto.vehicleType || (isPlanta(myMoto) ? 'planta' : 'moto');
      if (type === 'planta') {
        await supabase.from('plantas').update({
          brand: updated.brand,
          model: updated.model,
          power_kva: updated.powerKva,
          power_kw: updated.powerKw,
          current_hours: updated.currentHours !== undefined ? updated.currentHours : updated.currentOdometer,
          serial_number: updated.serialNumber || updated.plate,
          location: updated.location,
          image_url: updated.imageUrl,
          is_from_agency: updated.isFromAgency,
        }).eq('id', myMoto.id);
      } else if (type === 'car') {
        await supabase.from('vehiculos_empresa').update({
          brand: updated.brand,
          model: updated.model,
          current_odometer: updated.currentOdometer,
          image_url: updated.imageUrl,
        }).eq('id', myMoto.id);
      } else {
        await supabase.from('motos').update({
          brand: updated.brand,
          model: updated.model,
          current_odometer: updated.currentOdometer,
          image_url: updated.imageUrl,
        }).eq('id', myMoto.id);
      }
    } catch (e) {
      console.error('Error actualizando unidad:', e);
    }
  };

  const selectMoto = (id: string) => {
    const found = motos.find(m => m.id === id);
    if (found) {
      setMyMoto(found);
    }
  };

  const deleteMoto = async (id: string) => {
    try {
      const target = motos.find(m => m.id === id);
      const type = target?.vehicleType || (isPlanta(target) ? 'planta' : 'moto');
      if (type === 'planta') {
        await supabase.from('plantas').delete().eq('id', id);
      } else if (type === 'car') {
        await supabase.from('vehiculos_empresa').delete().eq('id', id);
      } else {
        await supabase.from('motos').delete().eq('id', id);
      }
    } catch (e) {
      console.error('Error eliminando unidad:', e);
    }
    await loadDataFromCloud();
  };

  const addRecord = async (record: ServiceRecord) => {
    setRecords(prev => {
      const updated = [record, ...prev];
      if (myMoto) {
        recordsCacheRef.current.set(myMoto.id, updated);
      }
      return updated;
    });

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || (await supabase.auth.getUser()).data?.user;
    if (user && myMoto) {
      const type = myMoto.vehicleType || (isPlanta(myMoto) ? 'planta' : 'moto');
      await supabase.from('service_records').insert({
        user_id: user.id,
        planta_id: type === 'planta' ? myMoto.id : null,
        vehiculo_id: type === 'car' ? myMoto.id : null,
        moto_id: type === 'moto' ? myMoto.id : null,
        type: record.type,
        date: record.date,
        odometer: record.odometer,
        hours: type === 'planta' ? record.odometer : null,
        cost_usd: record.costUSD,
        notes: record.notes,
        status: record.status || 'completed',
        scheduled_time: record.scheduledTime || '09:00 - 11:00'
      });
    }
  };

  const deleteRecord = async (id: string) => {
    setRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      if (myMoto) {
        recordsCacheRef.current.set(myMoto.id, updated);
      }
      return updated;
    });
    await supabase.from('service_records').delete().eq('id', id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <MotoContext.Provider value={{ 
      myMoto, 
      motos, 
      records, 
      drivesCompanyVehicle,
      setDrivesCompanyVehicle,
      userRole,
      setUserRole,
      isAdmin,
      approvalStatus,
      systemMetrics,
      pendingUsersList,
      operatorsList,
      clientsList,
      loadSystemUsers,
      approveUser,
      rejectUser,
      checkApprovalStatus,
      saveMoto, 
      updateMoto, 
      addRecord, 
      deleteRecord, 
      selectMoto, 
      deleteMoto, 
      isLoaded, 
      logout, 
      isAddingMoto, 
      setIsAddingMoto 
    }}>
      {children}
    </MotoContext.Provider>
  );
};

export const useMyMoto = () => {
  const context = useContext(MotoContext);
  if (!context) throw new Error('useMyMoto must be used within MotoProvider');
  return context;
};
