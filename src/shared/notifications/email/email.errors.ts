/** El proveedor no pudo entregar el correo. */
export class EmailDeliveryError extends Error {
  constructor(provider: string, reason: string) {
    super(`El proveedor de correo '${provider}' rechazó el envío: ${reason}`);
    this.name = EmailDeliveryError.name;
  }
}
