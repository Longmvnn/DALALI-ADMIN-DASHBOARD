import { useRef, useState } from 'react'
import { ImagePlus, X, Lock } from 'lucide-react'
import { useStore } from '../data/store'
import { Drawer, Toggle } from './ui'
import type { Listing, ListingKind, ListingStatus } from '../data/types'

const AMENITIES = ['Parking', 'Backup water', 'Generator', '24h security', 'Air conditioning', 'Balcony', 'Garden', 'Wi-Fi ready', 'Swimming pool', 'Gym', 'Lift', 'Sea view', 'Fenced', 'Servant quarter']
const KINDS: Record<'residential' | 'commercial', ListingKind[]> = {
  residential: ['apartment', 'house', 'room', 'studio'],
  commercial: ['office', 'shop', 'warehouse'],
}
const DISTRICTS = ['Kinondoni', 'Ilala', 'Ubungo', 'Temeke', 'Kigamboni']

/** Shrinks an uploaded photo so demo storage stays small. Real uploads go to the backend's file storage. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height))
      const c = Object.assign(document.createElement('canvas'), { width: img.width * scale, height: img.height * scale })
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function ListingEditor({ listing, onClose, onSaved }: { listing?: Listing; onClose: () => void; onSaved: (id: string) => void }) {
  const { db, saveListing, newListingId, toast } = useStore()
  const [f, setF] = useState<Listing>(() => listing ? structuredClone(listing) : {
    id: newListingId(), title: '', segment: 'residential', kind: 'apartment', area: '', district: 'Kinondoni', exactAddress: '',
    price: 0, period: 'month', bedrooms: 2, bathrooms: 1, sizeSqm: 0, furnished: false, amenities: [], description: '', photos: [],
    ownerName: '', ownerPhone: '', unlockPrice: db.settings.defaultUnlockPrice, featured: false, status: 'draft', views: 0, unlocks: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  })
  const [photoUrl, setPhotoUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Listing>(k: K, v: Listing[K]) => setF(x => ({ ...x, [k]: v }))
  const isCommercial = f.segment === 'commercial'

  function save(status?: ListingStatus) {
    if (!f.title.trim() || !f.area.trim() || f.price <= 0) {
      toast('Add a title, area and price first', 'warn')
      return
    }
    const next = { ...f, status: status ?? f.status }
    saveListing(next)
    onSaved(next.id)
  }

  async function addFiles(files: FileList | null) {
    if (!files) return
    const urls = await Promise.all([...files].slice(0, 8 - f.photos.length).map(shrink))
    set('photos', [...f.photos, ...urls])
  }

  return (
    <Drawer wide title={listing ? 'Edit listing' : 'New listing'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <span className="grow" />
        {f.status === 'live'
          ? <button className="btn btn-primary" onClick={() => save()}>Save changes</button>
          : <>
            <button className="btn btn-secondary" onClick={() => save()}>{listing ? 'Save changes' : 'Save as draft'}</button>
            <button className="btn btn-primary" onClick={() => save('live')}>Publish to app</button>
          </>}
      </>}>
      <form className="stack" onSubmit={e => { e.preventDefault(); save() }}>
        <div className="section-title">Basics</div>
        <div className="chips">
          {(['residential', 'commercial'] as const).map(s => (
            <button type="button" key={s} className={`chip${f.segment === s ? ' on' : ''}`} onClick={() => setF(x => ({ ...x, segment: s, kind: KINDS[s][0], bedrooms: s === 'commercial' ? 0 : Math.max(1, x.bedrooms) }))}>
              {s === 'residential' ? 'Residential' : 'Commercial'}
            </button>
          ))}
        </div>
        <label className="field"><span>Title</span>
          <input className="input" value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. 3 bedroom apartment in Mikocheni" required />
        </label>
        <div className="grid-3">
          <label className="field"><span>Type</span>
            <select className="select" value={f.kind} onChange={e => set('kind', e.target.value as ListingKind)}>
              {KINDS[f.segment].map(k => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
            </select>
          </label>
          <label className="field"><span>Price (TZS)</span>
            <input className="input mono" inputMode="numeric" value={f.price ? f.price.toLocaleString('en-US') : ''} onChange={e => set('price', Number(e.target.value.replace(/\D/g, '')) || 0)} placeholder="1,200,000" />
          </label>
          <label className="field"><span>Per</span>
            <select className="select" value={f.period} onChange={e => set('period', e.target.value as Listing['period'])}>
              <option value="month">Month</option><option value="year">Year</option><option value="sale">Sale (one-off)</option>
            </select>
          </label>
        </div>
        <div className="grid-3">
          {!isCommercial && <label className="field"><span>Bedrooms</span><input className="input" type="number" min={0} value={f.bedrooms} onChange={e => set('bedrooms', +e.target.value)} /></label>}
          <label className="field"><span>Bathrooms</span><input className="input" type="number" min={0} value={f.bathrooms} onChange={e => set('bathrooms', +e.target.value)} /></label>
          <label className="field"><span>Size (m²)</span><input className="input" type="number" min={0} value={f.sizeSqm || ''} onChange={e => set('sizeSqm', +e.target.value)} /></label>
        </div>
        {!isCommercial && (
          <div className="switch" style={{ borderBottom: 0, padding: 0 }}>
            <div className="grow"><b>Furnished</b></div>
            <Toggle label="Furnished" checked={f.furnished} onChange={v => set('furnished', v)} />
          </div>
        )}

        <div className="section-title">Location</div>
        <div className="grid-2">
          <label className="field"><span>Area / neighbourhood</span><input className="input" value={f.area} onChange={e => set('area', e.target.value)} placeholder="Mikocheni" required /></label>
          <label className="field"><span>District</span>
            <select className="select" value={f.district} onChange={e => set('district', e.target.value)}>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select>
          </label>
        </div>
        <label className="field"><span className="row" style={{ gap: 6 }}><Lock size={13} /> Exact address</span>
          <input className="input" value={f.exactAddress} onChange={e => set('exactAddress', e.target.value)} placeholder="Plot 123, Old Bagamoyo Rd" />
          <small>Hidden from tenants until they pay to unlock.</small>
        </label>

        <div className="section-title">Photos ({f.photos.length}/8)</div>
        <div className="photo-grid">
          {f.photos.map((p, i) => (
            <div className="ph" key={i}>
              <img src={p} alt={`Photo ${i + 1}`} />
              <button type="button" aria-label="Remove photo" onClick={() => set('photos', f.photos.filter((_, j) => j !== i))}><X size={14} /></button>
              {i === 0 && <span className="badge badge-navy" style={{ position: 'absolute', left: 6, bottom: 6 }}>Cover</span>}
            </div>
          ))}
          {f.photos.length < 8 && (
            <button type="button" className="ph" style={{ cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
              <span className="stack" style={{ gap: 4, alignItems: 'center' }}><ImagePlus size={22} /><span className="small">Upload</span></span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        <div className="row">
          <input className="input" placeholder="…or paste an image link" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
          <button type="button" className="btn btn-secondary" disabled={!/^https?:\/\//.test(photoUrl) || f.photos.length >= 8} onClick={() => { set('photos', [...f.photos, photoUrl]); setPhotoUrl('') }}>Add</button>
        </div>

        <div className="section-title">Description & amenities</div>
        <label className="field"><span>Description</span>
          <textarea className="textarea" rows={4} value={f.description} onChange={e => set('description', e.target.value)} placeholder="Plain language: what's nearby, water, power, security…" />
        </label>
        <div className="amenities">
          {AMENITIES.map(a => (
            <label key={a}><input type="checkbox" checked={f.amenities.includes(a)} onChange={e => set('amenities', e.target.checked ? [...f.amenities, a] : f.amenities.filter(x => x !== a))} />{a}</label>
          ))}
        </div>

        <div className="section-title">Owner & unlock (locked until paid)</div>
        <div className="grid-2">
          <label className="field"><span>Owner / landlord name</span><input className="input" value={f.ownerName} onChange={e => set('ownerName', e.target.value)} /></label>
          <label className="field"><span>Owner phone</span><input className="input" type="tel" value={f.ownerPhone} onChange={e => set('ownerPhone', e.target.value)} placeholder="+255 7xx xxx xxx" /></label>
        </div>
        <div className="grid-2">
          <label className="field"><span>Unlock price (TZS)</span>
            <input className="input mono" inputMode="numeric" value={f.unlockPrice.toLocaleString('en-US')} onChange={e => set('unlockPrice', Number(e.target.value.replace(/\D/g, '')) || 0)} />
            <small>What a tenant pays to see the owner's contact and exact location. Default {db.settings.defaultUnlockPrice.toLocaleString('en-US')}.</small>
          </label>
          <div className="switch" style={{ borderBottom: 0, paddingTop: 26 }}>
            <div className="grow"><b>Feature on home screen</b><span>Shows first in the app.</span></div>
            <Toggle label="Featured" checked={f.featured} onChange={v => set('featured', v)} />
          </div>
        </div>
      </form>
    </Drawer>
  )
}
