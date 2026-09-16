/* Envío de email de recuperación.
   Si hay RESEND_API_KEY, manda por Resend. Si no, loguea el link en consola
   (suficiente para desarrollo y pilotos sin proveedor configurado). */
export async function enviarEmailReset(to: string, link: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "StockLocal <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(`[email] (sin RESEND_API_KEY) Link de recuperación para ${to}: ${link}`);
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Recuperá tu contraseña de StockLocal",
        html: `
          <p>Alguien pidió cambiar la contraseña de tu cuenta en StockLocal.</p>
          <p>Entrá a este link para elegir una nueva (vence en 1 hora):</p>
          <p><a href="${link}">${link}</a></p>
          <p>Si no fuiste vos, ignorá este mensaje.</p>
        `,
      }),
    });
  } catch {
    console.log(`[email] Falló el envío a ${to}. Link: ${link}`);
  }
}
