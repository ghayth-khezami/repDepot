export type StatusBadge = {
  label: string;
  className: string;
};

export function getCommandStatusBadge(status: string): StatusBadge {
  switch (status) {
    case "DELIVERED":
      return {
        label: "Livrée",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "GOT_PROFIT":
      return {
        label: "Terminée",
        className: "border-violet-200 bg-violet-50 text-violet-800",
      };
    case "NOT_DELIVERED":
    default:
      return {
        label: "En préparation",
        className: "border-amber-200 bg-amber-50 text-amber-900",
      };
  }
}

export function getDepositStatusBadge(status: string): StatusBadge {
  switch (status) {
    case "CONFIRMED":
      return {
        label: "Confirmée",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "CONTACTED":
      return {
        label: "Contactée",
        className: "border-sky-200 bg-sky-50 text-sky-800",
      };
    case "CLOSED":
      return {
        label: "Clôturée",
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
    case "PENDING":
    default:
      return {
        label: "En attente",
        className: "border-amber-200 bg-amber-50 text-amber-900",
      };
  }
}
