export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'user';
  isActive?: boolean;
  createdAt?: string;
}

export interface Customer {
  id: number;
  name: string;
  ic?: string;
  dic?: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  postalCode?: string;
  email?: string;
  contactPersonFirstName?: string;
  contactPersonLastName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
}

export interface Order {
  id: number;
  number: string;
  title: string;
  customerId: number;
  customerName?: string;
  customerContactPhone?: string;
  customerContactEmail?: string;
  statusId: number;
  statusName?: string;
  assignedToUserId?: number;
  assignedToName?: string;
  createdByUserId?: number;
  createdByUserName?: string;
  totalPrice?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderStatus {
  id: number;
  name: string;
  orderIndex: number;
}

export interface Offer {
  id: number;
  orderId: number;
  sequenceNumber: number;
  name?: string;
  mainCategoryCode?: string;
  subcategoryCode?: string;
  issueDate: string;
  validityDate: string;
  travelCostsEnabled: boolean;
  travelCostsKmQuantity?: number;
  travelCostsKmPrice?: number;
  travelCostsHoursQuantity?: number;
  travelCostsHoursPrice?: number;
  assemblyEnabled: boolean;
  assemblyQuantity?: number;
  assemblyPrice?: number;
  weakCurrentEnabled?: boolean;
  selectedWeakCurrentItems?: string[];
  note?: string;
  textTemplateId?: number;
  customTextContent?: string;
  totalPrice?: number; // Vypočítáno z items, není v DB
}

export interface OfferItem {
  id: number;
  offerId: number;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderIndex: number;
}

export interface OfferPdf {
  id: number;
  offerId: number;
  sequenceNumber?: number;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}

export interface MainCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface Subcategory {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface CategoryCombination {
  id: number;
  mainCategoryCode: string;
  subcategoryCode: string;
  htmlContent: string;
}

export interface WeakCurrentItem {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface TextTemplate {
  id: number;
  name: string;
  htmlContent: string;
}

export interface DashboardStat {
  status: string;
  count: number;
  totalValue: number;
}
