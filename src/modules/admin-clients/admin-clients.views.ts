import type { AuditAction } from '../audit/audit-action';
import type { AuditValues } from '../audit/entities/audit-log.entity';
import type { InvitationDeliveryStatus } from '../invitations/entities/invitation.entity';
import type { TenantStatus } from '../tenants/entities/tenant.entity';
import type { MembershipStatus } from '../users/entities/membership.entity';

/** Contratos de respuesta del panel global (nunca se exponen entidades). */

export interface ClientSummaryView {
  id: string;
  name: string;
  taxId: string;
  logoUrl: string | null;
  administratorEmail: string | null;
  status: TenantStatus;
  createdAt: Date;
}

export interface ClientListView {
  items: ClientSummaryView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClientStatsView {
  total: number;
  active: number;
  pendingActivation: number;
  suspended: number;
}

export type InvitationState = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface InvitationView {
  state: InvitationState;
  deliveryStatus: InvitationDeliveryStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  lastSentAt: Date | null;
  createdAt: Date;
}

export interface MembershipView {
  id: string;
  email: string;
  status: MembershipStatus;
  roles: string[];
  createdAt: Date;
  activatedAt: Date | null;
}

export interface AuditEntryView {
  id: string;
  action: AuditAction;
  actorEmail: string | null;
  previousValues: AuditValues | null;
  newValues: AuditValues | null;
  createdAt: Date;
}

export interface ClientDetailView extends ClientSummaryView {
  activatedAt: Date | null;
  updatedAt: Date;
  memberships: MembershipView[];
  invitation: InvitationView | null;
  history: AuditEntryView[];
}

export interface InvitationDeliveryView {
  email: string;
  deliveryStatus: InvitationDeliveryStatus;
  expiresAt: Date;
}

export interface ClientCreatedView {
  client: ClientSummaryView;
  invitation: InvitationDeliveryView;
}
