import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { useStore } from '../data/store'
import { tzs } from '../lib/format'
import { Avatar, Empty, ListingBadge, PaymentBadge, Thumb } from '../components/ui'

export default function SearchPage() {
  const { db, maps } = useStore()
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').toLowerCase()
  const has = (s: string) => s.toLowerCase().includes(q)

  const listings = db.listings.filter(l => has(`${l.title} ${l.area} ${l.district} ${l.ownerName} ${l.id}`)).slice(0, 8)
  const tenants = db.tenants.filter(t => has(`${t.name} ${t.phone} ${t.email ?? ''}`)).slice(0, 8)
  const payments = db.payments.filter(p => has(p.ref)).slice(0, 8)
  const none = !listings.length && !tenants.length && !payments.length

  return (
    <main className="content" style={{ maxWidth: 900 }}>
      <div className="page-head"><div><h1>Results for “{params.get('q')}”</h1></div></div>
      {none && <div className="card"><Empty icon={<SearchIcon size={40} />} title="Nothing found">Try a name, area, phone number or payment reference.</Empty></div>}
      <div className="stack">
        {!!listings.length && (
          <section className="card">
            <div className="card-head"><h2>Listings</h2><Link to={`/listings?q=${encodeURIComponent(q)}`}>See all</Link></div>
            <table className="table"><tbody>{listings.map(l => (
              <tr key={l.id}><td><Link to={`/listings?open=${l.id}`} className="row" style={{ gap: 12, textDecoration: 'none' }}><Thumb l={l} /><span><span className="cell-main">{l.title}</span><br /><span className="cell-sub">{l.area} · {tzs(l.price)}</span></span></Link></td><td><ListingBadge s={l.status} /></td></tr>
            ))}</tbody></table>
          </section>
        )}
        {!!tenants.length && (
          <section className="card">
            <div className="card-head"><h2>Tenants</h2><Link to={`/tenants?q=${encodeURIComponent(q)}`}>See all</Link></div>
            <table className="table"><tbody>{tenants.map(t => (
              <tr key={t.id}><td><Link to={`/tenants?open=${t.id}`} className="row" style={{ gap: 12, textDecoration: 'none' }}><Avatar name={t.name} kind={t.isGuest ? 'guest' : undefined} /><span><span className="cell-main">{t.name}</span><br /><span className="cell-sub">{t.phone || 'Guest'}</span></span></Link></td></tr>
            ))}</tbody></table>
          </section>
        )}
        {!!payments.length && (
          <section className="card">
            <div className="card-head"><h2>Payments</h2><Link to="/payments">All payments</Link></div>
            <table className="table"><tbody>{payments.map(p => (
              <tr key={p.id}><td className="mono cell-main">{p.ref}</td><td>{maps.tenant.get(p.tenantId)?.name}</td><td className="num">{tzs(p.amount)}</td><td><PaymentBadge s={p.status} /></td></tr>
            ))}</tbody></table>
          </section>
        )}
      </div>
    </main>
  )
}
