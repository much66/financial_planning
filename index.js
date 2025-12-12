import React, { useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, DollarSign, Calendar, ArrowRight, AlertCircle, CheckCircle, Edit3 } from 'lucide-react';

const MonthlyFinancialModel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // --- 1. INITIAL ASSUMPTIONS (INPUTS) ---
  const [inputs, setInputs] = useState({
    // Revenue & Growth
    baseRevenue: 800, // Jan Revenue (Juta IDR)
    monthlyGrowth: 2, // % growth per month
    
    // Costs
    cogsPct: 60, // %
    opexFixed: 150, // Fixed per month (Rent, Salary)
    opexVarPct: 5, // Variable per month (% of sales)
    
    // Financials
    taxRate: 22, // %
    annualInterestRate: 12, // % per year
    
    // Working Capital (CRITICAL FOR RETAIL)
    dsi: 60, // Days Sales Inventory
    dpo: 45, // Days Payable Outstanding
    
    // Opening Balance (Dec Previous Year)
    startCash: 200,
    startInventory: 400,
    startFixedAssets: 5000,
    startDebt: 1000,
    startEquity: 4600, 
    startRetainedEarnings: 0 
  });

  // State untuk menyimpan manual override revenue per bulan
  // Format: { 1: 850, 4: 1200 } -> Bulan 1 jadi 850, Bulan 4 jadi 1200
  const [revenueOverrides, setRevenueOverrides] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: parseFloat(value) || 0 });
  };

  const handleRevenueChange = (month, val) => {
    setRevenueOverrides(prev => {
      const newOverrides = { ...prev };
      if (val === '' || val === null) {
        delete newOverrides[month]; // Hapus override jika kosong, kembali ke rumus
      } else {
        newOverrides[month] = parseFloat(val);
      }
      return newOverrides;
    });
  };

  // --- 2. CALCULATION ENGINE ---
  const monthlyData = useMemo(() => {
    let data = [];
    
    // Initial State (Month 0 / Dec Prev Year)
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
      // --- A. INCOME STATEMENT ---
      
      // LOGIC REVENUE BARU: Cek override dulu, kalau gak ada pakai rumus
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

      // --- B. BALANCE SHEET (Non-Cash) ---
      const inventory = (cogs / 30) * inputs.dsi;
      const ap = (cogs / 30) * inputs.dpo;
      const fixedAssets = prev.fixedAssets - depr; 
      const re = prev.re + netIncome;
      const debt = inputs.startDebt;
      const equity = inputs.startEquity;

      // --- C. CASH FLOW ---
      const cfo_ni = netIncome;
      const cfo_depr = depr;
      const cfo_inv = -(inventory - prev.inventory);
      const cfo_ap = (ap - prev.ap);
      const cfo_total = cfo_ni + cfo_depr + cfo_inv + cfo_ap;

      const cfi = 0; 
      const cff = 0; 
      
      const netChange = cfo_total + cfi + cff;
      const endCash = prev.cash + netChange;

      // Store current month data
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
  }, [inputs, revenueOverrides]); // Dependency nambah revenueOverrides

  // Format Helper
  const fmt = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-slate-800 font-sans">
      {/* Header */}
      <div className="bg-emerald-900 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar size={24} /> Monthly Financial Plan
          </h1>
          <p className="text-emerald-200 text-xs">Proyeksi 12 Bulan (Jan - Dec)</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setRevenueOverrides({})} className="text-xs bg-emerald-800 px-3 py-1 rounded hover:bg-emerald-700">Reset Edits</button>
           <button onClick={() => window.location.reload()} className="p-2 hover:bg-emerald-800 rounded"><RefreshCw size={18}/></button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* SIDEBAR INPUTS */}
        <div className="w-full md:w-80 bg-white border-r border-gray-200 overflow-y-auto p-4 flex-shrink-0">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={18}/> Assumptions</h2>
          
          <div className="space-y-6 text-sm">
            <Section title="1. Revenue & Cost">
              <div className="bg-blue-50 p-2 rounded border border-blue-100 mb-2 text-xs text-blue-800">
                <Edit3 size={12} className="inline mr-1"/>
                Anda sekarang bisa mengedit Revenue langsung di tabel "Income Statement".
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
              <div className="bg-yellow-50 p-2 rounded border border-yellow-200 mb-2 text-xs text-yellow-800">
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
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          {/* Tabs */}
          <div className="flex bg-white border-b border-gray-200 px-4 pt-2 gap-4 overflow-x-auto">
             {['dashboard', 'income', 'balance', 'cashflow'].map(t => (
               <button 
                key={t}
                onClick={() => setActiveTab(t)}
                className={`pb-2 px-2 text-sm font-medium capitalize ${activeTab === t ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 {t === 'dashboard' ? 'Summary Dashboard' : t + ' Statement'}
               </button>
             ))}
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto p-4">
            
            {/* DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card title="Total Revenue (1 Year)" value={fmt(monthlyData.reduce((acc, curr) => acc + curr.pl.rev, 0))} sub="Juta IDR" color="bg-blue-50 text-blue-800" />
                  <Card title="Ending Cash (Dec)" value={fmt(monthlyData[11].bs.cash)} sub="Posisi Akhir Tahun" color={monthlyData[11].bs.cash < 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"} />
                  <Card title="Net Income (1 Year)" value={fmt(monthlyData.reduce((acc, curr) => acc + curr.pl.netIncome, 0))} sub="Profit Bersih" color="bg-purple-50 text-purple-800" />
                </div>

                <div className="bg-white p-4 rounded shadow-sm border">
                  <h3 className="font-bold text-gray-700 mb-4">Cash Position Trend (Jan - Dec)</h3>
                  <div className="flex items-end space-x-2 h-40">
                    {monthlyData.map((m, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end group relative">
                        <div 
                          className={`w-full rounded-t ${m.bs.cash < 0 ? 'bg-red-400' : 'bg-emerald-400'}`} 
                          style={{ height: `${Math.max(5, Math.min(100, (Math.abs(m.bs.cash) / Math.max(...monthlyData.map(x=>Math.abs(x.bs.cash))) * 100)))}%` }}
                        ></div>
                        <span className="text-[10px] text-center text-gray-500 mt-1">{m.name.substring(0,3)}</span>
                         {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs p-1 rounded z-10 whitespace-nowrap">
                          {fmt(m.bs.cash)}
                        </div>
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
                    // PROPS UNTUK EDITABLE
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
                    <tr className="bg-emerald-50"><td className="p-2 font-bold text-xs uppercase text-emerald-800 sticky left-0 bg-emerald-50">Assets</td><td colSpan={12}></td></tr>
                    <Row label="Cash" data={monthlyData} field="bs.cash" highlight />
                    <Row label="Inventory" data={monthlyData} field="bs.inventory" />
                    <Row label="Fixed Assets" data={monthlyData} field="bs.fixedAssets" />
                    <Row label="TOTAL ASSETS" data={monthlyData} field="bs.totalAssets" bold borderT />
                    
                    <tr className="bg-emerald-50"><td className="p-2 font-bold text-xs uppercase text-emerald-800 sticky left-0 bg-emerald-50 mt-4">Liabilities & Equity</td><td colSpan={12}></td></tr>
                    <Row label="Accounts Payable" data={monthlyData} field="bs.ap" />
                    <Row label="Long Term Debt" data={monthlyData} field="bs.debt" />
                    <Row label="Equity" data={monthlyData} field="bs.equity" />
                    <Row label="Retained Earnings" data={monthlyData} field="bs.re" />
                    <Row label="TOTAL LIAB & EQ" data={monthlyData} field="bs.totalLiabEq" bold borderT />
                    
                    {/* Check Row */}
                    <tr>
                      <td className="p-2 text-xs font-bold sticky left-0 bg-white border-r">Check Balance</td>
                      {monthlyData.map((m, i) => (
                        <td key={i} className="p-2 text-center border-b">
                           {Math.abs(m.bs.totalAssets - m.bs.totalLiabEq) < 1 
                             ? <CheckCircle size={14} className="text-green-500 mx-auto"/> 
                             : <AlertCircle size={14} className="text-red-500 mx-auto"/>}
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
  <div className="mb-6 border-b pb-4 last:border-0">
    <h3 className="text-xs font-bold uppercase text-gray-400 mb-3">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const Input = ({ label, name, val, onChange }) => (
  <div className="flex justify-between items-center">
    <label className="text-xs text-gray-600">{label}</label>
    <input 
      type="number" 
      name={name}
      value={val} 
      onChange={onChange}
      className="w-16 p-1 text-right text-xs border rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
    />
  </div>
);

const Card = ({ title, value, sub, color }) => (
  <div className={`p-4 rounded shadow-sm border ${color}`}>
    <h3 className="text-xs font-bold opacity-70 uppercase">{title}</h3>
    <p className="text-2xl font-bold my-1">{value}</p>
    <p className="text-xs opacity-80">{sub}</p>
  </div>
);

const TableContainer = ({ children }) => (
  <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto">
    <table className="w-full text-sm min-w-[1000px]">
      {children}
    </table>
  </div>
);

const TableHead = ({ data }) => (
  <thead className="bg-gray-100 text-gray-600">
    <tr>
      <th className="text-left p-3 min-w-[150px] sticky left-0 bg-gray-100 border-r border-gray-200 z-10">Item (Juta IDR)</th>
      {data.map(m => (
        <th key={m.month} className="text-right p-3 font-medium min-w-[80px]">Bln {m.month}</th>
      ))}
    </tr>
  </thead>
);

const Row = ({ label, data, field, bold, bg, bgDouble, neg, negRed, highlight, borderT, italic, textGray, editable, overrides, onCellChange }) => {
  const getVal = (obj, path) => path.split('.').reduce((o, i) => o[i], obj);
  const fmt = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

  return (
    <tr className={`
      ${bg ? 'bg-gray-50' : ''} 
      ${bgDouble ? 'bg-emerald-50' : ''} 
      ${borderT ? 'border-t-2 border-gray-300' : 'border-b border-gray-50'}
      ${highlight ? 'bg-yellow-50' : ''}
      hover:bg-gray-50
    `}>
      <td className={`
        p-2 sticky left-0 border-r border-gray-200 z-10 flex items-center gap-1
        ${bold ? 'font-bold' : ''}
        ${highlight ? 'bg-yellow-50 text-blue-800' : bgDouble ? 'bg-emerald-50' : bg ? 'bg-gray-50' : 'bg-white'}
        ${italic ? 'italic' : ''}
        ${textGray ? 'text-gray-500' : ''}
      `}>
        {label}
        {editable && <Edit3 size={10} className="text-gray-400" />}
      </td>
      
      {data.map((m, i) => {
        const val = getVal(m, field);
        const displayVal = neg ? -val : val;
        const isNeg = displayVal < 0;

        // Jika Editable aktif
        if (editable) {
          const isOverridden = overrides && overrides[m.month] !== undefined;
          return (
            <td key={i} className="p-1 text-right">
              <input 
                type="number"
                value={isOverridden ? overrides[m.month] : Math.round(val)} // Tampilkan angka bulat agar bersih
                onChange={(e) => onCellChange(m.month, e.target.value)}
                className={`
                  w-full text-right p-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500
                  ${isOverridden ? 'bg-blue-50 border-blue-300 font-bold text-blue-700' : 'bg-transparent border-transparent hover:border-gray-300'}
                `}
              />
            </td>
          );
        }

        // Render Biasa
        return (
          <td key={i} className={`
            p-2 text-right 
            ${bold ? 'font-bold' : ''}
            ${(negRed || isNeg) && isNeg ? 'text-red-500' : ''}
            ${textGray ? 'text-gray-500' : ''}
          `}>
             {displayVal < 0 ? `(${fmt(Math.abs(displayVal))})` : fmt(displayVal)}
          </td>
        );
      })}
    </tr>
  );
};

export default MonthlyFinancialModel;