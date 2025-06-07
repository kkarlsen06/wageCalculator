// Constants extracted from appLogic.js
import { supabase } from '../lib/supabaseClient.js';

export const CONSTANTS = {
    YEAR: 2025,
    PAUSE_THRESHOLD: 5.5,
    PAUSE_DEDUCTION: 0.5,
    MONTHS: ['januar', 'februar', 'mars', 'april', 'mai', 'juni',
             'juli', 'august', 'september', 'oktober', 'november', 'desember'],
    WEEKDAYS: ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'],
    PRESET_WAGE_RATES: {
        1: 184.54,
        2: 185.38,
        3: 187.46,
        4: 193.05,
        5: 210.81,
        6: 256.14
    },
    PRESET_BONUSES: {
        weekday: [
            { from: "18:00", to: "21:00", rate: 22 },
            { from: "21:00", to: "23:59", rate: 45 }
        ],
        saturday: [
            { from: "13:00", to: "15:00", rate: 45 },
            { from: "15:00", to: "18:00", rate: 55 },
            { from: "18:00", to: "23:59", rate: 110 }
        ],
        sunday: [
            { from: "00:00", to: "23:59", rate: 100 }
        ]
    }
};

// Export specific constants for easier importing
export const PRESET_WAGE_RATES = CONSTANTS.PRESET_WAGE_RATES;
export const PRESET_BONUSES = CONSTANTS.PRESET_BONUSES;

// Demo data - converted to static export
export const DEMO_SHIFTS = [
    // Demo recurring series for UI testing
    { id: 'demo-series-1-1', date: "2025-06-04T00:00:00.000Z", startTime: "10:00", endTime: "12:00", type: 0, seriesId: 'demo-series-1' },
    { id: 'demo-series-1-2', date: "2025-06-11T00:00:00.000Z", startTime: "10:00", endTime: "12:00", type: 0, seriesId: 'demo-series-1' },

    // June (original demo data)
    { id: 'demo-6-1', date: "2025-06-03T00:00:00.000Z", startTime: "15:00", endTime: "23:15", type: 1 },
    { id: 'demo-6-2', date: "2025-06-10T00:00:00.000Z", startTime: "15:00", endTime: "23:15", type: 1 },
    { id: 'demo-6-3', date: "2025-06-12T00:00:00.000Z", startTime: "17:00", endTime: "23:15", type: 0 },
    { id: 'demo-6-4', date: "2025-06-15T00:00:00.000Z", startTime: "17:00", endTime: "22:00", type: 0 },
    { id: 'demo-6-5', date: "2025-06-19T00:00:00.000Z", startTime: "17:00", endTime: "21:00", type: 0 },
    { id: 'demo-6-6', date: "2025-06-21T00:00:00.000Z", startTime: "16:00", endTime: "23:15", type: 1 },
    { id: 'demo-6-7', date: "2025-06-22T00:00:00.000Z", startTime: "13:00", endTime: "18:00", type: 1 },
    { id: 'demo-6-8', date: "2025-06-23T00:00:00.000Z", startTime: "16:00", endTime: "23:15", type: 0 },
    { id: 'demo-6-9', date: "2025-06-24T00:00:00.000Z", startTime: "17:00", endTime: "23:15", type: 0 },
    { id: 'demo-6-10', date: "2025-06-26T00:00:00.000Z", startTime: "17:00", endTime: "23:15", type: 0 },
    { id: 'demo-6-11', date: "2025-06-30T00:00:00.000Z", startTime: "15:45", endTime: "23:15", type: 0 },

    // January
    { id: 'demo-1-1', date: "2025-01-05T00:00:00.000Z", startTime: "08:00", endTime: "16:00", type: 0 },
    { id: 'demo-1-2', date: "2025-01-12T00:00:00.000Z", startTime: "09:00", endTime: "17:00", type: 2 },
    { id: 'demo-1-3', date: "2025-01-18T00:00:00.000Z", startTime: "14:00", endTime: "22:00", type: 1 },

    // February
    { id: 'demo-2-1', date: "2025-02-03T00:00:00.000Z", startTime: "07:00", endTime: "15:00", type: 0 },
    { id: 'demo-2-2', date: "2025-02-14T00:00:00.000Z", startTime: "15:00", endTime: "23:00", type: 1 },
    { id: 'demo-2-3', date: "2025-02-23T00:00:00.000Z", startTime: "10:00", endTime: "18:00", type: 2 },

    // March
    { id: 'demo-3-1', date: "2025-03-02T00:00:00.000Z", startTime: "08:00", endTime: "16:00", type: 0 },
    { id: 'demo-3-2', date: "2025-03-15T00:00:00.000Z", startTime: "13:00", endTime: "21:00", type: 1 },
    { id: 'demo-3-3', date: "2025-03-23T00:00:00.000Z", startTime: "09:00", endTime: "17:00", type: 2 },

    // April
    { id: 'demo-4-1', date: "2025-04-04T00:00:00.000Z", startTime: "07:30", endTime: "15:30", type: 0 },
    { id: 'demo-4-2', date: "2025-04-12T00:00:00.000Z", startTime: "14:00", endTime: "22:00", type: 1 },
    { id: 'demo-4-3', date: "2025-04-20T00:00:00.000Z", startTime: "10:00", endTime: "18:00", type: 2 },

    // May
    { id: 'demo-5-1', date: "2025-05-01T00:00:00.000Z", startTime: "08:00", endTime: "16:00", type: 0 },
    { id: 'demo-5-2', date: "2025-05-17T00:00:00.000Z", startTime: "15:00", endTime: "23:00", type: 1 },
    { id: 'demo-5-3', date: "2025-05-25T00:00:00.000Z", startTime: "09:00", endTime: "17:00", type: 2 },

    // July
    { id: 'demo-7-1', date: "2025-07-04T00:00:00.000Z", startTime: "07:00", endTime: "15:00", type: 0 },
    { id: 'demo-7-2', date: "2025-07-12T00:00:00.000Z", startTime: "14:00", endTime: "22:00", type: 1 },
    { id: 'demo-7-3', date: "2025-07-20T00:00:00.000Z", startTime: "10:00", endTime: "18:00", type: 2 },

    // August
    { id: 'demo-8-1', date: "2025-08-03T00:00:00.000Z", startTime: "08:00", endTime: "16:00", type: 0 },
    { id: 'demo-8-2', date: "2025-08-16T00:00:00.000Z", startTime: "15:00", endTime: "23:00", type: 1 },
    { id: 'demo-8-3', date: "2025-08-24T00:00:00.000Z", startTime: "09:00", endTime: "17:00", type: 2 },

    // September
    { id: 'demo-9-1', date: "2025-09-05T00:00:00.000Z", startTime: "07:30", endTime: "15:30", type: 0 },
    { id: 'demo-9-2', date: "2025-09-13T00:00:00.000Z", startTime: "14:00", endTime: "22:00", type: 1 },
    { id: 'demo-9-3', date: "2025-09-21T00:00:00.000Z", startTime: "10:00", endTime: "18:00", type: 2 },

    // October
    { id: 'demo-10-1', date: "2025-10-02T00:00:00.000Z", startTime: "08:00", endTime: "16:00", type: 0 },
    { id: 'demo-10-2', date: "2025-10-18T00:00:00.000Z", startTime: "15:00", endTime: "23:00", type: 1 },
    { id: 'demo-10-3', date: "2025-10-26T00:00:00.000Z", startTime: "09:00", endTime: "17:00", type: 2 },

    // November
    { id: 'demo-11-1', date: "2025-11-06T00:00:00.000Z", startTime: "07:00", endTime: "15:00", type: 0 },
    { id: 'demo-11-2', date: "2025-11-15T00:00:00.000Z", startTime: "14:00", endTime: "22:00", type: 1 },
    { id: 'demo-11-3', date: "2025-11-23T00:00:00.000Z", startTime: "10:00", endTime: "18:00", type: 2 },

    // December
    { id: 'demo-12-1', date: "2025-12-03T00:00:00.000Z", startTime: "08:00", endTime: "16:00", type: 0 },
    { id: 'demo-12-2', date: "2025-12-13T00:00:00.000Z", startTime: "15:00", endTime: "23:00", type: 1 },
    { id: 'demo-12-3', date: "2025-12-21T00:00:00.000Z", startTime: "09:00", endTime: "17:00", type: 2 }
].map(shift => ({
    ...shift,
    date: new Date(shift.date)
}));

// Time utility functions
export const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

export const calculateOverlap = (startA, endA, startB, endB) => {
    const start = Math.max(startA, startB);
    const end = Math.min(endA, endB);
    return Math.max(0, end - start);
};

// Bonus calculation functions
export const calculateBonus = (startTime, endTime, bonusSegments) => {
    let totalBonus = 0;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    for (const segment of bonusSegments) {
        const segStart = timeToMinutes(segment.from);
        let segEnd = timeToMinutes(segment.to);
        if (segEnd <= segStart) {
            segEnd += 24 * 60;
        }
        const overlap = calculateOverlap(startMinutes, endMinutes, segStart, segEnd);
        totalBonus += (overlap / 60) * segment.rate;
    }
    return totalBonus;
};

// Wage calculation functions
export const getCurrentWageRate = (usePreset, currentWageLevel, customWage) => {
    return usePreset ? CONSTANTS.PRESET_WAGE_RATES[currentWageLevel] : customWage;
};

export const getCurrentBonuses = (usePreset, customBonuses) => {
    if (usePreset) {
        return CONSTANTS.PRESET_BONUSES;
    } else {
        // Ensure customBonuses has the expected structure
        const bonuses = customBonuses || {};
        return {
            weekday: bonuses.weekday || [],
            saturday: bonuses.saturday || [],
            sunday: bonuses.sunday || []
        };
    }
};

export const calculateShift = (shift, usePreset, currentWageLevel, customWage, customBonuses, pauseDeduction) => {
    const startMinutes = timeToMinutes(shift.startTime);
    let endMinutes = timeToMinutes(shift.endTime);
    const durationHours = (endMinutes - startMinutes) / 60;
    let paidHours = durationHours;
    
    if (pauseDeduction && durationHours > CONSTANTS.PAUSE_THRESHOLD) {
        paidHours -= CONSTANTS.PAUSE_DEDUCTION;
        endMinutes -= CONSTANTS.PAUSE_DEDUCTION * 60;
    }
    
    const wageRate = getCurrentWageRate(usePreset, currentWageLevel, customWage);
    const baseWage = paidHours * wageRate;
    const bonuses = getCurrentBonuses(usePreset, customBonuses);
    const bonusType = shift.type === 0 ? 'weekday' : (shift.type === 1 ? 'saturday' : 'sunday');
    const bonusSegments = bonuses[bonusType] || [];
    
    const bonus = calculateBonus(
        shift.startTime,
        `${Math.floor(endMinutes/60).toString().padStart(2,'0')}:${(endMinutes%60).toString().padStart(2,'0')}`,
        bonusSegments
    );
    
    return {
        hours: parseFloat(paidHours.toFixed(2)),
        totalHours: parseFloat(durationHours.toFixed(2)),
        paidHours: parseFloat(paidHours.toFixed(2)),
        pauseDeducted: pauseDeduction && durationHours > CONSTANTS.PAUSE_THRESHOLD,
        baseWage: baseWage,
        bonus: bonus,
        total: baseWage + bonus
    };
};

// Formatting functions
export const formatCurrency = (amount) => {
    return Math.round(amount).toLocaleString('nb-NO') + ' kr';
};

export const formatCurrencyShort = (amount) => {
    return Math.round(amount).toLocaleString('nb-NO');
};

export const formatCurrencyCalendar = (amount) => {
    return Math.round(amount).toLocaleString('nb-NO');
};

export const formatHours = (hours) => {
    return hours.toFixed(2).replace('.', ',') + ' t';
};

// Statistics calculation
export const calculateMonthStats = (shifts, currentMonth, usePreset, currentWageLevel, customWage, customBonuses, pauseDeduction) => {
    let totalHours = 0;
    let totalBase = 0;
    let totalBonus = 0;
    
    const monthShifts = shifts.filter(shift =>
        shift.date.getMonth() === currentMonth - 1 &&
        shift.date.getFullYear() === CONSTANTS.YEAR
    );
    
    monthShifts.forEach(shift => {
        const calc = calculateShift(shift, usePreset, currentWageLevel, customWage, customBonuses, pauseDeduction);
        totalHours += calc.hours;
        totalBase += calc.baseWage;
        totalBonus += calc.bonus;
    });
    
    return {
        totalHours,
        totalBase,
        totalBonus,
        totalAmount: totalBase + totalBonus,
        shiftCount: monthShifts.length
    };
};

// Validation functions
export const validateTimeInput = (hour, minute) => {
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    
    if (isNaN(hourNum) || isNaN(minuteNum)) {
        return false;
    }
    
    if (hourNum < 0 || hourNum > 24) {
        return false;
    }
    
    if (minuteNum < 0 || minuteNum > 59) {
        return false;
    }
    
    return true;
};

export const validateShiftData = (startHour, startMinute, endHour, endMinute, selectedDate) => {
    if (!selectedDate) {
        return { isValid: false, error: 'Vennligst velg en dato' };
    }
    
    if (!startHour || !endHour) {
        return { isValid: false, error: 'Vennligst fyll ut arbeidstid' };
    }
    
    if (!validateTimeInput(startHour, startMinute || '00') || !validateTimeInput(endHour, endMinute || '00')) {
        return { isValid: false, error: 'Ugyldig tid' };
    }
    
    return { isValid: true };
};

// Date utility functions
export const getShiftTypeFromDate = (date) => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 ? 2 : (dayOfWeek === 6 ? 1 : 0); // Sunday: 2, Saturday: 1, Weekday: 0
};

export const formatDateForDisplay = (date) => {
    const dayName = CONSTANTS.WEEKDAYS[date.getDay()];
    const monthName = CONSTANTS.MONTHS[date.getMonth()];
    return `${dayName} ${date.getDate()}. ${monthName} ${date.getFullYear()}`;
};

// Settings default values
export const getDefaultSettings = () => ({
    usePreset: true,
    customWage: 200,
    currentWageLevel: 1,
    customBonuses: {
        weekday: [],
        saturday: [],
        sunday: []
    },
    currentMonth: new Date().getMonth() + 1,
    pauseDeduction: false,
    fullMinuteRange: false,
    directTimeInput: false,
    demoMode: false,
    hasSeenRecurringIntro: false
});

// Custom bonus validation and capture
export const validateCustomBonuses = (capturedBonuses) => {
    const validatedBonuses = {};
    
    ['weekday', 'saturday', 'sunday'].forEach(type => {
        validatedBonuses[type] = [];
        
        if (capturedBonuses[type]) {
            capturedBonuses[type].forEach(bonus => {
                if (bonus.from && bonus.to && bonus.rate && !isNaN(bonus.rate) && bonus.rate > 0) {
                    validatedBonuses[type].push({
                        from: bonus.from,
                        to: bonus.to,
                        rate: parseFloat(bonus.rate)
                    });
                }
            });
        }
    });
    
    return validatedBonuses;
};

// UUID generator for series IDs (simplified version)
export const generateId = () => {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

// Time generation utilities for form population
export const generateTimeOptions = (fullMinuteRange = false) => {
    const hours = [];
    for (let h = 6; h <= 24; h++) {
        hours.push(String(h).padStart(2, '0'));
    }
    
    const minutes = fullMinuteRange 
        ? Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'))
        : ['00', '15', '30', '45'];
    
    return { hours, minutes };
};

// Supabase database functions
export const fetchShifts = async (userId) => {
    const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId);
    
    if (error) {
        throw new Error('Error fetching shifts: ' + error.message);
    }
    
    return data;
};

export const addShift = async (shift) => {
    const { data, error } = await supabase
        .from('shifts')
        .insert([shift]);
    
    if (error) {
        throw new Error('Error adding shift: ' + error.message);
    }
    
    return data[0];
};

export const updateShift = async (shiftId, updatedFields) => {
    const { data, error } = await supabase
        .from('shifts')
        .update(updatedFields)
        .eq('id', shiftId);
    
    if (error) {
        throw new Error('Error updating shift: ' + error.message);
    }
    
    return data[0];
};

export const deleteShift = async (shiftId) => {
    const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);
    
    if (error) {
        throw new Error('Error deleting shift: ' + error.message);
    }
};

// Shift series functions
export const fetchShiftSeries = async (userId) => {
    const { data, error } = await supabase
        .from('shift_series')
        .select('*')
        .eq('user_id', userId);
    
    if (error) {
        throw new Error('Error fetching shift series: ' + error.message);
    }
    
    return data;
};

export const addShiftSeries = async (series) => {
    const { data, error } = await supabase
        .from('shift_series')
        .insert([series]);
    
    if (error) {
        throw new Error('Error adding shift series: ' + error.message);
    }
    
    return data[0];
};

export const updateShiftSeries = async (seriesId, updatedFields) => {
    const { data, error } = await supabase
        .from('shift_series')
        .update(updatedFields)
        .eq('id', seriesId);
    
    if (error) {
        throw new Error('Error updating shift series: ' + error.message);
    }
    
    return data[0];
};

export const deleteShiftSeries = async (seriesId) => {
    const { error } = await supabase
        .from('shift_series')
        .delete()
        .eq('id', seriesId);
    
    if (error) {
        throw new Error('Error deleting shift series: ' + error.message);
    }
};

// Database functions for Supabase integration
export const getShiftsForUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching shifts:', error);
        throw error;
    }
};

export const saveShiftToDatabase = async (shift, userId) => {
    try {
        const shiftData = {
            ...shift,
            user_id: userId,
            date: new Date(shift.date).toISOString()
        };
        
        const { data, error } = await supabase
            .from('shifts')
            .insert([shiftData])
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error saving shift:', error);
        throw error;
    }
};

export const updateShiftInDatabase = async (shiftId, updates, userId) => {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .update(updates)
            .eq('id', shiftId)
            .eq('user_id', userId)
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error updating shift:', error);
        throw error;
    }
};

export const deleteShiftFromDatabase = async (shiftId, userId) => {
    try {
        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', shiftId)
            .eq('user_id', userId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting shift:', error);
        throw error;
    }
};

export const getUserSettings = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return data || getDefaultSettings();
    } catch (error) {
        console.error('Error fetching user settings:', error);
        return getDefaultSettings();
    }
};

export const saveUserSettings = async (settings, userId) => {
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .upsert([{
                user_id: userId,
                ...settings
            }])
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error saving user settings:', error);
        throw error;
    }
};

export default {
    CONSTANTS,
    DEMO_SHIFTS,
    timeToMinutes,
    calculateOverlap,
    calculateBonus,
    getCurrentWageRate,
    getCurrentBonuses,
    calculateShift,
    formatCurrency,
    formatCurrencyShort,
    formatCurrencyCalendar,
    formatHours,
    calculateMonthStats,
    validateTimeInput,
    validateShiftData,
    getShiftTypeFromDate,
    formatDateForDisplay,
    getDefaultSettings,
    validateCustomBonuses,
    generateId,
    generateTimeOptions,
    fetchShifts,
    addShift,
    updateShift,
    deleteShift,
    fetchShiftSeries,
    addShiftSeries,
    updateShiftSeries,
    deleteShiftSeries,
    getShiftsForUser,
    saveShiftToDatabase,
    updateShiftInDatabase,
    deleteShiftFromDatabase,
    getUserSettings,
    saveUserSettings
};
