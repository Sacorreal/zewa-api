export enum AuditAction {
  SuperAdminBootstrapped = 'SUPERADMIN_BOOTSTRAPPED',
  LoginSucceeded = 'AUTH_LOGIN_SUCCEEDED',
  LoginFailed = 'AUTH_LOGIN_FAILED',
  ClientCreated = 'CLIENT_CREATED',
  ClientUpdated = 'CLIENT_UPDATED',
  ClientSuspended = 'CLIENT_SUSPENDED',
  ClientReactivated = 'CLIENT_REACTIVATED',
  InvitationResent = 'INVITATION_RESENT',
  InvitationAccepted = 'INVITATION_ACCEPTED',
}

export enum AuditEntityType {
  User = 'USER',
  Tenant = 'TENANT',
  Invitation = 'INVITATION',
}
