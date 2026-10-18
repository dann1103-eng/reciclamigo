export type DemoRole = "comercio" | "reciclador" | "alcaldia";

/** Cuentas demo: comparten la contraseña DEMO_PASSWORD (variable de entorno). */
export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; home: string }> = {
  comercio: { email: "comercio@demo.reciclamigo.app", home: "/comercio" },
  reciclador: { email: "reciclador@demo.reciclamigo.app", home: "/reciclador" },
  alcaldia: { email: "alcaldia@demo.reciclamigo.app", home: "/alcaldia" },
};
