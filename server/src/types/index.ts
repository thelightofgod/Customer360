export interface Account {
  id: string
  name: string
  sector: string
  color: string
  edition: string
  tier: string
  csm: string
  nps: number | null
  sla_compliance: number | null
  avg_resolution: string | null
  open_tickets: number
  license_model: string | null
  arr: number
  contract_start: string | null
  renewal_date: string | null
  contract_status: string | null
  total_licenses: number
  total_contract_value: number
  address?: string | null
  partner_name?: string | null
  partner_margin?: number | null
  partner_license_price?: number | null
  currency?: string | null
  invoice_date?: string | null
  payment_terms?: string | null
  consulting_days?: string | null
  training_info?: string | null
}

export interface SubscriptionDetail {
  id: string
  account_id: string
  account_name?: string
  product_id: string
  quantity: number
  unit_label: string
  list_price?: number | null
  unit_price: number
  total_price: number
  is_active: number
  product_name: string
  category: string
  product_group: string
  product_unit_type: string
  subscription_years?: number | null
  commitment_end_date?: string | null
  invoice_date?: string | null
  payment_periods?: Array<{ period_start: string; period_end: string; amount: number }> | null
  lisans_turu?: 'yeni' | 'ek' | null
  sale_id?: string | null
}

export interface PaymentSchedule {
  id: string
  account_id: string
  period_start: string
  period_end: string
  amount: number
  invoice_date: string | null
}

export interface DealLine {
  product_name: string
  category: string
  product_group: string
  quantity: number
  unit: string
  list_price: number
  unit_price: number
  total_price: number
}

export interface DealPaymentEntry {
  period_start: string
  period_end: string
  amount: number
  invoice_date: string | null
}

export interface Deal {
  id: string
  account_name: string
  deal_type: string
  deal_status: string
  contract_start: string | null
  contract_end: string | null
  subscription_years: number | null
  finance_contact: string | null
  existing_commitment_end: string | null
  remaining_months: number | null
  remaining_period_price: number | null
  partner_name: string | null
  partner_margin: number | null
  partner_license_price: number | null
  currency: string | null
  invoice_date: string | null
  payment_terms: string | null
  consulting_days: string | null
  training_info: string | null
  notes: string | null
  total_value: number
  lines: DealLine[]
  payment_schedule: DealPaymentEntry[]
  created_at: string
}

export interface Contact {
  id: string
  account_id: string
  account_name?: string
  name: string
  role: string
  initials: string
  contact_type: string
  email: string | null
  phone: string | null
}

export interface Ticket {
  id: string
  account_id: string
  ticket_ref: string
  subject: string
  priority: string
  status: string
  sla_status: string
  assignee: string
  created_at: string
}

export interface Activity {
  id: string
  account_id: string
  description: string
  activity_type: string
  activity_date: string
  color: string
}

export interface Product {
  id: string
  name: string
  category: string
  product_group: string
  list_price: number
  unit_type: string
  is_active: number
  created_at: string
}

export interface ProductSubscriber {
  id: string
  name: string
  tier: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface ProductDetail extends Product {
  subscribers: ProductSubscriber[]
}

export interface AccountDetail extends Account {
  contacts: Contact[]
  tickets: Ticket[]
  activities: Activity[]
  subscriptions: SubscriptionDetail[]
  notes?: string
  payment_schedules: PaymentSchedule[]
}

export interface SalePeriod {
  baslangic: string
  bitis: string
  tutar: string
}

export interface Sale {
  id: string
  firma_adi: string
  firma_adresi: string | null
  kontak_adi: string | null
  kontak_gorevi: string | null
  kontak_email: string | null
  finans_kontak_adi: string | null
  finans_kontak_gorevi: string | null
  finans_kontak_email: string | null
  lisans_turu: 'yeni' | 'ek'
  yil_sayisi: string | null
  musteri_liste_bedeli_yeni: string | null
  indirimli_musteri_bedeli_yeni: string | null
  musteri_liste_bedeli_ek: string | null
  indirimli_musteri_bedeli_ek: string | null
  taahhut_bitis_tarihi: string | null
  kalan_ay: string | null
  kalan_donem_net_tutar: string | null
  urunler: Record<string, string>
  partner: string | null
  partner_marj: string | null
  partner_lisans_bedeli: string | null
  kur: string | null
  fatura_tarihi: string | null
  odeme_vadesi: string | null
  danismanlik_adam_gun: string | null
  egitim: string | null
  not: string | null
  lisans_periodlari: SalePeriod[] | null
  contacts: Array<{ name: string; role: string; contact_type: string; email: string }> | null
  account_id: string | null
  deal_id: string | null
  subscription_ids: string[] | null
  annual_value_eur: number | null
  total_value_eur: number | null
  created_at: string
  created_by: string | null
}

export interface AccountSummaryStats {
  total_accounts: number
  active_accounts: number
  prospect_accounts: number
  total_arr: number
  total_licenses: number
  upcoming_renewals: number
  total_open_tickets: number
}
