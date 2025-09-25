"use client";

import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

export type ShiftRecord = {
  id: string;
  employeeId: string;
  start: string; // ISO string in UTC
  end: string; // ISO string in UTC
  breakMinutes: number;
  hourlyRate: number;
  notes?: string;
};

export type EmployeeRecord = {
  id: string;
  name: string;
  role?: string;
  hourlyRate: number;
  avatarUrl?: string;
  active: boolean;
};

export type CalculationRecord = {
  id: string;
  shiftId: string;
  totalPay: number;
  currency: string;
  generatedAt: string; // ISO string
  breakdown?: Record<string, number>;
};

type DataStoreState = {
  shifts: ShiftRecord[];
  employees: EmployeeRecord[];
  calculations: CalculationRecord[];
  lastSyncedAt: string | null;
  isSyncing: boolean;
  setShifts: (shifts: ShiftRecord[]) => void;
  upsertShift: (shift: ShiftRecord) => void;
  removeShift: (shiftId: string) => void;
  setEmployees: (employees: EmployeeRecord[]) => void;
  upsertEmployee: (employee: EmployeeRecord) => void;
  removeEmployee: (employeeId: string) => void;
  setCalculations: (calculations: CalculationRecord[]) => void;
  upsertCalculation: (calculation: CalculationRecord) => void;
  clearCalculations: () => void;
  setSyncState: (isSyncing: boolean, at?: string | null) => void;
  reset: () => void;
};

const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const selectStorage = () =>
  typeof window === "undefined" ? memoryStorage : window.localStorage;

const initialState = {
  shifts: [] as ShiftRecord[],
  employees: [] as EmployeeRecord[],
  calculations: [] as CalculationRecord[],
  lastSyncedAt: null,
  isSyncing: false,
};

export const useDataStore = create<DataStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setShifts: (shifts) => set({ shifts }),
      upsertShift: (shift) =>
        set(({ shifts }) => ({
          shifts: [...shifts.filter((item) => item.id !== shift.id), shift],
        })),
      removeShift: (shiftId) =>
        set(({ shifts }) => ({
          shifts: shifts.filter((shift) => shift.id !== shiftId),
        })),
      setEmployees: (employees) => set({ employees }),
      upsertEmployee: (employee) =>
        set(({ employees }) => ({
          employees: [
            ...employees.filter((item) => item.id !== employee.id),
            employee,
          ],
        })),
      removeEmployee: (employeeId) =>
        set(({ employees }) => ({
          employees: employees.filter((employee) => employee.id !== employeeId),
        })),
      setCalculations: (calculations) => set({ calculations }),
      upsertCalculation: (calculation) =>
        set(({ calculations }) => ({
          calculations: [
            ...calculations.filter((item) => item.id !== calculation.id),
            calculation,
          ],
        })),
      clearCalculations: () => set({ calculations: [] }),
      setSyncState: (isSyncing, at = null) =>
        set({
          isSyncing,
          lastSyncedAt: at ?? (isSyncing ? get().lastSyncedAt : new Date().toISOString()),
        }),
      reset: () => set({ ...initialState }),
    }),
    {
      name: "data-store",
      storage: createJSONStorage(selectStorage),
      partialize: (state) => ({
        shifts: state.shifts,
        employees: state.employees,
        calculations: state.calculations,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);
