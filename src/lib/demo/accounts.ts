export type DemoRole = "comercio" | "reciclador" | "alcaldia" | "admin";

/** Cuentas demo: comparten la contraseña DEMO_PASSWORD (variable de entorno). */
export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; home: string }> = {
  comercio: { email: "comercio@demo.reciclamigo.app", home: "/comercio" },
  reciclador: { email: "reciclador@demo.reciclamigo.app", home: "/reciclador" },
  alcaldia: { email: "alcaldia@demo.reciclamigo.app", home: "/alcaldia" },
  admin: { email: "admin@demo.reciclamigo.app", home: "/admin" },
};
