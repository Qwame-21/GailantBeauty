import { AdminIcon } from "./AdminIcons";

export function OrderArrivalToast({ message, close, openOrders }: { message: string; close: () => void; openOrders: () => void }) {
  return <div className="gb-order-toast" role="status"><div className="gb-toast-head"><span>🛍️</span><div><strong>Dashboard update</strong><small>Just now</small></div><button onClick={close} aria-label="Dismiss">×</button></div><p>{message}</p><button className="gb-toast-action" onClick={openOrders}>View records <span>→</span></button><AdminIcon name="sparkle" className="gb-toast-sparkle"/><i className="gb-toast-progress"/></div>;
}
