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
}

export interface SubscriptionDetail {
  id: string
  account_id: string
  account_name?: string
  product_id: string
  quantity: number
  unit_label: string
  unit_price: number
  total_price: number
  is_active: number
  product_name: string
  category: string
  product_group: string
  product_unit_type: string
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
