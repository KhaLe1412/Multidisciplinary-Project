import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  Dryer,
  Area,
  DeviceTypeModel,
  Schedule,
  Notification,
  AlertRule,
  SystemAlertEntry,
  SystemLog,
  UserAccount,
  Fruit,
  BatchRecord,
  initialDryers,
  initialAreas,
  initialDeviceTypes,
  initialSchedules,
  initialNotifications,
  initialAlertRules,
  initialSystemAlerts,
  initialSystemLogs,
  initialUsers,
  initialFruits,
  initialBatchRecords,
} from "../data/mockData";

interface AppContextType {
  isAuthenticated: boolean;
  currentUser: UserAccount | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  dryers: Dryer[];
  setDryers: React.Dispatch<React.SetStateAction<Dryer[]>>;
  areas: Area[];
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
  deviceTypes: DeviceTypeModel[];
  setDeviceTypes: React.Dispatch<React.SetStateAction<DeviceTypeModel[]>>;
  schedules: Schedule[];
  setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
  fruits: Fruit[];
  setFruits: React.Dispatch<React.SetStateAction<Fruit[]>>;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  notificationOpen: boolean;
  setNotificationOpen: React.Dispatch<React.SetStateAction<boolean>>;

  alertRules: AlertRule[];
  setAlertRules: React.Dispatch<React.SetStateAction<AlertRule[]>>;
  systemAlerts: SystemAlertEntry[];
  setSystemAlerts: React.Dispatch<React.SetStateAction<SystemAlertEntry[]>>;
  systemLogs: SystemLog[];
  setSystemLogs: React.Dispatch<React.SetStateAction<SystemLog[]>>;

  batchRecords: BatchRecord[];
  setBatchRecords: React.Dispatch<React.SetStateAction<BatchRecord[]>>;
  addBatchRecord: (record: Omit<BatchRecord, "id">) => string;

  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  updateCurrentUser: (updates: Partial<UserAccount>) => void;

  addLog: (log: Omit<SystemLog, "id">) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [dryers, setDryers] = useState<Dryer[]>(initialDryers);
  const [areas, setAreas] = useState<Area[]>(initialAreas);
  const [deviceTypes, setDeviceTypes] =
    useState<DeviceTypeModel[]>(initialDeviceTypes);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [fruits, setFruits] = useState<Fruit[]>(initialFruits);
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(initialAlertRules);
  const [systemAlerts, setSystemAlerts] =
    useState<SystemAlertEntry[]>(initialSystemAlerts);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(initialSystemLogs);
  const [batchRecords, setBatchRecords] =
    useState<BatchRecord[]>(initialBatchRecords);
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);

  const login = (email: string, password: string) => {
    const found = users.find(
      (u) => u.email === email && u.password === password && u.active,
    );
    if (found) {
      setCurrentUser(found);
      setIsAuthenticated(true);
      setSystemLogs((prev) => [
        {
          id: `LOG-${Date.now()}`,
          eventType: "login",
          time: new Date().toISOString(),
          user: found.name,
          description: "Đăng nhập hệ thống thành công",
          severity: "info",
        },
        ...prev,
      ]);
      return true;
    }
    return false;
  };

  const logout = () => {
    if (currentUser) {
      setSystemLogs((prev) => [
        {
          id: `LOG-${Date.now()}`,
          eventType: "logout",
          time: new Date().toISOString(),
          user: currentUser.name,
          description: "Đăng xuất khỏi hệ thống",
          severity: "info",
        },
        ...prev,
      ]);
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const updateCurrentUser = (updates: Partial<UserAccount>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? updated : u)),
    );
  };

  const addLog = (log: Omit<SystemLog, "id">) => {
    setSystemLogs((prev) => [{ ...log, id: `LOG-${Date.now()}` }, ...prev]);
  };

  const addBatchRecord = (record: Omit<BatchRecord, "id">): string => {
    const id = `B${String(Date.now()).slice(-6)}`;
    setBatchRecords((prev) => [{ ...record, id }, ...prev]);
    return id;
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        dryers,
        setDryers,
        areas,
        setAreas,
        deviceTypes,
        setDeviceTypes,
        schedules,
        setSchedules,
        fruits,
        setFruits,
        notifications,
        setNotifications,
        notificationOpen,
        setNotificationOpen,
        alertRules,
        setAlertRules,
        systemAlerts,
        setSystemAlerts,
        systemLogs,
        setSystemLogs,
        batchRecords,
        setBatchRecords,
        addBatchRecord,
        users,
        setUsers,
        updateCurrentUser,
        addLog,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
