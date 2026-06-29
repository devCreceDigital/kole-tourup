export function generarLinkWhatsApp(telefono: string, mensaje: string): string {
  const telefonoLimpio = telefono.replace(/\D/g, '')
  const mensajeCodificado = encodeURIComponent(mensaje)
  return `https://wa.me/${telefonoLimpio}?text=${mensajeCodificado}`
}

export function mensajePagoVencido(nombreAlumno: string, nombreViaje: string, importe: number): string {
  return `Hola, le recordamos que tiene una cuota vencida de S/ ${importe} para el viaje "${nombreViaje}" de ${nombreAlumno}. Por favor regularice su pago a la brevedad. Gracias.`
}

export function mensajeDocumentoPendiente(nombreAlumno: string, nombreViaje: string, documento: string): string {
  return `Hola, le informamos que el documento "${documento}" de ${nombreAlumno} para el viaje "${nombreViaje}" requiere su atencion. Por favor subalo a la plataforma. Gracias.`
}

export function mensajeBienvenida(nombreAlumno: string, nombreViaje: string): string {
  return `Bienvenido! La inscripcion de ${nombreAlumno} al viaje "${nombreViaje}" ha sido registrada exitosamente. Puede gestionar pagos y documentos en la plataforma Tottem Hub.`
}