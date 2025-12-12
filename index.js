// --- 1. KITA GANTI IKON LUCIDE DENGAN KOMPONEN EMOJI BIASA ---
// Agar tidak error karena tidak ada build tools
const Icon = ({ name }) => {
  const icons = {
    refresh: "🔄",
    trend: "📈",
    dollar: "💰",
    calendar: "📅",
    arrow: "➡️",
    alert: "⚠️",
    check: "✅",
    edit: "✏️"
  };
  return <span style={{ marginRight: '8px', fontSize: '1.2em' }}>{icons[name] || ""}</span>;
};

// --- 2. KODE UTAMA ANDA (SAYA SESUAIKAN DIKIT) ---

const MonthlyFinancialModel = () => {
  const [activeTab, setActiveTab] = React.useState('dashboard');

  // --- INITIAL ASSUMPTIONS (INPUTS) ---
  const [inputs, setInputs] = React.useState({
    baseRevenue: 800, 
    monthlyGrowth: 2, 
    cogsPct: 60, 
    opexFixed: 150, 
    opexVarPct: 5, 
    taxRate: 22, 
    annualInterestRate: 12, 
    dsi: 60, 
    dpo: 45, 
    startCash: 200,
    startInventory: 400,
    startFixedAssets: 5000,
    startDebt: 1000,
    startEquity: 4600, 
    startRetainedEarnings: 0 
  });

  const [revenueOverrides, setRevenueOverrides] = React.useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: parseFloat(value) || 0 });
  };

  const handleRevenueChange = (month, val) => {
    setRevenueOverrides(prev => {
      const newOverrides = { ...prev };
      if (val === '' || val === null) {
        delete newOverrides[month]; 
      } else {
        newOverrides[month] = parseFloat(val);
      }
      return newOverrides;
    });
  };

  // --- CALCULATION ENGINE ---
  const monthlyData = React.useMemo(() => {
    let data = [];
    
    let prev = {
      rev: 0,
      inventory: inputs.startInventory,
      ap: (inputs.baseRevenue * (inputs.cogsPct/100) / 30) * inputs.dpo, 
      fixedAssets: inputs.startFixedAssets,
      cash: inputs.startCash,
      re: inputs.startRetainedEarnings,
      debt: inputs.startDebt,
      equity: inputs.startEquity
    };

    for (let m = 1; m <= 12; m++) {
      let rev;
      if (revenueOverrides[m] !== undefined) {
        rev = revenueOverrides[m];
      } else {
        rev = m === 1 ? inputs.baseRevenue : prev.rev * (1 + inputs.monthlyGrowth / 100);
      }

      const cogs = rev * (inputs.cogsPct / 100);
      const grossProfit = rev - cogs;
      
      const opexFixed = inputs.opexFixed;
      const opexVar = rev * (inputs.opexVarPct / 100);
      const depr = (inputs.startFixedAssets * 0.1) / 12; 
      
      const ebit = grossProfit - opexFixed - opexVar - depr;
      const interest = (inputs.startDebt * (inputs.annualInterestRate/100)) / 12;
      const ebt = ebit - interest;
      const tax = ebt > 0 ? ebt * (inputs.taxRate / 100) : 0;
      const netIncome = ebt - tax;

      const inventory = (cogs / 30) * inputs.dsi;
      const ap = (cogs / 30) * inputs.dpo;
      const fixedAssets = prev.fixedAssets - depr; 
      const re = prev.re + netIncome;
      const debt = inputs.startDebt;
      const equity = inputs.startEquity;

      const cfo_ni = netIncome;
      const cfo_depr = depr;
      const cfo_inv = -(inventory - prev.inventory);
      const cfo_ap = (ap - prev.ap);
      const cfo_total = cfo_ni + cfo_depr + cfo_inv + cfo_ap;

      const cfi = 0; 
      const cff = 0; 
      
      const netChange = cfo_total + cfi + cff;
      const endCash = prev.cash + netChange;

      const monthObj = {
        month: m,
        name: `Bulan ${m}`,
        pl: { rev, cogs, gp: grossProfit, opex: opexFixed+opexVar, depr, ebit, int: interest, tax, netIncome },
        bs: { cash: endCash, inventory, fixedAssets, totalAssets: endCash + inventory + fixedAssets, ap, debt, equity, re, totalLiabEq: ap + debt + equity + re },
        cf: { ni: cfo_ni, depr: cfo_depr, chgInv: cfo_inv, chgAp: cfo_ap, cfo: cfo_total, netChange, begCash: prev.cash, endCash }
      };

      data.push(monthObj);

      prev = { ...monthObj.bs, rev: rev, inventory: inventory, ap: ap, cash: endCash };
    }

    return data;
  }, [inputs, revenueOverrides]); 

  const fmt = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

  // --- STYLING MENGGUNAKAN TAILWIND (Pastikan CDN Tailwind ada atau pakai style manual) ---
  // Karena kita pakai CDN React, class Tailwind mungkin tidak jalan kalau tidak ada link CDN Tailwind.
  // Untuk amannya, saya asumsikan style dasar saja, tapi class tetap saya biarkan.
  
  return (
    <div className="font-sans text-slate-800" style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#064e3b', color: 'white', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', margin: 0 }}>
            <Icon name="calendar" /> Monthly Financial Plan
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#a7f3d0', margin: 0 }}>Proyeksi 12 Bulan (Jan - Dec)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
           <button onClick={() => setRevenueOverrides({})} style={{ fontSize: '0.75rem', background: '#065f46', border: 'none', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>Reset Edits</button>
           <button onClick={() => window.location.reload()} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><Icon name="refresh"/></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
        
        {/* SIDEBAR INPUTS */}
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontWeight: 'bold', color: '#334155', marginBottom: '16px', display: 'flex', alignItems: 'center' }}><Icon name="trend"/> Assumptions</h2>
          
          <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            <Section title="1. Revenue & Cost">
              <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '4px', border: '1px solid #dbeafe', fontSize: '0.75rem', color: '#1e40af', marginBottom: '8px' }}>
                <Icon name="edit"/> Anda sekarang bisa mengedit Revenue langsung di tabel "Income Statement".
              </div>
              <Input label="Jan Base (Juta)" name="baseRevenue" val={inputs.baseRevenue} onChange={handleChange} />
              <Input label="Monthly Growth (%)" name="monthlyGrowth" val={inputs.monthlyGrowth} onChange={handleChange} />
              <Input label="COGS (% of Rev)" name="cogsPct" val={inputs.cogsPct} onChange={handleChange} />
            </Section>

            <Section title="2. Operating Expense">
              <Input label="Fixed Opex (Gaji/Sewa)" name="opexFixed" val={inputs.opexFixed} onChange={handleChange} />
              <Input label="Var Opex (% Sales)" name="opexVarPct" val={inputs.opexVarPct} onChange={handleChange} />
            </Section>

            <Section title="3. Working Capital">
              <div style={{ background: '#fefce8', padding: '8px', borderRadius: '4px', border: '1px solid #fef9c3', fontSize: '0.75rem', color: '#854d0e', marginBottom: '8px' }}>
                Penting: DSI tinggi = Cashflow seret.
              </div>
              <Input label="Days Inventory (DSI)" name="dsi" val={inputs.dsi} onChange={handleChange} />
              <Input label="Days Payable (DPO)" name="dpo" val={inputs.dpo} onChange={handleChange} />
            </Section>

            <Section title="4. Opening Balances">
              <Input label="Start Cash" name="startCash" val={inputs.startCash} onChange={handleChange} />
              <Input label="Start Inventory" name="startInventory" val={inputs.startInventory} onChange={handleChange} />
              <Input label="Start Debt" name="startDebt" val={inputs.startDebt} onChange={handleChange} />
            </Section>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px', paddingBottom: '8px' }}>
             {['dashboard', 'income', 'balance', 'cashflow'].map(t => (
               <button 
                key={t}
                onClick={() => setActiveTab(t)}
                style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer', 
                    border: 'none', 
                    background: 'transparent',
                    borderBottom: activeTab === t ? '2px solid #047857' : 'none',
                    color: activeTab === t ? '#047857' : '#64748b',
                    fontWeight: activeTab === t ? 'bold' : 'normal',
                    textTransform: 'capitalize'
                }}
               >
                 {t === 'dashboard' ? 'Summary Dashboard' : t}
               </button>
             ))}
          </div>

          {/* Table Area */}
          <div style={{ overflowX: 'auto' }}>
            
            {/* DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <Card title="Total Revenue (1 Year)" value={fmt(monthlyData.reduce((acc, curr) => acc + curr.pl.rev, 0))} sub="Juta IDR" color="#eff6ff" textColor="#1e40af" />
                  <Card title="Ending Cash (Dec)" value={fmt(monthlyData[11].bs.cash)} sub="Posisi Akhir Tahun" color={monthlyData[11].bs.cash < 0 ? "#fef2f2" : "#f0fdf4"} textColor={monthlyData[11].bs.cash < 0 ? "#991b1b" : "#166534"} />
                  <Card title="Net Income (1 Year)" value={fmt(monthlyData.reduce((acc, curr) => acc + curr.pl.netIncome, 0))} sub="Profit Bersih" color="#faf5ff" textColor="#6b21a8" />
                </div>

                <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>Cash Position Trend (Jan - Dec)</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '160px', gap: '4px' }}>
                    {monthlyData.map((m, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                        <div 
                          style={{ 
                              width: '100%', 
                              background: m.bs.cash < 0 ? '#f87171' : '#34d399', 
                              borderRadius: '4px 4px 0 0',
                              height: `${Math.max(5, Math.min(100, (Math.abs(m.bs.cash) / Math.max(...monthlyData.map(x=>Math.abs(x.bs.cash))) * 100)))}%` 
                          }} 
                        ></div>
                        <span style={{ fontSize: '10px', textAlign: 'center', color: '#64748b', marginTop: '4px' }}>{m.name.substring(0,3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* INCOME STATEMENT TABLE */}
            {activeTab === 'income' && (
              <TableContainer>
                <TableHead data={monthlyData} />
                <tbody>
                  <Row 
                    label="Revenue (Editable)" 
                    data={monthlyData} 
                    field="pl.rev" 
                    bold 
                    editable 
                    overrides={revenueOverrides}
                    onCellChange={handleRevenueChange}
                  />
                  <Row label="(-) COGS" data={monthlyData} field="pl.cogs" neg />
                  <Row label="Gross Profit" data={monthlyData} field="pl.gp" bold bg />
                  <Row label="(-) Opex" data={monthlyData} field="pl.opex" neg />
                  <Row label="(-) Depreciation" data={monthlyData} field="pl.depr" neg />
                  <Row label="EBIT" data={monthlyData} field="pl.ebit" bold />
                  <Row label="(-) Interest" data={monthlyData} field="pl.int" neg />
                  <Row label="(-) Tax" data={monthlyData} field="pl.tax" neg />
                  <Row label="Net Income" data={monthlyData} field="pl.netIncome" bold bgDouble />
                </tbody>
              </TableContainer>
            )}

            {/* BALANCE SHEET TABLE */}
            {activeTab === 'balance' && (
              <TableContainer>
                 <TableHead data={monthlyData} />
                 <tbody>
                    <tr style={{ background: '#f0fdf4' }}><td style={{ padding: '8px', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', color: '#065f46', position: 'sticky', left: 0, background: '#f0fdf4' }}>Assets</td><td colSpan={12}></td></tr>
                    <Row label="Cash" data={monthlyData} field="bs.cash" highlight />
                    <Row label="Inventory" data={monthlyData} field="bs.inventory" />
                    <Row label="Fixed Assets" data={monthlyData} field="bs.fixedAssets" />
                    <Row label="TOTAL ASSETS" data={monthlyData} field="bs.totalAssets" bold borderT />
                    
                    <tr style={{ background: '#f0fdf4' }}><td style={{ padding: '8px', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', color: '#065f46', position: 'sticky', left: 0, background: '#f0fdf4' }}>Liabilities & Equity</td><td colSpan={12}></td></tr>
                    <Row label="Accounts Payable" data={monthlyData} field="bs.ap" />
                    <Row label="Long Term Debt" data={monthlyData} field="bs.debt" />
                    <Row label="Equity" data={monthlyData} field="bs.equity" />
                    <Row label="Retained Earnings" data={monthlyData} field="bs.re" />
                    <Row label="TOTAL LIAB & EQ" data={monthlyData} field="bs.totalLiabEq" bold borderT />
                    
                    {/* Check Row */}
                    <tr>
                      <td style={{ padding: '8px', fontSize: '0.75rem', fontWeight: 'bold', position: 'sticky', left: 0, background: 'white', borderRight: '1px solid #e2e8f0' }}>Check Balance</td>
                      {monthlyData.map((m, i) => (
                        <td key={i} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                           {Math.abs(m.bs.totalAssets - m.bs.totalLiabEq) < 1 
                             ? <Icon name="check"/> 
                             : <Icon name="alert"/>}
                        </td>
                      ))}
                    </tr>
                 </tbody>
              </TableContainer>
            )}

             {/* CASH FLOW TABLE */}
             {activeTab === 'cashflow' && (
              <TableContainer>
                <TableHead data={monthlyData} />
                <tbody>
                  <Row label="Net Income" data={monthlyData} field="cf.ni" bold />
                  <Row label="(+) Depreciation" data={monthlyData} field="cf.depr" />
                  <Row label="(Inc)/Dec Inventory" data={monthlyData} field="cf.chgInv" negRed />
                  <Row label="Inc/(Dec) Payable" data={monthlyData} field="cf.chgAp" />
                  <Row label="Cash From Ops" data={monthlyData} field="cf.cfo" bold bg />
                  
                  <Row label="Net Cash Change" data={monthlyData} field="cf.netChange" bold borderT />
                  <Row label="Beg. Cash" data={monthlyData} field="cf.begCash" italic textGray />
                  <Row label="End. Cash" data={monthlyData} field="cf.endCash" bold bgDouble />
                </tbody>
              </TableContainer>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub Components ---

const Section = ({ title, children }) => (
  <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
    <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.75rem' }}>{title}</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{children}</div>
  </div>
);

const Input = ({ label, name, val, onChange }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <label style={{ fontSize: '0.75rem', color: '#475569' }}>{label}</label>
    <input 
      type="number" 
      name={name}
      value={val} 
      onChange={onChange}
      style={{ width: '4rem', padding: '0.25rem', textAlign: 'right', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}
    />
  </div>
);

const Card = ({ title, value, sub, color, textColor }) => (
  <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)', background: color, color: textColor }}>
    <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', opacity: 0.7, textTransform: 'uppercase' }}>{title}</h3>
    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '4px 0' }}>{value}</p>
    <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{sub}</p>
  </div>
);

const TableContainer = ({ children }) => (
  <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
    <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse', minWidth: '1000px' }}>
      {children}
    </table>
  </div>
);

const TableHead = ({ data }) => (
  <thead style={{ background: '#f1f5f9', color: '#475569' }}>
    <tr>
      <th style={{ textAlign: 'left', padding: '12px', minWidth: '150px', position: 'sticky', left: 0, background: '#f1f5f9', borderRight: '1px solid #e2e8f0', zIndex: 10 }}>Item (Juta IDR)</th>
      {data.map(m => (
        <th key={m.month} style={{ textAlign: 'right', padding: '12px', fontWeight: '500', minWidth: '80px' }}>Bln {m.month}</th>
      ))}
    </tr>
  </thead>
);

const Row = ({ label, data, field, bold, bg, bgDouble, neg, negRed, highlight, borderT, italic, textGray, editable, overrides, onCellChange }) => {
  const getVal = (obj, path) => path.split('.').reduce((o, i) => o[i], obj);
  const fmt = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

  const rowStyle = {
    background: highlight ? '#fefce8' : bgDouble ? '#ecfdf5' : bg ? '#f9fafb' : 'white',
    borderBottom: borderT ? '2px solid #cbd5e1' : '1px solid #f1f5f9'
  };

  return (
    <tr style={rowStyle}>
      <td style={{ 
        padding: '8px', 
        position: 'sticky', 
        left: 0, 
        borderRight: '1px solid #e2e8f0', 
        zIndex: 10,
        fontWeight: bold ? 'bold' : 'normal',
        background: highlight ? '#fefce8' : bgDouble ? '#ecfdf5' : bg ? '#f9fafb' : 'white',
        fontStyle: italic ? 'italic' : 'normal',
        color: textGray ? '#64748b' : highlight ? '#1e40af' : 'inherit',
        display: 'flex', alignItems: 'center', gap: '4px'
      }}>
        {label}
        {editable && <Icon name="edit"/>}
      </td>
      
      {data.map((m, i) => {
        const val = getVal(m, field);
        const displayVal = neg ? -val : val;
        const isNeg = displayVal < 0;

        // Jika Editable aktif
        if (editable) {
          const isOverridden = overrides && overrides[m.month] !== undefined;
          return (
            <td key={i} style={{ padding: '4px', textAlign: 'right' }}>
              <input 
                type="number"
                value={isOverridden ? overrides[m.month] : Math.round(val)} 
                onChange={(e) => onCellChange(m.month, e.target.value)}
                style={{ 
                  width: '100%', 
                  textAlign: 'right', 
                  padding: '4px', 
                  fontSize: '0.75rem', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '4px',
                  background: isOverridden ? '#eff6ff' : 'transparent',
                  color: isOverridden ? '#1d4ed8' : 'inherit',
                  fontWeight: isOverridden ? 'bold' : 'normal'
                }}
              />
            </td>
          );
        }

        // Render Biasa
        return (
          <td key={i} style={{ 
            padding: '8px', 
            textAlign: 'right',
            fontWeight: bold ? 'bold' : 'normal',
            color: (negRed || isNeg) && isNeg ? '#ef4444' : textGray ? '#64748b' : 'inherit'
          }}>
             {displayVal < 0 ? `(${fmt(Math.abs(displayVal))})` : fmt(displayVal)}
          </td>
        );
      })}
    </tr>
  );
};

// --- BAGIAN PALING PENTING UNTUK RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MonthlyFinancialModel />);
