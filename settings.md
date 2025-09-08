# Settings Documentation - REDESIGNED

This document outlines every toggle, button, and function call for every setting inside the settings route, for every detail view. Use this as a reference when rewriting the separate detailed views from scratch.

## 🎯 MAJOR UX IMPROVEMENTS IMPLEMENTED

### Structural Changes:
- **Renamed** "Min profil" → "Konto" (clearer purpose)
- **Split** wage settings into basic + advanced sections  
- **Removed** Organization section (enterprise features redistributed)
- **Simplified** collapsible sections (reduced cognitive load)
- **Reorganized** dangerous actions into protected areas

### Content Redistribution:
- **Advanced wage features** → New "Avansert lønn" section
- **Enterprise features** → Distributed to relevant sections
- **Payroll export** → Moved to Data section
- **Employee tab toggle** → Moved to Interface section
- **Dangerous actions** → Protected with collapsible in Account section

### UX Enhancements:
- Monthly goals moved to prominent position
- Method info always visible (no collapsible)
- Destructive actions require extra click
- Enterprise upsell consolidated in Interface

## Settings Navigation Structure

**File**: `app/src/pages/settings.js`

### Home View (`/settings`)
- **Function**: `getHomeView()` (lines 3-93) - **UPDATE** to reflect new 5-section structure
- **Navigation Items**: Each settings item navigates via `data-spa data-href="/settings/{section}"`
- **ROUTE UPDATES NEEDED**:
  - `/settings/profile` → `/settings/account`
  - New route: `/settings/wage-advanced`
  - **REMOVE**: `/settings/org`

#### Settings Categories:
1. **Konto** (`/settings/account`)
   - Icon: User profile SVG
   - Description: "Profil, sikkerhet og tilgang"

2. **Lønn** (`/settings/wage`)  
   - Icon: Dollar sign SVG
   - Description: "Grunnlønn og utbetaling"

3. **Avansert lønn** (`/settings/wage-advanced`)
   - Icon: Settings/gear SVG
   - Description: "Tillegg, pauser og skatt"

4. **Utseende** (`/settings/interface`)
   - Icon: Monitor SVG  
   - Description: "Tema, visninger og bedriftsfunksjoner"

5. **Data** (`/settings/data`)
   - Icon: Grid SVG
   - Description: "Eksport, import og sikkerhetskopi"

#### Home View Buttons:
- **Lukk**: `data-spa data-href="/"` - Returns to main app

---

## Detail Views

### 1. Account Detail (`/settings/account`)

**Function**: `getAccountDetail()` - RENAMED from `getProfileDetail()` (lines 95-218)

#### Form Fields:
- **Fornavn Input** (`#accountName`) - **RENAME FROM** `#profileName` 
  - Type: Text input
  - Attributes: `autocomplete="given-name"`
  - Events: Blur and Enter key trigger `app.updateAccount()` - **RENAME FROM** `app.updateProfile()`

- **E-post Input** (`#accountEmail`) - **RENAME FROM** `#profileEmail`
  - Type: Email input
  - Disabled: `disabled` attribute
  - Populated by: `app.loadAccountData()` - **RENAME FROM** `app.loadProfileData()`

#### Avatar Section:
- **Avatar Preview** (`#accountAvatarPreview`) - **RENAME FROM** `#profileAvatarPreview`
  - Image: `#accountAvatarImage` - **RENAME FROM** `#profileAvatarImage`
  - Placeholder: `#accountAvatarPlaceholder` - **RENAME FROM** `#profileAvatarPlaceholder`

- **Avatar Controls**:
  - **Velg bilde**: `#accountAvatarChooseBtn` - **RENAME FROM** `#profileAvatarChooseBtn`
  - **Fjern**: `#accountAvatarRemoveBtn` - **RENAME FROM** `#profileAvatarRemoveBtn`
  - **File Input**: `#accountAvatarInput` - **RENAME FROM** `#profileAvatarInput` (hidden)

- **Progress Bar**: `#accountPictureProgress` - **RENAME FROM** `#profilePictureProgress`
  - Fill: `#accountPictureProgressFill` - **RENAME FROM** `#profilePictureProgressFill`
  - Text: `#accountPictureProgressText` - **RENAME FROM** `#profilePictureProgressText`

#### Avatar Crop Modal (`#cropModal`):
- **Crop Image**: `#cropImage`
- **Zoom Slider**: `#cropZoomSlider` (range 0.1-3, step 0.01)
- **Zoom Controls**:
  - **Zoom Out**: `#zoomOutBtn`
  - **Zoom In**: `#zoomInBtn`
- **Actions**:
  - **Avbryt**: `#cancelCropBtn`
  - **Lagre**: `#confirmCropBtn`

#### Google OAuth Section:
- **Link Google Button**: `#btn-link-google`
  - Function: `app.initGoogleLinkButton()`
  - Text: "Koble til Google"
- **Unlink Google Button**: `#btn-unlink-google` (initially hidden)
  - Text: "Fjern Google-konto"
- **Warning Text**: `#google-unlink-warning` (initially hidden)

#### Account Actions:
- **Start onboarding på nytt**:
  - Function: `onclick="app.restartOnboarding()"`
  - Style: `btn btn-secondary`
  - **MOVE TO BOTTOM** - Less prominent placement
  
#### Dangerous Actions Section (Collapsible):
- **Toggle Button**: `data-toggle-section="dangerousActions"`
- **Content**: `#dangerousActions`

- **Slett alle vakter**:
  - Function: `onclick="app.clearAllShifts()"`
  - Style: `btn btn-danger`
  - **MOVED TO COLLAPSIBLE** - Prevent accidental clicks

#### Navigation:
- **Lukk**: `data-spa data-href="/"`
- **Tilbake**: `data-spa data-href="/settings?from=detail"`

---

### 2. Wage Detail (`/settings/wage`) - SIMPLIFIED

**Function**: `getWageDetail()` (lines 220-427) - SIMPLIFIED to show only basic wage settings

#### Wage Model Section:

##### Preset Toggle:
- **Use Virke-tariff Toggle** (`#usePresetToggle`)
  - Function: `onchange="app.togglePreset()"`
  - Default: `checked`
  - Controls: `#presetWageSection` and `#customWageSection` visibility

##### Preset Section (`#presetWageSection`):
- **Wage Level Select** (`#wageSelect`)
  - Function: `onchange="app.updateWageLevel(this.value)"`
  - Options:
    - `-1`: "Under 16 år - 129,91 kr/time"
    - `-2`: "Under 18 år - 132,90 kr/time"  
    - `1`: "Trinn 1 - 184,54 kr/time" (default selected)
    - `2`: "Trinn 2 - 185,38 kr/time"
    - `3`: "Trinn 3 - 187,46 kr/time"
    - `4`: "Trinn 4 - 193,05 kr/time"
    - `5`: "Trinn 5 - 210,81 kr/time"
    - `6`: "Trinn 6 - 256,14 kr/time"

##### Custom Section (`#customWageSection`):
- **Custom Wage Input** (`#customWageInput`)
  - Function: `onchange="app.updateCustomWage(this.value)"`
  - Type: Number, step="0.01", placeholder="200"

#### Goals Section:
- **Monthly Goal Input** (`#monthlyGoalInput`)
  - Type: Number, min="0", step="100", placeholder="20000"
- **Save Goal Button** (`#saveMonthlyGoalBtn`)
  - **MOVED UP** - More prominent placement for important feature

#### Payroll Section:
- **Payroll Day Input** (`#payrollDayInput`)
  - Function: `onchange="app.updatePayrollDay(this.value)"`
  - Type: Number, min="1", max="31", step="1", placeholder="15"

#### Navigation:
- **Lukk**: `data-spa data-href="/"`
- **Tilbake**: `data-spa data-href="/settings?from=detail"`

---

### 3. Advanced Wage Detail (`/settings/wage-advanced`) - NEW SECTION

**Function**: `getAdvancedWageDetail()` - NEW function to handle complex wage features

#### Bonus Wage Settings:
- **Weekday Slots**: `#weekdayBonusSlots`
  - Add Button: `onclick="app.addBonusSlot('weekday')"`
- **Saturday Slots**: `#saturdayBonusSlots`  
  - Add Button: `onclick="app.addBonusSlot('saturday')"`
- **Sunday Slots**: `#sundayBonusSlots`
  - Add Button: `onclick="app.addBonusSlot('sunday')"`
- **MOVED FROM** basic wage section for better organization

#### Break Deduction Section:

##### Main Toggle:
- **Pause Deduction Toggle** (`#pauseDeductionEnabledToggle`)
  - Default: `checked`
  - Controls: `#breakDeductionSubsection` visibility

##### Method Selection:
- **Method Select** (`#pauseDeductionMethodSelect`)
  - Options:
    - `proportional`: "Proporsjonal (anbefalt)"
    - `base_only`: "Kun grunnlønn"
    - `end_of_shift`: "Slutt av vakt (legacy)"
  - **NOTE**: For non-enterprise users only

##### Method Info (Always Visible):
- `#proportionalInfo`: "Proporsjonalt: Trekkes fra alle timer. Anbefalt."
- `#baseOnlyInfo`: "Kun grunnlønn: Trekk kun fra grunnlønn. Tillegg bevares."
- `#endOfShiftInfo`: "⚠️ Slutt av vakt: Trekker på slutten. Kan være problematisk."
- `#noneInfo`: "Ingen trekk: Pause betales."
- **SIMPLIFIED** - Remove collapsible for better UX

##### Break Settings:
- **Pause Threshold** (`#pauseThresholdInput`)
  - Type: Number, min="0", max="24", step="0.5", value="5.5"
- **Deduction Minutes** (`#pauseDeductionMinutesInput`)
  - Type: Number, min="0", max="120", step="15", value="30"

##### Enterprise Break Policy (when subscription active):
- **Break Policy Select** (`#breakPolicySelect`)
  - Options:
    - `proportional_across_periods`: "Proporsjonal trekk (anbefalt)"
    - `from_base_rate`: "Trekk kun fra grunnlønn"
    - `fixed_0_5_over_5_5h`: "Trekk på slutten av vakt"
    - `none`: "Ingen trekk - betalt pause"
  - **MOVED FROM** Organization section
  - **REPLACES** basic method select for enterprise users
  - More advanced policy options with cross-period calculations

#### Tax Section:

##### Tax Toggle:
- **Tax Deduction Toggle** (`#taxDeductionToggle`)
  - Function: `onchange="app.toggleTaxDeduction(this.checked)"`
  - Controls: `#taxPercentageSection` visibility

##### Tax Percentage:
- **Tax Percentage Input** (`#taxPercentageInput`)
  - Function: `onchange="app.updateTaxPercentage(this.value)"`
  - Type: Number, min="0", max="100", step="0.5", placeholder="35"

#### Navigation:
- **Lukk**: `data-spa data-href="/"`
- **Tilbake**: `data-spa data-href="/settings?from=detail"`

---

### **[REMOVED] Organization Detail** (`/settings/org`)

**✅ SECTION COMPLETELY REMOVED** - All enterprise features successfully redistributed:

- ✅ Break Policy Select → **MOVED TO** Advanced Wage section (line 227)
- ✅ Export Payroll Report → **MOVED TO** Data section (line 343)  
- ✅ Employee Tab Toggle → **MOVED TO** Interface section (line 283)
- ✅ Subscription upgrade → **MOVED TO** Interface section (line 291)

**Function**: `getOrgDetail()` (lines 429-505) - **DELETE THIS FUNCTION**

---

### 4. Interface Detail (`/settings/interface`) - ENHANCED

**Function**: `getInterfaceDetail()` (lines 507-655)

#### Theme Section:
- **Theme Radio Options** (name="theme"):
  - `light`: "Lys" (`#themeLight`)
  - `dark`: "Mørk" (`#themeDark`)  
  - `system`: "Automatisk" (`#themeSystem`, default checked)

#### Shift View:
- **Default Shifts View Toggle** (`#defaultShiftsViewToggle`)
  - Controls whether calendar opens first instead of list

#### Business Features Section:
- **Show Employee Tab Toggle** (`#showEmployeeTabToggle`)
  - Only enabled if user has Enterprise subscription
  - Function: Saves to `app.showEmployeeTab` and calls `app.saveSettingsToSupabase()` and `app.updateTabBarVisibility()`
  - Labels change based on subscription:
    - With Enterprise: "Vis bedriftsfunksjoner"
    - Without Enterprise: "Bedriftsfunksjoner (krever Enterprise)"

##### Enterprise Upsell (when no subscription):
- **Upgrade Button**:
  - Function: `onclick="app.openSubscription()"`
  - Style: `btn btn-primary`
  - Text: "Oppgrader til Enterprise"
  - **MOVED FROM** Organization section

#### Time Registration:
- **Direct Time Input Toggle** (`#directTimeInputToggle`)
  - Controls whether users can type time directly vs dropdown

- **Full Minute Range Toggle** (`#fullMinuteRangeToggle`)
  - Controls whether to show every minute vs 15-minute intervals
  - **SIMPLIFIED** - Remove collapsible for better accessibility

#### Currency Format:
- **Currency Format Toggle** (`#currencyFormatToggle`)
  - Controls whether to use "NOK" vs "kr"

#### Navigation:
- **Lukk**: `data-spa data-href="/"`
- **Tilbake**: `data-spa data-href="/settings?from=detail"`

---

### 5. Data Detail (`/settings/data`) - ENHANCED

**Function**: `getDataDetail()` (lines 657-757)

#### Export Period Selection:
- **Period Radio Options** (name="exportPeriod"):
  - `current`: "Denne måneden" (`#currentMonthLabel`)
  - `year`: "Hele året (alle 12 måneder)"
  - `all`: "Alle vakter jeg har registrert"
  - `custom`: "Velg datoer selv"

#### Custom Period Section (`#customPeriodSection`):
Shows when "custom" period is selected.
- **Start Date** (`#exportStartDate`): Date input
- **End Date** (`#exportEndDate`): Date input

#### Export Buttons:
- **CSV Export**:
  - Function: `onclick="app.exportDataWithPeriod('csv')"`
  - Style: `btn btn-primary`
  - Text: "CSV (Excel)"

- **PDF Export**:
  - Function: `onclick="app.exportDataWithPeriod('pdf')"`
  - Style: `btn btn-secondary`  
  - Text: "PDF-rapport"

#### Enterprise Features (when subscription active):
- **Export Payroll Report**:
  - Function: `onclick="app.openCsvExportModal()"`
  - Style: `btn btn-primary`
  - Text: "Eksporter lønnsrapport"
  - **MOVED FROM** Organization section

#### Import Section:
- **Import File Input** (`#importFileData`)
  - Type: File, accept=".csv,.json"
- **Upload Button**:
  - Function: `onclick="app.importDataFromDataTab()"`
  - Style: `btn btn-secondary`
  - Text: "Last opp"

#### Navigation:
- **Lukk**: `data-spa data-href="/"`
- **Tilbake**: `data-spa data-href="/settings?from=detail"`

---

## Global Settings Functions

**File**: `app/src/js/appLogic.js`

### Core Toggle Functions:
- `app.togglePreset()`: Switches between Virke-tariff and custom wage
- `app.toggleTaxDeduction(checked)`: Enables/disables tax deduction
- `app.updateTaxDeductionUI()`: Updates tax UI based on toggle state

### Update Functions:
- `app.updateWageLevel(level)`: Updates wage level selection
- `app.updateCustomWage(wage)`: Updates custom wage amount
- `app.updateTaxPercentage(value)`: Updates tax percentage
- `app.updatePayrollDay(value)`: Updates payroll day (1-31)
- `app.updateAccount()`: Saves account name changes - **RENAME FROM** `app.updateProfile()`

### Data Management:
- `app.addBonusSlot(type)`: Adds bonus time slots (weekday/saturday/sunday)
- `app.loadAccountData()`: Loads user account data from Supabase - **RENAME FROM** `app.loadProfileData()`
- `app.saveSettingsToSupabase()`: Saves settings to database
- `app.updateTabBarVisibility()`: Shows/hides employee tab

### Action Functions:
- `app.restartOnboarding()`: Resets onboarding flow
- `app.clearAllShifts()`: Deletes all user shifts (with confirmation)
- `app.exportDataWithPeriod(format)`: Exports data as CSV or PDF
- `app.importDataFromDataTab()`: Imports data from file
- `app.openSubscription()`: Opens subscription modal
- `app.openCsvExportModal()`: Opens CSV export modal

### UI Setup Functions:
- `app.setupCollapsibleEventListeners()`: Manages collapsible sections
- `app.setupExportPeriodOptions()`: Sets up export period controls
- `app.populateCustomBonusSlots()`: Populates bonus time slots
- `app.initAccountAvatarControls()`: Initializes avatar upload/crop - **RENAME FROM** `app.initProfileAvatarControls()`
- `app.initGoogleLinkButton()`: Sets up Google OAuth integration

### Account Picture Functions:
- `app.updateAccountPictureProgress(percentage, text)`: Updates upload progress - **RENAME FROM** `app.updateProfilePictureProgress()`
- `app.confirmAvatarCrop()`: Processes and saves cropped avatar
- `app.cancelAvatarCrop()`: Cancels avatar editing

---

## Event Handling

### Initialization:
All detail views call `afterMountSettings()` (lines 785-1042) which:
1. Handles slide animations between views
2. Creates floating bottom navigation bar
3. Initializes section-specific functionality
4. Sets up collapsible section handlers
5. Manages enterprise subscription checks

### Collapsible Sections:
Handled by delegated event listener via `app.setupCollapsibleEventListeners()`:
- Toggles `aria-expanded` attribute
- Adds/removes `hidden` class on content
- Rotates chevron icons

### Form Validation:
- Payroll day: Validates 1-31 range, defaults to 15
- Tax percentage: Validates 0-100 range
- Custom wage: Validates numeric input
- Account name: Required field validation - **UPDATE FROM** Profile name

### Enterprise Features:
Business features are conditionally shown based on:
1. `hasEnterpriseSubscription()` - Subscription status
2. `app.showEmployeeTab` - User preference toggle

This creates a comprehensive settings system where all functionality is clearly mapped to specific UI elements and functions.

---

## 🔄 IMPLEMENTATION CHECKLIST

### Routes to Update:
- [ ] Remove `/settings/org` route handler
- [ ] Add `/settings/account` route (rename from profile)
- [ ] Add `/settings/wage-advanced` route (new)
- [ ] Update navigation in `getHomeView()` to show 5 sections

### Functions to Rename:
- [ ] `getProfileDetail()` → `getAccountDetail()`  
- [ ] `app.updateProfile()` → `app.updateAccount()`
- [ ] `app.loadProfileData()` → `app.loadAccountData()`
- [ ] Avatar-related functions: profile → account

### UI Elements to Update:
- [ ] All profile IDs → account IDs (12 elements)
- [ ] Break policy conditional logic (enterprise vs basic)
- [ ] Remove organization section from navigation
- [ ] Update section count in home view

### Features Successfully Redistributed:
- ✅ Enterprise break policy → Advanced Wage section
- ✅ Payroll export → Data section  
- ✅ Employee tab toggle → Interface section
- ✅ Subscription upgrade → Interface section