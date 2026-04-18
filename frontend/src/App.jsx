import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const HABIT_GROUPS = [
  {
    label: 'CORE TASKS',
    color: '#c8f135',
    habits: [
      { key: 'dsa',      label: '5–10 DSA Questions',        icon: '⚡' },
      { key: 'research', label: '30–60 min Research',         icon: '🔬' },
      { key: 'bus_time', label: 'Productive Bus Time ≥1hr',   icon: '🚌' },
      { key: 'gym',      label: 'Gym Done Properly',          icon: '💪' },
      { key: 'walk',     label: 'Walk 4 KM',                  icon: '🚶' },
    ]
  },
  {
    label: 'CONTROL RULES',
    color: '#ff8c42',
    habits: [
      { key: 'no_social',   label: 'No Social Media',           icon: '📵' },
      { key: 'no_junk',     label: 'No Junk Food',              icon: '🥗' },
      { key: 'no_chat',     label: 'No Unnecessary Chatting',   icon: '🤫' },
      { key: 'no_tt',       label: 'No Table Tennis',           icon: '🏓' },
      { key: 'no_phone_am', label: 'No Phone (First 30 min)',   icon: '📴' },
    ]
  },
  {
    label: 'DISCIPLINE',
    color: '#8dff6b',
    habits: [
      { key: 'wake_early',  label: 'Wake before 6 AM',  icon: '🌅' },
      { key: 'sleep_early', label: 'Sleep before 11 PM', icon: '🌙' },
    ]
  }
]

const ALL_HABITS = HABIT_GROUPS.flatMap(g => g.habits)
const HABIT_KEYS = ALL_HABITS.map(h => h.key)

const defaultChecks = () => Object.fromEntries(HABIT_KEYS.map(k => [k, false]))

function today() {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function scoreColor(s) {
  if (s >= 10) return '#c8f135'
  if (s >= 7)  return '#ffd166'
  if (s >= 4)  return '#ff8c42'
  return '#ff4444'
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #333',
      padding: '8px 12px', borderRadius: 4,
      fontFamily: 'DM Mono, monospace', fontSize: 12
    }}>
      <div style={{ color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ color: scoreColor(payload[0].value), fontWeight: 600 }}>
        {payload[0].value}/12
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [entries, setEntries]       = useState([])
  const [checks, setChecks]         = useState(defaultChecks())
  const [selectedDate, setSelected] = useState(today())
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [tab, setTab]               = useState('log') // 'log' | 'stats'

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch('/api/data')
      const d = await r.json()
      setEntries(d.entries || [])
    } catch {}
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Load existing entry when date changes
  useEffect(() => {
    const existing = entries.find(e => e.date === selectedDate)
    if (existing) {
      setChecks(Object.fromEntries(HABIT_KEYS.map(k => [k, !!existing[k]])))
    } else {
      setChecks(defaultChecks())
    }
  }, [selectedDate, entries])

  const currentScore = HABIT_KEYS.filter(k => checks[k]).length

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, ...checks })
      })
      await fetchData()
      showToast(`SAVED — ${currentScore}/12 today`)
    } catch {
      showToast('ERROR saving', true)
    }
    setSaving(false)
  }

  const showToast = (msg, err = false) => {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 3000)
  }

  // ── stats derived ──
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const last7  = sorted.slice(-7)
  const avgScore = entries.length ? (entries.reduce((a, b) => a + b.score, 0) / entries.length).toFixed(1) : 0
  const lastScore = sorted.at(-1)?.score ?? '—'

  // streak
  let streak = 0, maxStreak = 0, cur = 0
  for (const e of sorted) {
    if (e.score === 12) { cur++; maxStreak = Math.max(maxStreak, cur) }
    else cur = 0
  }
  // current streak (from end)
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].score === 12) streak++; else break
  }

  // habit completion rates
  const habitRates = ALL_HABITS.map(h => ({
    label: h.label,
    icon: h.icon,
    key: h.key,
    rate: entries.length ? Math.round((entries.filter(e => e[h.key]).length / entries.length) * 100) : 0
  })).sort((a, b) => a.rate - b.rate)

  const isExisting = entries.some(e => e.date === selectedDate)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── HEADER ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 2, color: 'var(--accent)' }}>
            ELITE EXECUTION
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: 1 }}>
            TRACKER
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['log', 'stats'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 16px', borderRadius: 3, fontSize: 12,
              fontFamily: 'var(--mono)', letterSpacing: 1, fontWeight: 500,
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#000' : 'var(--text2)',
              border: tab === t ? 'none' : '1px solid var(--border)',
              transition: 'all .15s'
            }}>{t.toUpperCase()}</button>
          ))}
        </div>
      </header>

      {/* ── QUICK STATS BAR ── */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto'
      }}>
        {[
          { label: 'AVG SCORE', val: `${avgScore}/12` },
          { label: 'DAYS LOGGED', val: entries.length },
          { label: 'LAST SCORE', val: `${lastScore}/12` },
          { label: 'BEST STREAK', val: `${maxStreak}d` },
          { label: 'LIVE STREAK', val: `${streak}d` },
        ].map((m, i) => (
          <div key={i} style={{
            flex: 1, minWidth: 100,
            padding: '12px 20px',
            borderRight: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: 1, marginBottom: 4 }}>
              {m.label}
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--text)', letterSpacing: 1 }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {tab === 'log' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

            {/* ── LEFT: HABIT FORM ── */}
            <div>
              {/* Date + score header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelected(e.target.value)}
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      color: 'var(--text)', padding: '8px 12px', borderRadius: 4,
                      fontFamily: 'var(--mono)', fontSize: 13, outline: 'none'
                    }}
                  />
                  {isExisting && (
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
                      color: 'var(--accent)', background: 'rgba(200,241,53,0.1)',
                      padding: '3px 8px', borderRadius: 2, border: '1px solid rgba(200,241,53,0.3)'
                    }}>EXISTING</span>
                  )}
                </div>
                <div style={{
                  fontFamily: 'var(--display)', fontSize: 48, letterSpacing: 2,
                  color: scoreColor(currentScore), transition: 'color .2s',
                  lineHeight: 1
                }}>
                  {currentScore}<span style={{ fontSize: 20, color: 'var(--text3)' }}>/12</span>
                </div>
              </div>

              {/* Habit groups */}
              {HABIT_GROUPS.map(group => (
                <div key={group.label} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2,
                    color: group.color, marginBottom: 10, paddingBottom: 6,
                    borderBottom: `1px solid ${group.color}22`
                  }}>{group.label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {group.habits.map(h => (
                      <label key={h.key} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 4, cursor: 'pointer',
                        background: checks[h.key] ? `${group.color}12` : 'var(--surface)',
                        border: `1px solid ${checks[h.key] ? group.color + '40' : 'var(--border)'}`,
                        transition: 'all .15s', userSelect: 'none'
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                          border: `2px solid ${checks[h.key] ? group.color : 'var(--border2)'}`,
                          background: checks[h.key] ? group.color : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .15s'
                        }}>
                          {checks[h.key] && (
                            <svg width="10" height="8" viewBox="0 0 10 8">
                              <path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={checks[h.key]}
                          onChange={e => setChecks(c => ({ ...c, [h.key]: e.target.checked }))}
                          style={{ display: 'none' }}
                        />
                        <span style={{ fontSize: 16 }}>{h.icon}</span>
                        <span style={{
                          fontSize: 13.5, color: checks[h.key] ? 'var(--text)' : 'var(--text2)',
                          transition: 'color .15s', flex: 1
                        }}>{h.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Save button */}
              <button onClick={handleSave} disabled={saving} style={{
                width: '100%', padding: '14px',
                background: saving ? 'var(--border)' : 'var(--accent)',
                color: '#000', fontFamily: 'var(--display)',
                fontSize: 18, letterSpacing: 3,
                borderRadius: 4, transition: 'all .15s',
                opacity: saving ? 0.6 : 1
              }}>
                {saving ? 'SAVING...' : isExisting ? 'UPDATE DAY' : 'SAVE DAY'}
              </button>
            </div>

            {/* ── RIGHT: MINI CALENDAR + RECENT ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* 7-day mini chart */}
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '16px'
              }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'var(--text3)', marginBottom: 12 }}>
                  LAST 7 DAYS
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={last7} barSize={24}>
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 12]} hide />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="score" radius={[2,2,0,0]}>
                      {last7.map((e, i) => <Cell key={i} fill={scoreColor(e.score)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Recent entries list */}
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '16px'
              }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'var(--text3)', marginBottom: 12 }}>
                  RECENT ENTRIES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
                  {[...sorted].reverse().slice(0, 14).map(e => (
                    <div key={e.date} onClick={() => setSelected(e.date)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', borderRadius: 3, cursor: 'pointer',
                        background: selectedDate === e.date ? 'var(--surface2)' : 'transparent',
                        border: `1px solid ${selectedDate === e.date ? 'var(--border2)' : 'transparent'}`,
                        transition: 'all .1s'
                      }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>
                        {fmtDate(e.date)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${(e.score/12)*100}%`, height: '100%', background: scoreColor(e.score), borderRadius: 2 }} />
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: scoreColor(e.score), minWidth: 28, textAlign: 'right' }}>
                          {e.score}/12
                        </span>
                      </div>
                    </div>
                  ))}
                  {entries.length === 0 && (
                    <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                      no entries yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Performance trend */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 20 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'var(--text3)', marginBottom: 16 }}>
                PERFORMANCE TREND — ALL TIME
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={sorted}>
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 12]} tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={avgScore} stroke="#333" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Habit completion rates */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 20 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'var(--text3)', marginBottom: 16 }}>
                HABIT CONSISTENCY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {habitRates.map(h => (
                  <div key={h.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, width: 22, textAlign: 'center' }}>{h.icon}</span>
                    <span style={{
                      fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text2)',
                      width: 220, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{h.label}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${h.rate}%`, height: '100%', borderRadius: 3,
                        background: h.rate >= 80 ? 'var(--accent)' : h.rate >= 50 ? 'var(--yellow)' : h.rate >= 30 ? 'var(--orange)' : 'var(--red)',
                        transition: 'width .4s ease'
                      }} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11,
                      color: h.rate >= 80 ? 'var(--accent)' : h.rate >= 50 ? 'var(--yellow)' : 'var(--red)',
                      width: 36, textAlign: 'right'
                    }}>{h.rate}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score distribution */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 20 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'var(--text3)', marginBottom: 16 }}>
                SCORE DISTRIBUTION
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
                {Array.from({ length: 13 }, (_, i) => {
                  const count = entries.filter(e => e.score === i).length
                  const maxCount = Math.max(...Array.from({ length: 13 }, (_, j) => entries.filter(e => e.score === j).length), 1)
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: count > 0 ? 'var(--text2)' : 'transparent' }}>
                        {count}
                      </div>
                      <div style={{
                        width: '100%', background: scoreColor(i), borderRadius: '2px 2px 0 0',
                        height: `${(count / maxCount) * 56}px`, minHeight: count > 0 ? 3 : 0,
                        transition: 'height .3s ease', opacity: count === 0 ? 0.15 : 1
                      }} />
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{i}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* All entries table */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 20 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'var(--text3)', marginBottom: 16 }}>
                FULL HISTORY
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 8px', color: 'var(--text3)', textAlign: 'left', borderBottom: '1px solid var(--border)', letterSpacing: 1 }}>DATE</th>
                      {ALL_HABITS.map(h => (
                        <th key={h.key} style={{ padding: '6px 4px', color: 'var(--text3)', textAlign: 'center', borderBottom: '1px solid var(--border)', fontSize: 14 }} title={h.label}>
                          {h.icon}
                        </th>
                      ))}
                      <th style={{ padding: '6px 8px', color: 'var(--text3)', textAlign: 'center', borderBottom: '1px solid var(--border)', letterSpacing: 1 }}>SCORE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sorted].reverse().map((e, i) => (
                      <tr key={e.date} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '6px 8px', color: 'var(--text2)' }}>{fmtDate(e.date)}</td>
                        {ALL_HABITS.map(h => (
                          <td key={h.key} style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <span style={{ color: e[h.key] ? '#c8f135' : '#333', fontSize: 13 }}>
                              {e[h.key] ? '●' : '○'}
                            </span>
                          </td>
                        ))}
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: scoreColor(e.score), fontWeight: 600 }}>
                          {e.score}/12
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.err ? 'var(--red)' : 'var(--accent)',
          color: '#000', padding: '10px 20px', borderRadius: 4,
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, letterSpacing: 1,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 999,
          animation: 'slideUp .2s ease'
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (max-width: 700px) {
          .main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
