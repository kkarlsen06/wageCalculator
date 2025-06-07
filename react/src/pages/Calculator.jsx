import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/style.css';
import { useAuth } from '../hooks/useAuth.jsx';

// Import utility functions from our migrated logic
import {
  formatCurrency,
  formatHours,
  calculateShift,
  calculateBonus,
  timeToMinutes,
  DEMO_SHIFTS,
  PRESET_WAGE_RATES,
  PRESET_BONUSES,
  generateTimeOptions,
  validateTimeInput,
  validateShiftData,
  getShiftTypeFromDate,
  getShiftsForUser,
  saveShiftToDatabase,
  updateShiftInDatabase,
  deleteShiftFromDatabase,
  getUserSettings,
  saveUserSettings
} from '../logic/wageUtils';

const Calculator = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Redirect to login if not authenticated (only check once on mount)
  useEffect(() => {
    if (user === null) { // user is null when auth state is determined and no user
      navigate('/login');
    }
  }, [user, navigate]);
  
  // State management
  const [currentMonth, setCurrentMonth] = useState('Mai 2025');
  const [currentWage, setCurrentWage] = useState(184.54);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [shiftCount, setShiftCount] = useState(0);
  const [baseAmount, setBaseAmount] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [showEditShift, setShowEditShift] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  
  // Settings states
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');
  const [activeAddShiftTab, setActiveAddShiftTab] = useState('simple');
  const [demoDataEnabled, setDemoDataEnabled] = useState(false);
  const [pauseDeduction, setPauseDeduction] = useState(true);
  const [fullMinuteRange, setFullMinuteRange] = useState(false);
  const [directTimeInput, setDirectTimeInput] = useState(false);
  const [usePreset, setUsePreset] = useState(true);
  const [wageLevel, setWageLevel] = useState(1);
  const [customWage, setCustomWage] = useState(200);
  
  // Form states
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState({ hour: '', minute: '' });
  const [endTime, setEndTime] = useState({ hour: '', minute: '' });
  
  // Load data from Supabase on component mount
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Load user settings
        const settings = await getUserSettings(user.id);
        setDemoDataEnabled(settings.demoDataEnabled || false);
        setPauseDeduction(settings.pauseDeduction !== undefined ? settings.pauseDeduction : true);
        setFullMinuteRange(settings.fullMinuteRange || false);
        setDirectTimeInput(settings.directTimeInput || false);
        setUsePreset(settings.usePreset !== undefined ? settings.usePreset : true);
        setWageLevel(settings.wageLevel || 1);
        setCustomWage(settings.customWage || 200);
        
        // Update wage based on settings
        if (settings.usePreset !== false) {
          setCurrentWage(PRESET_WAGE_RATES[settings.wageLevel || 1]);
        } else {
          setCurrentWage(settings.customWage || 200);
        }
        
        // Load shifts
        const userShifts = await getShiftsForUser(user.id);
        setShifts(userShifts);
        
      } catch (error) {
        console.error('Error loading user data:', error);
        // Fall back to demo data if needed
        if (demoDataEnabled) {
          setShifts(DEMO_SHIFTS);
        }
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };
    
    loadUserData();
  }, [user]);
  
  // Save settings to Supabase when they change (but only after initial load)
  useEffect(() => {
    const saveSettings = async () => {
      if (!user?.id || !initialLoadComplete) return;
      
      try {
        const settings = {
          demoDataEnabled,
          pauseDeduction,
          fullMinuteRange,
          directTimeInput,
          usePreset,
          wageLevel,
          customWage
        };
        
        await saveUserSettings(settings, user.id);
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    };
    
    saveSettings();
  }, [user?.id, demoDataEnabled, pauseDeduction, fullMinuteRange, directTimeInput, usePreset, wageLevel, customWage, initialLoadComplete]);

  // Update wage when settings change
  useEffect(() => {
    if (usePreset) {
      setCurrentWage(PRESET_WAGE_RATES[wageLevel]);
    } else {
      setCurrentWage(customWage);
    }
  }, [usePreset, wageLevel, customWage]);

  // Memoized calculate totals function
  const calculateTotals = useCallback(() => {
    let totalBase = 0;
    let totalBonus = 0;
    let totalMinutes = 0;
    
    const effectiveWage = usePreset ? PRESET_WAGE_RATES[wageLevel] : customWage;
    
    shifts.forEach(shift => {
      const result = calculateShift(
        shift.startTime,
        shift.endTime,
        shift.shiftType,
        effectiveWage,
        usePreset ? PRESET_BONUSES : null,
        pauseDeduction
      );
      
      totalBase += result.baseAmount;
      totalBonus += result.bonusAmount;
      totalMinutes += result.totalMinutes;
    });
    
    setBaseAmount(totalBase);
    setBonusAmount(totalBonus);
    setTotalAmount(totalBase + totalBonus);
    setTotalHours(totalMinutes / 60);
    setShiftCount(shifts.length);
  }, [shifts, usePreset, wageLevel, customWage, pauseDeduction]);

  // Calculate totals when shifts change
  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const openAddShiftModal = () => {
    setShowAddShift(true);
    // Reset form
    setSelectedDate(null);
    setStartTime({ hour: '', minute: '' });
    setEndTime({ hour: '', minute: '' });
  };

  const closeAddShiftModal = () => {
    setShowAddShift(false);
  };

  const addShift = async () => {
    // Validate form
    if (!selectedDate || !startTime.hour || !startTime.minute || !endTime.hour || !endTime.minute) {
      alert('Vennligst fyll ut alle felt');
      return;
    }

    const startTimeStr = `${startTime.hour}:${startTime.minute}`;
    const endTimeStr = `${endTime.hour}:${endTime.minute}`;
    
    if (!validateTimeInput(startTimeStr) || !validateTimeInput(endTimeStr)) {
      alert('Ugyldig tidsformat');
      return;
    }

    const newShift = {
      id: Date.now().toString(),
      date: selectedDate,
      startTime: startTimeStr,
      endTime: endTimeStr,
      shiftType: getShiftTypeFromDate(new Date(selectedDate))
    };

    if (!validateShiftData(newShift)) {
      alert('Ugyldig vaktdata');
      return;
    }

    try {
      // Save to database
      const savedShift = await saveShiftToDatabase(newShift, user.id);
      setShifts([...shifts, savedShift]);
      closeAddShiftModal();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert('Kunne ikke lagre vakten. Prøv igjen.');
    }
  };

  const deleteShift = async (shiftId) => {
    try {
      await deleteShiftFromDatabase(shiftId, user.id);
      setShifts(shifts.filter(shift => shift.id !== shiftId));
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert('Kunne ikke slette vakten. Prøv igjen.');
    }
  };

  const toggleMonthDropdown = () => {
    setShowMonthDropdown(!showMonthDropdown);
  };

  const selectMonth = (month, year) => {
    setCurrentMonth(`${month} ${year}`);
    setShowMonthDropdown(false);
  };

  // Generate month options
  const generateMonthOptions = () => {
    const months = [
      'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
    ];
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    
    return years.flatMap(year => 
      months.map(month => ({ month, year }))
    );
  };

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        day,
        date: date.toISOString().split('T')[0],
        isToday: day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
      });
    }
    
    return days;
  };

  const switchSettingsTab = (tab) => {
    setActiveSettingsTab(tab);
  };

  const clearAllData = () => {
    if (window.confirm('Er du sikker på at du vil slette alle data? Dette kan ikke angres.')) {
      setShifts([]);
      setDemoDataEnabled(false);
      localStorage.removeItem('wage-calculator-shifts');
      localStorage.removeItem('wage-calculator-settings');
    }
  };

  const toggleDemoData = () => {
    setDemoDataEnabled(!demoDataEnabled);
    if (!demoDataEnabled) {
      // Add demo shifts, converting format
      const convertedDemoShifts = DEMO_SHIFTS.map(shift => ({
        ...shift,
        shiftType: ['weekday', 'saturday', 'sunday'][shift.type] || 'weekday',
        date: new Date(shift.date).toISOString().split('T')[0] // Convert to YYYY-MM-DD format
      }));
      setShifts(convertedDemoShifts);
    } else {
      // Remove demo shifts
      setShifts([]);
    };

  const updateWageLevel = (level) => {
    setWageLevel(parseInt(level));
    setCurrentWage(PRESET_WAGE_RATES[level]);
  };

  const updateCustomWage = (wage) => {
    setCustomWage(parseFloat(wage));
    setCurrentWage(parseFloat(wage));
  };

  const togglePreset = () => {
    setUsePreset(!usePreset);
    if (!usePreset) {
      setCurrentWage(PRESET_WAGE_RATES[wageLevel]);
    } else {
      setCurrentWage(customWage);
    }
  };

  // Generate time options for dropdowns
  const timeOptions = generateTimeOptions(fullMinuteRange);

  // Show loading state while fetching data
  if (loading) {
    return (
      <div id="app">
        <div className="app-container">
          <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div>Laster...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="app">
      <div className="app-container">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div className="header-left">
              <a href="#" className="header-back-btn" onClick={handleBackToHome}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7"/>
                  <path d="M19 12H5"/>
                </svg>
                Hovedside
              </a>
            </div>
            <div className="header-right">
              <button className="settings-btn" onClick={openSettings}>
                <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Innstillinger</span>
              </button>
              <button className="settings-btn" onClick={handleLogout}>Logg&nbsp;ut</button>
            </div>
          </div>
          
          <div className="header-info">
            <span>
              <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <div className="month-selector">
                <button className="month-button" onClick={toggleMonthDropdown}>
                  <span id="currentMonth">{currentMonth}</span>
                  <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
            </span>
            <span>
              <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              <span id="currentWage">{formatCurrency(currentWage)}/t</span>
            </span>
            <div id="userEmailContainer" style={{display: userEmail ? 'block' : 'none'}}>
              <button id="emailToggleBtn" className="email-toggle-btn" onClick={toggleEmailDisplay}>
                <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </button>
              <span className="user-email-text">
                <span className="email-inner-text">{user?.email}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          {/* Total Card */}
          <div className="total-card">
            <div className="total-label">Total brutto lønn denne måneden</div>
            <div className="total-amount" id="totalAmount">{formatCurrency(totalAmount)}</div>
            <div className="total-hours">
              <span id="totalHours">{formatHours(totalHours)}</span> timer (<span id="shiftCount">{shiftCount}</span> vakter)
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="breakdown-cards">
            <div className="breakdown-card" data-type="base" onClick={() => setShowBreakdown('base')}>
              <div className="breakdown-icon">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </div>
              <div className="breakdown-value" id="baseAmount">{formatCurrency(baseAmount)}</div>
              <div className="breakdown-label">Grunnlønn</div>
            </div>
            <div className="breakdown-card" data-type="bonus" onClick={() => setShowBreakdown('bonus')}>
              <div className="breakdown-icon">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div className="breakdown-value" id="bonusAmount">{formatCurrency(bonusAmount)}</div>
              <div className="breakdown-label">Tillegg</div>
            </div>
          </div>

          {/* Add Shift Button */}
          <button className="add-shift-button" onClick={openAddShiftModal}>
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            Legg til vakt
          </button>

          {/* Shift List */}
          <div className="shift-list" id="shiftList">
            {shifts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg className="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <p>Ingen vakter registrert ennå</p>
              </div>
            ) : (
              shifts.map(shift => {
                const result = calculateShift(
                  shift.startTime,
                  shift.endTime,
                  shift.shiftType,
                  usePreset ? PRESET_WAGE_RATES[wageLevel] : customWage,
                  usePreset ? PRESET_BONUSES : null,
                  pauseDeduction
                );
                
                return (
                  <div key={shift.id} className={`shift-item ${shift.shiftType}`}>
                    <div className="shift-main">
                      <div className="shift-date">{new Date(shift.date).toLocaleDateString('no-NO')}</div>
                      <div className="shift-time">{shift.startTime} - {shift.endTime}</div>
                      <div className="shift-duration">{formatHours(result.totalMinutes / 60)} timer</div>
                      <div className="shift-amount">{formatCurrency(result.baseAmount + result.bonusAmount)}</div>
                    </div>
                    <div className="shift-actions">
                      <button onClick={() => deleteShift(shift.id)} className="delete-btn" title="Slett vakt">
                        <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        width: '100%',
        background: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        padding: '18px 10px 18px 10px',
        fontSize: '14px',
        borderTop: '1px solid var(--border)',
        borderRadius: '16px 16px 0 0',
        maxWidth: '600px',
        margin: '0 auto',
        right: 0
      }}>
        Laget av <a href="https://github.com/kkarlsen-productions" target="_blank" style={{color: 'var(--accent)', textDecoration: 'none'}}>Hjalmar Samuel Kristensen-Karlsen</a> &middot; 2025
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div id="settingsModal" className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Innstillinger</h2>
              <span className="modal-close" onClick={closeSettings}>
                <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </span>
            </div>
            
            <div className="tab-nav">
              <button className={`tab-btn ${activeSettingsTab === 'general' ? 'active' : ''}`} onClick={() => switchSettingsTab('general')}>Generelt</button>
              <button className={`tab-btn ${activeSettingsTab === 'wage' ? 'active' : ''}`} onClick={() => switchSettingsTab('wage')}>Lønn</button>
              <button className={`tab-btn ${activeSettingsTab === 'profile' ? 'active' : ''}`} onClick={() => switchSettingsTab('profile')}>Profil</button>
              <button className={`tab-btn ${activeSettingsTab === 'data' ? 'active' : ''}`} onClick={() => switchSettingsTab('data')}>Data</button>
            </div>

            {/* General Tab */}
            {activeSettingsTab === 'general' && (
              <div id="generalTab" className="tab-content active">
                <div className="form-group">
                  <label>Demo-data</label>
                  <div className="switch-group">
                    <span className="text-secondary">Vis demo-vakter</span>
                    <label className="switch">
                      <input type="checkbox" checked={demoDataEnabled} onChange={toggleDemoData} />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Pausetrekk</label>
                  <div className="switch-group">
                    <span className="text-secondary">Automatisk pausetrekk (over 5,5t)</span>
                    <label className="switch">
                      <input type="checkbox" checked={pauseDeduction} onChange={(e) => setPauseDeduction(e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Minutt-format</label>
                  <div className="switch-group">
                    <span className="text-secondary">Vis alle minutter (0-59) i stedet for kvarter</span>
                    <label className="switch">
                      <input type="checkbox" checked={fullMinuteRange} onChange={(e) => setFullMinuteRange(e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Tidsinnskriving</label>
                  <div className="switch-group">
                    <span className="text-secondary">Skriv inn tid direkte (timer:minutter) i stedet for dropdowns</span>
                    <label className="switch">
                      <input type="checkbox" checked={directTimeInput} onChange={(e) => setDirectTimeInput(e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Wage Tab */}
            {activeSettingsTab === 'wage' && (
              <div id="wageTab" className="tab-content">
                <div className="form-group">
                  <div className="flex justify-between align-center mb-10">
                    <label>Lønnstype</label>
                    {usePreset && <span className="preset-badge">Virke-tariff</span>}
                  </div>
                  <div className="switch-group">
                    <span>Bruk forhåndsinnstilt tariff</span>
                    <label className="switch">
                      <input type="checkbox" checked={usePreset} onChange={togglePreset} />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                {usePreset ? (
                  <div id="presetWageSection">
                    <div className="form-group">
                      <label>Lønnstrinn (Virke 2025)</label>
                      <select className="form-control" value={wageLevel} onChange={(e) => updateWageLevel(e.target.value)}>
                        <option value="1">Trinn 1 (184,54 kr/t)</option>
                        <option value="2">Trinn 2 (185,38 kr/t)</option>
                        <option value="3">Trinn 3 (187,46 kr/t)</option>
                        <option value="4">Trinn 4 (193,05 kr/t)</option>
                        <option value="5">Trinn 5 (210,81 kr/t)</option>
                        <option value="6">Trinn 6 (256,14 kr/t)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div id="customWageSection">
                    <div className="form-group">
                      <label>Timelønn (kr)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="200" 
                        step="0.01" 
                        value={customWage}
                        onChange={(e) => updateCustomWage(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeSettingsTab === 'profile' && (
              <div id="profileTab" className="tab-content">
                <div className="form-group">
                  <label>Fornavn</label>
                  <input type="text" className="form-control" placeholder="Fornavn" />
                </div>
                
                <div className="form-group">
                  <label>E-post</label>
                  <input type="email" className="form-control" placeholder="E-post" value={userEmail} disabled />
                  <small className="form-hint">E-postadressen kan ikke endres</small>
                </div>
                
                <div className="form-group">
                  <button className="btn btn-primary">Oppdater profil</button>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeSettingsTab === 'data' && (
              <div id="dataTab" className="tab-content">
                <div className="form-group">
                  <label>Slett alle data</label>
                  <button className="btn btn-danger" onClick={clearAllData}>Slett alt</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Shift Modal */}
      {showAddShift && (
        <div id="addShiftModal" className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Legg til vakt</h2>
              <span className="modal-close" onClick={closeAddShiftModal}>
                <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </span>
            </div>
            <div className="modal-body">
              <form id="shiftForm">
                <div className="tab-nav" style={{marginBottom: '16px'}}>
                  <button type="button" className={`tab-btn ${activeAddShiftTab === 'simple' ? 'active' : ''}`} onClick={() => switchAddShiftTab('simple')}>Enkel</button>
                  <button type="button" className={`tab-btn ${activeAddShiftTab === 'recurring' ? 'active' : ''}`} onClick={() => switchAddShiftTab('recurring')}>Gjentakende</button>
                </div>

                {activeAddShiftTab === 'simple' && (
                  <div id="simpleFields" className="tab-content active">
                    <div className="form-group">
                      <label>Velg dato</label>
                      <div className="date-grid-container">
                        <div className="date-grid" style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          gap: '4px',
                          marginTop: '8px'
                        }}>
                          {/* Weekday headers */}
                          {['S', 'M', 'T', 'O', 'T', 'F', 'L'].map(day => (
                            <div key={day} style={{
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              padding: '8px 4px'
                            }}>
                              {day}
                            </div>
                          ))}
                          
                          {/* Calendar days */}
                          {generateCalendarDays().map((dayData, index) => (
                            <div 
                              key={index}
                              className={`date-cell ${selectedDate === dayData?.date ? 'selected' : ''} ${dayData?.isToday ? 'today' : ''}`}
                              onClick={() => dayData && setSelectedDate(dayData.date)}
                              style={{
                                minHeight: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: dayData ? 'pointer' : 'default',
                                borderRadius: '4px',
                                fontSize: '14px',
                                border: selectedDate === dayData?.date ? '2px solid var(--accent)' : '1px solid var(--border)',
                                background: dayData?.isToday ? 'var(--accent-light)' : dayData ? 'var(--bg-secondary)' : 'transparent',
                                color: dayData ? 'var(--text-primary)' : 'transparent'
                              }}
                            >
                              {dayData?.day}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Fallback date input */}
                      <div style={{marginTop: '16px'}}>
                        <label style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Eller skriv inn dato:</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          value={selectedDate || ''} 
                          onChange={(e) => setSelectedDate(e.target.value)}
                          style={{marginTop: '4px'}}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Arbeidstid</label>
                      <div className="form-row">
                        <select className="form-control" value={startTime.hour} onChange={(e) => setStartTime({...startTime, hour: e.target.value})}>
                          <option value="">Fra time</option>
                          {timeOptions.hours.map(hour => (
                            <option key={hour} value={hour}>{hour}</option>
                          ))}
                        </select>
                        <select className="form-control" value={startTime.minute} onChange={(e) => setStartTime({...startTime, minute: e.target.value})}>
                          <option value="">Fra minutt</option>
                          {timeOptions.minutes.map(minute => (
                            <option key={minute} value={minute}>{minute}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-row">
                        <select className="form-control" value={endTime.hour} onChange={(e) => setEndTime({...endTime, hour: e.target.value})}>
                          <option value="">Til time</option>
                          {timeOptions.hours.map(hour => (
                            <option key={hour} value={hour}>{hour}</option>
                          ))}
                        </select>
                        <select className="form-control" value={endTime.minute} onChange={(e) => setEndTime({...endTime, minute: e.target.value})}>
                          <option value="">Til minutt</option>
                          {timeOptions.minutes.map(minute => (
                            <option key={minute} value={minute}>{minute}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="btn btn-primary" onClick={addShift}>
                    <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Legg til vakt
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Month Dropdown */}
      {showMonthDropdown && (
        <div className="month-dropdown" id="monthDropdown" style={{
          position: 'absolute',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          minWidth: '200px'
        }}>
          {generateMonthOptions().map(({month, year}) => (
            <div 
              key={`${month}-${year}`}
              className="month-option"
              onClick={() => selectMonth(month, year)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              {month} {year}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Calculator;
